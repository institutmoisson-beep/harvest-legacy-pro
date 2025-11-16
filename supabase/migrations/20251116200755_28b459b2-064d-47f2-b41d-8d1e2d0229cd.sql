-- Fix critical security issues: auth exposure and missing RLS policies

-- 1. Drop the exposed super_admin_info view
DROP VIEW IF EXISTS public.super_admin_info CASCADE;

-- 2. Add explicit DENY policies for wallets table to prevent unauthorized modifications
CREATE POLICY "Prevent direct wallet inserts"
ON public.wallets
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Prevent direct wallet updates"
ON public.wallets
FOR UPDATE
TO authenticated
USING (false);

-- 3. Add explicit DENY policy for wallet_transactions to prevent fake transaction creation
DROP POLICY IF EXISTS "Users can create transactions" ON public.wallet_transactions;

CREATE POLICY "Prevent direct transaction inserts"
ON public.wallet_transactions
FOR INSERT
TO authenticated
WITH CHECK (false);

-- 4. Add CHECK constraint to prevent negative balances
ALTER TABLE public.wallets
DROP CONSTRAINT IF EXISTS positive_balance;

ALTER TABLE public.wallets
ADD CONSTRAINT positive_balance CHECK (balance >= 0);