-- Create all group voice call tables if they don't exist

-- Create group_voice_calls table
CREATE TABLE IF NOT EXISTS public.group_voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on group_voice_calls
ALTER TABLE public.group_voice_calls ENABLE ROW LEVEL SECURITY;

-- Create group_call_participants table
CREATE TABLE IF NOT EXISTS public.group_call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.group_voice_calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_muted BOOLEAN DEFAULT false,
  UNIQUE(call_id, user_id)
);

-- Enable RLS on group_call_participants
ALTER TABLE public.group_call_participants ENABLE ROW LEVEL SECURITY;

-- Create group_call_signals table for WebRTC signaling
CREATE TABLE IF NOT EXISTS public.group_call_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.group_voice_calls(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate', 'screen-share-offer', 'screen-share-answer')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on group_call_signals
ALTER TABLE public.group_call_signals ENABLE ROW LEVEL SECURITY;

-- Create group_call_messages table for chat
CREATE TABLE IF NOT EXISTS public.group_call_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.group_voice_calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on group_call_messages
ALTER TABLE public.group_call_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view active group calls" ON public.group_voice_calls;
    DROP POLICY IF EXISTS "Users can create group calls" ON public.group_voice_calls;
    DROP POLICY IF EXISTS "Call creators can update their calls" ON public.group_voice_calls;
    DROP POLICY IF EXISTS "Users can view call participants" ON public.group_call_participants;
    DROP POLICY IF EXISTS "Users can join calls" ON public.group_call_participants;
    DROP POLICY IF EXISTS "Users can update own participation" ON public.group_call_participants;
    DROP POLICY IF EXISTS "Participants can view call signals" ON public.group_call_signals;
    DROP POLICY IF EXISTS "Participants can send signals" ON public.group_call_signals;
    DROP POLICY IF EXISTS "Participants can view call messages" ON public.group_call_messages;
    DROP POLICY IF EXISTS "Participants can send messages" ON public.group_call_messages;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- RLS policies for group_voice_calls
CREATE POLICY "Users can view active group calls"
ON public.group_voice_calls FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Users can create group calls"
ON public.group_voice_calls FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Call creators can update their calls"
ON public.group_voice_calls FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- RLS policies for group_call_participants
CREATE POLICY "Users can view call participants"
ON public.group_call_participants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_call_participants gcp
    WHERE gcp.call_id = group_call_participants.call_id
    AND gcp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join calls"
ON public.group_call_participants FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation"
ON public.group_call_participants FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- RLS policies for group_call_signals
CREATE POLICY "Participants can view call signals"
ON public.group_call_signals FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_call_participants gcp
    WHERE gcp.call_id = group_call_signals.call_id
    AND gcp.user_id = auth.uid()
  )
);

CREATE POLICY "Participants can send signals"
ON public.group_call_signals FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = from_user_id AND
  EXISTS (
    SELECT 1 FROM public.group_call_participants gcp
    WHERE gcp.call_id = group_call_signals.call_id
    AND gcp.user_id = auth.uid()
  )
);

-- RLS policies for group_call_messages
CREATE POLICY "Participants can view call messages"
ON public.group_call_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_call_participants gcp
    WHERE gcp.call_id = group_call_messages.call_id
    AND gcp.user_id = auth.uid()
  )
);

CREATE POLICY "Participants can send messages"
ON public.group_call_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.group_call_participants gcp
    WHERE gcp.call_id = group_call_messages.call_id
    AND gcp.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_call_participants_call_id ON public.group_call_participants(call_id);
CREATE INDEX IF NOT EXISTS idx_group_call_participants_user_id ON public.group_call_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_group_call_signals_call_id ON public.group_call_signals(call_id);
CREATE INDEX IF NOT EXISTS idx_group_call_signals_created_at ON public.group_call_signals(created_at);
CREATE INDEX IF NOT EXISTS idx_group_call_messages_call_id ON public.group_call_messages(call_id);
CREATE INDEX IF NOT EXISTS idx_group_call_messages_created_at ON public.group_call_messages(created_at);