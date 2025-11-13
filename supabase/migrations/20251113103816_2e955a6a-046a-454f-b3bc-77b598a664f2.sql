-- Add merchant role to app_role enum if not exists
DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'merchant';
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'agent';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create fund_withdrawals table for Moissonneur Fund withdrawal history
CREATE TABLE IF NOT EXISTS public.fund_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric NOT NULL CHECK (amount > 0),
  reason text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create delivery_providers table
CREATE TABLE IF NOT EXISTS public.delivery_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_key text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Update shop_settings to use correct column names
ALTER TABLE public.shop_settings 
  DROP COLUMN IF EXISTS owner_id,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

ALTER TABLE public.shop_settings 
  DROP COLUMN IF EXISTS slug,
  ADD COLUMN IF NOT EXISTS shop_url_slug text UNIQUE;

-- Update shop_products columns
ALTER TABLE public.shop_products 
  DROP COLUMN IF EXISTS approved,
  ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Update shop_orders columns
ALTER TABLE public.shop_orders 
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS amount,
  ADD COLUMN IF NOT EXISTS order_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS total_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS buyer_name text,
  ADD COLUMN IF NOT EXISTS buyer_phone text;

-- Update merchants table
ALTER TABLE public.merchants 
  ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0;

-- Update crypto_payment_settings
ALTER TABLE public.crypto_payment_settings
  DROP COLUMN IF EXISTS admin_key,
  ADD COLUMN IF NOT EXISTS api_key text;

-- Enable RLS on all tables
ALTER TABLE public.fund_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_qr_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fund_withdrawals
CREATE POLICY "Everyone can view fund withdrawals"
  ON public.fund_withdrawals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can create fund withdrawals"
  ON public.fund_withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for treasury
CREATE POLICY "Admins can view treasury"
  ON public.treasury FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update treasury"
  ON public.treasury FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for crypto_payment_settings
CREATE POLICY "Admins can manage crypto settings"
  ON public.crypto_payment_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active crypto settings"
  ON public.crypto_payment_settings FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for crypto_addresses
CREATE POLICY "Admins can manage crypto addresses"
  ON public.crypto_addresses FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view crypto addresses"
  ON public.crypto_addresses FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for merchants
CREATE POLICY "Admins can manage merchants"
  ON public.merchants FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can view own data"
  ON public.merchants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Merchants can update own data"
  ON public.merchants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for merchant_agents
CREATE POLICY "Admins can manage merchant agents"
  ON public.merchant_agents FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can manage their agents"
  ON public.merchant_agents FOR ALL
  TO authenticated
  USING (merchant_id IN (
    SELECT id FROM public.merchants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Agents can view own data"
  ON public.merchant_agents FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- RLS Policies for agent_commissions
CREATE POLICY "Admins can view all agent commissions"
  ON public.agent_commissions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can view their agents commissions"
  ON public.agent_commissions FOR SELECT
  TO authenticated
  USING (agent_id IN (
    SELECT id FROM public.merchant_agents 
    WHERE merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = auth.uid()
    )
  ));

-- RLS Policies for shop_settings
CREATE POLICY "Users can create own shop"
  ON public.shop_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own shop"
  ON public.shop_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own shop"
  ON public.shop_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view active shops"
  ON public.shop_settings FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Admins can manage all shops"
  ON public.shop_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for shop_products
CREATE POLICY "Shop owners can manage their products"
  ON public.shop_products FOR ALL
  TO authenticated
  USING (shop_id IN (
    SELECT id FROM public.shop_settings WHERE user_id = auth.uid()
  ));

CREATE POLICY "Everyone can view approved products"
  ON public.shop_products FOR SELECT
  TO authenticated
  USING (is_approved = true AND is_active = true);

CREATE POLICY "Admins can manage all products"
  ON public.shop_products FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for shop_orders
CREATE POLICY "Shop owners can view their orders"
  ON public.shop_orders FOR SELECT
  TO authenticated
  USING (shop_id IN (
    SELECT id FROM public.shop_settings WHERE user_id = auth.uid()
  ));

CREATE POLICY "Shop owners can update their orders"
  ON public.shop_orders FOR UPDATE
  TO authenticated
  USING (shop_id IN (
    SELECT id FROM public.shop_settings WHERE user_id = auth.uid()
  ));

CREATE POLICY "Buyers can view own orders"
  ON public.shop_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Anyone can create orders"
  ON public.shop_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage all orders"
  ON public.shop_orders FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for delivery_providers
CREATE POLICY "Admins can manage delivery providers"
  ON public.delivery_providers FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active providers"
  ON public.delivery_providers FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shop_orders_shop_id ON public.shop_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_buyer_id ON public.shop_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_shop_products_shop_id ON public.shop_products(shop_id);
CREATE INDEX IF NOT EXISTS idx_merchant_agents_merchant_id ON public.merchant_agents(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON public.merchants(user_id);

-- Create trigger to update treasury on transactions
CREATE OR REPLACE FUNCTION update_treasury_on_fee()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.treasury
  SET amount = amount + NEW.commission_amount,
      last_updated = now()
  WHERE id = 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER treasury_update_trigger
  AFTER INSERT ON public.agent_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_treasury_on_fee();

-- Initialize treasury if not exists
INSERT INTO public.treasury (id, name, amount)
VALUES (1, 'Caisse principale', 0)
ON CONFLICT (id) DO NOTHING;