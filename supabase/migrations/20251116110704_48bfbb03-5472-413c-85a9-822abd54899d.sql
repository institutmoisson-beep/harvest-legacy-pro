-- Migration complète pour système de représentants géographiques avec RLS corrigé

-- 1. Ajouter les colonnes country et city à orders
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'country') THEN
    ALTER TABLE public.orders ADD COLUMN country TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'city') THEN
    ALTER TABLE public.orders ADD COLUMN city TEXT;
  END IF;
END $$;

-- 2. Créer la table geographic_assignments
CREATE TABLE IF NOT EXISTS public.geographic_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('country', 'city')),
  country TEXT NOT NULL,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, assignment_type, country, city)
);

-- Enable RLS
ALTER TABLE public.geographic_assignments ENABLE ROW LEVEL SECURITY;

-- Policies using security definer functions
CREATE POLICY "Admins can manage geographic assignments"
ON public.geographic_assignments
FOR ALL
TO authenticated
USING (public.has_access_level(auth.uid(), 90));

CREATE POLICY "Representatives can view own assignments"
ON public.geographic_assignments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3. Créer la table african_locations
CREATE TABLE IF NOT EXISTS public.african_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(country, city)
);

-- Enable RLS
ALTER TABLE public.african_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view african locations"
ON public.african_locations
FOR SELECT
TO authenticated
USING (is_active = TRUE);

CREATE POLICY "Admins can manage african locations"
ON public.african_locations
FOR ALL
TO authenticated
USING (public.has_access_level(auth.uid(), 90));

-- 4. Fonction pour vérifier si un utilisateur peut voir une commande
CREATE OR REPLACE FUNCTION public.can_view_order(_user_id UUID, _order_country TEXT, _order_city TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_access_level INT;
  is_country_rep BOOLEAN;
  is_city_rep BOOLEAN;
BEGIN
  -- Vérifier si c'est un admin (utilise la fonction security definer)
  IF public.has_access_level(_user_id, 80) THEN
    RETURN TRUE;
  END IF;
  
  -- Vérifier si c'est le broker de la commande
  IF EXISTS (SELECT 1 FROM public.orders WHERE broker_id = _user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Vérifier si c'est un représentant pays
  SELECT EXISTS (
    SELECT 1 FROM public.geographic_assignments
    WHERE user_id = _user_id
    AND assignment_type = 'country'
    AND country = _order_country
  ) INTO is_country_rep;
  
  IF is_country_rep THEN
    RETURN TRUE;
  END IF;
  
  -- Vérifier si c'est un représentant ville
  SELECT EXISTS (
    SELECT 1 FROM public.geographic_assignments
    WHERE user_id = _user_id
    AND assignment_type = 'city'
    AND country = _order_country
    AND city = _order_city
  ) INTO is_city_rep;
  
  RETURN is_city_rep;
END;
$$;

-- 5. Mettre à jour les RLS policies sur orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users and representatives can view orders" ON public.orders;
DROP POLICY IF EXISTS "Admins and representatives can update orders" ON public.orders;

CREATE POLICY "Users and representatives can view orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  auth.uid() = broker_id OR
  public.can_view_order(auth.uid(), country, city)
);

CREATE POLICY "Admins and representatives can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  public.can_view_order(auth.uid(), country, city)
);

-- 6. Ajouter les nouvelles permissions
INSERT INTO public.permissions (module, action, name, description) VALUES
  ('orders', 'approve', 'Approuver commandes', 'Peut approuver les commandes'),
  ('orders', 'reject', 'Rejeter commandes', 'Peut rejeter les commandes'),
  ('geographic', 'assign', 'Assigner représentants', 'Peut assigner des représentants géographiques'),
  ('geographic', 'view', 'Voir assignations', 'Peut voir les assignations géographiques')
ON CONFLICT (module, action) DO NOTHING;

-- 7. Insérer les pays et villes d'Afrique
INSERT INTO public.african_locations (country, city) VALUES
  ('Bénin', 'Cotonou'),
  ('Bénin', 'Porto-Novo'),
  ('Bénin', 'Parakou'),
  ('Burkina Faso', 'Ouagadougou'),
  ('Burkina Faso', 'Bobo-Dioulasso'),
  ('Côte d''Ivoire', 'Abidjan'),
  ('Côte d''Ivoire', 'Yamoussoukro'),
  ('Côte d''Ivoire', 'Bouaké'),
  ('Ghana', 'Accra'),
  ('Ghana', 'Kumasi'),
  ('Guinée', 'Conakry'),
  ('Mali', 'Bamako'),
  ('Niger', 'Niamey'),
  ('Nigéria', 'Lagos'),
  ('Nigéria', 'Abuja'),
  ('Nigéria', 'Kano'),
  ('Sénégal', 'Dakar'),
  ('Sénégal', 'Thiès'),
  ('Togo', 'Lomé'),
  ('Cameroun', 'Yaoundé'),
  ('Cameroun', 'Douala'),
  ('Congo-Brazzaville', 'Brazzaville'),
  ('Congo-Kinshasa', 'Kinshasa'),
  ('Congo-Kinshasa', 'Lubumbashi'),
  ('Gabon', 'Libreville'),
  ('Tchad', 'N''Djamena'),
  ('Kenya', 'Nairobi'),
  ('Kenya', 'Mombasa'),
  ('Tanzanie', 'Dar es Salaam'),
  ('Ouganda', 'Kampala'),
  ('Rwanda', 'Kigali'),
  ('Éthiopie', 'Addis-Abeba'),
  ('Afrique du Sud', 'Johannesburg'),
  ('Afrique du Sud', 'Le Cap'),
  ('Afrique du Sud', 'Pretoria'),
  ('Zimbabwe', 'Harare'),
  ('Zambie', 'Lusaka'),
  ('Mozambique', 'Maputo'),
  ('Maroc', 'Casablanca'),
  ('Maroc', 'Rabat'),
  ('Algérie', 'Alger'),
  ('Tunisie', 'Tunis'),
  ('Égypte', 'Le Caire'),
  ('Égypte', 'Alexandrie')
ON CONFLICT (country, city) DO NOTHING;