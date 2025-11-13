-- Table pour le calendrier des paiements de tontines
CREATE TABLE IF NOT EXISTS public.tontine_payment_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tontine_id UUID NOT NULL REFERENCES public.tontines(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'late', 'missed'
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour le calendrier
CREATE INDEX IF NOT EXISTS idx_tontine_schedule_tontine ON public.tontine_payment_schedule(tontine_id);
CREATE INDEX IF NOT EXISTS idx_tontine_schedule_due_date ON public.tontine_payment_schedule(due_date);
CREATE INDEX IF NOT EXISTS idx_tontine_schedule_status ON public.tontine_payment_schedule(status);

-- RLS pour calendrier tontine
ALTER TABLE public.tontine_payment_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view schedule"
  ON public.tontine_payment_schedule FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tontine_participants tp
    WHERE tp.tontine_id = tontine_payment_schedule.tontine_id
    AND tp.user_id = auth.uid()
  ));

CREATE POLICY "System can insert schedule"
  ON public.tontine_payment_schedule FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update schedule"
  ON public.tontine_payment_schedule FOR UPDATE
  USING (true);

-- Table pour les badges de réussite
CREATE TABLE IF NOT EXISTS public.achievement_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  badge_type TEXT NOT NULL, -- 'investor', 'shop_owner', 'referral', 'tontine', 'general'
  requirement_type TEXT NOT NULL, -- 'investment_total', 'shop_sales', 'referrals_count', 'tontine_cycles'
  requirement_value NUMERIC NOT NULL,
  icon TEXT NOT NULL,
  badge_color TEXT DEFAULT '#FFD700',
  reward_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table pour les badges gagnés par les utilisateurs
CREATE TABLE IF NOT EXISTS public.user_earned_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.achievement_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reward_claimed BOOLEAN DEFAULT false,
  UNIQUE(user_id, badge_id)
);

-- Index pour badges
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_earned_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON public.user_earned_badges(badge_id);

-- RLS pour badges
ALTER TABLE public.achievement_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_earned_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view badges"
  ON public.achievement_badges FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage badges"
  ON public.achievement_badges FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own earned badges"
  ON public.user_earned_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can award badges"
  ON public.user_earned_badges FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own badges"
  ON public.user_earned_badges FOR UPDATE
  USING (auth.uid() = user_id);

-- Table pour les conversations du chat admin
CREATE TABLE IF NOT EXISTS public.admin_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  assigned_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table pour les messages du chat admin
CREATE TABLE IF NOT EXISTS public.admin_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.admin_chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour chat admin
CREATE INDEX IF NOT EXISTS idx_chat_conv_user ON public.admin_chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_status ON public.admin_chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conv_assigned ON public.admin_chat_conversations(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON public.admin_chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_created ON public.admin_chat_messages(created_at);

-- RLS pour chat admin
ALTER TABLE public.admin_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON public.admin_chat_conversations FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create conversations"
  ON public.admin_chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update conversations"
  ON public.admin_chat_conversations FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own messages"
  ON public.admin_chat_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.admin_chat_conversations
      WHERE user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Users can send messages"
  ON public.admin_chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND conversation_id IN (
      SELECT id FROM public.admin_chat_conversations
      WHERE user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- Fonction pour mettre à jour last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.admin_chat_conversations
  SET last_message_at = now(),
      updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour mettre à jour last_message_at
DROP TRIGGER IF EXISTS update_conversation_on_message ON public.admin_chat_messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON public.admin_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Fonction pour vérifier et attribuer les badges
CREATE OR REPLACE FUNCTION check_and_award_achievement_badges(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_badge RECORD;
  v_total_invested NUMERIC;
  v_total_shop_sales NUMERIC;
  v_referrals_count INTEGER;
  v_tontine_cycles INTEGER;
BEGIN
  -- Calculer les statistiques de l'utilisateur
  SELECT COALESCE(SUM(investment_amount), 0) INTO v_total_invested
  FROM public.investment_products
  WHERE investor_id = p_user_id;

  SELECT COALESCE(SUM(so.total_amount), 0) INTO v_total_shop_sales
  FROM public.shop_orders so
  JOIN public.shop_settings ss ON so.shop_id = ss.id
  WHERE ss.user_id = p_user_id AND so.order_status = 'confirmed';

  SELECT COUNT(DISTINCT referred_id) INTO v_referrals_count
  FROM public.referrals
  WHERE referrer_id = p_user_id AND level = 1;

  SELECT COUNT(DISTINCT tp.tontine_id) INTO v_tontine_cycles
  FROM public.tontine_participants tp
  WHERE tp.user_id = p_user_id;

  -- Vérifier chaque badge
  FOR v_badge IN SELECT * FROM public.achievement_badges LOOP
    -- Vérifier si l'utilisateur a déjà ce badge
    IF NOT EXISTS (
      SELECT 1 FROM public.user_earned_badges
      WHERE user_id = p_user_id AND badge_id = v_badge.id
    ) THEN
      -- Vérifier si l'utilisateur qualifie pour le badge
      IF (v_badge.requirement_type = 'investment_total' AND v_total_invested >= v_badge.requirement_value) OR
         (v_badge.requirement_type = 'shop_sales' AND v_total_shop_sales >= v_badge.requirement_value) OR
         (v_badge.requirement_type = 'referrals_count' AND v_referrals_count >= v_badge.requirement_value) OR
         (v_badge.requirement_type = 'tontine_cycles' AND v_tontine_cycles >= v_badge.requirement_value) THEN
        
        -- Attribuer le badge
        INSERT INTO public.user_earned_badges (user_id, badge_id)
        VALUES (p_user_id, v_badge.id);

        -- Créer une notification
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
          p_user_id,
          'Nouveau Badge Gagné! 🏆',
          'Félicitations! Vous avez gagné le badge: ' || v_badge.name,
          'general'
        );

        -- Si le badge a une récompense, l'ajouter au portefeuille
        IF v_badge.reward_amount > 0 THEN
          UPDATE public.wallets
          SET balance = balance + v_badge.reward_amount
          WHERE user_id = p_user_id;

          INSERT INTO public.wallet_transactions (
            from_user_id,
            to_user_id,
            amount,
            transaction_type,
            status,
            description
          ) VALUES (
            NULL,
            p_user_id,
            v_badge.reward_amount,
            'badge_reward',
            'completed',
            'Récompense pour le badge: ' || v_badge.name
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Insérer quelques badges par défaut
INSERT INTO public.achievement_badges (name, description, badge_type, requirement_type, requirement_value, icon, badge_color, reward_amount)
VALUES
  ('Premier Investissement', 'Effectuez votre premier investissement', 'investor', 'investment_total', 1, '🌱', '#4CAF50', 5),
  ('Investisseur Bronze', 'Investissez au moins 100,000 FCFA', 'investor', 'investment_total', 100000, '🥉', '#CD7F32', 10),
  ('Investisseur Argent', 'Investissez au moins 500,000 FCFA', 'investor', 'investment_total', 500000, '🥈', '#C0C0C0', 25),
  ('Investisseur Or', 'Investissez au moins 1,000,000 FCFA', 'investor', 'investment_total', 1000000, '🥇', '#FFD700', 50),
  ('Marchand Actif', 'Réalisez vos premières ventes de boutique', 'shop_owner', 'shop_sales', 1, '🏪', '#2196F3', 5),
  ('Super Vendeur', 'Atteignez 500,000 FCFA de ventes', 'shop_owner', 'shop_sales', 500000, '💰', '#FFC107', 30),
  ('Parrain', 'Parrainez au moins 5 personnes', 'referral', 'referrals_count', 5, '👥', '#9C27B0', 15),
  ('Super Parrain', 'Parrainez au moins 20 personnes', 'referral', 'referrals_count', 20, '👨‍👩‍👧‍👦', '#673AB7', 40),
  ('Membre Tontine', 'Participez à votre première tontine', 'tontine', 'tontine_cycles', 1, '🎲', '#FF5722', 5),
  ('Expert Tontine', 'Participez à au moins 5 tontines', 'tontine', 'tontine_cycles', 5, '🎰', '#F44336', 20)
ON CONFLICT (name) DO NOTHING;