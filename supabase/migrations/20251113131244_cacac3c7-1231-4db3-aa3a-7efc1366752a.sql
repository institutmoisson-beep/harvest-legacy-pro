-- Fix remaining functions without search_path

-- Fix calculate_investment_earnings
CREATE OR REPLACE FUNCTION public.calculate_investment_earnings(
  p_sale_amount NUMERIC, 
  p_profit_percentage NUMERIC, 
  p_investor_share_percentage NUMERIC
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (p_sale_amount * (p_profit_percentage / 100) * (p_investor_share_percentage / 100));
$$;

-- Fix trigger_check_badges
CREATE OR REPLACE FUNCTION public.trigger_check_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    PERFORM public.check_and_award_badges(NEW.agent_id);
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix update_treasury_on_fee
CREATE OR REPLACE FUNCTION public.update_treasury_on_fee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.treasury
  SET amount = amount + NEW.commission_amount,
      last_updated = now()
  WHERE id = 1;
  RETURN NEW;
END;
$function$;