import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserRole {
  role: string;
  access_level: number;
}

export function useUserRoles() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxAccessLevel, setMaxAccessLevel] = useState(0);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setRoles([]);
      setMaxAccessLevel(0);
      setLoading(false);
      return;
    }

    fetchUserRoles();
  }, [user, authLoading]);

  const fetchUserRoles = async () => {
    if (!user) {
      setRoles([]);
      setMaxAccessLevel(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Always get max access level via RPC (bypasses RLS)
      const { data: maxData } = (await supabase.rpc('get_user_max_access_level' as any, {
        _user_id: user.id,
      })) as any;

      if (typeof maxData === 'number') {
        setMaxAccessLevel(maxData);
      }

      // Try to fetch explicit roles list (may be restricted by RLS)
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, access_level')
        .eq('user_id', user.id);

      if (!error) {
        setRoles(data || []);
        if (maxData == null) {
          const maxLevel = data?.reduce((max, r) => Math.max(max, r.access_level || 0), 0) || 0;
          setMaxAccessLevel(maxLevel);
        }
      } else {
        // If roles cannot be read due to RLS, we still have max access
        setRoles([]);
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
      // Keep previously set maxAccessLevel from RPC; ensure roles empty
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (roleName: string): boolean => {
    return roles.some(r => r.role === roleName);
  };

  const hasAccessLevel = (minLevel: number): boolean => {
    return maxAccessLevel >= minLevel;
  };

  const isSuperAdmin = (): boolean => {
    return hasRole('super_admin') || hasAccessLevel(100);
  };

  const isAdmin = (): boolean => {
    return hasAccessLevel(80); // Admin or higher
  };

  return {
    roles,
    loading,
    maxAccessLevel,
    hasRole,
    hasAccessLevel,
    isSuperAdmin,
    isAdmin,
    refetch: fetchUserRoles,
  };
}
