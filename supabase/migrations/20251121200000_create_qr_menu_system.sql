-- Create establishments table
CREATE TABLE IF NOT EXISTS public.establishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  establishment_type TEXT NOT NULL CHECK (establishment_type IN ('restaurant', 'maquis', 'boutique', 'cafe', 'bar', 'autre')),
  qr_code_slug TEXT UNIQUE NOT NULL,
  banner_image_url TEXT,
  logo_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  currency_code TEXT DEFAULT 'XAF',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create menu_categories table
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  image_url TEXT,
  image_path TEXT,
  display_order INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  preparation_time_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.qr_menu_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  delivery_address TEXT NOT NULL,
  order_notes TEXT,
  total_amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'orange_money', 'mtn', 'crypto')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  order_status TEXT NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled')),
  estimated_delivery_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.qr_menu_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.qr_menu_orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_menu_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_menu_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for establishments
CREATE POLICY "Anyone can view active establishments"
ON public.establishments FOR SELECT
USING (is_active = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own establishments"
ON public.establishments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own establishments"
ON public.establishments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own establishments"
ON public.establishments FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all establishments"
ON public.establishments FOR ALL
USING (has_access_level(auth.uid(), 90));

-- RLS Policies for menu_categories
CREATE POLICY "Anyone can view categories of active establishments"
ON public.menu_categories FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.establishments
    WHERE establishments.id = menu_categories.establishment_id
    AND (establishments.is_active = true OR auth.uid() = establishments.user_id)
  )
);

CREATE POLICY "Owners can create categories for their establishment"
ON public.menu_categories FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.establishments
    WHERE establishments.id = establishment_id
    AND establishments.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update their categories"
ON public.menu_categories FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.establishments
    WHERE establishments.id = establishment_id
    AND establishments.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can delete their categories"
ON public.menu_categories FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.establishments
    WHERE establishments.id = establishment_id
    AND establishments.user_id = auth.uid()
  )
);

-- RLS Policies for menu_items
CREATE POLICY "Anyone can view items of active establishments"
ON public.menu_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.establishments
    WHERE establishments.id = menu_items.establishment_id
    AND (establishments.is_active = true OR auth.uid() = establishments.user_id)
  )
);

CREATE POLICY "Owners can create items for their establishment"
ON public.menu_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.establishments
    WHERE establishments.id = establishment_id
    AND establishments.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update their items"
ON public.menu_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.establishments
    WHERE establishments.id = establishment_id
    AND establishments.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can delete their items"
ON public.menu_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.establishments
    WHERE establishments.id = establishment_id
    AND establishments.user_id = auth.uid()
  )
);

-- RLS Policies for qr_menu_orders
CREATE POLICY "Users can view their own orders"
ON public.qr_menu_orders FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = (SELECT user_id FROM public.establishments WHERE id = establishment_id));

CREATE POLICY "Anyone can create orders"
ON public.qr_menu_orders FOR INSERT
WITH CHECK (true);

CREATE POLICY "Establishment owners can update orders"
ON public.qr_menu_orders FOR UPDATE
USING (auth.uid() = (SELECT user_id FROM public.establishments WHERE id = establishment_id));

CREATE POLICY "Admins can manage all orders"
ON public.qr_menu_orders FOR ALL
USING (has_access_level(auth.uid(), 90));

-- RLS Policies for qr_menu_order_items
CREATE POLICY "Users can view their order items"
ON public.qr_menu_order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.qr_menu_orders
    WHERE qr_menu_orders.id = qr_menu_order_items.order_id
    AND (auth.uid() = user_id OR auth.uid() = (SELECT user_id FROM public.establishments WHERE id = establishment_id))
  )
);

CREATE POLICY "Anyone can create order items"
ON public.qr_menu_order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.qr_menu_orders
    WHERE qr_menu_orders.id = order_id
  )
);

-- Triggers for updated_at
CREATE TRIGGER trigger_establishments_updated_at
BEFORE UPDATE ON public.establishments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_menu_categories_updated_at
BEFORE UPDATE ON public.menu_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_menu_items_updated_at
BEFORE UPDATE ON public.menu_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_qr_menu_orders_updated_at
BEFORE UPDATE ON public.qr_menu_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_establishments_user_id ON public.establishments(user_id);
CREATE INDEX idx_establishments_qr_code_slug ON public.establishments(qr_code_slug);
CREATE INDEX idx_establishments_is_active ON public.establishments(is_active);
CREATE INDEX idx_menu_categories_establishment_id ON public.menu_categories(establishment_id);
CREATE INDEX idx_menu_items_establishment_id ON public.menu_items(establishment_id);
CREATE INDEX idx_menu_items_category_id ON public.menu_items(category_id);
CREATE INDEX idx_qr_menu_orders_establishment_id ON public.qr_menu_orders(establishment_id);
CREATE INDEX idx_qr_menu_orders_user_id ON public.qr_menu_orders(user_id);
CREATE INDEX idx_qr_menu_orders_status ON public.qr_menu_orders(order_status);
CREATE INDEX idx_qr_menu_order_items_order_id ON public.qr_menu_order_items(order_id);

-- Create storage bucket for menu item images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('menu-images', 'menu-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for menu images
CREATE POLICY "Anyone can view menu images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'menu-images');

CREATE POLICY "Establishment owners can upload menu images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'menu-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners can delete their menu images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'menu-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
