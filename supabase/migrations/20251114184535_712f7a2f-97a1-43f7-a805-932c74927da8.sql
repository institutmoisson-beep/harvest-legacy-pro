-- Create investment_payment_history table
CREATE TABLE IF NOT EXISTS public.investment_payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id UUID NOT NULL REFERENCES public.investment_products(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('capital_return', 'earnings')),
  amount_paid NUMERIC NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investment_payment_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own payment history"
  ON public.investment_payment_history FOR SELECT
  USING (auth.uid() = investor_id);

CREATE POLICY "Admins can view all payment history"
  ON public.investment_payment_history FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert payment history"
  ON public.investment_payment_history FOR INSERT
  WITH CHECK (true);

-- Index for performance
CREATE INDEX idx_investment_payment_history_investor ON public.investment_payment_history(investor_id);
CREATE INDEX idx_investment_payment_history_investment ON public.investment_payment_history(investment_id);