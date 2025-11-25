-- Enhance user_locations table with better indexing and triggers

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_locations_is_active 
ON public.user_locations(is_active);

CREATE INDEX IF NOT EXISTS idx_user_locations_user_id 
ON public.user_locations(user_id);

CREATE INDEX IF NOT EXISTS idx_user_locations_updated_at 
ON public.user_locations(updated_at DESC);

-- Create index for geographic proximity queries
CREATE INDEX IF NOT EXISTS idx_user_locations_coordinates 
ON public.user_locations(latitude, longitude);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_locations_updated_at_trigger 
ON public.user_locations;

CREATE TRIGGER update_user_locations_updated_at_trigger
BEFORE UPDATE ON public.user_locations
FOR EACH ROW
EXECUTE FUNCTION update_user_locations_updated_at();

-- Add function to get nearby users for deliveries
CREATE OR REPLACE FUNCTION get_nearby_users(
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_radius_km NUMERIC DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  latitude NUMERIC,
  longitude NUMERIC,
  accuracy NUMERIC,
  distance_km NUMERIC
) AS $$
DECLARE
  v_earth_radius_km NUMERIC := 6371;
BEGIN
  RETURN QUERY
  SELECT 
    ul.id,
    ul.user_id,
    ul.latitude,
    ul.longitude,
    ul.accuracy,
    (v_earth_radius_km * 
      2 * 
      ASIN(SQRT(
        SIN(RADIANS(p_latitude - ul.latitude) / 2)^2 + 
        COS(RADIANS(p_latitude)) * 
        COS(RADIANS(ul.latitude)) * 
        SIN(RADIANS(p_longitude - ul.longitude) / 2)^2
      ))
    )::NUMERIC(10,2) AS distance_km
  FROM public.user_locations ul
  WHERE ul.is_active = true
    AND (v_earth_radius_km * 
      2 * 
      ASIN(SQRT(
        SIN(RADIANS(p_latitude - ul.latitude) / 2)^2 + 
        COS(RADIANS(p_latitude)) * 
        COS(RADIANS(ul.latitude)) * 
        SIN(RADIANS(p_longitude - ul.longitude) / 2)^2
      )) <= p_radius_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add function to get deliveries near a location
CREATE OR REPLACE FUNCTION get_nearby_deliveries(
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_radius_km NUMERIC DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  customer_name VARCHAR,
  customer_phone VARCHAR,
  customer_address VARCHAR,
  customer_city VARCHAR,
  customer_latitude NUMERIC,
  customer_longitude NUMERIC,
  delivery_commission NUMERIC,
  status VARCHAR,
  distance_km NUMERIC
) AS $$
DECLARE
  v_earth_radius_km NUMERIC := 6371;
BEGIN
  RETURN QUERY
  SELECT 
    dp.id,
    dp.customer_name,
    dp.customer_phone,
    dp.customer_address,
    dp.customer_city,
    dp.customer_latitude,
    dp.customer_longitude,
    dp.delivery_commission,
    dp.status,
    (v_earth_radius_km * 
      2 * 
      ASIN(SQRT(
        SIN(RADIANS(p_latitude - dp.customer_latitude) / 2)^2 + 
        COS(RADIANS(p_latitude)) * 
        COS(RADIANS(dp.customer_latitude)) * 
        SIN(RADIANS(p_longitude - dp.customer_longitude) / 2)^2
      ))
    )::NUMERIC(10,2) AS distance_km
  FROM public.delivery_packages dp
  WHERE dp.delivery_method = 'community_delivery'
    AND dp.status = 'pending'
    AND dp.deliverer_id IS NULL
    AND dp.customer_latitude IS NOT NULL
    AND dp.customer_longitude IS NOT NULL
    AND (v_earth_radius_km * 
      2 * 
      ASIN(SQRT(
        SIN(RADIANS(p_latitude - dp.customer_latitude) / 2)^2 + 
        COS(RADIANS(p_latitude)) * 
        COS(RADIANS(dp.customer_latitude)) * 
        SIN(RADIANS(p_longitude - dp.customer_longitude) / 2)^2
      )) <= p_radius_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update RLS policy to allow admins to view all locations
DROP POLICY IF EXISTS "Users can view shared locations" ON public.user_locations;
DROP POLICY IF EXISTS "Users can view own location" ON public.user_locations;

CREATE POLICY "Users can view their own location"
ON public.user_locations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view locations shared with them"
ON public.user_locations
FOR SELECT
USING (auth.uid() = shared_with_user_id AND shared_with_user_id IS NOT NULL);

CREATE POLICY "Users can view active locations for deliveries"
ON public.user_locations
FOR SELECT
USING (
  is_active = true AND
  (
    SELECT COUNT(*) FROM profiles 
    WHERE id = auth.uid() AND role = 'agent'
  ) > 0
);

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can share own location" ON public.user_locations;
DROP POLICY IF EXISTS "Users can update own location" ON public.user_locations;
DROP POLICY IF EXISTS "Users can delete own location" ON public.user_locations;

-- Re-create with cleaner logic
CREATE POLICY "Users can insert own location"
ON public.user_locations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own location"
ON public.user_locations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own location"
ON public.user_locations
FOR DELETE
USING (auth.uid() = user_id);
