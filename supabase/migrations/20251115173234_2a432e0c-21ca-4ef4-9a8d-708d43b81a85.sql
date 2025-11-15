-- Fix policies to rely on access level >= 80 instead of a missing enum value

-- 1) Trigger function to auto-fill access_level from role
CREATE OR REPLACE FUNCTION public.set_user_role_access_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.access_level := public.get_role_access_level(NEW.role);
  RETURN NEW;
END;
$$;

-- Recreate trigger on user_roles
DROP TRIGGER IF EXISTS trg_set_user_role_access_level ON public.user_roles;
CREATE TRIGGER trg_set_user_role_access_level
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.set_user_role_access_level();

-- 2) View aggregating users with their roles and max access level
CREATE OR REPLACE VIEW public.users_with_roles AS
SELECT
  p.id AS id,
  p.full_name,
  p.referral_code,
  p.phone,
  p.created_at,
  COALESCE(
    json_agg(
      json_build_object(
        'role', ur.role,
        'access_level', COALESCE(ur.access_level, public.get_role_access_level(ur.role))
      )
      ORDER BY COALESCE(ur.access_level, public.get_role_access_level(ur.role)) DESC
    ) FILTER (WHERE ur.id IS NOT NULL),
    '[]'::json
  ) AS roles,
  COALESCE(MAX(COALESCE(ur.access_level, public.get_role_access_level(ur.role))), 0) AS max_access_level
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.full_name, p.referral_code, p.phone, p.created_at;

-- 3) Indexes to speed up common queries
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON public.commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

-- 4) Enable RLS and policies using access level check (>=80)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper predicate reused in USING/WITH CHECK
-- admins_or_high_level := admin role OR any role with access_level >= 80
DO $$ BEGIN
  CREATE POLICY "Admins can manage user roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND COALESCE(ur.access_level, public.get_role_access_level(ur.role)) >= 80
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND COALESCE(ur.access_level, public.get_role_access_level(ur.role)) >= 80
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND COALESCE(ur.access_level, public.get_role_access_level(ur.role)) >= 80
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
