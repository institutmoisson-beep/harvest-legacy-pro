
-- Storage bucket for MLM pack assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('mlm-packs', 'mlm-packs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "MLM pack images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'mlm-packs');

CREATE POLICY "Admin upload mlm pack images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'mlm-packs' AND public.has_access_level(auth.uid(), 80));

CREATE POLICY "Admin update mlm pack images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'mlm-packs' AND public.has_access_level(auth.uid(), 80));

CREATE POLICY "Admin delete mlm pack images"
ON storage.objects FOR DELETE
USING (bucket_id = 'mlm-packs' AND public.has_access_level(auth.uid(), 80));

-- Packs catalogue
CREATE TABLE public.mlm_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  benefit_amount NUMERIC NOT NULL CHECK (benefit_amount >= 0),
  images TEXT[] DEFAULT '{}'::text[],
  partner_name TEXT,
  partner_logo_url TEXT,
  partner_image_url TEXT,
  base_commission_percentage NUMERIC NOT NULL DEFAULT 30 CHECK (base_commission_percentage >= 0 AND base_commission_percentage <= 100),
  decay_rate NUMERIC NOT NULL DEFAULT 0.85 CHECK (decay_rate > 0 AND decay_rate <= 1),
  max_levels INTEGER NOT NULL DEFAULT 20 CHECK (max_levels >= 1 AND max_levels <= 50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mlm_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active packs"
ON public.mlm_packs FOR SELECT
USING (is_active = true OR public.has_access_level(auth.uid(), 80));

CREATE POLICY "Admins manage packs"
ON public.mlm_packs FOR ALL
USING (public.has_access_level(auth.uid(), 80))
WITH CHECK (public.has_access_level(auth.uid(), 80));

CREATE TRIGGER mlm_packs_updated_at
BEFORE UPDATE ON public.mlm_packs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Purchases
CREATE TABLE public.mlm_pack_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES public.mlm_packs(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL,
  price_paid NUMERIC NOT NULL,
  benefit_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mlm_pack_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own pack purchases"
ON public.mlm_pack_purchases FOR SELECT
USING (auth.uid() = buyer_id OR public.has_access_level(auth.uid(), 80));

CREATE POLICY "Users create own purchases"
ON public.mlm_pack_purchases FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

CREATE INDEX idx_mlm_purchases_buyer ON public.mlm_pack_purchases(buyer_id);
CREATE INDEX idx_mlm_purchases_pack ON public.mlm_pack_purchases(pack_id);

-- Commissions distributed per purchase
CREATE TABLE public.mlm_pack_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.mlm_pack_purchases(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES public.mlm_packs(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  beneficiary_id UUID NOT NULL,
  level INTEGER NOT NULL,
  percentage NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mlm_pack_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own pack commissions"
ON public.mlm_pack_commissions FOR SELECT
USING (auth.uid() = beneficiary_id OR auth.uid() = buyer_id OR public.has_access_level(auth.uid(), 80));

CREATE INDEX idx_mlm_comm_benef ON public.mlm_pack_commissions(beneficiary_id);
CREATE INDEX idx_mlm_comm_purchase ON public.mlm_pack_commissions(purchase_id);

-- Function: purchase pack atomically
CREATE OR REPLACE FUNCTION public.purchase_mlm_pack(p_pack_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT, purchase_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_pack RECORD;
  v_balance NUMERIC;
  v_purchase_id UUID;
  v_current_referrer UUID;
  v_level INT := 1;
  v_pct NUMERIC;
  v_amt NUMERIC;
BEGIN
  IF v_user IS NULL THEN
    RETURN QUERY SELECT false, 'Non authentifié'::TEXT, NULL::UUID; RETURN;
  END IF;

  SELECT * INTO v_pack FROM public.mlm_packs WHERE id = p_pack_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Pack introuvable ou inactif'::TEXT, NULL::UUID; RETURN;
  END IF;

  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_user;
  IF COALESCE(v_balance,0) < v_pack.price THEN
    RETURN QUERY SELECT false, 'Solde insuffisant'::TEXT, NULL::UUID; RETURN;
  END IF;

  -- Debit wallet
  UPDATE public.wallets SET balance = balance - v_pack.price, updated_at = now()
  WHERE user_id = v_user;

  -- Create purchase
  INSERT INTO public.mlm_pack_purchases (pack_id, buyer_id, price_paid, benefit_amount, status)
  VALUES (v_pack.id, v_user, v_pack.price, v_pack.benefit_amount, 'completed')
  RETURNING id INTO v_purchase_id;

  -- Record wallet transaction
  INSERT INTO public.wallet_transactions (from_user_id, to_user_id, amount, transaction_type, description, status)
  VALUES (v_user, v_user, v_pack.price, 'order_payment'::transaction_type,
          'Achat du pack ' || v_pack.name, 'completed');

  -- Distribute commissions up the referral chain on the benefit
  SELECT referred_by INTO v_current_referrer FROM public.profiles WHERE id = v_user;

  WHILE v_current_referrer IS NOT NULL AND v_level <= v_pack.max_levels LOOP
    v_pct := v_pack.base_commission_percentage * power(v_pack.decay_rate, v_level - 1);
    v_amt := round((v_pack.benefit_amount * v_pct / 100)::numeric, 2);

    IF v_amt > 0 THEN
      INSERT INTO public.mlm_pack_commissions
        (purchase_id, pack_id, buyer_id, beneficiary_id, level, percentage, amount)
      VALUES (v_purchase_id, v_pack.id, v_user, v_current_referrer, v_level, v_pct, v_amt);

      UPDATE public.wallets SET balance = balance + v_amt, updated_at = now()
      WHERE user_id = v_current_referrer;

      INSERT INTO public.wallet_transactions (from_user_id, to_user_id, amount, transaction_type, description, status)
      VALUES (v_user, v_current_referrer, v_amt, 'commission'::transaction_type,
              'Commission niveau ' || v_level || ' - Pack ' || v_pack.name, 'completed');

      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (v_current_referrer,
              '💰 Commission Pack reçue',
              'Vous avez reçu ' || v_amt || ' FCFA (niveau ' || v_level || ') sur l''achat du pack ' || v_pack.name,
              'general');
    END IF;

    SELECT referred_by INTO v_current_referrer FROM public.profiles WHERE id = v_current_referrer;
    v_level := v_level + 1;
  END LOOP;

  RETURN QUERY SELECT true, 'Achat réussi'::TEXT, v_purchase_id;
END;
$$;
