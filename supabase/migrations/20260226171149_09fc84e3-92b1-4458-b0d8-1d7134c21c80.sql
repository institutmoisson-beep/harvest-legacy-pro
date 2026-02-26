-- Table: Statut des agents du centre d'appel
CREATE TABLE public.call_center_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('available', 'busy', 'paused', 'offline')),
  is_vip_handler BOOLEAN DEFAULT false,
  active_call_id UUID REFERENCES public.call_sessions(id) ON DELETE SET NULL,
  calls_handled_today INTEGER DEFAULT 0,
  total_calls_handled INTEGER DEFAULT 0,
  average_call_duration INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Table: File d'attente des appels
CREATE TABLE public.call_center_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caller_code TEXT NOT NULL,
  caller_name TEXT,
  priority INTEGER DEFAULT 0,
  is_vip BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'connecting', 'connected', 'abandoned', 'completed')),
  assigned_agent_id UUID REFERENCES public.call_center_agents(id) ON DELETE SET NULL,
  call_session_id UUID REFERENCES public.call_sessions(id) ON DELETE SET NULL,
  wait_start_at TIMESTAMPTZ DEFAULT now(),
  connected_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  abandon_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: Notes d'appel
CREATE TABLE public.call_center_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_session_id UUID NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: Historique détaillé des appels centre
CREATE TABLE public.call_center_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_session_id UUID REFERENCES public.call_sessions(id) ON DELETE SET NULL,
  queue_id UUID REFERENCES public.call_center_queue(id) ON DELETE SET NULL,
  caller_id UUID NOT NULL,
  caller_code TEXT,
  caller_name TEXT,
  agent_id UUID,
  agent_name TEXT,
  duration_seconds INTEGER DEFAULT 0,
  wait_seconds INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  routing_method TEXT,
  was_transferred BOOLEAN DEFAULT false,
  transferred_from UUID,
  notes_count INTEGER DEFAULT 0,
  caller_latitude DOUBLE PRECISION,
  caller_longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: Configuration du centre d'appel
CREATE TABLE public.call_center_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routing_method TEXT NOT NULL DEFAULT 'round_robin' CHECK (routing_method IN ('round_robin', 'least_busy', 'priority')),
  max_queue_size INTEGER DEFAULT 50,
  max_wait_seconds INTEGER DEFAULT 300,
  auto_abandon_seconds INTEGER DEFAULT 120,
  inactive_agent_timeout_seconds INTEGER DEFAULT 300,
  vip_priority_boost INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO public.call_center_settings (routing_method) VALUES ('round_robin');

-- Enable RLS
ALTER TABLE public.call_center_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_center_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_center_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_center_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_center_settings ENABLE ROW LEVEL SECURITY;

-- RLS: Admins only
CREATE POLICY "Admins manage call center agents" ON public.call_center_agents
  FOR ALL TO authenticated
  USING (public.has_access_level(auth.uid(), 80))
  WITH CHECK (public.has_access_level(auth.uid(), 80));

CREATE POLICY "Admins manage call queue" ON public.call_center_queue
  FOR ALL TO authenticated
  USING (public.has_access_level(auth.uid(), 80))
  WITH CHECK (public.has_access_level(auth.uid(), 80));

CREATE POLICY "Users can join call queue" ON public.call_center_queue
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can view own queue entry" ON public.call_center_queue
  FOR SELECT TO authenticated
  USING (auth.uid() = caller_id);

CREATE POLICY "Admins manage call notes" ON public.call_center_notes
  FOR ALL TO authenticated
  USING (public.has_access_level(auth.uid(), 80))
  WITH CHECK (public.has_access_level(auth.uid(), 80));

CREATE POLICY "Admins view call history" ON public.call_center_history
  FOR ALL TO authenticated
  USING (public.has_access_level(auth.uid(), 80))
  WITH CHECK (public.has_access_level(auth.uid(), 80));

CREATE POLICY "Admins manage call center settings" ON public.call_center_settings
  FOR ALL TO authenticated
  USING (public.has_access_level(auth.uid(), 80))
  WITH CHECK (public.has_access_level(auth.uid(), 80));

-- Function: Route call to best available agent
CREATE OR REPLACE FUNCTION public.route_call_to_agent(p_queue_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_routing_method TEXT;
  v_agent_id UUID;
  v_is_vip BOOLEAN;
BEGIN
  SELECT routing_method INTO v_routing_method FROM public.call_center_settings LIMIT 1;
  SELECT is_vip INTO v_is_vip FROM public.call_center_queue WHERE id = p_queue_id;
  
  CASE v_routing_method
    WHEN 'round_robin' THEN
      SELECT id INTO v_agent_id
      FROM public.call_center_agents
      WHERE status = 'available' AND active_call_id IS NULL
      ORDER BY last_active_at ASC NULLS FIRST
      LIMIT 1;
    WHEN 'least_busy' THEN
      SELECT id INTO v_agent_id
      FROM public.call_center_agents
      WHERE status = 'available' AND active_call_id IS NULL
      ORDER BY calls_handled_today ASC, last_active_at ASC NULLS FIRST
      LIMIT 1;
    WHEN 'priority' THEN
      IF v_is_vip THEN
        SELECT id INTO v_agent_id
        FROM public.call_center_agents
        WHERE status = 'available' AND active_call_id IS NULL AND is_vip_handler = true
        ORDER BY calls_handled_today ASC
        LIMIT 1;
      END IF;
      IF v_agent_id IS NULL THEN
        SELECT id INTO v_agent_id
        FROM public.call_center_agents
        WHERE status = 'available' AND active_call_id IS NULL
        ORDER BY calls_handled_today ASC
        LIMIT 1;
      END IF;
  END CASE;
  
  IF v_agent_id IS NOT NULL THEN
    UPDATE public.call_center_queue
    SET assigned_agent_id = v_agent_id, status = 'connecting'
    WHERE id = p_queue_id;
    
    UPDATE public.call_center_agents
    SET status = 'busy', last_active_at = now()
    WHERE id = v_agent_id;
  END IF;
  
  RETURN v_agent_id;
END;
$$;

-- Function: Detect inactive agents
CREATE OR REPLACE FUNCTION public.detect_inactive_agents()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_timeout INTEGER;
BEGIN
  SELECT inactive_agent_timeout_seconds INTO v_timeout FROM public.call_center_settings LIMIT 1;
  
  UPDATE public.call_center_agents
  SET status = 'offline'
  WHERE status = 'available'
    AND last_active_at < now() - (v_timeout || ' seconds')::INTERVAL;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_call_center_agents_updated_at
  BEFORE UPDATE ON public.call_center_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_credit_updated_at();

CREATE TRIGGER update_call_center_settings_updated_at
  BEFORE UPDATE ON public.call_center_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_credit_updated_at();