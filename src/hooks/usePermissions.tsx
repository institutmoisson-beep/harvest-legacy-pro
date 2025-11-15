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
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_permissions' as any, {
        _user_id: user.id,
      }) as any;

      if (error) {
        console.error('Error fetching permissions:', error);
        // En cas d'erreur, on vérifie si l'utilisateur est super admin
        const { data: roles } = await supabase
          .from('user_roles')
          .select('access_level')
          .eq('user_id', user.id);
        
        // Si super admin, on donne toutes les permissions
        if (roles && roles.some((r: any) => r.access_level >= 100)) {
          setPermissions([
            { module: 'all', action: 'all', name: 'Super Admin', description: 'Accès complet' }
          ]);
        } else {
          setPermissions([]);
        }
      } else {
        setPermissions((data as Permission[]) || []);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
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
