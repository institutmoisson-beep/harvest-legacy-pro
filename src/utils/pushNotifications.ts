// Service pour gérer les notifications push via l'API Notification du navigateur

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('Ce navigateur ne supporte pas les notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  const permission = await Notification.requestPermission();
  return permission;
};

export const showBrowserNotification = (title: string, body: string, options?: NotificationOptions) => {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') {
    requestNotificationPermission().then(perm => {
      if (perm === 'granted') {
        new Notification(title, { body, icon: '/pwa-192x192.png', badge: '/pwa-192x192.png', ...options });
      }
    });
    return;
  }
  new Notification(title, { body, icon: '/pwa-192x192.png', badge: '/pwa-192x192.png', ...options });
};

// Notification helpers for common operations
export const notifyOrderPlaced = (productName: string) =>
  showBrowserNotification('🛒 Commande passée', `Votre commande pour "${productName}" a été enregistrée.`);

export const notifyPaymentSuccess = (amount: string) =>
  showBrowserNotification('💰 Paiement réussi', `Paiement de ${amount} effectué avec succès.`);

export const notifyNewMessage = (senderName: string) =>
  showBrowserNotification('💬 Nouveau message', `${senderName} vous a envoyé un message.`);

export const notifyIncomingCall = (callerCode: string) =>
  showBrowserNotification('📞 Appel entrant', `Appel de ${callerCode}`, { requireInteraction: true, tag: 'incoming-call' });

export const notifyRideAccepted = () =>
  showBrowserNotification('🚖 Chauffeur trouvé', 'Un conducteur a accepté votre course !');

export const notifyBookingConfirmed = (title: string) =>
  showBrowserNotification('✅ Réservation confirmée', `Votre réservation "${title}" est confirmée.`);

export const notifyWalletCredited = (amount: string) =>
  showBrowserNotification('💳 Portefeuille crédité', `${amount} MSN ajoutés à votre portefeuille.`);

// Backward-compatible test notification
export const sendTestNotification = () =>
  showBrowserNotification('Test Notification', 'Ceci est une notification de test des Moissonneurs!');
