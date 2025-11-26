-- Create audit_logs table for tracking all changes
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view audit logs (for admin/super admin)
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_access_level(auth.uid(), 90)
  );

-- RLS Policy: System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- Create trigger function to log changes to role_permissions
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  -- Get user email if user_id is available
  IF NEW.user_id IS NOT NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = NEW.user_id;
  ELSIF OLD.user_id IS NOT NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = OLD.user_id;
  END IF;

  -- Determine action
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id,
      user_email,
      action,
      table_name,
      record_id,
      new_data
    ) VALUES (
      auth.uid(),
      v_user_email,
      'INSERT',
      TG_TABLE_NAME,
      NEW.id::TEXT,
      row_to_json(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      user_id,
      user_email,
      action,
      table_name,
      record_id,
      old_data,
      new_data
    ) VALUES (
      auth.uid(),
      v_user_email,
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id::TEXT,
      row_to_json(OLD),
      row_to_json(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      user_id,
      user_email,
      action,
      table_name,
      record_id,
      old_data
    ) VALUES (
      auth.uid(),
      v_user_email,
      'DELETE',
      TG_TABLE_NAME,
      OLD.id::TEXT,
      row_to_json(OLD)
    );
  END IF;

  RETURN NULL;
END;
$$;

-- Create triggers for audit logging on critical tables
DROP TRIGGER IF EXISTS audit_role_permissions_changes ON public.role_permissions;
CREATE TRIGGER audit_role_permissions_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;
CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_permissions_changes ON public.permissions;
CREATE TRIGGER audit_permissions_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

-- Enable realtime for audit_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;

-- Comment for documentation
COMMENT ON TABLE public.audit_logs IS 'Audit trail tracking all changes to critical tables for compliance and debugging';
