-- Enable RLS on shop tables (safe if already enabled)
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

-- Unique slug (only when present)
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_settings_slug_unique
ON public.shop_settings(shop_url_slug)
WHERE shop_url_slug IS NOT NULL;

-- Policies for shop_settings
DROP POLICY IF EXISTS "Public can view active shops" ON public.shop_settings;
CREATE POLICY "Public can view active shops"
ON public.shop_settings
FOR SELECT
USING (active = true);

DROP POLICY IF EXISTS "Users can insert own shop" ON public.shop_settings;
CREATE POLICY "Users can insert own shop"
ON public.shop_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own shop" ON public.shop_settings;
CREATE POLICY "Users can update own shop"
ON public.shop_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Policies for shop_products
DROP POLICY IF EXISTS "Public can view approved active products" ON public.shop_products;
CREATE POLICY "Public can view approved active products"
ON public.shop_products
FOR SELECT
USING (is_active = true AND is_approved = true);

DROP POLICY IF EXISTS "Owners can view all their products" ON public.shop_products;
CREATE POLICY "Owners can view all their products"
ON public.shop_products
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.shop_settings ss
  WHERE ss.id = shop_products.shop_id AND ss.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Owners can insert products" ON public.shop_products;
CREATE POLICY "Owners can insert products"
ON public.shop_products
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.shop_settings ss
  WHERE ss.id = shop_products.shop_id AND ss.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Owners can update products" ON public.shop_products;
CREATE POLICY "Owners can update products"
ON public.shop_products
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.shop_settings ss
  WHERE ss.id = shop_products.shop_id AND ss.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Owners can delete products" ON public.shop_products;
CREATE POLICY "Owners can delete products"
ON public.shop_products
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.shop_settings ss
  WHERE ss.id = shop_products.shop_id AND ss.user_id = auth.uid()
));

-- Policies for shop_orders
DROP POLICY IF EXISTS "Public can create orders" ON public.shop_orders;
CREATE POLICY "Public can create orders"
ON public.shop_orders
FOR INSERT
WITH CHECK (
  (order_status IS NULL OR order_status = 'pending')
  AND product_id IS NOT NULL
  AND shop_id IS NOT NULL
  AND quantity IS NOT NULL AND quantity > 0
  AND shop_id = (SELECT sp.shop_id FROM public.shop_products sp WHERE sp.id = shop_orders.product_id)
  AND EXISTS (
    SELECT 1 FROM public.shop_products sp
    WHERE sp.id = shop_orders.product_id AND sp.is_active = true AND sp.is_approved = true
  )
  AND EXISTS (
    SELECT 1 FROM public.shop_settings ss
    WHERE ss.id = shop_orders.shop_id AND ss.active = true
  )
);

DROP POLICY IF EXISTS "Owners can view orders" ON public.shop_orders;
CREATE POLICY "Owners can view orders"
ON public.shop_orders
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.shop_settings ss
  WHERE ss.id = shop_orders.shop_id AND ss.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Owners can update orders" ON public.shop_orders;
CREATE POLICY "Owners can update orders"
ON public.shop_orders
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.shop_settings ss
  WHERE ss.id = shop_orders.shop_id AND ss.user_id = auth.uid()
));