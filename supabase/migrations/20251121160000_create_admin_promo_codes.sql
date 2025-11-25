-- Create admin_promo_codes table
CREATE TABLE IF NOT EXISTS public.admin_promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_percentage NUMERIC(5, 2),
  discount_amount NUMERIC(10, 2),
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_promo_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_promo_codes
CREATE POLICY "Everyone can view active promo codes"
ON public.admin_promo_codes FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage all promo codes"
ON public.admin_promo_codes FOR ALL
USING (has_access_level(auth.uid(), 90));

-- Create trigger for updated_at
CREATE TRIGGER trigger_admin_promo_codes_updated_at
BEFORE UPDATE ON public.admin_promo_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_promo_codes_code ON public.admin_promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_admin_promo_codes_is_active ON public.admin_promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_promo_codes_created_at ON public.admin_promo_codes(created_at DESC);
