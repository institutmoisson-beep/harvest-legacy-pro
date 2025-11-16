-- Étape 2: Drop et recréer la vue users_with_roles
DROP VIEW IF EXISTS public.users_with_roles CASCADE;

CREATE VIEW public.users_with_roles AS
SELECT 
  p.id,
  p.full_name,
  au.email,
  ur.role,
  ur.access_level
FROM public.profiles p
INNER JOIN auth.users au ON p.id = au.id
LEFT JOIN public.user_roles ur ON p.id = ur.user_id;

-- Étape 3: Mettre à jour les RLS policies sur geographic_assignments
DROP POLICY IF EXISTS "Admins can manage geographic assignments" ON public.geographic_assignments;
DROP POLICY IF EXISTS "Representatives can view own assignments" ON public.geographic_assignments;

-- Policy pour que les admins (access_level >= 90) puissent tout gérer
CREATE POLICY "Admins can manage geographic assignments"
ON public.geographic_assignments
FOR ALL
TO authenticated
USING (public.has_access_level(auth.uid(), 90))
WITH CHECK (public.has_access_level(auth.uid(), 90));

-- Policy pour que les représentants puissent voir leurs propres assignments
CREATE POLICY "Representatives can view own assignments"
ON public.geographic_assignments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Étape 4: Mettre à jour la fonction get_role_access_level
CREATE OR REPLACE FUNCTION public.get_role_access_level(_role app_role)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _role::text
    WHEN 'admin' THEN 100
    WHEN 'financier' THEN 80
    WHEN 'country_representative' THEN 70
    WHEN 'city_representative' THEN 65
    WHEN 'merchant' THEN 60
    WHEN 'moderator' THEN 50
    WHEN 'agent' THEN 50
    WHEN 'user' THEN 30
    ELSE 30
  END;
$$;

-- Étape 5: Ajouter les permissions pour les représentants géographiques
INSERT INTO public.permissions (module, action, name, description)
VALUES 
  ('geographic', 'view_assignments', 'Voir les assignations géographiques', 'Permet de voir les assignations de représentants'),
  ('geographic', 'manage_city', 'Gérer ville', 'Permet de gérer les ordres d''une ville spécifique'),
  ('geographic', 'manage_country', 'Gérer pays', 'Permet de gérer les ordres d''un pays')
ON CONFLICT (module, action) DO NOTHING;

-- Ajouter les permissions par défaut aux rôles de représentants de ville
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'city_representative'::app_role, p.id 
FROM public.permissions p
WHERE p.module = 'geographic' AND p.action IN ('view_assignments', 'manage_city')
ON CONFLICT DO NOTHING;

-- Ajouter les permissions par défaut aux rôles de représentants de pays
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'country_representative'::app_role, p.id 
FROM public.permissions p
WHERE p.module = 'geographic' AND p.action IN ('view_assignments', 'manage_country')
ON CONFLICT DO NOTHING;