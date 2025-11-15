-- Garantir que picelvus@gmail.com est le Super Administrateur avec accès total

-- 1. S'assurer que l'utilisateur existe et a un profil
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Trouver l'ID de l'utilisateur
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'picelvus@gmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Assurer le rôle admin avec niveau 100
    INSERT INTO public.user_roles (user_id, role, access_level)
    VALUES (v_user_id, 'admin', 100)
    ON CONFLICT (user_id, role) 
    DO UPDATE SET access_level = 100;

    RAISE NOTICE 'Super Admin configuré pour user_id: %', v_user_id;
  ELSE
    RAISE WARNING 'Utilisateur picelvus@gmail.com non trouvé - il doit créer un compte d''abord';
  END IF;
END $$;

-- 2. Créer une vue pour faciliter la vérification du statut Super Admin
CREATE OR REPLACE VIEW public.super_admin_status AS
SELECT 
  u.id,
  u.email::text as email,
  p.full_name,
  p.referral_code,
  ur.role,
  ur.access_level,
  CASE 
    WHEN u.email = 'picelvus@gmail.com' AND ur.access_level = 100 THEN true
    ELSE false
  END as is_super_admin
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'picelvus@gmail.com';