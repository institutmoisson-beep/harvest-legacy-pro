
-- ============ CURRENCY RATES ============
CREATE TABLE IF NOT EXISTS public.currency_rates (
  code text PRIMARY KEY,
  name text NOT NULL,
  symbol text NOT NULL,
  rate_to_fcfa numeric NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active currencies"
  ON public.currency_rates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage currencies"
  ON public.currency_rates FOR ALL
  USING (public.has_access_level(auth.uid(), 80))
  WITH CHECK (public.has_access_level(auth.uid(), 80));

INSERT INTO public.currency_rates (code, name, symbol, rate_to_fcfa) VALUES
  ('XOF', 'Franc CFA (BCEAO)', 'FCFA', 1),
  ('EUR', 'Euro', '€', 655.957),
  ('USD', 'Dollar US', '$', 605),
  ('GBP', 'Livre sterling', '£', 770),
  ('NGN', 'Naira nigérian', '₦', 0.38),
  ('GHS', 'Cedi ghanéen', 'GH₵', 38),
  ('MAD', 'Dirham marocain', 'DH', 61),
  ('CAD', 'Dollar canadien', 'C$', 440),
  ('XAF', 'Franc CFA (BEAC)', 'FCFA', 1)
ON CONFLICT (code) DO NOTHING;

-- ============ PROFILES preferred currency ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_currency text NOT NULL DEFAULT 'XOF';

-- ============ DELIVERY RELAY POINTS extension ============
ALTER TABLE public.delivery_relay_points
  ADD COLUMN IF NOT EXISTS host_type text NOT NULL DEFAULT 'partner',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS host_user_id uuid;

-- Make sure RLS enabled and public can read active points
ALTER TABLE public.delivery_relay_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active relay points" ON public.delivery_relay_points;
CREATE POLICY "Anyone can read active relay points"
  ON public.delivery_relay_points FOR SELECT
  USING (is_active = true OR public.has_access_level(auth.uid(), 80) OR host_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage relay points" ON public.delivery_relay_points;
CREATE POLICY "Admins manage relay points"
  ON public.delivery_relay_points FOR ALL
  USING (public.has_access_level(auth.uid(), 80))
  WITH CHECK (public.has_access_level(auth.uid(), 80));

-- ============ MLM PACK PURCHASES extension ============
ALTER TABLE public.mlm_pack_purchases
  ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'address',
  ADD COLUMN IF NOT EXISTS relay_point_id uuid REFERENCES public.delivery_relay_points(id),
  ADD COLUMN IF NOT EXISTS pickup_code text,
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz;

-- ============ UPDATE purchase_mlm_pack RPC ============
CREATE OR REPLACE FUNCTION public.purchase_mlm_pack(
  p_pack_id uuid,
  p_delivery_address text DEFAULT NULL,
  p_delivery_city text DEFAULT NULL,
  p_delivery_phone text DEFAULT NULL,
  p_delivery_notes text DEFAULT NULL,
  p_delivery_mode text DEFAULT 'address',
  p_relay_point_id uuid DEFAULT NULL
)
RETURNS TABLE(success boolean, message text, purchase_id uuid, pickup_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_pack RECORD;
  v_balance numeric;
  v_purchase_id uuid;
  v_referrer uuid;
  v_level int := 1;
  v_commission numeric;
  v_pickup text;
BEGIN
  IF v_user IS NULL THEN
    RETURN QUERY SELECT false, 'Non authentifié'::text, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  SELECT * INTO v_pack FROM public.mlm_packs WHERE id = p_pack_id AND is_active = true;
  IF v_pack IS NULL THEN
    RETURN QUERY SELECT false, 'Pack introuvable'::text, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  -- Validation livraison
  IF p_delivery_mode = 'relay' THEN
    IF p_relay_point_id IS NULL THEN
      RETURN QUERY SELECT false, 'Point relais requis'::text, NULL::uuid, NULL::text;
      RETURN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.delivery_relay_points WHERE id = p_relay_point_id AND is_active = true) THEN
      RETURN QUERY SELECT false, 'Point relais indisponible'::text, NULL::uuid, NULL::text;
      RETURN;
    END IF;
    v_pickup := public.generate_pickup_code();
  ELSE
    IF p_delivery_address IS NULL OR length(trim(p_delivery_address)) < 5 THEN
      RETURN QUERY SELECT false, 'Adresse requise'::text, NULL::uuid, NULL::text;
      RETURN;
    END IF;
    IF p_delivery_phone IS NULL OR length(trim(p_delivery_phone)) < 6 THEN
      RETURN QUERY SELECT false, 'Téléphone requis'::text, NULL::uuid, NULL::text;
      RETURN;
    END IF;
  END IF;

  -- Solde
  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_user;
  IF COALESCE(v_balance,0) < v_pack.price THEN
    RETURN QUERY SELECT false, 'Solde insuffisant'::text, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  -- Débit
  UPDATE public.wallets SET balance = balance - v_pack.price, updated_at = now() WHERE user_id = v_user;

  INSERT INTO public.wallet_transactions(from_user_id, to_user_id, amount, transaction_type, description, status)
  VALUES (v_user, v_user, v_pack.price, 'order_payment', 'Achat pack MLM: ' || v_pack.name, 'approved');

  -- Enregistrement achat
  INSERT INTO public.mlm_pack_purchases(
    pack_id, buyer_id, price_paid, benefit_amount, status,
    delivery_mode, delivery_address, delivery_city, delivery_phone, delivery_notes,
    relay_point_id, pickup_code
  )
  VALUES (
    p_pack_id, v_user, v_pack.price, v_pack.benefit_amount, 'paid',
    p_delivery_mode, p_delivery_address, p_delivery_city, p_delivery_phone, p_delivery_notes,
    p_relay_point_id, v_pickup
  )
  RETURNING id INTO v_purchase_id;

  -- Commissions ascendantes
  SELECT referred_by INTO v_referrer FROM public.profiles WHERE id = v_user;
  WHILE v_referrer IS NOT NULL AND v_level <= v_pack.max_levels LOOP
    v_commission := (v_pack.benefit_amount * v_pack.base_commission_percentage * power(v_pack.decay_rate, v_level - 1)) / 100;
    IF v_commission > 0 THEN
      UPDATE public.wallets SET balance = balance + v_commission, updated_at = now() WHERE user_id = v_referrer;
      INSERT INTO public.wallet_transactions(from_user_id, to_user_id, amount, transaction_type, description, status)
      VALUES (v_user, v_referrer, v_commission, 'commission', 'Commission niveau ' || v_level || ' — pack ' || v_pack.name, 'approved');
    END IF;
    SELECT referred_by INTO v_referrer FROM public.profiles WHERE id = v_referrer;
    v_level := v_level + 1;
  END LOOP;

  RETURN QUERY SELECT true, 'Achat réussi'::text, v_purchase_id, v_pickup;
END;
$$;

-- ============ CONVERT SHOP TO RELAY (admin) ============
CREATE OR REPLACE FUNCTION public.convert_shop_to_relay(
  p_shop_id uuid,
  p_host_type text DEFAULT 'shop'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop RECORD;
  v_new_id uuid;
BEGIN
  IF NOT public.has_access_level(auth.uid(), 80) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT id, user_id, shop_name, shop_address, shop_city, shop_country, shop_phone
  INTO v_shop FROM public.shop_settings WHERE id = p_shop_id;
  IF v_shop IS NULL THEN RAISE EXCEPTION 'Boutique introuvable'; END IF;

  INSERT INTO public.delivery_relay_points(
    name, type, host_type, address, city, country, phone, host_user_id, manager_id, is_active, description
  )
  VALUES (
    v_shop.shop_name, 'shop', p_host_type,
    COALESCE(v_shop.shop_address, 'N/A'),
    COALESCE(v_shop.shop_city, 'N/A'),
    COALESCE(v_shop.shop_country, 'Côte d''Ivoire'),
    v_shop.shop_phone, v_shop.user_id, v_shop.user_id, true,
    'Point relais hébergé par ' || v_shop.shop_name
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;
