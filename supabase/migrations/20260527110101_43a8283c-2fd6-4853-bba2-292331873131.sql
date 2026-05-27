
-- 1. Crypto payment settings: hide api_key column from clients
REVOKE SELECT (api_key) ON public.crypto_payment_settings FROM anon, authenticated;

-- 2. Delivery providers: hide api_key column from clients
REVOKE SELECT (api_key) ON public.delivery_providers FROM anon, authenticated;

-- 3. Payment methods: remove "USING true" public read and hide config column from clients
DROP POLICY IF EXISTS "Users can read payment methods" ON public.payment_methods;
-- Restrict remaining public SELECT to authenticated only
DROP POLICY IF EXISTS "Anyone can view active payment methods" ON public.payment_methods;
CREATE POLICY "Authenticated view active payment methods"
  ON public.payment_methods FOR SELECT TO authenticated
  USING (is_active = true);
REVOKE SELECT (config) ON public.payment_methods FROM anon, authenticated;

-- 4. user_roles: drop overly permissive policies — keep only self-select and super_admin manage
DROP POLICY IF EXISTS "Admins can manage user roles simple" ON public.user_roles;
DROP POLICY IF EXISTS "Admin full user roles access" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone authenticated can view roles" ON public.user_roles;

-- 5. Fix can_view_order logic bug — remove broker branch (already covered by policy USING auth.uid() = broker_id where applicable)
CREATE OR REPLACE FUNCTION public.can_view_order(_user_id uuid, _order_country text, _order_city text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_country_rep BOOLEAN;
  is_city_rep BOOLEAN;
BEGIN
  IF public.has_access_level(_user_id, 80) THEN
    RETURN TRUE;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.geographic_assignments
    WHERE user_id = _user_id
      AND assignment_type = 'country'
      AND country = _order_country
  ) INTO is_country_rep;
  IF is_country_rep THEN RETURN TRUE; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.geographic_assignments
    WHERE user_id = _user_id
      AND assignment_type = 'city'
      AND country = _order_country
      AND city = _order_city
  ) INTO is_city_rep;

  RETURN is_city_rep;
END;
$function$;

-- 6. Lock down write-all policies on goals / schedule tables
DROP POLICY IF EXISTS "System can manage goals" ON public.agent_monthly_goals;
DROP POLICY IF EXISTS "System can manage order goals" ON public.order_monthly_goals;
DROP POLICY IF EXISTS "System can insert schedule" ON public.tontine_payment_schedule;
DROP POLICY IF EXISTS "System can update schedule" ON public.tontine_payment_schedule;

-- (service_role still has full access via GRANT ALL; SECURITY DEFINER functions still work)

-- 7. delivery_packages: require authentication to view "available for delivery"
DROP POLICY IF EXISTS "Users can view available packages for delivery" ON public.delivery_packages;
CREATE POLICY "Authenticated can view available packages for delivery"
  ON public.delivery_packages FOR SELECT TO authenticated
  USING (delivery_method = 'community_delivery' AND status = 'pending' AND deliverer_id IS NULL);

-- 8. admin_promo_codes: restrict to authenticated
DROP POLICY IF EXISTS "Everyone can view active promo codes" ON public.admin_promo_codes;
CREATE POLICY "Authenticated view active promo codes"
  ON public.admin_promo_codes FOR SELECT TO authenticated
  USING (is_active = true);

-- 9. withdrawal_partners: restrict to authenticated
DROP POLICY IF EXISTS "Everyone can view active partners" ON public.withdrawal_partners;
CREATE POLICY "Authenticated view active partners"
  ON public.withdrawal_partners FOR SELECT TO authenticated
  USING (is_active = true);

-- 10. merchant_agents: drop password_hash column (auth must use Supabase Auth)
ALTER TABLE public.merchant_agents DROP COLUMN IF EXISTS password_hash;
