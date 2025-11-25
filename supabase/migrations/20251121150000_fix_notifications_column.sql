-- Fix notifications table to use is_read instead of read
ALTER TABLE public.notifications
RENAME COLUMN read TO is_read;

-- Update the RLS policy to use is_read
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Users can update own notifications" 
  ON public.notifications 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Update the index to use is_read
DROP INDEX IF EXISTS idx_notifications_read;
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
