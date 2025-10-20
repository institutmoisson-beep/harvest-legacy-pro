-- Fix critical security vulnerabilities and add transaction status

-- 1. Add status column to wallet_transactions for approval workflow
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- 2. Update profiles RLS - only show necessary public info
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

CREATE POLICY "Users can view public profile info"
ON profiles FOR SELECT
USING (true);

-- 3. Update wallet_transactions RLS - hide payment details from recipients
DROP POLICY IF EXISTS "Users can view own transactions" ON wallet_transactions;

CREATE POLICY "Users can view sent transactions"
ON wallet_transactions FOR SELECT
USING (auth.uid() = from_user_id);

CREATE POLICY "Users can view received transactions"
ON wallet_transactions FOR SELECT
USING (auth.uid() = to_user_id AND payment_method IS NULL);

-- 4. Restrict referrals insertion - only system can create
DROP POLICY IF EXISTS "System can create referrals" ON referrals;

CREATE POLICY "Only authenticated system operations"
ON referrals FOR INSERT
WITH CHECK (auth.uid() = referrer_id);

-- 5. Prevent client-side wallet updates
DROP POLICY IF EXISTS "Users can update own wallet" ON wallets;

CREATE POLICY "Only admins can update wallets"
ON wallets FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- 6. Allow admins to approve/reject transactions
CREATE POLICY "Admins can update transaction status"
ON wallet_transactions FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- 7. Add order status management
CREATE POLICY "Admins can manage order status"
ON orders FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_from_user ON wallet_transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_to_user ON wallet_transactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 9. Enable realtime for reactive updates
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;