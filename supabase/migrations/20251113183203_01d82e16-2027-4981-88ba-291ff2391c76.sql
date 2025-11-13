-- Fix RLS recursion on tontine_participants and add clear, safe policies

ALTER TABLE IF EXISTS public.tontine_participants ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on tontine_participants (fix recursive one)
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'tontine_participants'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tontine_participants', p.policyname);
  END LOOP;
END$$;

-- Helper function (security definer) in case we later need scoped visibility
CREATE OR REPLACE FUNCTION public.is_tontine_participant(_tontine_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tontine_participants
    WHERE tontine_id = _tontine_id AND user_id = _user_id
  );
$$;

-- Policies: permissive SELECT, self-owned INSERT/UPDATE/DELETE
CREATE POLICY "tontine_participants_select"
ON public.tontine_participants
FOR SELECT
USING (true);

CREATE POLICY "tontine_participants_insert"
ON public.tontine_participants
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tontine_participants_update"
ON public.tontine_participants
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "tontine_participants_delete"
ON public.tontine_participants
FOR DELETE
USING (auth.uid() = user_id);
