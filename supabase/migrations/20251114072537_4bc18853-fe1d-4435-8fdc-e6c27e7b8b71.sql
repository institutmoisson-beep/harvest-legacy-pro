-- Créer la table des objectifs mensuels pour les agents
CREATE TABLE IF NOT EXISTS public.agent_monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('transactions', 'volume', 'commissions', 'orders')),
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  progress_percentage NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN target_value > 0 THEN LEAST((current_value / target_value) * 100, 100)
      ELSE 0
    END
  ) STORED,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  reward_amount NUMERIC DEFAULT 0,
  reward_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, month, goal_type)
);

-- Activer RLS
ALTER TABLE public.agent_monthly_goals ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Agents can view own goals"
  ON public.agent_monthly_goals FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "System can manage goals"
  ON public.agent_monthly_goals FOR ALL
  USING (true);

-- Créer la table des objectifs mensuels pour les commandes
CREATE TABLE IF NOT EXISTS public.order_monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('orders_count', 'orders_value', 'profit_total', 'success_rate')),
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  progress_percentage NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN target_value > 0 THEN LEAST((current_value / target_value) * 100, 100)
      ELSE 0
    END
  ) STORED,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  reward_amount NUMERIC DEFAULT 0,
  reward_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(broker_id, month, goal_type)
);

-- Activer RLS
ALTER TABLE public.order_monthly_goals ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Brokers can view own goals"
  ON public.order_monthly_goals FOR SELECT
  USING (auth.uid() = broker_id);

CREATE POLICY "System can manage order goals"
  ON public.order_monthly_goals FOR ALL
  USING (true);

-- Créer index pour les performances
CREATE INDEX idx_agent_monthly_goals_agent_month ON public.agent_monthly_goals(agent_id, month);
CREATE INDEX idx_order_monthly_goals_broker_month ON public.order_monthly_goals(broker_id, month);

-- Fonction pour initialiser les objectifs mensuels des agents
CREATE OR REPLACE FUNCTION public.initialize_agent_monthly_goals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id UUID;
  v_current_month DATE;
BEGIN
  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  -- Obtenir tous les agents actifs
  FOR v_agent_id IN 
    SELECT DISTINCT agent_id 
    FROM public.agent_transactions
    WHERE created_at >= v_current_month - INTERVAL '3 months'
  LOOP
    -- Objectif de transactions
    INSERT INTO public.agent_monthly_goals (agent_id, month, goal_type, target_value, reward_amount)
    VALUES (v_agent_id, v_current_month, 'transactions', 50, 10000)
    ON CONFLICT (agent_id, month, goal_type) DO NOTHING;
    
    -- Objectif de volume
    INSERT INTO public.agent_monthly_goals (agent_id, month, goal_type, target_value, reward_amount)
    VALUES (v_agent_id, v_current_month, 'volume', 500000, 25000)
    ON CONFLICT (agent_id, month, goal_type) DO NOTHING;
    
    -- Objectif de commissions
    INSERT INTO public.agent_monthly_goals (agent_id, month, goal_type, target_value, reward_amount)
    VALUES (v_agent_id, v_current_month, 'commissions', 50000, 15000)
    ON CONFLICT (agent_id, month, goal_type) DO NOTHING;
  END LOOP;
END;
$$;

-- Fonction pour initialiser les objectifs mensuels des commandes
CREATE OR REPLACE FUNCTION public.initialize_order_monthly_goals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_broker_id UUID;
  v_current_month DATE;
BEGIN
  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  -- Obtenir tous les brokers actifs
  FOR v_broker_id IN 
    SELECT DISTINCT broker_id 
    FROM public.orders
    WHERE created_at >= v_current_month - INTERVAL '3 months'
  LOOP
    -- Objectif de nombre de commandes
    INSERT INTO public.order_monthly_goals (broker_id, month, goal_type, target_value, reward_amount)
    VALUES (v_broker_id, v_current_month, 'orders_count', 20, 15000)
    ON CONFLICT (broker_id, month, goal_type) DO NOTHING;
    
    -- Objectif de valeur des commandes
    INSERT INTO public.order_monthly_goals (broker_id, month, goal_type, target_value, reward_amount)
    VALUES (v_broker_id, v_current_month, 'orders_value', 1000000, 30000)
    ON CONFLICT (broker_id, month, goal_type) DO NOTHING;
    
    -- Objectif de profits
    INSERT INTO public.order_monthly_goals (broker_id, month, goal_type, target_value, reward_amount)
    VALUES (v_broker_id, v_current_month, 'profit_total', 200000, 20000)
    ON CONFLICT (broker_id, month, goal_type) DO NOTHING;
  END LOOP;
END;
$$;

-- Fonction pour mettre à jour la progression des objectifs agents
CREATE OR REPLACE FUNCTION public.update_agent_goals_progress()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_goal RECORD;
  v_current_value NUMERIC;
BEGIN
  FOR v_goal IN 
    SELECT * FROM public.agent_monthly_goals 
    WHERE status = 'in_progress'
    AND month = DATE_TRUNC('month', CURRENT_DATE)::DATE
  LOOP
    -- Calculer la valeur actuelle selon le type d'objectif
    CASE v_goal.goal_type
      WHEN 'transactions' THEN
        SELECT COUNT(*) INTO v_current_value
        FROM public.agent_transactions
        WHERE agent_id = v_goal.agent_id
          AND status = 'completed'
          AND created_at >= v_goal.month;
          
      WHEN 'volume' THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_current_value
        FROM public.agent_transactions
        WHERE agent_id = v_goal.agent_id
          AND status = 'completed'
          AND created_at >= v_goal.month;
          
      WHEN 'commissions' THEN
        SELECT COALESCE(SUM(commission_amount), 0) INTO v_current_value
        FROM public.agent_commission_earnings
        WHERE agent_id = v_goal.agent_id
          AND created_at >= v_goal.month;
    END CASE;
    
    -- Mettre à jour la valeur actuelle
    UPDATE public.agent_monthly_goals
    SET current_value = v_current_value,
        status = CASE 
          WHEN v_current_value >= target_value THEN 'completed'
          ELSE 'in_progress'
        END,
        updated_at = now()
    WHERE id = v_goal.id;
    
    -- Si l'objectif vient d'être complété, attribuer la récompense
    IF v_current_value >= v_goal.target_value AND NOT v_goal.reward_claimed THEN
      -- Créditer le portefeuille
      UPDATE public.wallets
      SET balance = balance + v_goal.reward_amount
      WHERE user_id = v_goal.agent_id;
      
      -- Marquer la récompense comme réclamée
      UPDATE public.agent_monthly_goals
      SET reward_claimed = true
      WHERE id = v_goal.id;
      
      -- Créer une notification
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        v_goal.agent_id,
        '🎯 Objectif Atteint!',
        'Félicitations! Vous avez atteint votre objectif mensuel et gagné ' || v_goal.reward_amount || ' FCFA!',
        'general'
      );
    END IF;
  END LOOP;
END;
$$;

-- Fonction pour mettre à jour la progression des objectifs commandes
CREATE OR REPLACE FUNCTION public.update_order_goals_progress()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_goal RECORD;
  v_current_value NUMERIC;
BEGIN
  FOR v_goal IN 
    SELECT * FROM public.order_monthly_goals 
    WHERE status = 'in_progress'
    AND month = DATE_TRUNC('month', CURRENT_DATE)::DATE
  LOOP
    -- Calculer la valeur actuelle selon le type d'objectif
    CASE v_goal.goal_type
      WHEN 'orders_count' THEN
        SELECT COUNT(*) INTO v_current_value
        FROM public.orders
        WHERE broker_id = v_goal.broker_id
          AND status IN ('completed', 'validated')
          AND created_at >= v_goal.month;
          
      WHEN 'orders_value' THEN
        SELECT COALESCE(SUM(purchase_price * quantity), 0) INTO v_current_value
        FROM public.orders
        WHERE broker_id = v_goal.broker_id
          AND status IN ('completed', 'validated')
          AND created_at >= v_goal.month;
          
      WHEN 'profit_total' THEN
        SELECT COALESCE(SUM(profit), 0) INTO v_current_value
        FROM public.orders
        WHERE broker_id = v_goal.broker_id
          AND status IN ('completed', 'validated')
          AND created_at >= v_goal.month;
    END CASE;
    
    -- Mettre à jour la valeur actuelle
    UPDATE public.order_monthly_goals
    SET current_value = v_current_value,
        status = CASE 
          WHEN v_current_value >= target_value THEN 'completed'
          ELSE 'in_progress'
        END,
        updated_at = now()
    WHERE id = v_goal.id;
    
    -- Si l'objectif vient d'être complété, attribuer la récompense
    IF v_current_value >= v_goal.target_value AND NOT v_goal.reward_claimed THEN
      -- Créditer le portefeuille
      UPDATE public.wallets
      SET balance = balance + v_goal.reward_amount
      WHERE user_id = v_goal.broker_id;
      
      -- Marquer la récompense comme réclamée
      UPDATE public.order_monthly_goals
      SET reward_claimed = true
      WHERE id = v_goal.id;
      
      -- Créer une notification
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        v_goal.broker_id,
        '🎯 Objectif Commandes Atteint!',
        'Félicitations! Vous avez atteint votre objectif de commandes et gagné ' || v_goal.reward_amount || ' FCFA!',
        'general'
      );
    END IF;
  END LOOP;
END;
$$;

-- Trigger pour mettre à jour automatiquement les objectifs lors d'une nouvelle transaction agent
CREATE OR REPLACE FUNCTION public.trigger_update_agent_goals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    PERFORM public.update_agent_goals_progress();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_agent_goals_on_transaction
AFTER INSERT OR UPDATE ON public.agent_transactions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_agent_goals();

-- Trigger pour mettre à jour automatiquement les objectifs lors d'une nouvelle commande
CREATE OR REPLACE FUNCTION public.trigger_update_order_goals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('completed', 'validated') THEN
    PERFORM public.update_order_goals_progress();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_order_goals_on_order
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_order_goals();

-- Initialiser les objectifs pour le mois en cours
SELECT public.initialize_agent_monthly_goals();
SELECT public.initialize_order_monthly_goals();