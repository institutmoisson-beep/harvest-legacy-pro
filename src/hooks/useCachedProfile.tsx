import { supabase } from '@/integrations/supabase/client';
import { CACHE_KEYS } from '@/lib/queryClient';
import { useOptimizedQuery } from './useOptimizedQuery';

export function useCachedProfile(userId: string | undefined) {
  return useOptimizedQuery(
    CACHE_KEYS.USER_PROFILE(userId || ''),
    async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    {
      enabled: !!userId,
      staleTime: 1000 * 60 * 10, // 10 minutes
      localCacheMinutes: 15, // Cache local de 15 minutes
    }
  );
}
