-- Fix Security Definer Views and remaining function issues

-- Drop and recreate views as SECURITY INVOKER instead of SECURITY DEFINER
DROP VIEW IF EXISTS public.agent_leaderboard CASCADE;
DROP VIEW IF EXISTS public.agent_monthly_commission_report CASCADE;
DROP VIEW IF EXISTS public.agent_performance_comparison CASCADE;

-- Recreate agent_leaderboard as SECURITY INVOKER
CREATE OR REPLACE VIEW public.agent_leaderboard
WITH (security_invoker = true)
AS
SELECT 
  t.agent_id,
  p.full_name AS agent_name,
  COUNT(*) AS total_transactions,
  SUM(t.amount) AS total_volume,
  COUNT(CASE WHEN t.transaction_type = 'deposit' THEN 1 END) AS deposit_count,
  COUNT(CASE WHEN t.transaction_type = 'withdrawal' THEN 1 END) AS withdrawal_count,
  COALESCE(SUM(ce.commission_amount), 0) AS total_commissions,
  MAX(ce.tier_name) AS current_tier,
  RANK() OVER (ORDER BY COUNT(*) DESC) AS rank_by_transactions,
  RANK() OVER (ORDER BY SUM(t.amount) DESC) AS rank_by_volume,
  RANK() OVER (ORDER BY COALESCE(SUM(ce.commission_amount), 0) DESC) AS rank_by_commissions
FROM public.agent_transactions t
JOIN public.profiles p ON p.id = t.agent_id
LEFT JOIN public.agent_commission_earnings ce ON ce.agent_id = t.agent_id
WHERE t.status = 'completed'
  AND t.created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY t.agent_id, p.full_name
ORDER BY total_transactions DESC;

-- Recreate agent_monthly_commission_report as SECURITY INVOKER
CREATE OR REPLACE VIEW public.agent_monthly_commission_report
WITH (security_invoker = true)
AS
SELECT 
  ce.agent_id,
  p.full_name AS agent_name,
  DATE_TRUNC('month', ce.created_at) AS report_month,
  COUNT(*) AS total_transactions,
  SUM(ce.transaction_amount) AS total_volume,
  SUM(ce.commission_amount) AS total_commission,
  AVG(ce.commission_rate) AS avg_commission_rate,
  COUNT(CASE WHEN ce.transaction_type = 'deposit' THEN 1 END) AS deposit_count,
  COUNT(CASE WHEN ce.transaction_type = 'withdrawal' THEN 1 END) AS withdrawal_count,
  MAX(ce.tier_name) AS current_tier,
  MAX(ce.tier_level) AS tier_level
FROM public.agent_commission_earnings ce
JOIN public.profiles p ON p.id = ce.agent_id
GROUP BY ce.agent_id, p.full_name, DATE_TRUNC('month', ce.created_at)
ORDER BY report_month DESC, total_commission DESC;

-- Recreate agent_performance_comparison as SECURITY INVOKER
CREATE OR REPLACE VIEW public.agent_performance_comparison
WITH (security_invoker = true)
AS
SELECT 
  t.agent_id,
  p.full_name AS agent_name,
  DATE_TRUNC('month', t.created_at) AS performance_month,
  COUNT(*) AS monthly_transactions,
  SUM(t.amount) AS monthly_volume,
  COUNT(CASE WHEN t.transaction_type = 'deposit' THEN 1 END) AS monthly_deposits,
  COUNT(CASE WHEN t.transaction_type = 'withdrawal' THEN 1 END) AS monthly_withdrawals,
  COALESCE(SUM(ce.commission_amount), 0) AS monthly_commissions,
  AVG(t.amount) AS avg_transaction_amount
FROM public.agent_transactions t
JOIN public.profiles p ON p.id = t.agent_id
LEFT JOIN public.agent_commission_earnings ce ON ce.agent_id = t.agent_id 
  AND DATE_TRUNC('month', ce.created_at) = DATE_TRUNC('month', t.created_at)
WHERE t.status = 'completed'
GROUP BY t.agent_id, p.full_name, DATE_TRUNC('month', t.created_at)
ORDER BY performance_month DESC, monthly_transactions DESC;

-- Grant SELECT on views to authenticated users
GRANT SELECT ON public.agent_leaderboard TO authenticated;
GRANT SELECT ON public.agent_monthly_commission_report TO authenticated;
GRANT SELECT ON public.agent_performance_comparison TO authenticated;