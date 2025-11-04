-- Create visits table for analytics
CREATE TABLE IF NOT EXISTS public.visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON public.visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_session ON public.visits(session_id);
CREATE INDEX IF NOT EXISTS idx_visits_user_id ON public.visits(user_id);

-- Enable RLS
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Admin can view all visits
CREATE POLICY "Admins can view all visits"
ON public.visits
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Anyone can insert visits (for tracking)
CREATE POLICY "Anyone can insert visits"
ON public.visits
FOR INSERT
WITH CHECK (true);