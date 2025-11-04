-- Create messages table for private messaging
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_messages_from ON public.messages(from_user_id, created_at DESC);
CREATE INDEX idx_messages_to ON public.messages(to_user_id, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their messages"
ON public.messages FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update read status"
ON public.messages FOR UPDATE
USING (auth.uid() = to_user_id);

-- Create tontines table
CREATE TABLE IF NOT EXISTS public.tontines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  max_participants INTEGER NOT NULL,
  frequency TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  current_cycle INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_tontines_creator ON public.tontines(creator_id);
CREATE INDEX idx_tontines_status ON public.tontines(status);

ALTER TABLE public.tontines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tontines"
ON public.tontines FOR SELECT
USING (status = 'active' OR creator_id = auth.uid());

CREATE POLICY "Users can create tontines"
ON public.tontines FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their tontines"
ON public.tontines FOR UPDATE
USING (auth.uid() = creator_id);

-- Create tontine_participants table
CREATE TABLE IF NOT EXISTS public.tontine_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tontine_id UUID NOT NULL REFERENCES public.tontines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  has_received BOOLEAN DEFAULT false,
  received_at TIMESTAMP WITH TIME ZONE,
  is_paid_current_cycle BOOLEAN DEFAULT false,
  UNIQUE(tontine_id, user_id)
);

CREATE INDEX idx_tontine_participants_tontine ON public.tontine_participants(tontine_id);
CREATE INDEX idx_tontine_participants_user ON public.tontine_participants(user_id);

ALTER TABLE public.tontine_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tontine participants"
ON public.tontine_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tontine_participants tp
    WHERE tp.tontine_id = tontine_participants.tontine_id
    AND tp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join tontines"
ON public.tontine_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create tontine_payments table
CREATE TABLE IF NOT EXISTS public.tontine_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tontine_id UUID NOT NULL REFERENCES public.tontines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT, -- 'orange_money', 'mtn_money', 'wave', 'push', 'wallet'
  payment_contact TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_tontine_payments_tontine ON public.tontine_payments(tontine_id);
CREATE INDEX idx_tontine_payments_user ON public.tontine_payments(user_id);

ALTER TABLE public.tontine_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their payments"
ON public.tontine_payments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create payments"
ON public.tontine_payments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update payment status"
ON public.tontine_payments FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create tontine_drawings table
CREATE TABLE IF NOT EXISTS public.tontine_drawings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tontine_id UUID NOT NULL REFERENCES public.tontines(id) ON DELETE CASCADE,
  winner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  amount_won NUMERIC NOT NULL,
  drawn_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tontine_id, cycle_number)
);

CREATE INDEX idx_tontine_drawings_tontine ON public.tontine_drawings(tontine_id);
CREATE INDEX idx_tontine_drawings_winner ON public.tontine_drawings(winner_id);

ALTER TABLE public.tontine_drawings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view drawings"
ON public.tontine_drawings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tontine_participants tp
    WHERE tp.tontine_id = tontine_drawings.tontine_id
    AND tp.user_id = auth.uid()
  )
);

-- Create tontine_messages table for group chat
CREATE TABLE IF NOT EXISTS public.tontine_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tontine_id UUID NOT NULL REFERENCES public.tontines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_tontine_messages_tontine ON public.tontine_messages(tontine_id, created_at DESC);

ALTER TABLE public.tontine_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view tontine messages"
ON public.tontine_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tontine_participants tp
    WHERE tp.tontine_id = tontine_messages.tontine_id
    AND tp.user_id = auth.uid()
  )
);

CREATE POLICY "Participants can send tontine messages"
ON public.tontine_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.tontine_participants tp
    WHERE tp.tontine_id = tontine_messages.tontine_id
    AND tp.user_id = auth.uid()
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tontine_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tontine_drawings;