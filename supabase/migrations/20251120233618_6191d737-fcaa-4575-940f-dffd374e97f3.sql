-- Mise à jour de la fonction calculate_career_level pour utiliser les nouveaux niveaux de carrière
CREATE OR REPLACE FUNCTION public.calculate_career_level(p_user_id UUID)
RETURNS public.career_level
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_referrals INT;
  v_validated_orders INT;
BEGIN
  -- Compter les parrainages directs (niveau 1)
  SELECT COUNT(*) INTO v_total_referrals
  FROM public.referrals
  WHERE referrer_id = p_user_id AND level = 1;
  
  -- Compter les commandes validées
  SELECT COUNT(*) INTO v_validated_orders
  FROM public.orders
  WHERE broker_id = p_user_id AND status IN ('validated', 'completed');
  
  -- Déterminer le niveau de carrière basé sur les critères
  -- Guide (niveau max): 150 parrainages, 450 commandes validées
  IF v_total_referrals >= 150 AND v_validated_orders >= 450 THEN
    RETURN 'guide'::public.career_level;
  -- Ambassadeur: 125 parrainages, 375 commandes validées
  ELSIF v_total_referrals >= 125 AND v_validated_orders >= 375 THEN
    RETURN 'ambassadeur'::public.career_level;
  -- Gouverneur: 100 parrainages, 300 commandes validées
  ELSIF v_total_referrals >= 100 AND v_validated_orders >= 300 THEN
    RETURN 'gouverneur'::public.career_level;
  -- Directeur: 75 parrainages, 225 commandes validées
  ELSIF v_total_referrals >= 75 AND v_validated_orders >= 225 THEN
    RETURN 'directeur'::public.career_level;
  -- Coordinateur: 60 parrainages, 180 commandes validées
  ELSIF v_total_referrals >= 60 AND v_validated_orders >= 180 THEN
    RETURN 'coordinateur'::public.career_level;
  -- Superviseur: 50 parrainages, 150 commandes validées
  ELSIF v_total_referrals >= 50 AND v_validated_orders >= 150 THEN
    RETURN 'superviseur'::public.career_level;
  -- Gestionnaire: 30 parrainages, 90 commandes validées
  ELSIF v_total_referrals >= 30 AND v_validated_orders >= 90 THEN
    RETURN 'gestionnaire'::public.career_level;
  -- Récolteur: 20 parrainages, 60 commandes validées
  ELSIF v_total_referrals >= 20 AND v_validated_orders >= 60 THEN
    RETURN 'recolteur'::public.career_level;
  -- Cultivateur: 15 parrainages, 45 commandes validées
  ELSIF v_total_referrals >= 15 AND v_validated_orders >= 45 THEN
    RETURN 'cultivateur'::public.career_level;
  -- Semeur (niveau de départ): au moins 5 parrainages OU 15 commandes validées
  ELSIF v_total_referrals >= 5 OR v_validated_orders >= 15 THEN
    RETURN 'semeur'::public.career_level;
  -- Par défaut, retourner semeur
  ELSE
    RETURN 'semeur'::public.career_level;
  END IF;
END;
$$;

-- Créer une fonction pour mettre à jour tous les niveaux de carrière existants
CREATE OR REPLACE FUNCTION public.update_all_career_levels()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id FROM public.profiles WHERE id IS NOT NULL
  LOOP
    PERFORM public.update_user_career_level(user_record.id);
  END LOOP;
END;
$$;

-- Mettre à jour tous les niveaux de carrière existants
SELECT public.update_all_career_levels();