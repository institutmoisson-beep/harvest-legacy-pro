-- Fix CRITICAL security issue: Restrict profile visibility
-- Currently ALL user data (names, phones, ID numbers) is publicly accessible!

-- Drop the insecure policy
DROP POLICY IF EXISTS "Users can view public profile info" ON profiles;

-- Create secure policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can view profiles of people in their referral network (direct referrals only)
CREATE POLICY "Users can view direct referrals"
  ON profiles
  FOR SELECT
  USING (
    id IN (
      SELECT referred_id 
      FROM referrals 
      WHERE referrer_id = auth.uid() AND level = 1
    )
  );

-- Users can view their direct referrer's profile
CREATE POLICY "Users can view referrer profile"
  ON profiles
  FOR SELECT
  USING (
    id IN (
      SELECT referrer_id 
      FROM referrals 
      WHERE referred_id = auth.uid() AND level = 1
    )
  );

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'financier')
    )
  );