-- Add admin and financier roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financier';

-- Create new enum with correct transaction types
CREATE TYPE public.transaction_type_new AS ENUM ('deposit', 'withdrawal', 'transfer', 'commission', 'order_profit');

-- Migrate existing data
ALTER TABLE public.wallet_transactions 
  ALTER COLUMN transaction_type TYPE text;

UPDATE public.wallet_transactions 
SET transaction_type = CASE 
  WHEN transaction_type = 'send' THEN 'transfer'
  WHEN transaction_type = 'receive' THEN 'transfer'
  ELSE transaction_type
END;

ALTER TABLE public.wallet_transactions 
  ALTER COLUMN transaction_type TYPE public.transaction_type_new USING transaction_type::public.transaction_type_new;

-- Drop old enum
DROP TYPE IF EXISTS public.transaction_type CASCADE;

-- Rename new enum
ALTER TYPE public.transaction_type_new RENAME TO transaction_type;

-- Add payment method fields to wallet_transactions
ALTER TABLE public.wallet_transactions 
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS payment_contact text;

-- Assign admin role to picelvus@gmail.com
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = 'picelvus@gmail.com';
  
  -- If user exists, assign admin role
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Credit wallet with 100,000,000,000 MSN
    UPDATE public.wallets 
    SET balance = 100000000000
    WHERE user_id = target_user_id;
    
    -- Create transaction record
    INSERT INTO public.wallet_transactions (to_user_id, amount, transaction_type, description)
    VALUES (target_user_id, 100000000000, 'deposit', 'Crédit initial administrateur - 100 milliards MSN (75,000 milliards FCFA)');
  END IF;
END $$;