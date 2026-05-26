
-- 1. Tracking code on mlm_pack_purchases (for both relay and home delivery)
ALTER TABLE public.mlm_pack_purchases
  ADD COLUMN IF NOT EXISTS tracking_code TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    new_code := 'MSN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM public.mlm_pack_purchases WHERE tracking_code = new_code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_purchase_tracking_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tracking_code IS NULL THEN
    NEW.tracking_code := public.generate_tracking_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_purchase_tracking_code ON public.mlm_pack_purchases;
CREATE TRIGGER trg_set_purchase_tracking_code
  BEFORE INSERT ON public.mlm_pack_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_purchase_tracking_code();

UPDATE public.mlm_pack_purchases
SET tracking_code = public.generate_tracking_code()
WHERE tracking_code IS NULL;

-- 2. Broadcast channel
CREATE TABLE IF NOT EXISTS public.broadcast_channel_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  link_url TEXT,
  link_label TEXT,
  category TEXT NOT NULL DEFAULT 'info',
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.broadcast_channel_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout authentifié peut lire les messages publiés"
  ON public.broadcast_channel_messages FOR SELECT
  TO authenticated
  USING (published_at <= now());

CREATE POLICY "Admin peut publier des messages"
  ON public.broadcast_channel_messages FOR INSERT
  TO authenticated
  WITH CHECK (public.has_access_level(auth.uid(), 80) AND author_id = auth.uid());

CREATE POLICY "Admin peut modifier les messages"
  ON public.broadcast_channel_messages FOR UPDATE
  TO authenticated
  USING (public.has_access_level(auth.uid(), 80));

CREATE POLICY "Admin peut supprimer les messages"
  ON public.broadcast_channel_messages FOR DELETE
  TO authenticated
  USING (public.has_access_level(auth.uid(), 80));

CREATE TABLE IF NOT EXISTS public.broadcast_channel_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.broadcast_channel_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

ALTER TABLE public.broadcast_channel_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur voit ses propres lectures"
  ON public.broadcast_channel_reads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut marquer comme lu"
  ON public.broadcast_channel_reads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_broadcast_messages_published ON public.broadcast_channel_messages(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_reads_user ON public.broadcast_channel_reads(user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_channel_messages;

-- 3. Storage bucket pour images de canal
INSERT INTO storage.buckets (id, name, public)
VALUES ('broadcast', 'broadcast', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Images canal publiquement lisibles"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'broadcast');

CREATE POLICY "Admin peut uploader images canal"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'broadcast' AND public.has_access_level(auth.uid(), 80));

CREATE POLICY "Admin peut supprimer images canal"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'broadcast' AND public.has_access_level(auth.uid(), 80));
