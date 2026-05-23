ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'order_payment';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'pack_purchase';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'badge_reward';