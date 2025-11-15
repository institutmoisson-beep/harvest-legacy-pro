import { QueryClient } from '@tanstack/react-query';

// Configuration du cache global pour React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache les données pendant 5 minutes
      staleTime: 1000 * 60 * 5,
      // Garde les données en cache pendant 10 minutes même si inutilisées
      gcTime: 1000 * 60 * 10,
      // Retry automatique en cas d'erreur
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch en arrière-plan quand la fenêtre regagne le focus
      refetchOnWindowFocus: true,
      // Ne pas refetch automatiquement au montage si les données sont fresh
      refetchOnMount: false,
      // Refetch automatiquement quand la connexion revient
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Clés de cache standardisées
export const CACHE_KEYS = {
  USER_PROFILE: (userId: string) => ['user-profile', userId],
  USER_ORDERS: (userId: string) => ['user-orders', userId],
  USER_REFERRALS: (userId: string) => ['user-referrals', userId],
  USER_ROLES: (userId: string) => ['user-roles', userId],
  USER_PERMISSIONS: (userId: string) => ['user-permissions', userId],
  MOISSONNEUR_FUND: ['moissonneur-fund'],
  MONTHLY_GOALS: (userId: string, month: string) => ['monthly-goals', userId, month],
  ALL_USERS: ['all-users'],
  ALL_PERMISSIONS: ['all-permissions'],
  ROLE_PERMISSIONS: (role: string) => ['role-permissions', role],
  AUDIT_LOGS: ['audit-logs'],
  WALLET: (userId: string) => ['wallet', userId],
  NOTIFICATIONS: (userId: string) => ['notifications', userId],
  TONTINES: (userId: string) => ['tontines', userId],
  INVESTMENTS: (userId: string) => ['investments', userId],
} as const;

// Préfetch des données critiques
export function prefetchUserData(userId: string) {
  queryClient.prefetchQuery({
    queryKey: CACHE_KEYS.USER_PROFILE(userId),
    staleTime: 1000 * 60 * 10, // 10 minutes pour le profil
  });
  
  queryClient.prefetchQuery({
    queryKey: CACHE_KEYS.USER_ROLES(userId),
    staleTime: 1000 * 60 * 15, // 15 minutes pour les rôles (changent rarement)
  });
}

// Invalidation de cache ciblée
export function invalidateUserCache(userId: string) {
  queryClient.invalidateQueries({ queryKey: CACHE_KEYS.USER_PROFILE(userId) });
  queryClient.invalidateQueries({ queryKey: CACHE_KEYS.USER_ORDERS(userId) });
  queryClient.invalidateQueries({ queryKey: CACHE_KEYS.WALLET(userId) });
}

export function invalidateAllUsersCache() {
  queryClient.invalidateQueries({ queryKey: CACHE_KEYS.ALL_USERS });
}
