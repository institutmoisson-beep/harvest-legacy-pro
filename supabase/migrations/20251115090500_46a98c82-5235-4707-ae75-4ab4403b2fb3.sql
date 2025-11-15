-- Add access_level column to user_roles if not exists
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS access_level integer DEFAULT 30;

-- Create function to map existing roles to access levels
CREATE OR REPLACE FUNCTION public.get_role_access_level(_role app_role)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _role::text
    WHEN 'admin' THEN 100
    WHEN 'financier' THEN 80
    WHEN 'moderator' THEN 50
    WHEN 'merchant' THEN 60
    WHEN 'agent' THEN 50
    WHEN 'user' THEN 30
    ELSE 30
  END;
$$;

-- Create trigger function to auto-set access_level
CREATE OR REPLACE FUNCTION public.set_access_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.access_level := public.get_role_access_level(NEW.role);
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS set_user_role_access_level ON public.user_roles;
CREATE TRIGGER set_user_role_access_level
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_access_level();

-- Update existing rows to set their access levels
UPDATE public.user_roles
SET access_level = public.get_role_access_level(role);

-- Create helper function to check if user has minimum access level
CREATE OR REPLACE FUNCTION public.has_access_level(_user_id uuid, _min_level integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND access_level >= _min_level
  );
$$;

-- Create function to get user's maximum access level
CREATE OR REPLACE FUNCTION public.get_user_max_access_level(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(access_level), 0)
  FROM public.user_roles
  WHERE user_id = _user_id;
$$;