-- Create menu_categories table
CREATE TABLE public.menu_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create qr_menu_orders table
CREATE TABLE public.qr_menu_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  table_number TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create qr_menu_order_items table
CREATE TABLE public.qr_menu_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.qr_menu_orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_menu_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_menu_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for menu_categories
CREATE POLICY "Public can view active categories"
ON public.menu_categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can manage categories"
ON public.menu_categories FOR ALL
USING (establishment_id IN (SELECT id FROM public.establishments WHERE user_id = auth.uid()));

-- RLS Policies for menu_items
CREATE POLICY "Public can view available items"
ON public.menu_items FOR SELECT
USING (is_available = true);

CREATE POLICY "Owners can manage items"
ON public.menu_items FOR ALL
USING (category_id IN (
  SELECT mc.id FROM public.menu_categories mc
  JOIN public.establishments e ON mc.establishment_id = e.id
  WHERE e.user_id = auth.uid()
));

-- RLS Policies for qr_menu_orders
CREATE POLICY "Public can create orders"
ON public.qr_menu_orders FOR INSERT
WITH CHECK (true);

CREATE POLICY "Owners can view orders"
ON public.qr_menu_orders FOR SELECT
USING (establishment_id IN (SELECT id FROM public.establishments WHERE user_id = auth.uid()));

CREATE POLICY "Owners can update orders"
ON public.qr_menu_orders FOR UPDATE
USING (establishment_id IN (SELECT id FROM public.establishments WHERE user_id = auth.uid()));

-- RLS Policies for qr_menu_order_items
CREATE POLICY "Public can create order items"
ON public.qr_menu_order_items FOR INSERT
WITH CHECK (true);

CREATE POLICY "Owners can view order items"
ON public.qr_menu_order_items FOR SELECT
USING (order_id IN (
  SELECT o.id FROM public.qr_menu_orders o
  JOIN public.establishments e ON o.establishment_id = e.id
  WHERE e.user_id = auth.uid()
));