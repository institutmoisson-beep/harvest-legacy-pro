-- Attribuer le rôle Super Admin à l'email spécifique
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Trouver l'utilisateur avec cet email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'picelvus@gmail.com'
  LIMIT 1;
  
  -- Si l'utilisateur existe
  IF v_user_id IS NOT NULL THEN
    -- Supprimer les anciens rôles pour éviter les conflits
    DELETE FROM public.user_roles
    WHERE user_id = v_user_id;
    
    -- Attribuer le rôle admin (niveau 100)
    INSERT INTO public.user_roles (user_id, role, access_level)
    VALUES (v_user_id, 'admin', 100)
    ON CONFLICT (user_id, role) DO UPDATE
    SET access_level = 100;
    
    RAISE NOTICE 'Super Admin attribué à l''utilisateur %', v_user_id;
  ELSE
    RAISE NOTICE 'Utilisateur avec email picelvus@gmail.com non trouvé';
  END IF;
END $$;

-- Créer une fonction pour vérifier et maintenir le Super Admin
CREATE OR REPLACE FUNCTION public.ensure_super_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Trouver le Super Admin
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'picelvus@gmail.com'
  LIMIT 1;
  
  -- Si l'utilisateur existe et n'a pas le rôle admin
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, access_level)
    VALUES (v_user_id, 'admin', 100)
    ON CONFLICT (user_id, role) DO UPDATE
    SET access_level = 100;
  END IF;
END;
$$;

-- Créer un trigger pour s'assurer que le Super Admin garde toujours son rôle
CREATE OR REPLACE FUNCTION public.protect_super_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_admin_id uuid;
BEGIN
  -- Trouver l'ID du Super Admin
  SELECT id INTO v_super_admin_id
  FROM auth.users
  WHERE email = 'picelvus@gmail.com'
  LIMIT 1;
  
  -- Empêcher la suppression ou modification du rôle admin du Super Admin
  IF OLD.user_id = v_super_admin_id AND OLD.role = 'admin' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Impossible de supprimer le rôle du Super Administrateur';
    ELSIF TG_OP = 'UPDATE' AND (NEW.role != 'admin' OR NEW.access_level < 100) THEN
      RAISE EXCEPTION 'Impossible de modifier le rôle du Super Administrateur';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger de protection
DROP TRIGGER IF EXISTS protect_super_admin_role ON public.user_roles;
CREATE TRIGGER protect_super_admin_role
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_super_admin();

-- Créer une vue pour identifier facilement le Super Admin
CREATE OR REPLACE VIEW public.super_admin_info AS
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  ur.role,
  ur.access_level,
  p.full_name,
  p.phone,
  p.referral_code
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'picelvus@gmail.com';

-- Grant access to the view
GRANT SELECT ON public.super_admin_info TO authenticated;

COMMENT ON VIEW public.super_admin_info IS 'Vue pour visualiser les informations du Super Administrateur principal';