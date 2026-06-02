-- ============= MOISSON PROJECTS =============
CREATE TABLE public.moisson_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('cinema', 'agrobusiness', 'tech', 'immobilier', 'autre')),
  description TEXT NOT NULL,
  global_target NUMERIC NOT NULL CHECK (global_target > 0),
  share_price NUMERIC NOT NULL CHECK (share_price > 0),
  total_shares INTEGER NOT NULL CHECK (total_shares > 0),
  shares_sold INTEGER NOT NULL DEFAULT 0,
  estimated_roi NUMERIC NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'collecte' CHECK (status IN ('collecte', 'production', 'distribution', 'termine', 'annule')),
  cover_image TEXT,
  total_revenue NUMERIC DEFAULT 0,
  total_distributed NUMERIC DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.moisson_projects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.moisson_projects TO authenticated;
GRANT ALL ON public.moisson_projects TO service_role;

ALTER TABLE public.moisson_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moisson_projects_public_read" ON public.moisson_projects
  FOR SELECT USING (true);

CREATE POLICY "moisson_projects_admin_insert" ON public.moisson_projects
  FOR INSERT TO authenticated
  WITH CHECK (public.has_access_level(auth.uid(), 80));

CREATE POLICY "moisson_projects_admin_update" ON public.moisson_projects
  FOR UPDATE TO authenticated
  USING (public.has_access_level(auth.uid(), 80));

CREATE POLICY "moisson_projects_admin_delete" ON public.moisson_projects
  FOR DELETE TO authenticated
  USING (public.has_access_level(auth.uid(), 80));

CREATE TRIGGER trg_moisson_projects_updated_at
  BEFORE UPDATE ON public.moisson_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= MOISSON COMMUNITY INVESTMENTS =============
CREATE TABLE public.moisson_community_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.moisson_projects(id) ON DELETE CASCADE,
  shares_purchased INTEGER NOT NULL CHECK (shares_purchased > 0),
  total_amount_invested NUMERIC NOT NULL CHECK (total_amount_invested > 0),
  payout_received NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  contract_signed_url TEXT,
  investment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_moisson_investments_user ON public.moisson_community_investments(user_id);
CREATE INDEX idx_moisson_investments_project ON public.moisson_community_investments(project_id);

GRANT SELECT, INSERT, UPDATE ON public.moisson_community_investments TO authenticated;
GRANT ALL ON public.moisson_community_investments TO service_role;

ALTER TABLE public.moisson_community_investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moisson_inv_owner_read" ON public.moisson_community_investments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_access_level(auth.uid(), 80));

CREATE POLICY "moisson_inv_owner_insert" ON public.moisson_community_investments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "moisson_inv_admin_update" ON public.moisson_community_investments
  FOR UPDATE TO authenticated
  USING (public.has_access_level(auth.uid(), 80));

-- ============= MOISSON USER WALLETS =============
CREATE TABLE public.moisson_user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  total_deposited NUMERIC NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.moisson_user_wallets TO authenticated;
GRANT ALL ON public.moisson_user_wallets TO service_role;

ALTER TABLE public.moisson_user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moisson_wallet_owner_read" ON public.moisson_user_wallets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_access_level(auth.uid(), 80));

CREATE POLICY "moisson_wallet_owner_insert" ON public.moisson_user_wallets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_moisson_wallets_updated_at
  BEFORE UPDATE ON public.moisson_user_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= MOISSON PROJECT UPDATES (Journal de bord) =============
CREATE TABLE public.moisson_project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.moisson_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  posted_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_moisson_updates_project ON public.moisson_project_updates(project_id);

GRANT SELECT ON public.moisson_project_updates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.moisson_project_updates TO authenticated;
GRANT ALL ON public.moisson_project_updates TO service_role;

ALTER TABLE public.moisson_project_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moisson_updates_public_read" ON public.moisson_project_updates
  FOR SELECT USING (true);

CREATE POLICY "moisson_updates_admin_write" ON public.moisson_project_updates
  FOR INSERT TO authenticated
  WITH CHECK (public.has_access_level(auth.uid(), 80) AND posted_by = auth.uid());

CREATE POLICY "moisson_updates_admin_update" ON public.moisson_project_updates
  FOR UPDATE TO authenticated
  USING (public.has_access_level(auth.uid(), 80));

CREATE POLICY "moisson_updates_admin_delete" ON public.moisson_project_updates
  FOR DELETE TO authenticated
  USING (public.has_access_level(auth.uid(), 80));

-- ============= FONCTION : INVESTIR DANS UN PROJET =============
CREATE OR REPLACE FUNCTION public.moisson_invest_in_project(
  p_project_id UUID,
  p_shares INTEGER,
  p_payment_method TEXT
) RETURNS TABLE(success BOOLEAN, message TEXT, investment_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_project RECORD;
  v_total NUMERIC;
  v_inv_id UUID;
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

  INSERT INTO public.moisson_community_investments(user_id, project_id, shares_purchased, total_amount_invested, payment_method)
  VALUES (v_user_id, p_project_id, p_shares, v_total, p_payment_method)
  RETURNING id INTO v_inv_id;

  UPDATE public.moisson_projects
  SET shares_sold = shares_sold + p_shares,
      updated_at = now()
  WHERE id = p_project_id;

  -- Ensure wallet exists
  INSERT INTO public.moisson_user_wallets(user_id, total_deposited)
  VALUES (v_user_id, v_total)
  ON CONFLICT (user_id) DO UPDATE
    SET total_deposited = public.moisson_user_wallets.total_deposited + v_total,
        updated_at = now();

  RETURN QUERY SELECT true, 'Investissement enregistré avec succès'::TEXT, v_inv_id;
END;
$$;

-- ============= FONCTION : DISTRIBUER LES DIVIDENDES =============
CREATE OR REPLACE FUNCTION public.distribute_moisson_dividends(
  p_project_id UUID,
  p_total_revenue NUMERIC
) RETURNS TABLE(success BOOLEAN, message TEXT, total_distributed NUMERIC, beneficiaries INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_project RECORD;
  v_inv RECORD;
  v_share_value NUMERIC;
  v_payout NUMERIC;
  v_count INTEGER := 0;
  v_total NUMERIC := 0;
BEGIN
  IF NOT public.has_access_level(auth.uid(), 80) THEN
    RETURN QUERY SELECT false, 'Accès refusé'::TEXT, 0::NUMERIC, 0;
    RETURN;
  END IF;

  SELECT * INTO v_project FROM public.moisson_projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Projet introuvable'::TEXT, 0::NUMERIC, 0;
    RETURN;
  END IF;

  IF v_project.shares_sold = 0 THEN
    RETURN QUERY SELECT false, 'Aucune part vendue'::TEXT, 0::NUMERIC, 0;
    RETURN;
  END IF;

  v_share_value := p_total_revenue / v_project.shares_sold;

  FOR v_inv IN
    SELECT * FROM public.moisson_community_investments WHERE project_id = p_project_id
  LOOP
    v_payout := v_inv.shares_purchased * v_share_value;

    UPDATE public.moisson_community_investments
    SET payout_received = payout_received + v_payout
    WHERE id = v_inv.id;

    INSERT INTO public.moisson_user_wallets(user_id, current_balance)
    VALUES (v_inv.user_id, v_payout)
    ON CONFLICT (user_id) DO UPDATE
      SET current_balance = public.moisson_user_wallets.current_balance + v_payout,
          updated_at = now();

    INSERT INTO public.notifications(user_id, title, message, type)
    VALUES (
      v_inv.user_id,
      '🌾 Dividendes reçus - ' || v_project.title,
      'Vous avez reçu ' || ROUND(v_payout)::TEXT || ' FCFA pour vos ' || v_inv.shares_purchased || ' part(s).',
      'investment'
    );

    v_count := v_count + 1;
    v_total := v_total + v_payout;
  END LOOP;

  UPDATE public.moisson_projects
  SET total_revenue = total_revenue + p_total_revenue,
      total_distributed = total_distributed + v_total,
      status = 'distribution',
      updated_at = now()
  WHERE id = p_project_id;

  RETURN QUERY SELECT true, 'Dividendes distribués avec succès'::TEXT, v_total, v_count;
END;
$$;