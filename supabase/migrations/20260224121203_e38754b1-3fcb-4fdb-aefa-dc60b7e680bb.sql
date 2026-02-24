
-- Fix 1: Remove overly permissive profiles policy (other restrictive policies remain)
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Fix 2: Restrict payment_contacts to authenticated users only
DROP POLICY IF EXISTS "Everyone can view active payment contacts" ON public.payment_contacts;
CREATE POLICY "Authenticated users can view active payment contacts"
  ON public.payment_contacts
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Fix 3: Recreate users_with_roles view without SECURITY DEFINER
DROP VIEW IF EXISTS public.users_with_roles;
CREATE VIEW public.users_with_roles AS
SELECT p.id,
    p.full_name,
    p.phone,
    p.referral_code,
    p.created_at,
    p.career_level,
    COALESCE(json_agg(json_build_object('role', ur.role, 'access_level', ur.access_level)) FILTER (WHERE (ur.role IS NOT NULL)), '[]'::json) AS roles,
    COALESCE(max(ur.access_level), 0) AS max_access_level
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
GROUP BY p.id, p.full_name, p.phone, p.referral_code, p.created_at, p.career_level;
