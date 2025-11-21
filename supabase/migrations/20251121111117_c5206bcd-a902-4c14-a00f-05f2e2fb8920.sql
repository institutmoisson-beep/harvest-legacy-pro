-- Table des points relais (boutiques, box Moissonneur)
CREATE TABLE IF NOT EXISTS public.delivery_relay_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('shop', 'moissonneur_box', 'partner')),
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  manager_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  opening_hours JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table des colis/commandes en livraison
CREATE TABLE IF NOT EXISTS public.delivery_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id),
  customer_id UUID REFERENCES auth.users(id) NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_city TEXT NOT NULL,
  customer_latitude NUMERIC(10, 8),
  customer_longitude NUMERIC(11, 8),
  
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('relay_point', 'community_delivery', 'direct')),
  
  -- Pour les points relais
  relay_point_id UUID REFERENCES public.delivery_relay_points(id),
  pickup_code TEXT UNIQUE,
  
  -- Pour la livraison communautaire
  deliverer_id UUID REFERENCES auth.users(id),
  delivery_code TEXT,
  delivery_commission NUMERIC(10, 2) DEFAULT 500,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'awaiting_pickup', 'in_transit', 'delivered', 'cancelled')),
  
  assigned_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table des propositions de livraison
CREATE TABLE IF NOT EXISTS public.delivery_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES public.delivery_packages(id) NOT NULL,
  deliverer_id UUID REFERENCES auth.users(id) NOT NULL,
  proposed_delivery_time TIMESTAMPTZ,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(package_id, deliverer_id)
);

-- Table des évaluations des livreurs
CREATE TABLE IF NOT EXISTS public.delivery_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES public.delivery_packages(id) NOT NULL,
  deliverer_id UUID REFERENCES auth.users(id) NOT NULL,
  customer_id UUID REFERENCES auth.users(id) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(package_id, customer_id)
);

-- Index pour performances
CREATE INDEX idx_delivery_packages_customer ON public.delivery_packages(customer_id);
CREATE INDEX idx_delivery_packages_deliverer ON public.delivery_packages(deliverer_id);
CREATE INDEX idx_delivery_packages_status ON public.delivery_packages(status);
CREATE INDEX idx_delivery_packages_relay ON public.delivery_packages(relay_point_id);
CREATE INDEX idx_delivery_offers_package ON public.delivery_offers(package_id);
CREATE INDEX idx_delivery_offers_deliverer ON public.delivery_offers(deliverer_id);
CREATE INDEX idx_delivery_relay_points_location ON public.delivery_relay_points(latitude, longitude);

-- Fonction pour générer un code de retrait unique
CREATE OR REPLACE FUNCTION public.generate_pickup_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'PKP' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.delivery_packages WHERE pickup_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Fonction pour générer un code de livraison unique
CREATE OR REPLACE FUNCTION public.generate_delivery_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'DLV' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.delivery_packages WHERE delivery_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Trigger pour générer automatiquement les codes
CREATE OR REPLACE FUNCTION public.set_delivery_codes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.delivery_method = 'relay_point' AND NEW.pickup_code IS NULL THEN
    NEW.pickup_code := public.generate_pickup_code();
  END IF;
  
  IF NEW.delivery_method = 'community_delivery' AND NEW.delivery_code IS NULL THEN
    NEW.delivery_code := public.generate_delivery_code();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_delivery_codes
BEFORE INSERT ON public.delivery_packages
FOR EACH ROW
EXECUTE FUNCTION public.set_delivery_codes();

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER trigger_delivery_packages_updated_at
BEFORE UPDATE ON public.delivery_packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_delivery_relay_points_updated_at
BEFORE UPDATE ON public.delivery_relay_points
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_delivery_offers_updated_at
BEFORE UPDATE ON public.delivery_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies pour delivery_relay_points
ALTER TABLE public.delivery_relay_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active relay points"
ON public.delivery_relay_points FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage relay points"
ON public.delivery_relay_points FOR ALL
USING (has_access_level(auth.uid(), 90));

CREATE POLICY "Managers can view their relay points"
ON public.delivery_relay_points FOR SELECT
USING (auth.uid() = manager_id);

-- RLS Policies pour delivery_packages
ALTER TABLE public.delivery_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own packages"
ON public.delivery_packages FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Deliverers can view assigned packages"
ON public.delivery_packages FOR SELECT
USING (auth.uid() = deliverer_id);

CREATE POLICY "Relay managers can view packages at their relay"
ON public.delivery_packages FOR SELECT
USING (relay_point_id IN (
  SELECT id FROM public.delivery_relay_points WHERE manager_id = auth.uid()
));

CREATE POLICY "Users can view available packages for delivery"
ON public.delivery_packages FOR SELECT
USING (
  delivery_method = 'community_delivery' 
  AND status = 'pending' 
  AND deliverer_id IS NULL
);

CREATE POLICY "Admins can manage all packages"
ON public.delivery_packages FOR ALL
USING (has_access_level(auth.uid(), 90));

CREATE POLICY "System can create packages"
ON public.delivery_packages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Deliverers can update assigned packages"
ON public.delivery_packages FOR UPDATE
USING (auth.uid() = deliverer_id);

CREATE POLICY "Relay managers can update packages at their relay"
ON public.delivery_packages FOR UPDATE
USING (relay_point_id IN (
  SELECT id FROM public.delivery_relay_points WHERE manager_id = auth.uid()
));

-- RLS Policies pour delivery_offers
ALTER TABLE public.delivery_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deliverers can create offers"
ON public.delivery_offers FOR INSERT
WITH CHECK (auth.uid() = deliverer_id);

CREATE POLICY "Deliverers can view own offers"
ON public.delivery_offers FOR SELECT
USING (auth.uid() = deliverer_id);

CREATE POLICY "Customers can view offers for their packages"
ON public.delivery_offers FOR SELECT
USING (package_id IN (
  SELECT id FROM public.delivery_packages WHERE customer_id = auth.uid()
));

CREATE POLICY "Customers can update offers for their packages"
ON public.delivery_offers FOR UPDATE
USING (package_id IN (
  SELECT id FROM public.delivery_packages WHERE customer_id = auth.uid()
));

CREATE POLICY "Admins can manage all offers"
ON public.delivery_offers FOR ALL
USING (has_access_level(auth.uid(), 90));

-- RLS Policies pour delivery_ratings
ALTER TABLE public.delivery_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can create ratings for their deliveries"
ON public.delivery_ratings FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Everyone can view ratings"
ON public.delivery_ratings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage ratings"
ON public.delivery_ratings FOR ALL
USING (has_access_level(auth.uid(), 90));