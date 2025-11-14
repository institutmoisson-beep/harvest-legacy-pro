import { useEffect } from 'react';
import { useOfflineSync } from './useOfflineSync';
import { supabase } from '@/integrations/supabase/client';

interface UseOfflineCacheProps {
  userId?: string;
  enabled?: boolean;
}

export const useOfflineCache = ({ userId, enabled = true }: UseOfflineCacheProps) => {
  const { isOnline, cacheData, getCachedData, CACHE_KEYS } = useOfflineSync();

  // Mettre en cache les données utilisateur importantes
  useEffect(() => {
    if (!enabled || !userId) return;

    const cacheUserData = async () => {
      if (!isOnline) {
        console.log('📦 Mode hors-ligne: utilisation du cache');
        return;
      }

      try {
        // Cache profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (profile) {
          cacheData(CACHE_KEYS.profile, profile);
        }

        // Cache wallet
        const { data: wallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (wallet) {
          cacheData(CACHE_KEYS.wallet, wallet);
        }

        // Cache recent transactions (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: transactions } = await supabase
          .from('agent_transactions')
          .select('*')
          .eq('agent_id', userId)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (transactions) {
          cacheData(CACHE_KEYS.transactions, transactions);
        }

        // Cache recent orders
        const { data: orders } = await supabase
          .from('orders')
          .select('*')
          .eq('broker_id', userId)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (orders) {
          cacheData(CACHE_KEYS.orders, orders);
        }

        // Cache commissions summary
        const { data: commissions } = await supabase
          .from('agent_transactions')
          .select('amount, transaction_type, created_at')
          .eq('agent_id', userId)
          .eq('status', 'completed')
          .gte('created_at', thirtyDaysAgo.toISOString());
        
        if (commissions) {
          const summary = {
            total: commissions.reduce((sum, t) => sum + t.amount, 0),
            count: commissions.length,
            byType: commissions.reduce((acc: any, t) => {
              acc[t.transaction_type] = (acc[t.transaction_type] || 0) + t.amount;
              return acc;
            }, {}),
          };
          cacheData(CACHE_KEYS.commissions, summary);
        }

        console.log('✅ Données utilisateur mises en cache avec succès');
      } catch (error) {
        console.error('❌ Erreur lors de la mise en cache:', error);
      }
    };

    cacheUserData();

    // Rafraîchir le cache toutes les 5 minutes quand en ligne
    const interval = setInterval(() => {
      if (isOnline) {
        cacheUserData();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId, enabled, isOnline, cacheData, CACHE_KEYS]);

  // Fonctions pour récupérer les données en cache
  const getCachedProfile = () => getCachedData(CACHE_KEYS.profile);
  const getCachedWallet = () => getCachedData(CACHE_KEYS.wallet);
  const getCachedTransactions = () => getCachedData(CACHE_KEYS.transactions);
  const getCachedOrders = () => getCachedData(CACHE_KEYS.orders);
  const getCachedCommissions = () => getCachedData(CACHE_KEYS.commissions);

  return {
    isOnline,
    getCachedProfile,
    getCachedWallet,
    getCachedTransactions,
    getCachedOrders,
    getCachedCommissions,
  };
};
