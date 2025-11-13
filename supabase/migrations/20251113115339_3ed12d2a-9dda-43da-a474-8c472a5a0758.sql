-- Create monthly bonus tiers table
CREATE TABLE IF NOT EXISTS public.agent_bonus_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_level INTEGER NOT NULL UNIQUE,
  tier_name TEXT NOT NULL,
  min_transactions INTEGER NOT NULL,
  max_transactions INTEGER,
  bonus_amount NUMERIC NOT NULL,
  badge_icon TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_bonus_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view bonus tiers"
ON public.agent_bonus_tiers
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage bonus tiers"
ON public.agent_bonus_tiers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert bonus tiers
INSERT INTO public.agent_bonus_tiers (tier_level, tier_name, min_transactions, max_transactions, bonus_amount, badge_icon) VALUES
(1, 'Débutant', 50, 99, 10, '🥉'),
(2, 'Performant', 100, 199, 25, '🥈'),
(3, 'Expert', 200, 299, 50, '🥇'),
(4, 'Elite', 300, 499, 100, '💎'),
(5, 'Champion', 500, NULL, 200, '👑');

-- Create monthly bonus awards table
CREATE TABLE IF NOT EXISTS public.agent_monthly_bonus_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  award_month DATE NOT NULL,
  transactions_count INTEGER NOT NULL,
  tier_level INTEGER NOT NULL,
  tier_name TEXT NOT NULL,
  bonus_amount NUMERIC NOT NULL,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(agent_id, award_month)
);

-- Enable RLS
ALTER TABLE public.agent_monthly_bonus_awards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all bonus awards"
ON public.agent_monthly_bonus_awards
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can view own bonus awards"
ON public.agent_monthly_bonus_awards
FOR SELECT
USING (auth.uid() = agent_id);

-- Create agent leaderboard view
CREATE OR REPLACE VIEW public.agent_leaderboard AS
SELECT 
  t.agent_id,
  p.full_name as agent_name,
  COUNT(*) as total_transactions,
  SUM(t.amount) as total_volume,
  COUNT(CASE WHEN t.transaction_type = 'deposit' THEN 1 END) as deposit_count,
  COUNT(CASE WHEN t.transaction_type = 'withdrawal' THEN 1 END) as withdrawal_count,
  COALESCE(SUM(ce.commission_amount), 0) as total_commissions,
  MAX(ce.tier_name) as current_tier,
  RANK() OVER (ORDER BY COUNT(*) DESC) as rank_by_transactions,
  RANK() OVER (ORDER BY SUM(t.amount) DESC) as rank_by_volume,
  RANK() OVER (ORDER BY COALESCE(SUM(ce.commission_amount), 0) DESC) as rank_by_commissions
FROM public.agent_transactions t
JOIN public.profiles p ON p.id = t.agent_id
LEFT JOIN public.agent_commission_earnings ce ON ce.agent_id = t.agent_id
WHERE t.status = 'completed'
  AND t.created_at >= date_trunc('month', CURRENT_DATE)
GROUP BY t.agent_id, p.full_name
ORDER BY total_transactions DESC;

-- Create agent performance comparison view
CREATE OR REPLACE VIEW public.agent_performance_comparison AS
SELECT 
  t.agent_id,
  p.full_name as agent_name,
  DATE_TRUNC('month', t.created_at) as performance_month,
  COUNT(*) as monthly_transactions,
  SUM(t.amount) as monthly_volume,
  COUNT(CASE WHEN t.transaction_type = 'deposit' THEN 1 END) as monthly_deposits,
  COUNT(CASE WHEN t.transaction_type = 'withdrawal' THEN 1 END) as monthly_withdrawals,
  COALESCE(SUM(ce.commission_amount), 0) as monthly_commissions,
  AVG(t.amount) as avg_transaction_amount
FROM public.agent_transactions t
JOIN public.profiles p ON p.id = t.agent_id
LEFT JOIN public.agent_commission_earnings ce ON ce.agent_id = t.agent_id 
  AND DATE_TRUNC('month', ce.created_at) = DATE_TRUNC('month', t.created_at)
WHERE t.status = 'completed'
GROUP BY t.agent_id, p.full_name, DATE_TRUNC('month', t.created_at)
ORDER BY performance_month DESC, monthly_transactions DESC;

-- Grant select on views
GRANT SELECT ON public.agent_leaderboard TO authenticated;
GRANT SELECT ON public.agent_performance_comparison TO authenticated;

-- Function to calculate and award monthly bonus
CREATE OR REPLACE FUNCTION public.award_monthly_bonus()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent RECORD;
  v_bonus_tier RECORD;
  v_last_month DATE;
BEGIN
  -- Get last complete month
  v_last_month := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE;
  
  -- Loop through all agents with transactions last month
  FOR v_agent IN 
    SELECT 
      agent_id,
      COUNT(*) as transaction_count
    FROM public.agent_transactions
    WHERE status = 'completed'
      AND created_at >= v_last_month
      AND created_at < DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY agent_id
  LOOP
    -- Find matching bonus tier
    SELECT * INTO v_bonus_tier
    FROM public.agent_bonus_tiers
    WHERE v_agent.transaction_count >= min_transactions
      AND (max_transactions IS NULL OR v_agent.transaction_count <= max_transactions)
    ORDER BY tier_level DESC
    LIMIT 1;
    
    -- Award bonus if tier found and not already awarded
    IF v_bonus_tier IS NOT NULL THEN
      INSERT INTO public.agent_monthly_bonus_awards (
        agent_id,
        award_month,
        transactions_count,
        tier_level,
        tier_name,
        bonus_amount
      )
      VALUES (
        v_agent.agent_id,
        v_last_month,
        v_agent.transaction_count,
        v_bonus_tier.tier_level,
        v_bonus_tier.tier_name,
        v_bonus_tier.bonus_amount
      )
      ON CONFLICT (agent_id, award_month) DO NOTHING;
      
      -- Credit bonus to agent's wallet
      UPDATE public.wallets
      SET balance = balance + v_bonus_tier.bonus_amount,
          updated_at = now()
      WHERE user_id = v_agent.agent_id;
    END IF;
  END LOOP;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_monthly_bonus_awards_agent_month 
ON public.agent_monthly_bonus_awards(agent_id, award_month DESC);