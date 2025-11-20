-- Create withdrawal_partners table for partners who deliver products
CREATE TABLE IF NOT EXISTS public.withdrawal_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text NOT NULL,
  region text NOT NULL,
  city text NOT NULL,
  is_active boolean DEFAULT true,
  commission_rate numeric DEFAULT 5.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create savings_purchases table for deferred purchase savings
CREATE TABLE IF NOT EXISTS public.savings_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_name text NOT NULL,
  product_image text,
  total_price numeric NOT NULL,
  amount_saved numeric DEFAULT 0,
  partner_id uuid REFERENCES public.withdrawal_partners(id),
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'withdrawn', 'cancelled')),
  withdrawal_code text UNIQUE,
  qr_code_url text,
  penalty_rate numeric DEFAULT 10.0,
  withdrawn_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create savings_payments table for progressive payments
CREATE TABLE IF NOT EXISTS public.savings_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  savings_id uuid REFERENCES public.savings_purchases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_method text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawal_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for withdrawal_partners
CREATE POLICY "Everyone can view active partners"
  ON public.withdrawal_partners FOR SELECT
  USING (is_active = true);

CREATE POLICY "Partners can manage own profile"
  ON public.withdrawal_partners FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all partners"
  ON public.withdrawal_partners FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for savings_purchases
CREATE POLICY "Users can create savings purchases"
  ON public.savings_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own savings purchases"
  ON public.savings_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own savings purchases"
  ON public.savings_purchases FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Partners can view assigned savings"
  ON public.savings_purchases FOR SELECT
  USING (
    partner_id IN (
      SELECT id FROM public.withdrawal_partners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Partners can update assigned savings"
  ON public.savings_purchases FOR UPDATE
  USING (
    partner_id IN (
      SELECT id FROM public.withdrawal_partners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all savings"
  ON public.savings_purchases FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for savings_payments
CREATE POLICY "Users can create payments"
  ON public.savings_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own payments"
  ON public.savings_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Partners can view payments for their savings"
  ON public.savings_payments FOR SELECT
  USING (
    savings_id IN (
      SELECT id FROM public.savings_purchases 
      WHERE partner_id IN (
        SELECT id FROM public.withdrawal_partners WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can view all payments"
  ON public.savings_payments FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_savings_purchases_user_id ON public.savings_purchases(user_id);
CREATE INDEX idx_savings_purchases_partner_id ON public.savings_purchases(partner_id);
CREATE INDEX idx_savings_purchases_status ON public.savings_purchases(status);
CREATE INDEX idx_savings_payments_savings_id ON public.savings_payments(savings_id);
CREATE INDEX idx_withdrawal_partners_region ON public.withdrawal_partners(region);

-- Function to generate unique withdrawal code
CREATE OR REPLACE FUNCTION generate_withdrawal_code()
RETURNS text AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := 'WD' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.savings_purchases WHERE withdrawal_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update amount_saved and generate withdrawal code
CREATE OR REPLACE FUNCTION update_savings_on_payment()
RETURNS trigger AS $$
BEGIN
  -- Update total amount saved
  UPDATE public.savings_purchases
  SET amount_saved = amount_saved + NEW.amount,
      updated_at = now()
  WHERE id = NEW.savings_id;
  
  -- Check if 100% reached and generate withdrawal code
  UPDATE public.savings_purchases
  SET status = 'completed',
      withdrawal_code = generate_withdrawal_code(),
      updated_at = now()
  WHERE id = NEW.savings_id
    AND amount_saved >= total_price
    AND status = 'in_progress';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_savings_on_payment
  AFTER INSERT ON public.savings_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_savings_on_payment();

-- Trigger to update updated_at
CREATE TRIGGER update_savings_purchases_updated_at
  BEFORE UPDATE ON public.savings_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_withdrawal_partners_updated_at
  BEFORE UPDATE ON public.withdrawal_partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();