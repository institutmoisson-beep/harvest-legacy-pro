
-- 1. Fix active_locations: restrict SELECT to own location only (delivery features use edge functions)
DROP POLICY IF EXISTS "Users can view active locations near them" ON public.active_locations;
CREATE POLICY "Users can view own location" ON public.active_locations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Allow admins to view all locations for delivery management
CREATE POLICY "Admins can view all locations" ON public.active_locations
  FOR SELECT TO authenticated USING (has_access_level(auth.uid(), 80));

-- 2. Fix crypto_payment_settings: don't expose api_key to everyone
DROP POLICY IF EXISTS "Everyone can view active crypto settings" ON public.crypto_payment_settings;
CREATE POLICY "Users can view active crypto settings" ON public.crypto_payment_settings
  FOR SELECT TO authenticated USING (is_active = true);

-- 3. Fix tontine_participants: restrict to participants of the same tontine
DROP POLICY IF EXISTS "tontine_participants_select" ON public.tontine_participants;
CREATE POLICY "tontine_participants_select" ON public.tontine_participants
  FOR SELECT TO public USING (
    auth.uid() = user_id
    OR tontine_id IN (
      SELECT tontine_id FROM public.tontine_participants tp WHERE tp.user_id = auth.uid()
    )
    OR has_access_level(auth.uid(), 80)
  );

-- 4. Fix user_job_profiles: remove the overly broad public SELECT
DROP POLICY IF EXISTS "Users can view profiles with job domains" ON public.user_job_profiles;

-- 5. Fix delivery_packages: restrict system insert to service role only  
DROP POLICY IF EXISTS "System can create packages" ON public.delivery_packages;
CREATE POLICY "Authenticated users can create own packages" ON public.delivery_packages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);

-- 6. Fix shop_orders: tighten the authenticated INSERT  
DROP POLICY IF EXISTS "Anyone can create orders" ON public.shop_orders;

-- 7. Fix wallet_transactions received: don't filter on payment_method being null (confusing)
DROP POLICY IF EXISTS "Users can view received transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view received transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (auth.uid() = to_user_id);
