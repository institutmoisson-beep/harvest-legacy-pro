-- Create establishments table for QR menu system
CREATE TABLE public.establishments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  establishment_type TEXT NOT NULL DEFAULT 'restaurant',
  qr_code_slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;

-- Users can view their own establishments
CREATE POLICY "Users can view own establishments"
ON public.establishments
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own establishments
CREATE POLICY "Users can create own establishments"
ON public.establishments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own establishments
CREATE POLICY "Users can update own establishments"
ON public.establishments
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own establishments
CREATE POLICY "Users can delete own establishments"
ON public.establishments
FOR DELETE
USING (auth.uid() = user_id);

-- Public can view active establishments by slug (for QR menu)
CREATE POLICY "Public can view active establishments by slug"
ON public.establishments
FOR SELECT
USING (is_active = true);

-- Admins can manage all establishments
CREATE POLICY "Admins can manage all establishments"
ON public.establishments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_establishments_updated_at
BEFORE UPDATE ON public.establishments
FOR EACH ROW
EXECUTE FUNCTION public.update_credit_updated_at();