import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserRole {
  role: string;
  access_level: number;
}

export function useUserRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxAccessLevel, setMaxAccessLevel] = useState(0);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setMaxAccessLevel(0);
      setLoading(false);
      return;
    }

    fetchUserRoles();
  }, [user]);

  const fetchUserRoles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, access_level')
        .eq('user_id', user.id);

      if (error) throw error;

      setRoles(data || []);
      
      // Calculate max access level
      const maxLevel = data?.reduce((max, r) => Math.max(max, r.access_level || 0), 0) || 0;
      setMaxAccessLevel(maxLevel);
    } catch (error) {
      console.error('Error fetching user roles:', error);
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
