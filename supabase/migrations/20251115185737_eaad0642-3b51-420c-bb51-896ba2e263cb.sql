-- Fix by dropping and recreating the view to add created_at
DROP VIEW IF EXISTS public.users_with_roles;

CREATE VIEW public.users_with_roles AS
SELECT 
  p.id,
  p.full_name,
  p.phone,
  p.referral_code,
  p.created_at,
  COALESCE(
    json_agg(
      json_build_object('role', ur.role, 'access_level', ur.access_level)
    ) FILTER (WHERE ur.role IS NOT NULL),
    '[]'::json
  ) AS roles,
  COALESCE(MAX(ur.access_level), 0) AS max_access_level
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.full_name, p.phone, p.referral_code, p.created_at;

-- Re-create permissions tables and policies (idempotent)
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  action text NOT NULL,
  name text NOT NULL,
  description text,
  UNIQUE(module, action)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE(role, permission_id)
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'permissions' AND policyname = 'permissions_read'
  ) THEN
    CREATE POLICY "permissions_read" ON public.permissions
    FOR SELECT TO authenticated
    USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'permissions' AND policyname = 'permissions_admin_manage'
  ) THEN
    CREATE POLICY "permissions_admin_manage" ON public.permissions
    FOR ALL TO authenticated
    USING (public.has_access_level(auth.uid(), 90) OR public.is_super_admin())
    WITH CHECK (public.has_access_level(auth.uid(), 90) OR public.is_super_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_permissions' AND policyname = 'role_permissions_read'
  ) THEN
    CREATE POLICY "role_permissions_read" ON public.role_permissions
    FOR SELECT TO authenticated
    USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_permissions' AND policyname = 'role_permissions_admin_manage'
  ) THEN
    CREATE POLICY "role_permissions_admin_manage" ON public.role_permissions
    FOR ALL TO authenticated
    USING (public.has_access_level(auth.uid(), 90) OR public.is_super_admin())
    WITH CHECK (public.has_access_level(auth.uid(), 90) OR public.is_super_admin());
  END IF;
END $$;

-- Functions for permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE(module text, action text, name text, description text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT p.module, p.action, p.name, p.description
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON rp.role = ur.role
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = _user_id
  GROUP BY p.module, p.action, p.name, p.description
$$;

CREATE OR REPLACE FUNCTION public.get_role_permissions(_role public.app_role)
RETURNS TABLE(module text, action text, name text, description text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT p.module, p.action, p.name, p.description
  FROM public.role_permissions rp
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE rp.role = _role
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id
      AND p.module = _module
      AND p.action = _action
  )
$$;