
-- ============================================
-- MODULE BILLETTERIE (TICKETING)
-- ============================================

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  location TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  event_end_date TIMESTAMPTZ,
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  max_capacity INTEGER,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  tier TEXT DEFAULT 'standard' CHECK (tier IN ('standard', 'vip', 'vvip')),
  price NUMERIC NOT NULL DEFAULT 0,
  quantity_available INTEGER NOT NULL DEFAULT 100,
  quantity_sold INTEGER DEFAULT 0,
  description TEXT,
  benefits TEXT[],
  payment_link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ticket_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id UUID REFERENCES public.ticket_types(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  buyer_phone TEXT,
  quantity INTEGER DEFAULT 1,
  total_amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'wallet',
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  ticket_code TEXT UNIQUE DEFAULT 'TKT-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8)),
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- MODULE CAGNOTTE (FUNDRAISING)
-- ============================================

CREATE TABLE public.fundraisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  goal_amount NUMERIC NOT NULL DEFAULT 0,
  current_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'FCFA',
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'paused')),
  category TEXT DEFAULT 'general',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contributors_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  payment_link TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.fundraiser_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fundraiser_id UUID REFERENCES public.fundraisers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contributor_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  payment_method TEXT DEFAULT 'wallet',
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Function to auto-update fundraiser totals
CREATE OR REPLACE FUNCTION public.update_fundraiser_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.payment_status = 'completed' AND (OLD IS NULL OR OLD.payment_status != 'completed') THEN
    UPDATE public.fundraisers
    SET current_amount = current_amount + NEW.amount,
        contributors_count = contributors_count + 1,
        updated_at = now()
    WHERE id = NEW.fundraiser_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_contribution_completed
  AFTER INSERT OR UPDATE ON public.fundraiser_contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_fundraiser_totals();

-- RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundraisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundraiser_contributions ENABLE ROW LEVEL SECURITY;

-- Events: public read, admin write
CREATE POLICY "Anyone can view published events" ON public.events FOR SELECT USING (status = 'published' OR created_by = auth.uid() OR public.has_access_level(auth.uid(), 80));
CREATE POLICY "Admins can manage events" ON public.events FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80)) WITH CHECK (public.has_access_level(auth.uid(), 80));
CREATE POLICY "Admins can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.has_access_level(auth.uid(), 80));

-- Ticket types: public read
CREATE POLICY "Anyone can view ticket types" ON public.ticket_types FOR SELECT USING (true);
CREATE POLICY "Admins manage ticket types" ON public.ticket_types FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80)) WITH CHECK (public.has_access_level(auth.uid(), 80));

-- Ticket purchases
CREATE POLICY "Users can view own purchases" ON public.ticket_purchases FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_access_level(auth.uid(), 80));
CREATE POLICY "Authenticated users can buy tickets" ON public.ticket_purchases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins manage purchases" ON public.ticket_purchases FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80)) WITH CHECK (public.has_access_level(auth.uid(), 80));

-- Fundraisers: public read active, admin write
CREATE POLICY "Anyone can view active fundraisers" ON public.fundraisers FOR SELECT USING (is_public = true OR created_by = auth.uid() OR public.has_access_level(auth.uid(), 80));
CREATE POLICY "Admins manage fundraisers" ON public.fundraisers FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80)) WITH CHECK (public.has_access_level(auth.uid(), 80));
CREATE POLICY "Admins insert fundraisers" ON public.fundraisers FOR INSERT TO authenticated WITH CHECK (public.has_access_level(auth.uid(), 80));

-- Contributions: user can view own, admin all
CREATE POLICY "Users view own contributions" ON public.fundraiser_contributions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_access_level(auth.uid(), 80));
CREATE POLICY "Authenticated users can contribute" ON public.fundraiser_contributions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins manage contributions" ON public.fundraiser_contributions FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80)) WITH CHECK (public.has_access_level(auth.uid(), 80));
