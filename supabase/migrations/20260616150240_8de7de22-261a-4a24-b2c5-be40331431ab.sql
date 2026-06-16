
-- ============================================================
-- MODULE: RELAY PARTNERS (Points Relais Partenaires)
-- ============================================================

-- 1. relay_partners
CREATE TABLE public.relay_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  partner_type text NOT NULL CHECK (partner_type IN ('alimentation','restaurant','cave','hotel')),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  address text,
  city text,
  latitude numeric,
  longitude numeric,
  phone text,
  cover_url text,
  logo_url text,
  commission_rate numeric NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  low_stock_threshold int NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.relay_partners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relay_partners TO authenticated;
GRANT ALL ON public.relay_partners TO service_role;
ALTER TABLE public.relay_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active partners"
  ON public.relay_partners FOR SELECT
  USING (is_active = true OR owner_id = auth.uid() OR public.has_access_level(auth.uid(), 80));

CREATE POLICY "Owner can manage own partner"
  ON public.relay_partners FOR ALL
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_access_level(auth.uid(), 80))
  WITH CHECK (owner_id = auth.uid() OR public.has_access_level(auth.uid(), 80));

-- 2. relay_products
CREATE TABLE public.relay_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.relay_partners(id) ON DELETE CASCADE,
  category text NOT NULL,
  name text NOT NULL,
  description text,
  photo_url text,
  price_fcfa numeric NOT NULL CHECK (price_fcfa >= 0),
  is_service boolean NOT NULL DEFAULT false,
  service_type text NOT NULL DEFAULT 'product' CHECK (service_type IN ('product','meal','room_booking')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.relay_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relay_products TO authenticated;
GRANT ALL ON public.relay_products TO service_role;
ALTER TABLE public.relay_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active products"
  ON public.relay_products FOR SELECT
  USING (is_active = true OR public.has_access_level(auth.uid(), 80)
    OR EXISTS (SELECT 1 FROM public.relay_partners p WHERE p.id = partner_id AND p.owner_id = auth.uid()));

CREATE POLICY "Partner owner manages own products"
  ON public.relay_products FOR ALL
  TO authenticated
  USING (
    public.has_access_level(auth.uid(), 80)
    OR EXISTS (SELECT 1 FROM public.relay_partners p WHERE p.id = partner_id AND p.owner_id = auth.uid())
  )
  WITH CHECK (
    public.has_access_level(auth.uid(), 80)
    OR EXISTS (SELECT 1 FROM public.relay_partners p WHERE p.id = partner_id AND p.owner_id = auth.uid())
  );

-- 3. relay_stocks
CREATE TABLE public.relay_stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.relay_partners(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.relay_products(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(partner_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relay_stocks TO authenticated;
GRANT ALL ON public.relay_stocks TO service_role;
ALTER TABLE public.relay_stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stocks readable by partner owner or admin"
  ON public.relay_stocks FOR SELECT
  TO authenticated
  USING (
    public.has_access_level(auth.uid(), 80)
    OR EXISTS (SELECT 1 FROM public.relay_partners p WHERE p.id = partner_id AND p.owner_id = auth.uid())
  );

CREATE POLICY "Stocks managed by partner owner or admin"
  ON public.relay_stocks FOR ALL
  TO authenticated
  USING (
    public.has_access_level(auth.uid(), 80)
    OR EXISTS (SELECT 1 FROM public.relay_partners p WHERE p.id = partner_id AND p.owner_id = auth.uid())
  )
  WITH CHECK (
    public.has_access_level(auth.uid(), 80)
    OR EXISTS (SELECT 1 FROM public.relay_partners p WHERE p.id = partner_id AND p.owner_id = auth.uid())
  );

-- 4. relay_orders
CREATE TABLE public.relay_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  partner_id uuid NOT NULL REFERENCES public.relay_partners(id),
  product_id uuid NOT NULL REFERENCES public.relay_products(id),
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  commission_amount numeric NOT NULL DEFAULT 0,
  partner_amount numeric NOT NULL DEFAULT 0,
  qr_token text NOT NULL UNIQUE,
  pickup_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'paid_pending' CHECK (status IN ('paid_pending','served','refunded','expired')),
  booking_date timestamptz,
  served_at timestamptz,
  served_by uuid,
  payout_status text NOT NULL DEFAULT 'held' CHECK (payout_status IN ('held','released','refunded')),
  payout_transaction_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.relay_orders TO authenticated;
GRANT ALL ON public.relay_orders TO service_role;
ALTER TABLE public.relay_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order visible to client, partner owner, admin"
  ON public.relay_orders FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid()
    OR public.has_access_level(auth.uid(), 80)
    OR EXISTS (SELECT 1 FROM public.relay_partners p WHERE p.id = partner_id AND p.owner_id = auth.uid())
  );

CREATE POLICY "Partner owner / admin can update served status"
  ON public.relay_orders FOR UPDATE
  TO authenticated
  USING (
    public.has_access_level(auth.uid(), 80)
    OR EXISTS (SELECT 1 FROM public.relay_partners p WHERE p.id = partner_id AND p.owner_id = auth.uid())
  )
  WITH CHECK (
    public.has_access_level(auth.uid(), 80)
    OR EXISTS (SELECT 1 FROM public.relay_partners p WHERE p.id = partner_id AND p.owner_id = auth.uid())
  );

-- 5. relay_stock_movements
CREATE TABLE public.relay_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  product_id uuid NOT NULL,
  order_id uuid,
  delta int NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.relay_stock_movements TO authenticated;
GRANT ALL ON public.relay_stock_movements TO service_role;
ALTER TABLE public.relay_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stock movements visible to partner owner / admin"
  ON public.relay_stock_movements FOR SELECT
  TO authenticated
  USING (
    public.has_access_level(auth.uid(), 80)
    OR EXISTS (SELECT 1 FROM public.relay_partners p WHERE p.id = partner_id AND p.owner_id = auth.uid())
  );

-- ============================================================
-- HELPERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_relay_pickup_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  exists_check boolean;
BEGIN
  LOOP
    new_code := 'RLP-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.relay_orders WHERE pickup_code = new_code) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN new_code;
END;
$$;

-- ============================================================
-- RPC: relay_purchase
-- ============================================================
CREATE OR REPLACE FUNCTION public.relay_purchase(
  p_product_id uuid,
  p_quantity int DEFAULT 1,
  p_booking_date timestamptz DEFAULT NULL
)
RETURNS TABLE(order_id uuid, qr_token text, pickup_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_product record;
  v_partner record;
  v_stock_qty int;
  v_total numeric;
  v_commission numeric;
  v_partner_amount numeric;
  v_qr text;
  v_code text;
  v_order_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;
  IF p_quantity < 1 THEN
    RAISE EXCEPTION 'Quantité invalide';
  END IF;

  SELECT * INTO v_product FROM public.relay_products WHERE id = p_product_id AND is_active = true FOR UPDATE;
  IF v_product IS NULL THEN
    RAISE EXCEPTION 'Produit introuvable ou inactif';
  END IF;

  SELECT * INTO v_partner FROM public.relay_partners WHERE id = v_product.partner_id AND is_active = true;
  IF v_partner IS NULL THEN
    RAISE EXCEPTION 'Partenaire indisponible';
  END IF;

  -- Stock control for physical products
  IF v_product.is_service = false THEN
    SELECT quantity INTO v_stock_qty FROM public.relay_stocks
      WHERE partner_id = v_partner.id AND product_id = v_product.id FOR UPDATE;
    IF v_stock_qty IS NULL OR v_stock_qty < p_quantity THEN
      RAISE EXCEPTION 'Stock insuffisant';
    END IF;
  END IF;

  v_total := v_product.price_fcfa * p_quantity;
  v_commission := round(v_total * v_partner.commission_rate / 100, 2);
  v_partner_amount := v_total - v_commission;

  -- Debit wallet
  PERFORM public.decrement_wallet_balance(v_user_id, v_total);

  -- Generate codes
  v_qr := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_code := public.generate_relay_pickup_code();

  INSERT INTO public.relay_orders (
    client_id, partner_id, product_id, quantity,
    unit_price, total_price, commission_amount, partner_amount,
    qr_token, pickup_code, status, booking_date, payout_status
  ) VALUES (
    v_user_id, v_partner.id, v_product.id, p_quantity,
    v_product.price_fcfa, v_total, v_commission, v_partner_amount,
    v_qr, v_code, 'paid_pending', p_booking_date, 'held'
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.wallet_transactions (
    from_user_id, to_user_id, amount, transaction_type, status, description
  ) VALUES (
    v_user_id, v_user_id, v_total, 'order_payment'::transaction_type, 'completed',
    'Achat Points Relais — ' || v_product.name || ' (' || v_code || ')'
  );

  IF v_product.is_service = false THEN
    UPDATE public.relay_stocks
      SET quantity = quantity - p_quantity, updated_at = now()
      WHERE partner_id = v_partner.id AND product_id = v_product.id;
    INSERT INTO public.relay_stock_movements(partner_id, product_id, order_id, delta, reason)
      VALUES (v_partner.id, v_product.id, v_order_id, -p_quantity, 'order_purchase');
  END IF;

  RETURN QUERY SELECT v_order_id, v_qr, v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.relay_purchase(uuid, int, timestamptz) TO authenticated;

-- ============================================================
-- RPC: relay_scan_serve
-- ============================================================
CREATE OR REPLACE FUNCTION public.relay_scan_serve(p_code text)
RETURNS TABLE(
  order_id uuid, status text, product_name text, photo_url text,
  quantity int, total_price numeric, pickup_code text, partner_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_order public.relay_orders;
  v_product public.relay_products;
  v_partner public.relay_partners;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;

  SELECT * INTO v_order FROM public.relay_orders
    WHERE qr_token = p_code OR pickup_code = upper(p_code)
    FOR UPDATE;

  IF v_order IS NULL THEN RAISE EXCEPTION 'Commande introuvable'; END IF;

  SELECT * INTO v_partner FROM public.relay_partners WHERE id = v_order.partner_id;
  IF v_partner.owner_id <> v_user_id AND NOT public.has_access_level(v_user_id, 80) THEN
    RAISE EXCEPTION 'Vous n''êtes pas autorisé à valider cette commande';
  END IF;

  IF v_order.status <> 'paid_pending' THEN
    RAISE EXCEPTION 'Commande déjà traitée (statut: %)', v_order.status;
  END IF;

  UPDATE public.relay_orders
    SET status = 'served', served_at = now(), served_by = v_user_id, updated_at = now()
    WHERE id = v_order.id;

  SELECT * INTO v_product FROM public.relay_products WHERE id = v_order.product_id;

  RETURN QUERY SELECT v_order.id, 'served'::text, v_product.name, v_product.photo_url,
    v_order.quantity, v_order.total_price, v_order.pickup_code, v_partner.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.relay_scan_serve(text) TO authenticated;

-- ============================================================
-- RPC: relay_release_payout (admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.relay_release_payout(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_order public.relay_orders;
  v_partner public.relay_partners;
  v_tx_id uuid;
BEGIN
  IF NOT public.has_access_level(v_user_id, 80) THEN
    RAISE EXCEPTION 'Accès administrateur requis';
  END IF;

  SELECT * INTO v_order FROM public.relay_orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  IF v_order.status <> 'served' OR v_order.payout_status <> 'held' THEN
    RAISE EXCEPTION 'Reversement non disponible (statut: %, payout: %)', v_order.status, v_order.payout_status;
  END IF;

  SELECT * INTO v_partner FROM public.relay_partners WHERE id = v_order.partner_id;

  PERFORM public.increment_wallet_balance(v_partner.owner_id, v_order.partner_amount);

  INSERT INTO public.wallet_transactions(from_user_id, to_user_id, amount, transaction_type, status, description)
    VALUES (v_order.client_id, v_partner.owner_id, v_order.partner_amount,
            'order_payment'::transaction_type, 'completed',
            'Reversement Points Relais — ' || v_order.pickup_code)
    RETURNING id INTO v_tx_id;

  UPDATE public.treasury SET amount = amount + v_order.commission_amount, last_updated = now() WHERE id = 1;

  UPDATE public.relay_orders
    SET payout_status = 'released', payout_transaction_id = v_tx_id, updated_at = now()
    WHERE id = v_order.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.relay_release_payout(uuid) TO authenticated;

-- ============================================================
-- RPC: relay_refund (admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.relay_refund(p_order_id uuid, p_reason text DEFAULT 'Remboursement administrateur')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_order public.relay_orders;
  v_product public.relay_products;
BEGIN
  IF NOT public.has_access_level(v_user_id, 80) THEN
    RAISE EXCEPTION 'Accès administrateur requis';
  END IF;
  SELECT * INTO v_order FROM public.relay_orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  IF v_order.status NOT IN ('paid_pending','served') OR v_order.payout_status = 'released' THEN
    RAISE EXCEPTION 'Remboursement impossible';
  END IF;

  PERFORM public.increment_wallet_balance(v_order.client_id, v_order.total_price);

  INSERT INTO public.wallet_transactions(from_user_id, to_user_id, amount, transaction_type, status, description)
    VALUES (v_order.client_id, v_order.client_id, v_order.total_price,
            'order_payment'::transaction_type, 'completed',
            'Remboursement Points Relais — ' || v_order.pickup_code || ' — ' || p_reason);

  SELECT * INTO v_product FROM public.relay_products WHERE id = v_order.product_id;
  IF v_product.is_service = false THEN
    UPDATE public.relay_stocks SET quantity = quantity + v_order.quantity, updated_at = now()
      WHERE partner_id = v_order.partner_id AND product_id = v_order.product_id;
    INSERT INTO public.relay_stock_movements(partner_id, product_id, order_id, delta, reason)
      VALUES (v_order.partner_id, v_order.product_id, v_order.id, v_order.quantity, 'refund');
  END IF;

  UPDATE public.relay_orders
    SET status = 'refunded', payout_status = 'refunded', updated_at = now()
    WHERE id = v_order.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.relay_refund(uuid, text) TO authenticated;

-- ============================================================
-- Trigger: low-stock alert
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_low_relay_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner public.relay_partners;
  v_product public.relay_products;
  v_admin record;
BEGIN
  IF NEW.quantity >= OLD.quantity THEN RETURN NEW; END IF;
  SELECT * INTO v_partner FROM public.relay_partners WHERE id = NEW.partner_id;
  IF NEW.quantity < v_partner.low_stock_threshold THEN
    SELECT * INTO v_product FROM public.relay_products WHERE id = NEW.product_id;

    -- Notify partner owner
    INSERT INTO public.notifications(user_id, title, message, type)
    VALUES (v_partner.owner_id, '⚠️ Stock bas',
            'Stock bas pour ' || v_product.name || ' (' || NEW.quantity || ' restants) chez ' || v_partner.name,
            'general');

    -- Notify all admins
    FOR v_admin IN SELECT user_id FROM public.user_roles WHERE access_level >= 80 LOOP
      INSERT INTO public.notifications(user_id, title, message, type)
      VALUES (v_admin.user_id, '⚠️ Stock bas Points Relais',
              v_partner.name || ' — ' || v_product.name || ' : ' || NEW.quantity || ' restants',
              'general');
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_low_relay_stock
  AFTER UPDATE ON public.relay_stocks
  FOR EACH ROW EXECUTE FUNCTION public.notify_low_relay_stock();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.relay_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.relay_stocks;
