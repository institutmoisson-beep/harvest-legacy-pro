import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useDashboardData = (userId: string | undefined) => {
  // Profile query avec cache de 5 minutes
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, referral_code, phone')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Wallet query avec cache de 2 minutes
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Stats query avec cache de 5 minutes
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', userId],
    queryFn: async () => {
      if (!userId) return { directReferrals: 0, totalCommissions: 0 };

      // Requêtes parallèles
      const [referralsRes, commissionsRes] = await Promise.all([
        supabase
          .from('referrals')
          .select('*', { count: 'exact', head: true })
          .eq('referrer_id', userId)
          .eq('level', 1),
        supabase
          .from('commissions')
          .select('amount')
          .eq('user_id', userId),
      ]);

      return {
        directReferrals: referralsRes.count || 0,
        totalCommissions: commissionsRes.data?.reduce((sum, c) => sum + c.amount, 0) || 0,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Roles query avec cache de 10 minutes
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  const hasAdminAccess = roles?.some(r => r.role === 'admin') || false;
  const hasMerchantRole = roles?.some(r => r.role === 'merchant') || false;

  return {
    profile,
    wallet,
    stats,
    hasAdminAccess,
    hasMerchantRole,
    isLoading: profileLoading || walletLoading || statsLoading || rolesLoading,
  };
};
