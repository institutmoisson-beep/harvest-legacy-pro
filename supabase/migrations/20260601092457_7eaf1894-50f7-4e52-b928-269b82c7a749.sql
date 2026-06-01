-- Add target user support to broadcast channel messages
ALTER TABLE public.broadcast_channel_messages
  ADD COLUMN IF NOT EXISTS target_user_id UUID NULL REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_broadcast_messages_target ON public.broadcast_channel_messages(target_user_id);

-- Replace SELECT policy: messages publics OR ciblés sur l'utilisateur OR admin
DROP POLICY IF EXISTS "Tout authentifié peut lire les messages publiés" ON public.broadcast_channel_messages;

CREATE POLICY "Lecture messages canal (public ou ciblé)"
  ON public.broadcast_channel_messages FOR SELECT
  TO authenticated
  USING (
    published_at <= now()
    AND (
      target_user_id IS NULL
      OR target_user_id = auth.uid()
      OR public.has_access_level(auth.uid(), 80)
    )
  );
