// Service pour gérer les notifications push PWA

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('Ce navigateur ne supporte pas les notifications');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
};

export const showNotification = async (title: string, options?: NotificationOptions) => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker non supporté');
    return;
  }

  const permission = await requestNotificationPermission();
  
  if (permission === 'granted') {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      badge: '/pwa-192x192.png',
      icon: '/pwa-192x192.png',
      ...options,
    });
  }
};

export const subscribeToPushNotifications = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications non supportées');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Vérifier si déjà inscrit
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Créer une nouvelle subscription
      // Note: Nécessite une clé VAPID publique pour production
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: null, // Ajouter votre clé VAPID publique ici
      });
    }
    
    return subscription;
  } catch (error) {
    console.error('Erreur lors de l\'inscription aux push notifications:', error);
    return null;
  }
};

export const unsubscribeFromPushNotifications = async () => {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('Désinscription des push notifications réussie');
    }
  } catch (error) {
    console.error('Erreur lors de la désinscription:', error);
  }
};

// Fonction utilitaire pour envoyer une notification de test
export const sendTestNotification = async () => {
  await showNotification('Test Notification', {
    body: 'Ceci est une notification de test des Moissonneurs!',
    tag: 'test',
    requireInteraction: false,
  });
};
