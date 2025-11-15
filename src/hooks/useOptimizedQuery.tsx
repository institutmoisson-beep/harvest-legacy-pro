import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { LocalCache } from '@/lib/localCache';

/**
 * Hook optimisé qui combine React Query et localStorage cache
 * Utile pour les données qui changent rarement
 */
export function useOptimizedQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> & {
    localCacheMinutes?: number;
    enableLocalCache?: boolean;
  }
) {
  const {
    localCacheMinutes = 5,
    enableLocalCache = true,
    ...queryOptions
  } = options || {};

  const cacheKey = queryKey.join('_');

  return useQuery<T>({
    queryKey,
    queryFn: async () => {
      // Essayer le cache local d'abord si activé
      if (enableLocalCache) {
        const cached = LocalCache.get<T>(cacheKey);
        if (cached !== null) {
          return cached;
        }
      }

      // Sinon, fetch depuis Supabase
      const data = await queryFn();

      // Mettre en cache localement
      if (enableLocalCache && data) {
        LocalCache.set(cacheKey, data, localCacheMinutes);
      }

      return data;
    },
    ...queryOptions,
  });
}

/**
 * Hook pour invalider à la fois React Query et localStorage
 */
export function useInvalidateOptimizedCache() {
  return (queryKey: string[]) => {
    const cacheKey = queryKey.join('_');
    LocalCache.remove(cacheKey);
  };
}
