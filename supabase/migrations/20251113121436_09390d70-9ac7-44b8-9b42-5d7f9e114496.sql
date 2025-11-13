-- Create agent badges system
CREATE TABLE IF NOT EXISTS public.agent_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL,
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('transactions', 'volume', 'commissions', 'referrals')),
  requirement_value DECIMAL(15,2) NOT NULL,
  badge_color TEXT DEFAULT '#FFD700',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_earned_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.agent_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(agent_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.agent_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_earned_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view badges"
ON public.agent_badges FOR SELECT
USING (true);

CREATE POLICY "Agents can view their earned badges"
ON public.agent_earned_badges FOR SELECT
USING (agent_id = auth.uid());

CREATE POLICY "System can insert earned badges"
ON public.agent_earned_badges FOR INSERT
WITH CHECK (true);

-- Insert default badges
INSERT INTO public.agent_badges (name, description, icon, requirement_type, requirement_value, badge_color) VALUES
  ('Nouveau Moissonneur', 'Première transaction complétée', '🌱', 'transactions', 1, '#90EE90'),
  ('Moissonneur Bronze', '50 transactions complétées', '🥉', 'transactions', 50, '#CD7F32'),
  ('Moissonneur Argent', '200 transactions complétées', '🥈', 'transactions', 200, '#C0C0C0'),
  ('Moissonneur Or', '500 transactions complétées', '🥇', 'transactions', 500, '#FFD700'),
  ('Moissonneur Diamant', '1000 transactions complétées', '💎', 'transactions', 1000, '#B9F2FF'),
  ('Gros Volume', '100,000 MSN de volume traité', '💰', 'volume', 100000, '#50C878'),
  ('Expert des Commissions', '5,000 MSN de commissions gagnées', '⭐', 'commissions', 5000, '#FFD700'),
  ('Leader des Parrainages', '50 filleuls directs', '👥', 'referrals', 50, '#FF6B6B')
ON CONFLICT (name) DO NOTHING;

-- Function to check and award badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_agent_id UUID)
RETURNS void AS $$
DECLARE
  v_transactions_count INTEGER;
  v_total_volume DECIMAL(15,2);
  v_total_commissions DECIMAL(15,2);
  v_referrals_count INTEGER;
  v_badge RECORD;
BEGIN
  -- Get agent stats
  SELECT 
    COUNT(*) FILTER (WHERE status = 'completed'),
    COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0),
    COALESCE(SUM(commission) FILTER (WHERE status = 'completed'), 0)
  INTO v_transactions_count, v_total_volume, v_total_commissions
  FROM public.agent_transactions
  WHERE agent_id = p_agent_id;

  -- Get referrals count
  SELECT COUNT(DISTINCT referred_id)
  INTO v_referrals_count
  FROM public.referrals
  WHERE referrer_id = p_agent_id AND level = 1;

  -- Check each badge
  FOR v_badge IN SELECT * FROM public.agent_badges LOOP
    -- Check if agent already has this badge
    IF NOT EXISTS (
      SELECT 1 FROM public.agent_earned_badges 
      WHERE agent_id = p_agent_id AND badge_id = v_badge.id
    ) THEN
      -- Check if agent qualifies
      IF (v_badge.requirement_type = 'transactions' AND v_transactions_count >= v_badge.requirement_value) OR
         (v_badge.requirement_type = 'volume' AND v_total_volume >= v_badge.requirement_value) OR
         (v_badge.requirement_type = 'commissions' AND v_total_commissions >= v_badge.requirement_value) OR
         (v_badge.requirement_type = 'referrals' AND v_referrals_count >= v_badge.requirement_value) THEN
        -- Award badge
        INSERT INTO public.agent_earned_badges (agent_id, badge_id)
        VALUES (p_agent_id, v_badge.id);
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to check badges after transactions
CREATE OR REPLACE FUNCTION public.trigger_check_badges()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    PERFORM check_and_award_badges(NEW.agent_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_badges_after_transaction
AFTER INSERT OR UPDATE ON public.agent_transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_check_badges();

-- Create automated monthly bonus job (to be run via cron)
CREATE OR REPLACE FUNCTION public.run_monthly_bonus_awards()
RETURNS void AS $$
BEGIN
  -- This will be called by a cron job
  PERFORM award_monthly_bonus();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add cron job for monthly bonuses (runs on 1st of each month at 00:00)
-- Note: This requires pg_cron extension
SELECT cron.schedule(
  'monthly-bonus-awards',
  '0 0 1 * *',
  'SELECT public.run_monthly_bonus_awards();'
);