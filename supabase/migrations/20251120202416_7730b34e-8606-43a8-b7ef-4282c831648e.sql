-- Create credit vendors table
CREATE TABLE IF NOT EXISTS public.credit_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  product_categories TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create credit products table
CREATE TABLE IF NOT EXISTS public.credit_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.credit_vendors(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('object', 'land', 'service')),
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user credit profiles table
CREATE TABLE IF NOT EXISTS public.user_credit_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  credit_score INTEGER DEFAULT 100,
  total_credits INTEGER DEFAULT 0,
  active_credits INTEGER DEFAULT 0,
  completed_credits INTEGER DEFAULT 0,
  defaulted_credits INTEGER DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create credits table
CREATE TABLE IF NOT EXISTS public.credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  product_type TEXT NOT NULL CHECK (product_type IN ('object', 'land', 'service')),
  total_price NUMERIC NOT NULL,
  down_payment NUMERIC DEFAULT 0,
  remaining_amount NUMERIC NOT NULL,
  payment_frequency TEXT NOT NULL CHECK (payment_frequency IN ('daily', 'every_2_days', 'weekly', 'monthly')),
  duration_months INTEGER NOT NULL,
  installment_amount NUMERIC NOT NULL,
  delivery_address TEXT,
  contract_pdf_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'completed', 'defaulted')),
  admin_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create credit repayments table
CREATE TABLE IF NOT EXISTS public.credit_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id UUID REFERENCES public.credits(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  amount_due NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  payment_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial')),
  penalty_amount NUMERIC DEFAULT 0,
  days_overdue INTEGER DEFAULT 0,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credit_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_repayments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit_vendors
CREATE POLICY "Vendors can view own profile"
ON public.credit_vendors FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage vendors"
ON public.credit_vendors FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for credit_products
CREATE POLICY "Everyone can view available products"
ON public.credit_products FOR SELECT
USING (is_available = true);

CREATE POLICY "Vendors can manage own products"
ON public.credit_products FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.credit_vendors cv
  WHERE cv.id = credit_products.vendor_id AND cv.user_id = auth.uid()
));

-- RLS Policies for user_credit_profiles
CREATE POLICY "Users can view own profile"
ON public.user_credit_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create profiles"
ON public.user_credit_profiles FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all profiles"
ON public.user_credit_profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update profiles"
ON public.user_credit_profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for credits
CREATE POLICY "Users can create own credits"
ON public.credits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own credits"
ON public.credits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all credits"
ON public.credits FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update credits"
ON public.credits FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for credit_repayments
CREATE POLICY "Users can view own repayments"
ON public.credit_repayments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.credits c
  WHERE c.id = credit_repayments.credit_id AND c.user_id = auth.uid()
));

CREATE POLICY "Admins can manage repayments"
ON public.credit_repayments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create repayments"
ON public.credit_repayments FOR INSERT
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_credits_user_id ON public.credits(user_id);
CREATE INDEX idx_credits_status ON public.credits(status);
CREATE INDEX idx_credit_repayments_credit_id ON public.credit_repayments(credit_id);
CREATE INDEX idx_credit_repayments_status ON public.credit_repayments(status);
CREATE INDEX idx_credit_repayments_due_date ON public.credit_repayments(due_date);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_credit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_credits_updated_at
BEFORE UPDATE ON public.credits
FOR EACH ROW
EXECUTE FUNCTION update_credit_updated_at();

CREATE TRIGGER update_credit_vendors_updated_at
BEFORE UPDATE ON public.credit_vendors
FOR EACH ROW
EXECUTE FUNCTION update_credit_updated_at();

CREATE TRIGGER update_user_credit_profiles_updated_at
BEFORE UPDATE ON public.user_credit_profiles
FOR EACH ROW
EXECUTE FUNCTION update_credit_updated_at();