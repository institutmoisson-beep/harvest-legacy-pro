
-- Transport Module: Professional Ride-Hailing System

-- Enum for vehicle types
CREATE TYPE public.vehicle_type AS ENUM ('moto', 'vehicule', 'mini_remorque', 'remorque');

-- Enum for service class
CREATE TYPE public.service_class AS ENUM ('standard', 'vip', 'vvip');

-- Enum for ride status
CREATE TYPE public.ride_status AS ENUM ('pending', 'accepted', 'driver_arriving', 'in_progress', 'completed', 'cancelled');

-- Enum for driver status
CREATE TYPE public.driver_status AS ENUM ('available', 'busy', 'offline', 'suspended');

-- 1. Transport Drivers
CREATE TABLE public.transport_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  identity_number TEXT NOT NULL,
  identity_document_url TEXT,
  license_number TEXT NOT NULL,
  license_expiry DATE,
  license_document_url TEXT,
  photo_url TEXT,
  rating NUMERIC(3,2) DEFAULT 5.00,
  total_rides INTEGER DEFAULT 0,
  total_earnings NUMERIC(15,2) DEFAULT 0,
  status public.driver_status DEFAULT 'offline',
  current_latitude NUMERIC(10,7),
  current_longitude NUMERIC(10,7),
  last_location_update TIMESTAMPTZ,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Transport Vehicles
CREATE TABLE public.transport_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.transport_drivers(id) ON DELETE CASCADE NOT NULL,
  vehicle_type public.vehicle_type NOT NULL,
  service_class public.service_class DEFAULT 'standard',
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT,
  year INTEGER,
  plate_number TEXT NOT NULL UNIQUE,
  insurance_number TEXT,
  insurance_expiry DATE,
  vehicle_photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Transport Pricing Rules
CREATE TABLE public.transport_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type public.vehicle_type NOT NULL,
  service_class public.service_class NOT NULL,
  base_fare NUMERIC(10,2) NOT NULL DEFAULT 500,
  price_per_km NUMERIC(10,2) NOT NULL DEFAULT 150,
  price_per_minute NUMERIC(10,2) NOT NULL DEFAULT 50,
  min_fare NUMERIC(10,2) NOT NULL DEFAULT 500,
  night_multiplier NUMERIC(4,2) DEFAULT 1.50,
  night_start_hour INTEGER DEFAULT 22,
  night_end_hour INTEGER DEFAULT 6,
  weekend_multiplier NUMERIC(4,2) DEFAULT 1.20,
  holiday_multiplier NUMERIC(4,2) DEFAULT 1.50,
  strike_multiplier NUMERIC(4,2) DEFAULT 2.00,
  peak_hour_multiplier NUMERIC(4,2) DEFAULT 1.30,
  peak_start_hour INTEGER DEFAULT 7,
  peak_end_hour INTEGER DEFAULT 9,
  peak_evening_start INTEGER DEFAULT 17,
  peak_evening_end INTEGER DEFAULT 19,
  is_strike_active BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vehicle_type, service_class)
);

-- 4. Transport Rides
CREATE TABLE public.transport_rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES public.transport_drivers(id),
  vehicle_type public.vehicle_type NOT NULL,
  service_class public.service_class DEFAULT 'standard',
  pickup_address TEXT NOT NULL,
  pickup_latitude NUMERIC(10,7) NOT NULL,
  pickup_longitude NUMERIC(10,7) NOT NULL,
  dropoff_address TEXT NOT NULL,
  dropoff_latitude NUMERIC(10,7) NOT NULL,
  dropoff_longitude NUMERIC(10,7) NOT NULL,
  distance_km NUMERIC(8,2),
  duration_minutes INTEGER,
  estimated_fare NUMERIC(10,2),
  final_fare NUMERIC(10,2),
  fare_multiplier NUMERIC(4,2) DEFAULT 1.00,
  fare_breakdown JSONB,
  status public.ride_status DEFAULT 'pending',
  payment_method TEXT DEFAULT 'wallet',
  payment_status TEXT DEFAULT 'pending',
  rider_rating INTEGER,
  rider_review TEXT,
  driver_rating INTEGER,
  driver_review TEXT,
  cancellation_reason TEXT,
  cancelled_by UUID,
  accepted_at TIMESTAMPTZ,
  driver_arrived_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  msn_channel_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Transport Ride Messages (auto-created chat channel)
CREATE TABLE public.transport_ride_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES public.transport_rides(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Transport Settings (admin-managed API keys etc.)
CREATE TABLE public.transport_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Driver location history for tracking
CREATE TABLE public.transport_driver_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.transport_drivers(id) ON DELETE CASCADE NOT NULL,
  ride_id UUID REFERENCES public.transport_rides(id),
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  heading NUMERIC(5,2),
  speed NUMERIC(6,2),
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.transport_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_ride_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_driver_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Transport Drivers
CREATE POLICY "Admins can manage drivers" ON public.transport_drivers
  FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80));
CREATE POLICY "Drivers can view own profile" ON public.transport_drivers
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Drivers can update own location/status" ON public.transport_drivers
  FOR UPDATE TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view available drivers" ON public.transport_drivers
  FOR SELECT TO authenticated USING (is_approved = true AND status = 'available');

-- Transport Vehicles
CREATE POLICY "Admins can manage vehicles" ON public.transport_vehicles
  FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80));
CREATE POLICY "Anyone can view active vehicles" ON public.transport_vehicles
  FOR SELECT TO authenticated USING (is_active = true);

-- Transport Pricing
CREATE POLICY "Anyone can view active pricing" ON public.transport_pricing
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage pricing" ON public.transport_pricing
  FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80));

-- Transport Rides
CREATE POLICY "Riders can view own rides" ON public.transport_rides
  FOR SELECT TO authenticated USING (rider_id = auth.uid());
CREATE POLICY "Riders can create rides" ON public.transport_rides
  FOR INSERT TO authenticated WITH CHECK (rider_id = auth.uid());
CREATE POLICY "Riders can update own rides" ON public.transport_rides
  FOR UPDATE TO authenticated USING (rider_id = auth.uid());
CREATE POLICY "Drivers can view pending rides" ON public.transport_rides
  FOR SELECT TO authenticated USING (
    status = 'pending' 
    OR driver_id IN (SELECT id FROM public.transport_drivers WHERE user_id = auth.uid())
  );
CREATE POLICY "Drivers can update assigned rides" ON public.transport_rides
  FOR UPDATE TO authenticated USING (
    driver_id IN (SELECT id FROM public.transport_drivers WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins can manage all rides" ON public.transport_rides
  FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80));

-- Ride Messages
CREATE POLICY "Ride participants can view messages" ON public.transport_ride_messages
  FOR SELECT TO authenticated USING (
    ride_id IN (
      SELECT id FROM public.transport_rides 
      WHERE rider_id = auth.uid() 
      OR driver_id IN (SELECT id FROM public.transport_drivers WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "Ride participants can send messages" ON public.transport_ride_messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Admins can view all messages" ON public.transport_ride_messages
  FOR SELECT TO authenticated USING (public.has_access_level(auth.uid(), 80));

-- Transport Settings
CREATE POLICY "Admins can manage settings" ON public.transport_settings
  FOR ALL TO authenticated USING (public.has_access_level(auth.uid(), 80));
CREATE POLICY "Anyone can view settings" ON public.transport_settings
  FOR SELECT TO authenticated USING (true);

-- Driver Locations
CREATE POLICY "Drivers can insert own location" ON public.transport_driver_locations
  FOR INSERT TO authenticated WITH CHECK (
    driver_id IN (SELECT id FROM public.transport_drivers WHERE user_id = auth.uid())
  );
CREATE POLICY "Ride participants can view driver location" ON public.transport_driver_locations
  FOR SELECT TO authenticated USING (
    ride_id IN (
      SELECT id FROM public.transport_rides WHERE rider_id = auth.uid()
    ) OR driver_id IN (SELECT id FROM public.transport_drivers WHERE user_id = auth.uid())
    OR public.has_access_level(auth.uid(), 80)
  );

-- Insert default pricing
INSERT INTO public.transport_pricing (vehicle_type, service_class, base_fare, price_per_km, price_per_minute, min_fare)
VALUES
  ('moto', 'standard', 300, 100, 25, 300),
  ('moto', 'vip', 500, 150, 40, 500),
  ('vehicule', 'standard', 500, 150, 50, 500),
  ('vehicule', 'vip', 1000, 250, 75, 1000),
  ('vehicule', 'vvip', 2000, 400, 100, 2000),
  ('mini_remorque', 'standard', 1500, 300, 80, 1500),
  ('remorque', 'standard', 3000, 500, 120, 3000);

-- Insert default Mapbox token
INSERT INTO public.transport_settings (setting_key, setting_value, description)
VALUES ('mapbox_public_token', 'pk.eyJ1IjoiY2VsdnVzIiwiYSI6ImNtZjVvcm1zejA2dWsyanM5cGdxOTM5NWkifQ.1I0VU-32Ek6bg3sZvpUS0w', 'Token public Mapbox pour la géolocalisation');
