-- Trigger pour mettre à jour le career level après une commande validée
CREATE OR REPLACE FUNCTION public.trigger_update_career_level_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update career level for the broker when order status changes to validated
  IF NEW.status = 'validated' AND OLD.status != 'validated' THEN
    PERFORM public.update_user_career_level(NEW.broker_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_career_on_order_validated ON public.orders;
CREATE TRIGGER update_career_on_order_validated
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_career_level_on_order();

-- Trigger pour mettre à jour le career level après un nouveau parrainage
DROP TRIGGER IF EXISTS update_career_on_new_referral ON public.referrals;
CREATE TRIGGER update_career_on_new_referral
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  WHEN (NEW.level = 1)
  EXECUTE FUNCTION public.trigger_update_career_level_on_referral();

-- Trigger pour mettre à jour le fond après dépôt validé
DROP TRIGGER IF EXISTS trigger_update_fund_on_deposit ON public.wallet_transactions;
CREATE TRIGGER trigger_update_fund_on_deposit
  AFTER UPDATE ON public.wallet_transactions
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.transaction_type = 'deposit')
  EXECUTE FUNCTION public.update_fund_on_deposit();