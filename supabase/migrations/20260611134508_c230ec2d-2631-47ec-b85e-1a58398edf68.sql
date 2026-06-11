
-- 1) call_center_agents self-read
CREATE POLICY "Agents can view own record"
  ON public.call_center_agents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2) credit_repayments: restrict insert
DROP POLICY IF EXISTS "System can create repayments" ON public.credit_repayments;
CREATE POLICY "Users can create repayments for own credits"
  ON public.credit_repayments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.credits c
      WHERE c.id = credit_repayments.credit_id
        AND c.user_id = auth.uid()
    )
  );

-- 3) profiles PII hardening
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, full_name, avatar_url, referral_code, referred_by,
  binary_position, binary_parent_id, created_at, updated_at,
  career_level, career_level_updated_at, id_verified,
  preferred_currency, id_moissonneur, est_souverain
) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM public.profiles WHERE id = auth.uid(); $$;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

CREATE OR REPLACE VIEW public.referral_profiles
WITH (security_invoker = true) AS
SELECT id, full_name, avatar_url, referral_code, id_moissonneur,
       est_souverain, career_level, created_at
FROM public.profiles;
GRANT SELECT ON public.referral_profiles TO authenticated;

-- 4) transport_drivers column hardening
REVOKE SELECT ON public.transport_drivers FROM anon, authenticated;
GRANT SELECT (
  id, user_id, full_name, photo_url, rating, total_rides,
  status, current_latitude, current_longitude, last_location_update,
  is_approved, approved_at, created_at, updated_at, license_expiry
) ON public.transport_drivers TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_driver_full(_driver_id uuid)
RETURNS SETOF public.transport_drivers
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.transport_drivers
  WHERE id = _driver_id
    AND (has_access_level(auth.uid(), 80) OR user_id = auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_driver_full(uuid) TO authenticated;

-- 5) transport_vehicles column hardening
REVOKE SELECT ON public.transport_vehicles FROM anon, authenticated;
GRANT SELECT (
  id, driver_id, vehicle_type, service_class, brand, model,
  color, year, vehicle_photo_url, is_active, created_at, updated_at
) ON public.transport_vehicles TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_vehicle_full(_vehicle_id uuid)
RETURNS SETOF public.transport_vehicles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT v.* FROM public.transport_vehicles v
  WHERE v.id = _vehicle_id
    AND (
      has_access_level(auth.uid(), 80)
      OR EXISTS (
        SELECT 1 FROM public.transport_drivers d
        WHERE d.id = v.driver_id AND d.user_id = auth.uid()
      )
    );
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_vehicle_full(uuid) TO authenticated;

-- 6) user_credit_profiles insert restriction
DROP POLICY IF EXISTS "System can create profiles" ON public.user_credit_profiles;
CREATE POLICY "Users can create own credit profile"
  ON public.user_credit_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
