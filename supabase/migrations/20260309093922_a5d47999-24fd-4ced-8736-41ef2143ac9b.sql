-- Enterprise/Business Directory Module
CREATE TABLE IF NOT EXISTS public.enterprises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  banner_url text,
  video_url text,
  description text,
  short_description text,
  category text DEFAULT 'general',
  address text,
  city text,
  country text DEFAULT 'Cameroun',
  phone text,
  email text,
  website text,
  latitude double precision,
  longitude double precision,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  branding_color text DEFAULT '#2563eb',
  opening_hours jsonb,
  social_links jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enterprise_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid REFERENCES public.enterprises(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  caption text,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enterprise_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid REFERENCES public.enterprises(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  price numeric(15,2) NOT NULL DEFAULT 0,
  image_url text,
  category text DEFAULT 'general',
  is_active boolean DEFAULT true,
  is_service boolean DEFAULT false,
  stock int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enterprise_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid REFERENCES public.enterprises(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.enterprise_products(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  quantity int DEFAULT 1,
  total_amount numeric(15,2) NOT NULL,
  status text DEFAULT 'pending',
  payment_method text DEFAULT 'wallet',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enterprise_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid REFERENCES public.enterprises(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  appointment_code text UNIQUE NOT NULL,
  product_id uuid REFERENCES public.enterprise_products(id) ON DELETE SET NULL,
  appointment_date timestamptz NOT NULL,
  status text DEFAULT 'scheduled',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enterprise_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid REFERENCES public.enterprises(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  rating int,
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.enterprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active enterprises" ON public.enterprises FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage enterprises" ON public.enterprises FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80));

CREATE POLICY "Anyone can view enterprise photos" ON public.enterprise_photos FOR SELECT USING (true);
CREATE POLICY "Admins manage enterprise photos" ON public.enterprise_photos FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80));

CREATE POLICY "Anyone can view active products" ON public.enterprise_products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage enterprise products" ON public.enterprise_products FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80));

CREATE POLICY "Users view own orders" ON public.enterprise_orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_access_level(auth.uid(), 80));
CREATE POLICY "Users create orders" ON public.enterprise_orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage orders" ON public.enterprise_orders FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80));

CREATE POLICY "Users view own appointments" ON public.enterprise_appointments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_access_level(auth.uid(), 80));
CREATE POLICY "Users create appointments" ON public.enterprise_appointments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage appointments" ON public.enterprise_appointments FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80));

CREATE POLICY "Anyone can view reviews" ON public.enterprise_reviews FOR SELECT USING (true);
CREATE POLICY "Users create reviews" ON public.enterprise_reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.product_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  quantity int DEFAULT 1,
  status text DEFAULT 'pending',
  reservation_code text UNIQUE NOT NULL,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own reservations" ON public.product_reservations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users create reservations" ON public.product_reservations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.generate_appointment_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := 'RDV' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.enterprise_appointments WHERE appointment_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_reservation_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := 'RSV' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.product_reservations WHERE reservation_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;