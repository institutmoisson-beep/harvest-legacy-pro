-- Add description column to shop_settings if not exists
ALTER TABLE public.shop_settings 
ADD COLUMN IF NOT EXISTS description text;

-- Add payment_link column for products
ALTER TABLE public.shop_products 
ADD COLUMN IF NOT EXISTS payment_link text;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shop_settings_user_id ON public.shop_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_settings_slug ON public.shop_settings(shop_url_slug);
CREATE INDEX IF NOT EXISTS idx_shop_products_shop_id ON public.shop_products(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_shop_id ON public.shop_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON public.shop_orders(order_status);