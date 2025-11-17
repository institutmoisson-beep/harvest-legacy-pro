-- Drop the super_admin_status view that exposes auth.users data
-- This addresses security vulnerability: auth.users should never be exposed via PostgREST views
DROP VIEW IF EXISTS public.super_admin_status CASCADE;

-- Note: The existing is_super_admin() SECURITY DEFINER function provides
-- secure admin status verification without exposing auth.users data