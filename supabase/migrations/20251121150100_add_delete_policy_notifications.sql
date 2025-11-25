-- Add DELETE policy for notifications to allow users to delete their own
CREATE POLICY "Users can delete own notifications" 
  ON public.notifications 
  FOR DELETE 
  USING (auth.uid() = user_id);
