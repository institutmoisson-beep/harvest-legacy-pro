-- Fix Security Issues: Remove auth.users exposure from view
-- Drop existing view
DROP VIEW IF EXISTS public.users_with_roles;

-- Recreate view without exposing auth.users sensitive data
CREATE OR REPLACE VIEW public.users_with_roles AS
SELECT 
  p.id,
  p.full_name,
  p.phone,
  p.referral_code,
  p.created_at,
  p.career_level,
  COALESCE(
    json_agg(
      json_build_object(
        'role', ur.role,
        'access_level', ur.access_level
      )
    ) FILTER (WHERE ur.role IS NOT NULL),
    '[]'::json
  ) as roles,
  COALESCE(MAX(ur.access_level), 0) as max_access_level
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
GROUP BY p.id, p.full_name, p.phone, p.referral_code, p.created_at, p.career_level;

-- Create secure function for admins to get user details including auth data
CREATE OR REPLACE FUNCTION public.get_user_admin_details(_user_id uuid)
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  phone text,
  referral_code text,
  created_at timestamptz,
  banned_until timestamptz,
  confirmed_at timestamptz,
  roles json,
  max_access_level int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND access_level >= 90
  ) THEN
    RAISE EXCEPTION 'Accès refusé: Seuls les administrateurs peuvent accéder à ces informations';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    u.email,
    p.full_name,
    p.phone,
    p.referral_code,
    p.created_at,
    u.banned_until,
    u.confirmed_at,
    COALESCE(
      json_agg(
        json_build_object(
          'role', ur.role,
          'access_level', ur.access_level
        )
      ) FILTER (WHERE ur.role IS NOT NULL),
      '[]'::json
    ) as roles,
    COALESCE(MAX(ur.access_level), 0) as max_access_level
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  LEFT JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE p.id = _user_id
  GROUP BY p.id, u.email, p.full_name, p.phone, p.referral_code, p.created_at, u.banned_until, u.confirmed_at;
END;
$$;

-- Create function to list all users for admins
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  phone text,
  referral_code text,
  created_at timestamptz,
  banned_until timestamptz,
  confirmed_at timestamptz,
  roles json,
  max_access_level int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND access_level >= 90
  ) THEN
    RAISE EXCEPTION 'Accès refusé: Seuls les administrateurs peuvent accéder à ces informations';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    u.email,
    p.full_name,
    p.phone,
    p.referral_code,
    p.created_at,
    u.banned_until,
    u.confirmed_at,
    COALESCE(
      json_agg(
        json_build_object(
          'role', ur.role,
          'access_level', ur.access_level
        )
      ) FILTER (WHERE ur.role IS NOT NULL),
      '[]'::json
    ) as roles,
    COALESCE(MAX(ur.access_level), 0) as max_access_level
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  LEFT JOIN public.user_roles ur ON p.id = ur.user_id
  GROUP BY p.id, u.email, p.full_name, p.phone, p.referral_code, p.created_at, u.banned_until, u.confirmed_at
  ORDER BY p.created_at DESC;
END;
$$;