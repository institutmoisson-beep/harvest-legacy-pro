import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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
      const nav = navigator as any;
      if (count > 0) {
        await nav.setAppBadge(count);
        console.log(`✅ Badge mis à jour: ${count}`);
      } else {
        await nav.clearAppBadge();
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
      const nav = navigator as any;
      await nav.clearAppBadge();
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
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        let errorMessage = 'Impossible de récupérer les notifications';

        // Properly handle error message - it could be a string or object
        if (error.message) {
          if (typeof error.message === 'string') {
            errorMessage = error.message;
          } else if (typeof error.message === 'object') {
            errorMessage = JSON.stringify(error.message);
          }
        } else if (error.code && typeof error.code === 'string') {
          errorMessage = `Erreur (${error.code})`;
        } else if (error.details) {
          if (typeof error.details === 'string') {
            errorMessage = error.details;
          } else if (typeof error.details === 'object') {
            errorMessage = JSON.stringify(error.details);
          }
        }

        // Ensure errorMessage is always a string
        if (typeof errorMessage !== 'string') {
          errorMessage = String(errorMessage || 'Erreur inconnue');
        }

        // Log the error with proper formatting
        const errorLog: any = {
          message: errorMessage,
        };
        if (error.code) errorLog.code = error.code;
        if (error.details) errorLog.details = error.details;

        console.error('❌ Erreur lors de la récupération des notifications:', errorLog);
        return 0;
      }

      return count || 0;
    } catch (error: any) {
      let errorMessage = 'Une erreur est survenue';

      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String(error.message);
      }

      console.error('❌ Erreur lors de la récupération des notifications:', errorMessage);
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
