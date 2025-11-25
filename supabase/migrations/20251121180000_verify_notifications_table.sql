-- Verify and fix notifications table structure
-- This migration ensures the notifications table exists with correct columns and policies

-- Check if column needs renaming (in case migration wasn't applied)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND table_schema = 'public'
        AND column_name = 'read'
    ) THEN
        -- If 'read' column exists, rename it to 'is_read'
        ALTER TABLE public.notifications RENAME COLUMN read TO is_read;
        DROP INDEX IF EXISTS idx_notifications_read;
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
        RAISE NOTICE 'Renamed read column to is_read';
    END IF;
END $$;

-- Ensure the is_read column exists and has proper default
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND table_schema = 'public'
        AND column_name = 'is_read'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_read column';
    END IF;
END $$;

-- Ensure all required RLS policies exist
-- Drop existing policies if they exist with conflicting names
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Re-create all policies with proper definitions
CREATE POLICY "Users can view own notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" 
  ON public.notifications 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
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

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON public.notifications(user_id, created_at DESC);

-- Ensure realtime is enabled
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Verify the table structure
DO $$
DECLARE
    v_column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_column_count
    FROM information_schema.columns
    WHERE table_name = 'notifications' AND table_schema = 'public';
    
    RAISE NOTICE 'Notifications table has % columns', v_column_count;
END $$;
