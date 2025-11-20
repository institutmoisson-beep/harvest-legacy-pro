-- Mise à jour des RLS policies pour credits
-- Permettre aux super admins (access_level >= 90) d'accéder aux crédits

DROP POLICY IF EXISTS "Admins can view all credits" ON credits;
DROP POLICY IF EXISTS "Admins can update credits" ON credits;

CREATE POLICY "Admins and super admins can view all credits"
ON credits
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_access_level(auth.uid(), 90)
);

CREATE POLICY "Admins and super admins can update credits"
ON credits
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_access_level(auth.uid(), 90)
);

-- Mise à jour des RLS policies pour savings_purchases
-- Permettre aux super admins (access_level >= 90) d'accéder aux achats progressifs

DROP POLICY IF EXISTS "Admins can manage all savings" ON savings_purchases;

CREATE POLICY "Admins and super admins can manage all savings"
ON savings_purchases
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_access_level(auth.uid(), 90)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_access_level(auth.uid(), 90)
);

-- Mise à jour des policies pour savings_payments également
DROP POLICY IF EXISTS "Admins can view all payment history" ON savings_payments;
DROP POLICY IF EXISTS "System can insert payment history" ON savings_payments;
DROP POLICY IF EXISTS "Users can view own payment history" ON savings_payments;

CREATE POLICY "Admins and super admins can view all payment history"
ON savings_payments
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_access_level(auth.uid(), 90)
);

CREATE POLICY "System and admins can insert payment history"
ON savings_payments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins and super admins can update payment history"
ON savings_payments
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_access_level(auth.uid(), 90)
);

CREATE POLICY "Admins and super admins can delete payment history"
ON savings_payments
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_access_level(auth.uid(), 90)
);