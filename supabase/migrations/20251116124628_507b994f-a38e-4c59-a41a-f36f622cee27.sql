-- Fix get_all_users_admin function return type
DROP FUNCTION IF EXISTS public.get_all_users_admin();

CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE(
  id UUID,
  email VARCHAR(255),
  full_name TEXT,
  phone TEXT,
  referral_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  banned_until TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  roles JSON,
  max_access_level INTEGER
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    u.email::VARCHAR(255),
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
$function$;

-- Also fix get_user_admin_details for consistency
DROP FUNCTION IF EXISTS public.get_user_admin_details(UUID);

CREATE OR REPLACE FUNCTION public.get_user_admin_details(_user_id UUID)
RETURNS TABLE(
  id UUID,
  email VARCHAR(255),
  full_name TEXT,
  phone TEXT,
  referral_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  banned_until TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  roles JSON,
  max_access_level INTEGER
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    u.email::VARCHAR(255),
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
$function$;