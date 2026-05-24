CREATE OR REPLACE FUNCTION public.purchase_mlm_pack(p_pack_id uuid)
 RETURNS TABLE(success boolean, message text, purchase_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  UPDATE public.wallets SET balance = balance - v_pack.price, updated_at = now()
  WHERE user_id = v_user;

  INSERT INTO public.mlm_pack_purchases (pack_id, buyer_id, price_paid, benefit_amount, status)
  VALUES (v_pack.id, v_user, v_pack.price, v_pack.benefit_amount, 'completed')
  RETURNING id INTO v_purchase_id;

  INSERT INTO public.wallet_transactions (from_user_id, to_user_id, amount, transaction_type, description, status)
  VALUES (v_user, v_user, v_pack.price, 'order_payment'::transaction_type,
          'Achat du pack ' || v_pack.name, 'approved');

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
              'Commission niveau ' || v_level || ' - Pack ' || v_pack.name, 'approved');

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
$function$;