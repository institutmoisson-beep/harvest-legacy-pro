
-- Recreate view with security_invoker = true to fix the security definer warning
DROP VIEW IF EXISTS public.users_with_roles;
CREATE VIEW public.users_with_roles 
WITH (security_invoker = true) AS
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
