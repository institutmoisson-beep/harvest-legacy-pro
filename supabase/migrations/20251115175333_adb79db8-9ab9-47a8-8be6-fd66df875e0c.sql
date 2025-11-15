-- Re-apply without recursion: drop and recreate users_with_roles, fix user_roles policies safely
BEGIN;

-- Drop the view first to avoid column drop errors
DROP VIEW IF EXISTS public.users_with_roles;

-- Ensure RLS enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clean old policies on user_roles
DROP POLICY IF EXISTS "user_roles_admin_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_self_select" ON public.user_roles;

-- Safe policies (no recursion)
CREATE POLICY "user_roles_self_select"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_roles_super_admin_select"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "user_roles_super_admin_manage"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Profiles policies
DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
CREATE POLICY "profiles_self_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
CREATE POLICY "profiles_admin_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_super_admin() OR public.has_access_level(auth.uid(), 80));

-- Recreate users_with_roles view
CREATE VIEW public.users_with_roles AS
SELECT
  p.id,
  p.full_name,
  p.phone,
  p.referral_code,
  COALESCE(MAX(ur.access_level), 0) AS max_access_level,
  COALESCE(
    json_agg(
      json_build_object(
        'role', ur.role,
        'access_level', ur.access_level
      )
    ) FILTER (WHERE ur.role IS NOT NULL),
    '[]'::json
  ) AS roles
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.full_name, p.phone, p.referral_code;

-- Ensure Super Admin privileges
SELECT public.ensure_super_admin();

COMMIT;