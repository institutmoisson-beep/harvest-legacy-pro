import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface BadgeAPI {
  set: (count: number) => Promise<void>;
  clear: () => Promise<void>;
}

declare global {
  interface Navigator {
    setAppBadge?: (count: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  }
}

export const usePWABadge = () => {
  const { user } = useAuth();

  // Vérifier si l'API Badge est supportée
  const isBadgeSupported = useCallback(() => {
    return 'setAppBadge' in navigator && 'clearAppBadge' in navigator;
  }, []);

  // Définir le badge avec un nombre
  const setBadge = useCallback(async (count: number) => {
    if (!isBadgeSupported()) {
      console.log('⚠️ Badge API non supportée sur ce navigateur');
      return;
    }

    try {
      if (count > 0) {
        await navigator.setAppBadge!(count);
        console.log(`✅ Badge mis à jour: ${count}`);
      } else {
        await navigator.clearAppBadge!();
        console.log('✅ Badge effacé');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du badge:', error);
    }
  }, [isBadgeSupported]);

  // Effacer le badge
  const clearBadge = useCallback(async () => {
    if (!isBadgeSupported()) return;

    try {
      await navigator.clearAppBadge!();
      console.log('✅ Badge effacé');
    } catch (error) {
      console.error('❌ Erreur lors de l\'effacement du badge:', error);
    }
  }, [isBadgeSupported]);

  // Récupérer le nombre de notifications non lues
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return 0;

    try {
      const { count, error } = await supabase
        .from('notifications' as any)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      console.log(`📬 Notifications non lues: ${count || 0}`);
      return count || 0;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des notifications:', error);
      return 0;
    }
  }, [user]);

  // Mettre à jour le badge avec le nombre de notifications
  const updateBadgeFromNotifications = useCallback(async () => {
    const count = await fetchUnreadCount();
    await setBadge(count);
  }, [fetchUnreadCount, setBadge]);

  // Écouter les changements de notifications en temps réel
  useEffect(() => {
    if (!user || !isBadgeSupported()) return;

    // Mise à jour initiale
    updateBadgeFromNotifications();

    // S'abonner aux changements de notifications
    const channel = supabase
      .channel('notification-badge-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 Notification changée:', payload.eventType);
          updateBadgeFromNotifications();
        }
      )
      .subscribe();

    // Nettoyer à la déconnexion
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isBadgeSupported, updateBadgeFromNotifications]);

  // Effacer le badge quand l'utilisateur est actif sur la page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Quand l'app devient visible, mettre à jour le badge
        updateBadgeFromNotifications();
      }
    };

    const handleFocus = () => {
      // Quand la fenêtre reçoit le focus, mettre à jour le badge
      updateBadgeFromNotifications();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [updateBadgeFromNotifications]);

  return {
    setBadge,
    clearBadge,
    updateBadgeFromNotifications,
    isBadgeSupported: isBadgeSupported(),
  };
};
