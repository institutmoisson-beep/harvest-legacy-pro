-- Add is_active column to crypto_payment_settings if it doesn't exist
ALTER TABLE public.crypto_payment_settings
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for is_active for better query performance
CREATE INDEX IF NOT EXISTS idx_crypto_payment_settings_is_active ON public.crypto_payment_settings(is_active);
