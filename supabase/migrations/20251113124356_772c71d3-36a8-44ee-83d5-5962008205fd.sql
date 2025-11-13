-- Create storage bucket for call recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'call-recordings',
  'call-recordings',
  false,
  52428800, -- 50MB limit
  ARRAY['video/webm', 'audio/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Create table for call recordings metadata
CREATE TABLE IF NOT EXISTS public.call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.group_voice_calls(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on call_recordings
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;

-- RLS policies for call_recordings
CREATE POLICY "Participants can view call recordings"
ON public.call_recordings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_call_participants gcp
    WHERE gcp.call_id = call_recordings.call_id
    AND gcp.user_id = auth.uid()
  )
);

CREATE POLICY "Recorders can insert recordings"
ON public.call_recordings FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = recorded_by AND
  EXISTS (
    SELECT 1 FROM public.group_call_participants gcp
    WHERE gcp.call_id = call_recordings.call_id
    AND gcp.user_id = auth.uid()
  )
);

-- Storage policies for call-recordings bucket
CREATE POLICY "Users can upload their own recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'call-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Participants can view call recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'call-recordings' AND
  EXISTS (
    SELECT 1 
    FROM public.call_recordings cr
    JOIN public.group_call_participants gcp ON gcp.call_id = cr.call_id
    WHERE cr.file_path = storage.objects.name
    AND gcp.user_id = auth.uid()
  )
);

CREATE POLICY "Recorders can delete their recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'call-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_call_recordings_call_id ON public.call_recordings(call_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_recorded_by ON public.call_recordings(recorded_by);