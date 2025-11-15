import { supabase } from '@/integrations/supabase/client';
import { CACHE_KEYS } from '@/lib/queryClient';
import { useOptimizedQuery } from './useOptimizedQuery';

export function useCachedOrders(userId: string | undefined) {
  return useOptimizedQuery(
    CACHE_KEYS.USER_ORDERS(userId || ''),
    async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('broker_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    {
      enabled: !!userId,
      staleTime: 1000 * 60 * 3, // 3 minutes pour les commandes
      localCacheMinutes: 5,
    }
  );
}
