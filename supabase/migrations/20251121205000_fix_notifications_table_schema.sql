-- Fix notifications table schema
-- Rename 'read' column to 'is_read' to match application code

-- First drop the problematic index
DROP INDEX IF EXISTS public.idx_notifications_read;

-- Rename the column
ALTER TABLE public.notifications RENAME COLUMN "read" TO is_read;

-- Recreate the index with correct name
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Verify the change was successful
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND table_schema = 'public'
        AND column_name = 'is_read'
    ) THEN
        RAISE NOTICE 'Successfully renamed read column to is_read in notifications table';
    ELSE
        RAISE EXCEPTION 'Failed to rename column - is_read column does not exist';
    END IF;
END $$;

-- Ensure RLS policies reference the correct column
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

-- Recreate all RLS policies
CREATE POLICY "Users can view own notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications" 
  ON public.notifications 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications" 
  ON public.notifications 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" 
  ON public.notifications 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Ensure realtime is enabled
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
