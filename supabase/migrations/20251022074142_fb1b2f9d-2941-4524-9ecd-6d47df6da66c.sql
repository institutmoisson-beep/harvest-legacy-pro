-- Create career levels enum
CREATE TYPE public.career_level AS ENUM (
  'novice',
  'actif',
  'zonal',
  'principal',
  'gouverneur',
  'comte',
  'general',
  'royal_8',
  'royal_9',
  'guide'
);

-- Add career level column to profiles
ALTER TABLE public.profiles
ADD COLUMN career_level public.career_level DEFAULT 'novice',
ADD COLUMN career_level_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create function to calculate career level based on metrics
CREATE OR REPLACE FUNCTION public.calculate_career_level(p_user_id UUID)
RETURNS public.career_level
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_referrals INT;
  v_total_orders INT;
  v_validated_orders INT;
  v_account_age_days INT;
  v_monthly_sales NUMERIC;
  v_team_size INT;
BEGIN
  -- Count total referrals
  SELECT COUNT(*) INTO v_total_referrals
  FROM public.referrals
  WHERE referrer_id = p_user_id AND level = 1;
  
  -- Count total orders
  SELECT COUNT(*) INTO v_total_orders
  FROM public.orders
  WHERE broker_id = p_user_id;
  
  -- Count validated orders
  SELECT COUNT(*) INTO v_validated_orders
  FROM public.orders
  WHERE broker_id = p_user_id AND status = 'validated';
  
  -- Calculate account age in days
  SELECT EXTRACT(DAY FROM (now() - created_at))::INT INTO v_account_age_days
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Calculate monthly sales (last 30 days)
  SELECT COALESCE(SUM(purchase_price * quantity), 0) INTO v_monthly_sales
  FROM public.orders
  WHERE broker_id = p_user_id 
    AND status = 'validated'
    AND created_at >= now() - INTERVAL '30 days';
  
  -- Count team size (direct referrals with at least one order)
  SELECT COUNT(DISTINCT r.referred_id) INTO v_team_size
  FROM public.referrals r
  INNER JOIN public.orders o ON o.broker_id = r.referred_id
  WHERE r.referrer_id = p_user_id AND r.level = 1;
  
  -- Determine career level based on criteria
  IF v_total_referrals >= 15 AND v_validated_orders >= 15 AND v_team_size >= 20 AND v_monthly_sales >= 250000 THEN
    RETURN 'guide'::public.career_level;
  ELSIF v_total_referrals >= 15 AND v_validated_orders >= 15 AND v_team_size >= 15 THEN
    RETURN 'royal_9'::public.career_level;
  ELSIF v_total_referrals >= 15 AND v_validated_orders >= 15 AND v_team_size >= 10 THEN
    RETURN 'royal_8'::public.career_level;
  ELSIF v_total_referrals >= 15 AND v_validated_orders >= 15 AND v_team_size >= 8 THEN
    RETURN 'general'::public.career_level;
  ELSIF v_total_referrals >= 15 AND v_validated_orders >= 15 AND v_team_size >= 5 THEN
    RETURN 'comte'::public.career_level;
  ELSIF v_total_referrals >= 15 AND v_validated_orders >= 15 AND v_team_size >= 3 THEN
    RETURN 'gouverneur'::public.career_level;
  ELSIF v_total_referrals >= 15 AND v_validated_orders >= 15 AND v_monthly_sales >= 250000 THEN
    RETURN 'principal'::public.career_level;
  ELSIF v_total_referrals >= 15 AND v_validated_orders >= 15 AND v_team_size >= 20 THEN
    RETURN 'zonal'::public.career_level;
  ELSIF v_total_referrals >= 15 AND v_validated_orders >= 15 THEN
    RETURN 'actif'::public.career_level;
  ELSIF v_total_referrals >= 4 AND v_total_orders >= 5 AND v_account_age_days >= 30 THEN
    RETURN 'actif'::public.career_level;
  ELSE
    RETURN 'novice'::public.career_level;
  END IF;
END;
$$;

-- Create function to update user career level
CREATE OR REPLACE FUNCTION public.update_user_career_level(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_level public.career_level;
BEGIN
  v_new_level := public.calculate_career_level(p_user_id);
  
  UPDATE public.profiles
  SET career_level = v_new_level,
      career_level_updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- Create trigger to auto-update career level on order validation
CREATE OR REPLACE FUNCTION public.trigger_update_career_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update career level for the broker
  PERFORM public.update_user_career_level(NEW.broker_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_career_level_on_order_validated
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
WHEN (NEW.status = 'validated' AND OLD.status != 'validated')
EXECUTE FUNCTION public.trigger_update_career_level();

-- Create trigger to auto-update career level on new referral
CREATE OR REPLACE FUNCTION public.trigger_update_career_level_on_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update career level for the referrer
  PERFORM public.update_user_career_level(NEW.referrer_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_career_level_on_new_referral
AFTER INSERT ON public.referrals
FOR EACH ROW
WHEN (NEW.level = 1)
EXECUTE FUNCTION public.trigger_update_career_level_on_referral();