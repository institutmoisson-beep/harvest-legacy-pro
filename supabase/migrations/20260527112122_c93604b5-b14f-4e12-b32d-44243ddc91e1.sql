-- Harden exposed payment and delivery provider settings by using safe public views.
DROP POLICY IF EXISTS "Users can view active crypto settings" ON public.crypto_payment_settings;
REVOKE SELECT (api_key) ON public.crypto_payment_settings FROM anon, authenticated;

CREATE OR REPLACE VIEW public.crypto_payment_settings_public AS
SELECT id, provider, api_endpoint, is_active, created_at
FROM public.crypto_payment_settings
WHERE is_active = true;

GRANT SELECT ON public.crypto_payment_settings_public TO authenticated;
GRANT ALL ON public.crypto_payment_settings_public TO service_role;

DROP POLICY IF EXISTS "Everyone can view active providers" ON public.delivery_providers;
REVOKE SELECT (api_key) ON public.delivery_providers FROM anon, authenticated;

CREATE OR REPLACE VIEW public.delivery_providers_public AS
SELECT id, name, is_active, created_at
FROM public.delivery_providers
WHERE is_active = true;

GRANT SELECT ON public.delivery_providers_public TO authenticated;
GRANT ALL ON public.delivery_providers_public TO service_role;

-- Hide customer PII on unassigned community deliveries. Full details remain visible only to the customer,
-- assigned deliverer, relay manager, or administrators through existing scoped policies.
DROP POLICY IF EXISTS "Authenticated can view available packages for delivery" ON public.delivery_packages;
DROP VIEW IF EXISTS public.available_delivery_packages_public;

CREATE VIEW public.available_delivery_packages_public AS
SELECT
  id,
  customer_city,
  round(customer_latitude::numeric, 2)::double precision AS approximate_latitude,
  round(customer_longitude::numeric, 2)::double precision AS approximate_longitude,
  delivery_commission,
  created_at
FROM public.delivery_packages
WHERE delivery_method = 'community_delivery'
  AND status = 'pending'
  AND deliverer_id IS NULL
  AND customer_latitude IS NOT NULL
  AND customer_longitude IS NOT NULL;

GRANT SELECT ON public.available_delivery_packages_public TO authenticated;
GRANT ALL ON public.available_delivery_packages_public TO service_role;

-- Users may create and read their payment transactions, but may not alter status/details after creation.
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "System can insert payment transactions" ON public.payment_transactions;

-- Badge, payment history, audit log and notification inserts must come from trusted code paths.
DROP POLICY IF EXISTS "System can insert earned badges" ON public.agent_earned_badges;
CREATE POLICY "Admins can award agent badges"
ON public.agent_earned_badges
FOR INSERT
TO authenticated
WITH CHECK (public.has_access_level(auth.uid(), 80));

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

DROP POLICY IF EXISTS "System can insert payment history" ON public.investment_payment_history;

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Admins can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (public.has_access_level(auth.uid(), 80));

DROP POLICY IF EXISTS "System can award badges" ON public.user_earned_badges;
CREATE POLICY "Admins can award user badges"
ON public.user_earned_badges
FOR INSERT
TO authenticated
WITH CHECK (public.has_access_level(auth.uid(), 80));

-- Do not broadcast sensitive audit-log rows through database realtime changes.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'audit_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.audit_logs;
  END IF;
END $$;

-- Explicit call-center settings read access for operational roles.
DROP POLICY IF EXISTS "Call center operators can read settings" ON public.call_center_settings;
CREATE POLICY "Call center operators can read settings"
ON public.call_center_settings
FOR SELECT
TO authenticated
USING (public.has_access_level(auth.uid(), 50));

-- Employment associations are no longer anonymously enumerable.
DROP POLICY IF EXISTS "user_employment_public_read" ON public.user_employment;
CREATE POLICY "Authenticated users can read active employment domains"
ON public.user_employment
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.employment_domains ed
    WHERE ed.id = user_employment.domain_id
      AND ed.is_active = true
  )
);

-- Channel-level realtime authorization. Sensitive admin/audit topics are restricted to administrators;
-- user-specific topics must match the authenticated user id.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated realtime channel access" ON realtime.messages;
CREATE POLICY "Authenticated realtime channel access"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    topic IN (
      'broadcast-feed',
      'public:user_locations',
      'active-deliverers',
      'call-center-stats',
      'call-queue',
      'driver-rides',
      'rider-rides',
      'promo-codes',
      'promo-codes-widget',
      'badges-updates',
      'orders-career-updates',
      'referrals-career-updates',
      'tontine-schedule',
      'fund-updates',
      'commission_earnings',
      'notification-badge-updates',
      'user-notifications',
      'user-notifications-center'
    )
    OR topic = 'dashboard-' || auth.uid()::text
    OR topic = 'user-orders-' || auth.uid()::text
    OR topic = 'delivery-missions-' || auth.uid()::text
    OR topic = 'order-goals-' || auth.uid()::text
    OR topic = 'user_location_' || auth.uid()::text
    OR topic = 'voice-call-' || auth.uid()::text
    OR topic LIKE 'messages-%'
    OR topic LIKE 'tontine-%'
    OR topic LIKE 'call-participants-%'
    OR topic LIKE 'call-signals-%'
    OR topic LIKE 'call-messages-%'
    OR (topic IN ('admin-dashboard', 'admin-rides', 'admin-chat', 'admin-order-changes', 'admin-transaction-changes', 'transaction-changes', 'audit_logs_changes', 'visits-analytics', 'agent-goals') AND public.has_access_level(auth.uid(), 80))
  )
);

DROP POLICY IF EXISTS "Authenticated realtime channel send" ON realtime.messages;
CREATE POLICY "Authenticated realtime channel send"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    topic IN (
      'broadcast-feed',
      'public:user_locations',
      'active-deliverers',
      'call-center-stats',
      'call-queue',
      'driver-rides',
      'rider-rides',
      'promo-codes',
      'promo-codes-widget',
      'badges-updates',
      'orders-career-updates',
      'referrals-career-updates',
      'tontine-schedule',
      'fund-updates',
      'commission_earnings',
      'notification-badge-updates',
      'user-notifications',
      'user-notifications-center'
    )
    OR topic = 'dashboard-' || auth.uid()::text
    OR topic = 'user-orders-' || auth.uid()::text
    OR topic = 'delivery-missions-' || auth.uid()::text
    OR topic = 'order-goals-' || auth.uid()::text
    OR topic = 'user_location_' || auth.uid()::text
    OR topic = 'voice-call-' || auth.uid()::text
    OR topic LIKE 'messages-%'
    OR topic LIKE 'tontine-%'
    OR topic LIKE 'call-participants-%'
    OR topic LIKE 'call-signals-%'
    OR topic LIKE 'call-messages-%'
    OR (topic IN ('admin-dashboard', 'admin-rides', 'admin-chat', 'admin-order-changes', 'admin-transaction-changes', 'transaction-changes', 'audit_logs_changes', 'visits-analytics', 'agent-goals') AND public.has_access_level(auth.uid(), 80))
  )
);