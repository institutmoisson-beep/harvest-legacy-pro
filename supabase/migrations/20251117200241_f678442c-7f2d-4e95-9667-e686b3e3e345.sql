-- Add background theme customization to shop_settings
ALTER TABLE public.shop_settings 
ADD COLUMN IF NOT EXISTS background_theme text DEFAULT 'gradient-purple';

-- Add comment to describe available themes
COMMENT ON COLUMN public.shop_settings.background_theme IS 'Shop background theme: gradient-purple, gradient-blue, gradient-green, gradient-orange, gradient-pink, solid-dark, solid-light, pattern-dots, pattern-grid';