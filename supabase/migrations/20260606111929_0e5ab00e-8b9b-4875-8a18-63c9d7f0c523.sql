CREATE OR REPLACE FUNCTION public.moisson_invest_in_project(p_project_id uuid, p_shares integer, p_payment_method text DEFAULT 'wallet')
 RETURNS TABLE(success boolean, message text, investment_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_project RECORD;
  v_total NUMERIC;
  v_inv_id UUID;
  v_balance NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Authentification requise'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT * INTO v_project FROM public.moisson_projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Projet introuvable'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_project.status != 'collecte' THEN
    RETURN QUERY SELECT false, 'La collecte de ce projet est fermée'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF p_shares <= 0 OR p_shares > (v_project.total_shares - v_project.shares_sold) THEN
    RETURN QUERY SELECT false, 'Nombre de parts invalide ou insuffisant'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  v_total := p_shares * v_project.share_price;

  -- Ensure wallet exists
  INSERT INTO public.wallets(user_id, balance) VALUES (v_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_total THEN
    RETURN QUERY SELECT false, 'Solde du portefeuille insuffisant'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  UPDATE public.wallets SET balance = balance - v_total, updated_at = now() WHERE user_id = v_user_id;

  INSERT INTO public.wallet_transactions(user_id, amount, transaction_type, status, description)
  VALUES (v_user_id, -v_total, 'investment', 'completed', 'Achat de ' || p_shares || ' part(s) — projet Grenier')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.moisson_community_investments(user_id, project_id, shares_purchased, total_amount_invested, payment_method)
  VALUES (v_user_id, p_project_id, p_shares, v_total, 'wallet')
  RETURNING id INTO v_inv_id;

  UPDATE public.moisson_projects
  SET shares_sold = shares_sold + p_shares,
      updated_at = now()
  WHERE id = p_project_id;

  RETURN QUERY SELECT true, 'Investissement enregistré avec succès'::TEXT, v_inv_id;
END;
$function$;