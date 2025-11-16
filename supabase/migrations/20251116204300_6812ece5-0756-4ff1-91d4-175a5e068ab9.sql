-- Add customer_phone field to orders table
ALTER TABLE public.orders 
ADD COLUMN customer_phone TEXT;