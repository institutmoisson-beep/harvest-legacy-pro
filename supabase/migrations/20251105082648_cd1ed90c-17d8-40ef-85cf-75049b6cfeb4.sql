-- Create table for user locations sharing
CREATE TABLE IF NOT EXISTS public.user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  accuracy NUMERIC,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- Users can view locations shared with them
CREATE POLICY "Users can view shared locations"
ON public.user_locations
FOR SELECT
USING (
  auth.uid() = shared_with_user_id OR auth.uid() = user_id
);

-- Users can share their own location
CREATE POLICY "Users can share own location"
ON public.user_locations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own location
CREATE POLICY "Users can update own location"
ON public.user_locations
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own location
CREATE POLICY "Users can delete own location"
ON public.user_locations
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_locations;

-- Create table for call sessions (WebRTC signaling)
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, ended
  offer JSONB,
  answer JSONB,
  ice_candidates JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own call sessions
CREATE POLICY "Users can view own call sessions"
ON public.call_sessions
FOR SELECT
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Users can create call sessions
CREATE POLICY "Users can create call sessions"
ON public.call_sessions
FOR INSERT
WITH CHECK (auth.uid() = caller_id);

-- Users can update call sessions they're part of
CREATE POLICY "Users can update own call sessions"
ON public.call_sessions
FOR UPDATE
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Enable realtime for call sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;