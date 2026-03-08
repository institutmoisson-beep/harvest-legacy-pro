
-- Add driver role to access level function
CREATE OR REPLACE FUNCTION public.get_role_access_level(_role app_role)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT CASE _role::text
    WHEN 'admin' THEN 100
    WHEN 'financier' THEN 80
    WHEN 'country_representative' THEN 70
    WHEN 'city_representative' THEN 65
    WHEN 'merchant' THEN 60
    WHEN 'moderator' THEN 50
    WHEN 'agent' THEN 50
    WHEN 'driver' THEN 40
    WHEN 'user' THEN 30
    ELSE 30
  END;
$$;
