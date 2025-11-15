import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Permission {
  module: string;
  action: string;
  name: string;
  description: string;
}

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    fetchUserPermissions();
  }, [user]);

  const fetchUserPermissions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_user_permissions' as any, {
        _user_id: user.id,
      }) as any;

      if (error) throw error;

      setPermissions((data as Permission[]) || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (module: string, action: string): boolean => {
    return permissions.some(
      (p) => p.module === module && p.action === action
    );
  };

  const hasAnyPermission = (checks: Array<{ module: string; action: string }>): boolean => {
    return checks.some(({ module, action }) => hasPermission(module, action));
  };

  const hasAllPermissions = (checks: Array<{ module: string; action: string }>): boolean => {
    return checks.every(({ module, action }) => hasPermission(module, action));
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refetch: fetchUserPermissions,
  };
}
