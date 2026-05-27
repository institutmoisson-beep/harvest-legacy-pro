CREATE OR REPLACE FUNCTION public.get_available_delivery_packages()
RETURNS TABLE (
  id uuid,
  customer_city text,
  approximate_latitude double precision,
  approximate_longitude double precision,
  delivery_commission numeric,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    dp.id,
    dp.customer_city,
    round(dp.customer_latitude::numeric, 2)::double precision AS approximate_latitude,
    round(dp.customer_longitude::numeric, 2)::double precision AS approximate_longitude,
    dp.delivery_commission,
    dp.created_at
  FROM public.delivery_packages dp
  WHERE dp.delivery_method = 'community_delivery'
    AND dp.status = 'pending'
    AND dp.deliverer_id IS NULL
    AND dp.customer_latitude IS NOT NULL
    AND dp.customer_longitude IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_delivery_packages() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_delivery_packages() TO service_role;

DROP VIEW IF EXISTS public.available_delivery_packages_public;