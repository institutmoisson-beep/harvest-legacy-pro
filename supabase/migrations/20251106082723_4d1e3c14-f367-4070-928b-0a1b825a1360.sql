-- Table pour les contacts de paiement gérés par l'admin
CREATE TABLE IF NOT EXISTS public.payment_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method text NOT NULL,
  contact_number text NOT NULL,
  contact_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.payment_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active payment contacts"
  ON public.payment_contacts FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage payment contacts"
  ON public.payment_contacts FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Table pour le Fond Moissonneur
CREATE TABLE IF NOT EXISTS public.moissonneur_fund (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_amount numeric NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.moissonneur_fund ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view fund"
  ON public.moissonneur_fund FOR SELECT
  USING (true);

CREATE POLICY "Only admins can update fund"
  ON public.moissonneur_fund FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Initialiser le fond avec un seul enregistrement
INSERT INTO public.moissonneur_fund (total_amount) VALUES (0)
ON CONFLICT DO NOTHING;

-- Table pour les contributions au fond
CREATE TABLE IF NOT EXISTS public.fund_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.fund_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contributions"
  ON public.fund_contributions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create contributions"
  ON public.fund_contributions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all contributions"
  ON public.fund_contributions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Table pour le système "J'achète, Vous vendez pour moi"
CREATE TABLE IF NOT EXISTS public.investment_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid REFERENCES auth.users(id) NOT NULL,
  product_name text NOT NULL,
  investment_amount numeric NOT NULL,
  profit_percentage numeric DEFAULT 25, -- 1/4 du prix = 25%
  investor_share_percentage numeric DEFAULT 46,
  payout_frequency text NOT NULL, -- 'daily', 'two_days', 'weekly', 'two_weeks', 'monthly', 'two_months', 'six_months'
  total_profit numeric DEFAULT 0,
  investor_earnings numeric DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_payout_at timestamptz
);

ALTER TABLE public.investment_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investments"
  ON public.investment_products FOR SELECT
  USING (auth.uid() = investor_id);

CREATE POLICY "Users can create investments"
  ON public.investment_products FOR INSERT
  WITH CHECK (auth.uid() = investor_id);

CREATE POLICY "Admins can view all investments"
  ON public.investment_products FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update investments"
  ON public.investment_products FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Table pour les ventes réalisées sur les investissements
CREATE TABLE IF NOT EXISTS public.investment_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id uuid REFERENCES public.investment_products(id) NOT NULL,
  sale_amount numeric NOT NULL,
  profit_amount numeric NOT NULL,
  investor_earnings numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.investment_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investment sales"
  ON public.investment_sales FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.investment_products ip
    WHERE ip.id = investment_sales.investment_id
    AND ip.investor_id = auth.uid()
  ));

CREATE POLICY "Admins can manage investment sales"
  ON public.investment_sales FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Fonction pour mettre à jour automatiquement le grade
CREATE OR REPLACE FUNCTION public.auto_update_career_level()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id FROM public.profiles WHERE id IS NOT NULL
  LOOP
    PERFORM public.update_user_career_level(user_record.id);
  END LOOP;
END;
$$;

-- Trigger pour mettre à jour le fond après dépôt
CREATE OR REPLACE FUNCTION public.update_fund_on_deposit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.transaction_type = 'deposit' AND NEW.status = 'completed' THEN
    UPDATE public.moissonneur_fund
    SET total_amount = total_amount + NEW.amount,
        updated_at = now();
    
    INSERT INTO public.fund_contributions (user_id, amount)
    VALUES (NEW.from_user_id, NEW.amount);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_fund_on_deposit
  AFTER UPDATE ON public.wallet_transactions
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION public.update_fund_on_deposit();

-- Ajouter realtime pour les nouvelles tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.moissonneur_fund;
ALTER PUBLICATION supabase_realtime ADD TABLE public.investment_products;

-- Fonction pour calculer les gains d'investissement
CREATE OR REPLACE FUNCTION public.calculate_investment_earnings(
  p_sale_amount numeric,
  p_profit_percentage numeric,
  p_investor_share_percentage numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_sale_amount * (p_profit_percentage / 100) * (p_investor_share_percentage / 100));
$$;