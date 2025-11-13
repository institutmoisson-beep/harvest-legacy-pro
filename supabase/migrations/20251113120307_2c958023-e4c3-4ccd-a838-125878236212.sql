-- Fix Security Definer Views by recreating them without SECURITY DEFINER
-- This ensures they use the querying user's permissions instead of creator's

-- Drop and recreate agent_leaderboard view without SECURITY DEFINER
DROP VIEW IF EXISTS public.agent_leaderboard;

CREATE VIEW public.agent_leaderboard AS
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

-- Drop and recreate agent_performance_comparison view without SECURITY DEFINER
DROP VIEW IF EXISTS public.agent_performance_comparison;

CREATE VIEW public.agent_performance_comparison AS
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

-- Drop and recreate agent_monthly_commission_report view without SECURITY DEFINER
DROP VIEW IF EXISTS public.agent_monthly_commission_report;

CREATE VIEW public.agent_monthly_commission_report AS
SELECT 
  ce.agent_id,
  p.full_name as agent_name,
  DATE_TRUNC('month', ce.created_at) as report_month,
  COUNT(*) as total_transactions,
  SUM(ce.transaction_amount) as total_volume,
  SUM(ce.commission_amount) as total_commission,
  AVG(ce.commission_rate) as avg_commission_rate,
  COUNT(CASE WHEN ce.transaction_type = 'deposit' THEN 1 END) as deposit_count,
  COUNT(CASE WHEN ce.transaction_type = 'withdrawal' THEN 1 END) as withdrawal_count,
  MAX(ce.tier_name) as current_tier,
  MAX(ce.tier_level) as tier_level
FROM public.agent_commission_earnings ce
JOIN public.profiles p ON p.id = ce.agent_id
GROUP BY ce.agent_id, p.full_name, DATE_TRUNC('month', ce.created_at)
ORDER BY report_month DESC, total_commission DESC;

-- Fix function search_path issues by explicitly setting search_path
-- Update calculate_agent_commission function
CREATE OR REPLACE FUNCTION public.calculate_agent_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission_settings RECORD;
  v_commission_tier RECORD;
  v_commission_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_monthly_transactions INTEGER;
BEGIN
  -- Only process completed transactions
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Get active commission settings
  SELECT * INTO v_commission_settings
  FROM public.agent_commission_settings
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get agent's monthly transaction count
  SELECT COUNT(*) INTO v_monthly_transactions
  FROM public.agent_transactions
  WHERE agent_id = NEW.agent_id
    AND status = 'completed'
    AND created_at >= date_trunc('month', CURRENT_DATE);

  -- Find applicable commission tier
  SELECT * INTO v_commission_tier
  FROM public.agent_commission_tiers
  WHERE v_monthly_transactions >= min_monthly_transactions
    AND (max_monthly_transactions IS NULL OR v_monthly_transactions <= max_monthly_transactions)
  ORDER BY tier_level DESC
  LIMIT 1;

  -- Use tier rate if found, otherwise use base rate
  IF v_commission_tier IS NOT NULL THEN
    v_commission_rate := v_commission_tier.commission_rate;
  ELSE
    -- Default base rate
    IF NEW.transaction_type = 'deposit' THEN
      v_commission_rate := COALESCE(v_commission_settings.deposit_rate, 0.40);
    ELSE
      v_commission_rate := COALESCE(v_commission_settings.withdrawal_rate, 0.40);
    END IF;
  END IF;

  -- Calculate commission
  v_commission_amount := NEW.amount * (v_commission_rate / 100);

  -- Insert commission earning record
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
    v_commission_tier.tier_level,
    v_commission_tier.tier_name
  );

  -- Credit commission to agent's wallet
  UPDATE public.wallets
  SET balance = balance + v_commission_amount,
      updated_at = now()
  WHERE user_id = NEW.agent_id;

  RETURN NEW;
END;
$$;

-- Update award_monthly_bonus function
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

-- Add RLS policies for views (they inherit from underlying tables)
-- Grant select on views to authenticated users
GRANT SELECT ON public.agent_leaderboard TO authenticated;
GRANT SELECT ON public.agent_performance_comparison TO authenticated;
GRANT SELECT ON public.agent_monthly_commission_report TO authenticated;