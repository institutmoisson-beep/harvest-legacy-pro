
-- Create triggers to update career level automatically
-- Trigger when an order is updated (validated)
CREATE OR REPLACE TRIGGER trigger_update_career_level_on_order
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION public.trigger_update_career_level();

-- Trigger when a new referral is added
CREATE OR REPLACE TRIGGER trigger_update_career_level_on_new_referral
AFTER INSERT ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_career_level_on_referral();
