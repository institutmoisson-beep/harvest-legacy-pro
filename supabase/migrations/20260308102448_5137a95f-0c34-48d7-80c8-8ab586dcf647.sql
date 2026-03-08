
-- MSN Immo Module: Reverse-offer real estate platform

-- Property types enum
CREATE TYPE public.property_type AS ENUM ('apartment', 'studio', 'room', 'hotel', 'villa', 'house', 'residence');

-- Offer status enum  
CREATE TYPE public.immo_offer_status AS ENUM ('pending', 'accepted', 'refused', 'expired', 'cancelled', 'confirmed', 'completed');

-- Host/Residence listings
CREATE TABLE public.immo_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  property_type public.property_type NOT NULL DEFAULT 'apartment',
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Mali',
  latitude NUMERIC,
  longitude NUMERIC,
  price_per_night NUMERIC NOT NULL DEFAULT 0,
  max_guests INTEGER NOT NULL DEFAULT 2,
  bedrooms INTEGER DEFAULT 1,
  bathrooms INTEGER DEFAULT 1,
  amenities TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  rating_avg NUMERIC DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  cancellation_policy TEXT DEFAULT 'flexible',
  check_in_time TEXT DEFAULT '14:00',
  check_out_time TEXT DEFAULT '11:00',
  rules TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Availability calendar for listings
CREATE TABLE public.immo_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.immo_listings(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  custom_price NUMERIC,
  UNIQUE(listing_id, date)
);

-- Client offers (reverse offer system)
CREATE TABLE public.immo_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.immo_listings(id) ON DELETE CASCADE,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INTEGER NOT NULL DEFAULT 1,
  proposed_budget NUMERIC NOT NULL,
  property_type_wanted public.property_type,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Mali',
  latitude NUMERIC,
  longitude NUMERIC,
  radius_km NUMERIC DEFAULT 10,
  amenities_wanted TEXT[] DEFAULT '{}',
  message TEXT,
  status public.immo_offer_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Host responses to offers
CREATE TABLE public.immo_offer_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES public.immo_offers(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.immo_listings(id) ON DELETE CASCADE NOT NULL,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  proposed_price NUMERIC NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bookings / Reservations
CREATE TABLE public.immo_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES public.immo_offers(id),
  response_id UUID REFERENCES public.immo_offer_responses(id),
  listing_id UUID REFERENCES public.immo_listings(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC NOT NULL,
  platform_commission NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  booking_status TEXT DEFAULT 'confirmed',
  cancellation_reason TEXT,
  cancelled_by UUID,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reviews
CREATE TABLE public.immo_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.immo_bookings(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reviewee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.immo_listings(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Immo messages (chat between client and host)
CREATE TABLE public.immo_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.immo_bookings(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.immo_offers(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Immo transactions
CREATE TABLE public.immo_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.immo_bookings(id) ON DELETE CASCADE NOT NULL,
  payer_id UUID REFERENCES auth.users(id) NOT NULL,
  payee_id UUID REFERENCES auth.users(id) NOT NULL,
  amount NUMERIC NOT NULL,
  commission_amount NUMERIC DEFAULT 0,
  transaction_type TEXT NOT NULL DEFAULT 'booking_payment',
  status TEXT DEFAULT 'pending',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add 'driver' to app_role enum if not exists
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'driver';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS policies
ALTER TABLE public.immo_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.immo_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.immo_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.immo_offer_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.immo_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.immo_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.immo_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.immo_transactions ENABLE ROW LEVEL SECURITY;

-- Listings: public read, host write
CREATE POLICY "Anyone can view active listings" ON public.immo_listings FOR SELECT USING (is_active = true);
CREATE POLICY "Hosts manage own listings" ON public.immo_listings FOR ALL TO authenticated USING (host_id = auth.uid()) WITH CHECK (host_id = auth.uid());
CREATE POLICY "Admins manage all listings" ON public.immo_listings FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80));

-- Availability: public read, host write
CREATE POLICY "Anyone can view availability" ON public.immo_availability FOR SELECT USING (true);
CREATE POLICY "Hosts manage own availability" ON public.immo_availability FOR ALL TO authenticated 
  USING (listing_id IN (SELECT id FROM public.immo_listings WHERE host_id = auth.uid()))
  WITH CHECK (listing_id IN (SELECT id FROM public.immo_listings WHERE host_id = auth.uid()));

-- Offers: clients manage own, hosts can view offers in their city
CREATE POLICY "Clients manage own offers" ON public.immo_offers FOR ALL TO authenticated USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());
CREATE POLICY "Authenticated can view pending offers" ON public.immo_offers FOR SELECT TO authenticated USING (status = 'pending');
CREATE POLICY "Admins manage all offers" ON public.immo_offers FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80));

-- Offer responses
CREATE POLICY "Hosts manage own responses" ON public.immo_offer_responses FOR ALL TO authenticated USING (host_id = auth.uid()) WITH CHECK (host_id = auth.uid());
CREATE POLICY "Clients view responses to their offers" ON public.immo_offer_responses FOR SELECT TO authenticated 
  USING (offer_id IN (SELECT id FROM public.immo_offers WHERE client_id = auth.uid()));
CREATE POLICY "Admins manage all responses" ON public.immo_offer_responses FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80));

-- Bookings
CREATE POLICY "Users view own bookings" ON public.immo_bookings FOR SELECT TO authenticated 
  USING (client_id = auth.uid() OR host_id = auth.uid());
CREATE POLICY "Authenticated insert bookings" ON public.immo_bookings FOR INSERT TO authenticated WITH CHECK (client_id = auth.uid());
CREATE POLICY "Users update own bookings" ON public.immo_bookings FOR UPDATE TO authenticated USING (client_id = auth.uid() OR host_id = auth.uid());
CREATE POLICY "Admins manage all bookings" ON public.immo_bookings FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80));

-- Reviews
CREATE POLICY "Anyone can view published reviews" ON public.immo_reviews FOR SELECT USING (is_published = true);
CREATE POLICY "Users create own reviews" ON public.immo_reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "Admins manage all reviews" ON public.immo_reviews FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80));

-- Messages
CREATE POLICY "Users view own messages" ON public.immo_messages FOR SELECT TO authenticated 
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users send messages" ON public.immo_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Users mark own messages read" ON public.immo_messages FOR UPDATE TO authenticated USING (receiver_id = auth.uid());

-- Transactions
CREATE POLICY "Users view own transactions" ON public.immo_transactions FOR SELECT TO authenticated 
  USING (payer_id = auth.uid() OR payee_id = auth.uid());
CREATE POLICY "Admins manage all transactions" ON public.immo_transactions FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80));
