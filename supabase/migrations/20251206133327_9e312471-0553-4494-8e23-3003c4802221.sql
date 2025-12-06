-- Add missing columns to menu_items
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS preparation_time_minutes INTEGER;