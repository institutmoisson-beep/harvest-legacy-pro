-- Supprimer la vue problématique
DROP VIEW IF EXISTS public.super_admin_info;

-- Créer une fonction sécurisée pour vérifier si l'utilisateur courant est le Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_admin_email text := 'picelvus@gmail.com';
  v_user_email text;
BEGIN
  -- Récupérer l'email de l'utilisateur courant
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Vérifier si c'est le Super Admin
  RETURN v_user_email = v_super_admin_email;
END;
$$;

-- Créer une fonction pour obtenir les infos du Super Admin (accessible uniquement au Super Admin lui-même)
CREATE OR REPLACE FUNCTION public.get_super_admin_info()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  phone text,
  referral_code text,
  role app_role,
  access_level integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'utilisateur est bien le Super Admin
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Accès refusé: Seul le Super Administrateur peut accéder à ces informations';
  END IF;
  
  -- Retourner les informations
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    p.full_name,
    p.phone,
    p.referral_code,
    ur.role,
    ur.access_level
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  LEFT JOIN public.user_roles ur ON u.id = ur.user_id
  WHERE u.email = 'picelvus@gmail.com';
END;
$$;

-- Mettre à jour la fonction de protection du Super Admin pour utiliser l'email directement
CREATE OR REPLACE FUNCTION public.protect_super_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_admin_id uuid;
  v_is_protected boolean := false;
BEGIN
  -- Trouver l'ID du Super Admin
  SELECT id INTO v_super_admin_id
  FROM auth.users
  WHERE email = 'picelvus@gmail.com'
  LIMIT 1;
  
  -- Vérifier si c'est une opération sur le Super Admin
  v_is_protected := (OLD.user_id = v_super_admin_id AND OLD.role = 'admin' AND OLD.access_level = 100);
  
  -- Empêcher la suppression ou modification du rôle admin du Super Admin
  IF v_is_protected THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Impossible de supprimer le rôle du Super Administrateur (picelvus@gmail.com)';
      RETURN NULL;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.role != 'admin' OR NEW.access_level < 100 THEN
        RAISE EXCEPTION 'Impossible de réduire les privilèges du Super Administrateur (picelvus@gmail.com)';
      END IF;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.is_super_admin() IS 'Vérifie si l''utilisateur courant est le Super Administrateur principal';
COMMENT ON FUNCTION public.get_super_admin_info() IS 'Retourne les informations du Super Admin (accessible uniquement par le Super Admin lui-même)';
COMMENT ON FUNCTION public.protect_super_admin() IS 'Protège le rôle du Super Admin contre toute modification ou suppression';