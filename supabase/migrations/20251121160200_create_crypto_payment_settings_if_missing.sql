-- Create crypto_payment_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.crypto_payment_settings (
  id INTEGER PRIMARY KEY,
  provider TEXT NOT NULL,
  api_endpoint TEXT NOT NULL,
  api_key TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crypto_payment_settings ENABLE ROW LEVEL SECURITY;
