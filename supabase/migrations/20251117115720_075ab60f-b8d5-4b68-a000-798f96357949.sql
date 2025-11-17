-- Fix visits foreign key constraint to allow user deletion with CASCADE

-- Drop existing foreign key constraint
ALTER TABLE public.visits 
DROP CONSTRAINT IF EXISTS visits_user_id_fkey;

-- Add new foreign key constraint with CASCADE
ALTER TABLE public.visits
ADD CONSTRAINT visits_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_visits_user_id ON public.visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON public.visits(created_at);