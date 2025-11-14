import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface QueuedAction {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
}

const CACHE_KEYS = {
  profile: 'offline_profile',
  transactions: 'offline_transactions',
  orders: 'offline_orders',
  commissions: 'offline_commissions',
  wallet: 'offline_wallet',
  queue: 'offline_sync_queue',
};

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([]);

  // Charger la file d'attente au démarrage
  useEffect(() => {
    const savedQueue = localStorage.getItem(CACHE_KEYS.queue);
    if (savedQueue) {
      setQueuedActions(JSON.parse(savedQueue));
    }
  }, []);

  // Sauvegarder la file d'attente
  useEffect(() => {
    localStorage.setItem(CACHE_KEYS.queue, JSON.stringify(queuedActions));
  }, [queuedActions]);

  // Détecter les changements de connexion
  useEffect(() => {
    const handleOnline = () => {
      console.log('🟢 Connexion rétablie');
      setIsOnline(true);
      toast({
        title: '🟢 Connexion rétablie',
        description: 'Synchronisation des données en cours...',
      });
      syncQueuedActions();
    };

    const handleOffline = () => {
      console.log('🔴 Mode hors-ligne activé');
      setIsOnline(false);
      toast({
        title: '🔴 Mode hors-ligne',
        description: 'Vos actions seront synchronisées à la reconnexion',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queuedActions]);

  // Mettre en cache les données
  const cacheData = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now(),
        version: 1,
      }));
      console.log(`✅ Données mises en cache: ${key}`);
    } catch (error) {
      console.error(`❌ Erreur de mise en cache: ${key}`, error);
    }
  }, []);

  // Récupérer les données en cache
  const getCachedData = useCallback((key: string, maxAge: number = 24 * 60 * 60 * 1000) => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age > maxAge) {
        console.log(`⏰ Cache expiré: ${key}`);
        localStorage.removeItem(key);
        return null;
      }

      console.log(`📦 Données en cache utilisées: ${key}`);
      return data;
    } catch (error) {
      console.error(`❌ Erreur de lecture du cache: ${key}`, error);
      return null;
    }
  }, []);

  // Ajouter une action à la file d'attente
  const queueAction = useCallback((
    type: QueuedAction['type'],
    table: string,
    data: any
  ) => {
    const action: QueuedAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      table,
      data,
      timestamp: Date.now(),
    };

    setQueuedActions(prev => [...prev, action]);
    
    toast({
      title: '💾 Action enregistrée',
      description: 'Cette action sera synchronisée à la reconnexion',
    });

    return action.id;
  }, []);

  // Synchroniser les actions en file d'attente
  const syncQueuedActions = useCallback(async () => {
    if (queuedActions.length === 0 || isSyncing || !isOnline) return;

    setIsSyncing(true);
    console.log(`🔄 Synchronisation de ${queuedActions.length} actions...`);

    let successCount = 0;
    let failedActions: QueuedAction[] = [];

    for (const action of queuedActions) {
      try {
        let result;
        
        switch (action.type) {
          case 'insert':
            result = await supabase.from(action.table as any).insert(action.data);
            break;
          case 'update':
            result = await supabase.from(action.table as any).update(action.data).eq('id', action.data.id);
            break;
          case 'delete':
            result = await supabase.from(action.table as any).delete().eq('id', action.data.id);
            break;
        }

        if (result?.error) throw result.error;
        
        successCount++;
        console.log(`✅ Action synchronisée: ${action.type} ${action.table}`);
      } catch (error) {
        console.error(`❌ Échec de synchronisation:`, error);
        failedActions.push(action);
      }
    }

    setQueuedActions(failedActions);
    setIsSyncing(false);

    if (successCount > 0) {
      toast({
        title: '✅ Synchronisation réussie',
        description: `${successCount} action(s) synchronisée(s)`,
      });
    }

    if (failedActions.length > 0) {
      toast({
        title: '⚠️ Synchronisation partielle',
        description: `${failedActions.length} action(s) en attente`,
        variant: 'destructive',
      });
    }
  }, [queuedActions, isSyncing, isOnline]);

  // Vider le cache
  const clearCache = useCallback(() => {
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    setQueuedActions([]);
    toast({
      title: '🗑️ Cache vidé',
      description: 'Toutes les données hors-ligne ont été supprimées',
    });
  }, []);

  return {
    isOnline,
    isSyncing,
    queuedActions: queuedActions.length,
    cacheData,
    getCachedData,
    queueAction,
    syncQueuedActions,
    clearCache,
    CACHE_KEYS,
  };
};
