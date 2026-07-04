
-- 1. crypto_addresses: restrict SELECT to owner + admins
DROP POLICY IF EXISTS "Users can view crypto addresses" ON public.crypto_addresses;
CREATE POLICY "Users can view own crypto addresses"
  ON public.crypto_addresses FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR has_role(auth.uid(), 'admin'::app_role));

-- 2. deliveries_driver_read: fix broken correlation
DROP POLICY IF EXISTS deliveries_driver_read ON public.deliveries;
CREATE POLICY deliveries_driver_read
  ON public.deliveries FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.delivery_assignments da
    WHERE da.delivery_id = deliveries.id AND da.driver_id = auth.uid()
  ));

-- 3. shop_orders: require buyer_id = auth.uid() on insert (or explicit guest with NULL buyer_id)
DROP POLICY IF EXISTS "Public can create orders" ON public.shop_orders;
CREATE POLICY "Users can create their own orders"
  ON public.shop_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id
    AND ((order_status IS NULL) OR (order_status = 'pending'))
    AND product_id IS NOT NULL
    AND shop_id IS NOT NULL
    AND quantity IS NOT NULL
    AND quantity > 0
    AND shop_id = (SELECT sp.shop_id FROM public.shop_products sp WHERE sp.id = shop_orders.product_id)
    AND EXISTS (SELECT 1 FROM public.shop_products sp WHERE sp.id = shop_orders.product_id AND sp.is_active = true AND sp.is_approved = true)
    AND EXISTS (SELECT 1 FROM public.shop_settings ss WHERE ss.id = shop_orders.shop_id AND ss.active = true)
  );
