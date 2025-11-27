-- Grant full admin control across all site functionalities
-- This migration ensures admin role has complete management over:
-- - Orders (accept/reject)
-- - Wallets (credit/debit user accounts)
-- - Tontines (management)
-- - User shops (management)
-- - Investments (management)
-- - All other system functionalities

-- 1. Add missing roles to app_role enum (if they don't exist)
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'shop_manager';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'relay_agent';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'developer';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moissonneur';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operational_admin';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financial_manager';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tontine_manager';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Ensure all modules and actions are properly defined
INSERT INTO public.permissions (module, action, name, description) VALUES
  -- Orders management
  ('orders', 'approve', 'Approuver commandes', 'Approuver les commandes'),
  ('orders', 'reject', 'Rejeter commandes', 'Rejeter les commandes'),
  ('orders', 'view_all', 'Voir toutes les commandes', 'Voir toutes les commandes du système'),
  ('orders', 'edit_order', 'Modifier commandes', 'Modifier les détails des commandes'),
  ('orders', 'delete_order', 'Supprimer commandes', 'Supprimer les commandes'),
  
  -- Wallet and transaction management
  ('wallets', 'credit_user', 'Créditer compte', 'Créditer le compte d''un utilisateur'),
  ('wallets', 'debit_user', 'Débiter compte', 'Débiter le compte d''un utilisateur'),
  ('wallets', 'view_all_wallets', 'Voir tous les portefeuilles', 'Voir tous les portefeuilles'),
  ('wallets', 'manage_transactions', 'Gérer les transactions', 'Approuver ou rejeter les transactions'),
  ('wallets', 'view_transactions', 'Voir les transactions', 'Voir toutes les transactions'),
  
  -- Tontine management
  ('tontines', 'create_tontine', 'Créer une tontine', 'Créer une nouvelle tontine'),
  ('tontines', 'manage_tontine', 'Gérer tontines', 'Gérer les tontines existantes'),
  ('tontines', 'manage_payments', 'Gérer les paiements tontine', 'Approuver ou rejeter les paiements tontine'),
  ('tontines', 'view_all', 'Voir toutes les tontines', 'Voir toutes les tontines du système'),
  ('tontines', 'delete_tontine', 'Supprimer une tontine', 'Supprimer une tontine'),
  
  -- User shop management
  ('shops', 'create_shop', 'Créer une boutique', 'Créer une nouvelle boutique pour un utilisateur'),
  ('shops', 'manage_shop', 'Gérer boutiques', 'Gérer les boutiques des utilisateurs'),
  ('shops', 'manage_products', 'Gérer les produits', 'Ajouter/modifier/supprimer les produits'),
  ('shops', 'view_all_shops', 'Voir toutes les boutiques', 'Voir toutes les boutiques du système'),
  ('shops', 'delete_shop', 'Supprimer une boutique', 'Supprimer la boutique d''un utilisateur'),
  
  -- Investment management
  ('investments', 'create_investment', 'Créer investissement', 'Créer un nouvel investissement'),
  ('investments', 'manage_investment', 'Gérer investissements', 'Gérer les investissements'),
  ('investments', 'process_payout', 'Traiter les paiements', 'Traiter les paiements des investissements'),
  ('investments', 'view_all', 'Voir tous les investissements', 'Voir tous les investissements du système'),
  ('investments', 'delete_investment', 'Supprimer investissement', 'Supprimer un investissement'),
  
  -- User management
  ('users', 'manage_roles', 'Gérer les rôles', 'Assigner ou modifier les rôles des utilisateurs'),
  ('users', 'manage_permissions', 'Gérer les permissions', 'Assigner ou modifier les permissions'),
  ('users', 'suspend_user', 'Suspendre utilisateur', 'Suspendre le compte d''un utilisateur'),
  ('users', 'delete_user', 'Supprimer utilisateur', 'Supprimer le compte d''un utilisateur'),
  ('users', 'view_all_users', 'Voir tous les utilisateurs', 'Voir tous les utilisateurs du système'),
  ('users', 'edit_user', 'Modifier utilisateur', 'Modifier les informations de l''utilisateur'),
  
  -- Geographic assignment management
  ('geographic', 'view_assignments', 'Voir les assignations géographiques', 'Voir les assignations de représentants'),
  ('geographic', 'manage_city', 'Gérer ville', 'Gérer les ordres d''une ville'),
  ('geographic', 'manage_country', 'Gérer pays', 'Gérer les ordres d''un pays'),
  ('geographic', 'assign_representative', 'Assigner représentants', 'Assigner des représentants géographiques'),
  
  -- Payment and promo management
  ('payments', 'manage_payment_methods', 'Gérer moyens de paiement', 'Gérer les méthodes de paiement'),
  ('payments', 'view_payment_history', 'Voir historique paiement', 'Voir l''historique des paiements'),
  ('payments', 'manage_payment_transactions', 'Gérer transactions paiement', 'Approuver ou rejeter les transactions'),
  ('promo', 'create_promo_code', 'Créer code promo', 'Créer des codes de promotion'),
  ('promo', 'manage_promo', 'Gérer promos', 'Gérer les codes de promotion'),
  ('promo', 'view_all_promos', 'Voir tous les codes promo', 'Voir tous les codes de promotion'),
  
  -- Delivery management
  ('delivery', 'manage_packages', 'Gérer paquets', 'Gérer les paquets de livraison'),
  ('delivery', 'manage_relays', 'Gérer points relais', 'Gérer les points relais de livraison'),
  ('delivery', 'view_deliveries', 'Voir livraisons', 'Voir toutes les livraisons'),
  
  -- System and audit
  ('system', 'view_audit_logs', 'Voir logs audit', 'Accéder aux journaux d''audit'),
  ('system', 'manage_system_config', 'Gérer configuration', 'Gérer la configuration du système'),
  ('system', 'view_analytics', 'Voir analytiques', 'Accéder aux analytiques du système')
ON CONFLICT (module, action) DO NOTHING;

-- 3. Grant admin role all permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::app_role, p.id
FROM public.permissions p
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role = 'admin'::app_role
  AND rp.permission_id = p.id
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 4. Update wallet transactions policy to ensure admin full access
DROP POLICY IF EXISTS "Admin full transaction access" ON public.wallet_transactions;
CREATE POLICY "Admin full transaction access"
  ON public.wallet_transactions
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = from_user_id OR 
    auth.uid() = to_user_id OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_access_level(auth.uid(), 90)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_access_level(auth.uid(), 90)
  );

-- 5. Update orders policy to ensure admin can do everything
DROP POLICY IF EXISTS "Admin full order access" ON public.orders;
CREATE POLICY "Admin full order access"
  ON public.orders
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = broker_id OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_access_level(auth.uid(), 90)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_access_level(auth.uid(), 90)
  );

-- 6. Update wallets policy to ensure admin full access
DROP POLICY IF EXISTS "Admin full wallet access" ON public.wallets;
CREATE POLICY "Admin full wallet access"
  ON public.wallets
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_access_level(auth.uid(), 90)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_access_level(auth.uid(), 90)
  );

-- 7. Update user_roles table policies for admin management
DROP POLICY IF EXISTS "Admin full user roles access" ON public.user_roles;
CREATE POLICY "Admin full user roles access"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_access_level(auth.uid(), 90)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_access_level(auth.uid(), 90)
  );

-- 8. Update commissions policy to allow admin full access
DROP POLICY IF EXISTS "Admin full commission access" ON public.commissions;
CREATE POLICY "Admin full commission access"
  ON public.commissions
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_access_level(auth.uid(), 90)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_access_level(auth.uid(), 90)
  );

-- 9. Comment for clarity
COMMENT ON TABLE public.role_permissions IS 
'Maps roles to permissions. Admin role is granted ALL permissions to enable full system management of orders, wallets, transactions, tontines, shops, investments, and all other functionalities.';
