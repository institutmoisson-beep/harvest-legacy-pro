-- Table pour les images des produits
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_listing_id UUID NOT NULL REFERENCES public.product_listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_path TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  size_bytes INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_images
CREATE POLICY "Users can view product images"
ON public.product_images FOR SELECT
USING (true);

CREATE POLICY "Users can create their product images"
ON public.product_images FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their product images"
ON public.product_images FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their product images"
ON public.product_images FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all product images"
ON public.product_images FOR ALL
USING (has_access_level(auth.uid(), 90));

-- Trigger to update updated_at
CREATE TRIGGER trigger_product_images_updated_at
BEFORE UPDATE ON public.product_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_product_images_product_listing_id ON public.product_images(product_listing_id);
CREATE INDEX idx_product_images_user_id ON public.product_images(user_id);
CREATE INDEX idx_product_images_is_primary ON public.product_images(is_primary);
CREATE INDEX idx_product_images_display_order ON public.product_images(product_listing_id, display_order);

-- Create storage bucket for product images if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product images
CREATE POLICY "Anyone can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Users can upload their product images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their product images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'product-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
