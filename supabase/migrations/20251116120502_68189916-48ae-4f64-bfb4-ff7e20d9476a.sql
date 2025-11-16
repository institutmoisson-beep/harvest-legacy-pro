-- Fix users_with_roles view to include created_at from profiles
DROP VIEW IF EXISTS public.users_with_roles;

CREATE VIEW public.users_with_roles AS
SELECT 
  p.id,
  p.full_name,
  p.referral_code,
  p.phone,
  p.created_at,
  u.email,
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
  ) AS roles,
  COALESCE(MAX(ur.access_level), 0) AS max_access_level
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.full_name, p.referral_code, p.phone, p.created_at, u.email, u.banned_until, u.confirmed_at;

-- Add RLS policy for admins to manage user status
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND access_level >= 90
  )
);

-- Create function to suspend user account
CREATE OR REPLACE FUNCTION public.suspend_user_account(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND access_level >= 90
  ) THEN
    RAISE EXCEPTION 'Accès refusé: Seuls les administrateurs peuvent suspendre des comptes';
  END IF;

  -- Update banned_until in auth.users
  UPDATE auth.users
  SET banned_until = NOW() + (p_days || ' days')::INTERVAL
  WHERE id = p_user_id;
END;
$$;

-- Create function to activate user account
CREATE OR REPLACE FUNCTION public.activate_user_account(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND access_level >= 90
  ) THEN
    RAISE EXCEPTION 'Accès refusé: Seuls les administrateurs peuvent activer des comptes';
  END IF;

  -- Remove ban
  UPDATE auth.users
  SET banned_until = NULL
  WHERE id = p_user_id;
END;
$$;

-- Create function to delete user completely
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND access_level >= 90
  ) THEN
    RAISE EXCEPTION 'Accès refusé: Seuls les administrateurs peuvent supprimer des comptes';
  END IF;

  -- Prevent deleting super admin
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id AND email = 'picelvus@gmail.com'
  ) THEN
    RAISE EXCEPTION 'Impossible de supprimer le compte Super Administrateur';
  END IF;

  -- Delete from auth.users (cascade will handle related records)
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;