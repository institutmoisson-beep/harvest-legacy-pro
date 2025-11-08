-- Create user_qr_codes table for QR code generation and tracking
CREATE TABLE IF NOT EXISTS public.user_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  qr_code_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_qr_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_qr_codes
CREATE POLICY "Users can view own QR code"
  ON public.user_qr_codes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own QR code"
  ON public.user_qr_codes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own QR code"
  ON public.user_qr_codes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all QR codes"
  ON public.user_qr_codes
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create agent_transactions table for agent dashboard
CREATE TABLE IF NOT EXISTS public.agent_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'commission')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_transactions
CREATE POLICY "Agents can view own transactions"
  ON public.agent_transactions
  FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "Members can view their transactions"
  ON public.agent_transactions
  FOR SELECT
  USING (auth.uid() = member_id);

CREATE POLICY "Agents can create transactions"
  ON public.agent_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Admins can manage all agent transactions"
  ON public.agent_transactions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_user_qr_codes_user_id ON public.user_qr_codes(user_id);
CREATE INDEX idx_agent_transactions_agent_id ON public.agent_transactions(agent_id);
CREATE INDEX idx_agent_transactions_member_id ON public.agent_transactions(member_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_user_qr_codes_updated_at
  BEFORE UPDATE ON public.user_qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_transactions_updated_at
  BEFORE UPDATE ON public.agent_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();