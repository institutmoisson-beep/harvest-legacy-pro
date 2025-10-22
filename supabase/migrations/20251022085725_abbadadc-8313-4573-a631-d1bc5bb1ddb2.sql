-- Add identity document field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN id_number TEXT,
ADD COLUMN id_verified BOOLEAN DEFAULT FALSE;