-- Create commission tiers table
CREATE TABLE IF NOT EXISTS public.agent_commission_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL,
  tier_level INTEGER NOT NULL UNIQUE,
  min_monthly_transactions INTEGER NOT NULL,
  max_monthly_transactions INTEGER,
  commission_rate NUMERIC NOT NULL,
  badge_color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_commission_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view commission tiers"
ON public.agent_commission_tiers
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage commission tiers"
ON public.agent_commission_tiers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert commission tiers
INSERT INTO public.agent_commission_tiers (tier_name, tier_level, min_monthly_transactions, max_monthly_transactions, commission_rate, badge_color) VALUES
('Bronze', 1, 0, 50, 0.40, '#CD7F32'),
('Silver', 2, 51, 150, 0.50, '#C0C0C0'),
('Gold', 3, 151, 300, 0.60, '#FFD700'),
('Platinum', 4, 301, NULL, 0.75, '#E5E4E2');

-- Add tier tracking to agent_commission_earnings
ALTER TABLE public.agent_commission_earnings
ADD COLUMN IF NOT EXISTS tier_level INTEGER,
ADD COLUMN IF NOT EXISTS tier_name TEXT;

-- Function to get agent's current tier based on monthly transactions
CREATE OR REPLACE FUNCTION public.get_agent_tier(p_agent_id UUID)
RETURNS TABLE(tier_name TEXT, tier_level INTEGER, commission_rate NUMERIC, badge_color TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_monthly_count INTEGER;
BEGIN
  -- Count transactions in current month
  SELECT COUNT(*) INTO v_monthly_count
  FROM public.agent_transactions
  WHERE agent_id = p_agent_id
    AND status = 'completed'
    AND created_at >= date_trunc('month', CURRENT_DATE);
  
  -- Return matching tier
  RETURN QUERY
  SELECT t.tier_name, t.tier_level, t.commission_rate, t.badge_color
  FROM public.agent_commission_tiers t
  WHERE v_monthly_count >= t.min_monthly_transactions
    AND (t.max_monthly_transactions IS NULL OR v_monthly_count <= t.max_monthly_transactions)
  ORDER BY t.tier_level DESC
  LIMIT 1;
END;
$$;

-- Update commission calculation function to use tiers
CREATE OR REPLACE FUNCTION public.calculate_agent_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_tier RECORD;
BEGIN
  -- Only process completed transactions
  IF NEW.status = 'completed' THEN
    -- Get agent's current tier
    SELECT * INTO v_tier
    FROM public.get_agent_tier(NEW.agent_id);
    
    -- Use tier commission rate or default to 0.40%
    v_commission_rate := COALESCE(v_tier.commission_rate, 0.40);
    
    -- Calculate commission amount (rate is in percentage)
    v_commission_amount := (NEW.amount * v_commission_rate / 100);
    
    IF v_commission_amount > 0 THEN
      -- Insert commission earning record with tier info
      INSERT INTO public.agent_commission_earnings (
        agent_id,
        transaction_id,
        transaction_type,
        transaction_amount,
        commission_rate,
        commission_amount,
        tier_level,
        tier_name
      ) VALUES (
        NEW.agent_id,
        NEW.id,
        NEW.transaction_type,
        NEW.amount,
        v_commission_rate,
        v_commission_amount,
        v_tier.tier_level,
        v_tier.tier_name
      );
      
      -- Credit commission to agent's wallet
      UPDATE public.wallets
      SET balance = balance + v_commission_amount,
          updated_at = now()
      WHERE user_id = NEW.agent_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create monthly commission report view
CREATE OR REPLACE VIEW public.agent_monthly_commission_report AS
SELECT 
  e.agent_id,
  p.full_name as agent_name,
  DATE_TRUNC('month', e.created_at) as report_month,
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN e.transaction_type = 'deposit' THEN 1 END) as deposit_count,
  COUNT(CASE WHEN e.transaction_type = 'withdrawal' THEN 1 END) as withdrawal_count,
  SUM(e.transaction_amount) as total_volume,
  SUM(e.commission_amount) as total_commission,
  AVG(e.commission_rate) as avg_commission_rate,
  MAX(e.tier_name) as current_tier,
  MAX(e.tier_level) as tier_level
FROM public.agent_commission_earnings e
JOIN public.profiles p ON p.id = e.agent_id
GROUP BY e.agent_id, p.full_name, DATE_TRUNC('month', e.created_at)
ORDER BY report_month DESC, total_commission DESC;

-- Grant select on view
GRANT SELECT ON public.agent_monthly_commission_report TO authenticated;

-- Create notification trigger for commissions
CREATE OR REPLACE FUNCTION public.notify_commission_earned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This will be handled by the edge function
  PERFORM pg_notify(
    'commission_earned',
    json_build_object(
      'agent_id', NEW.agent_id,
      'commission_amount', NEW.commission_amount,
      'transaction_type', NEW.transaction_type,
      'tier_name', NEW.tier_name
    )::text
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_commission_earned
AFTER INSERT ON public.agent_commission_earnings
FOR EACH ROW
EXECUTE FUNCTION public.notify_commission_earned();