-- Fix data visibility and restore Super Admin access (v2)
-- 1) Ensure RLS is enabled where needed (safe to run multiple times)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2) Profiles policies
DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
CREATE POLICY "profiles_self_select"
ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
CREATE POLICY "profiles_admin_select"
ON public.profiles
FOR SELECT TO authenticated
USING (public.has_access_level(auth.uid(), 80) OR public.is_super_admin());

-- 3) User roles policies
DROP POLICY IF EXISTS "user_roles_self_select" ON public.user_roles;
CREATE POLICY "user_roles_self_select"
ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_roles_admin_select" ON public.user_roles;
CREATE POLICY "user_roles_admin_select"
ON public.user_roles
FOR SELECT TO authenticated
USING (public.has_access_level(auth.uid(), 80) OR public.is_super_admin());

DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
CREATE POLICY "user_roles_admin_manage"
ON public.user_roles
FOR ALL TO authenticated
USING (public.has_access_level(auth.uid(), 80) OR public.is_super_admin())
WITH CHECK (public.has_access_level(auth.uid(), 80) OR public.is_super_admin());

-- 4) Restore/ensure Super Admin privileges
SELECT public.ensure_super_admin();
