-- Add pending_admin_review status to order_status enum
ALTER TYPE public.order_status ADD VALUE 'pending_admin_review';

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (name IN ('wallet', 'wave', 'lygos', 'coinpayments', 'cash_on_delivery')),
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method_id UUID REFERENCES public.payment_methods(id),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'FCFA',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  external_transaction_id TEXT,
  payment_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on payment_methods and payment_transactions
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_methods (public read, admin write)
CREATE POLICY "Anyone can view active payment methods"
  ON public.payment_methods
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage payment methods"
  ON public.payment_methods
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'financier'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'financier'::app_role)
  );

-- RLS Policies for payment_transactions (users can view own, admins can view all)
CREATE POLICY "Users can view own payment transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'financier'::app_role)
  );

CREATE POLICY "System can insert payment transactions"
  ON public.payment_transactions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update payment transaction status"
  ON public.payment_transactions
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'financier'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'financier'::app_role)
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON public.payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON public.payment_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_methods_name ON public.payment_methods(name);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active ON public.payment_methods(is_active);

-- Insert default payment methods
INSERT INTO public.payment_methods (name, display_name, description, icon, is_active, config)
VALUES
  ('wallet', '💰 Portefeuille Moissonneur', 'Paiement direct depuis votre portefeuille', '💰', true, '{}'),
  ('wave', '📱 Wave Paiement', 'Paiement mobile via Wave', '📱', true, '{"merchant_link": "https://pay.wave.com/m/M_ci_txFrj6YmGYT2/c/ci/"}'),
  ('lygos', '🔗 Lygos Paiement', 'Paiement par code QR Lygos', '🔗', true, '{"merchant_id": "lygosapp-1857270e-82b3-4072-a565-4e1c3de4cf4c"}'),
  ('coinpayments', '₿ Cryptomonnaie', 'Paiement en Bitcoin ou autres cryptocurrences', '₿', true, '{"client_id": "3c672fcda81649908790a70d863a6b2e"}'),
  ('cash_on_delivery', '💵 Paiement à la Livraison', 'Paiement au moment de la livraison', '💵', true, '{}')
ON CONFLICT (name) DO NOTHING;

-- Enable realtime for payment_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE payment_transactions;
