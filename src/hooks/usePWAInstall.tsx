import { useState, useEffect } from 'react';

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return true;
      }
      
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return true;
      }
      
      return false;
    };

    checkInstalled();

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    const handleBeforeInstall = (e: Event) => {
      console.log('📱 beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      console.log('✅ App installed successfully');
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check service worker status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          console.log('✅ Service Worker registered:', registration.active?.state);
        } else {
          console.log('⚠️ No Service Worker registered');
        }
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) {
      console.log('⚠️ No deferred prompt available');
      return { outcome: 'unavailable', isIOS };
    }

    try {
      console.log('🚀 Showing install prompt');
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      console.log('📊 User choice:', result.outcome);
      
      if (result.outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
      return result;
    } catch (error) {
      console.error('❌ Error showing install prompt:', error);
      return { outcome: 'error', error };
    }
  };

  return {
    deferredPrompt,
    isInstalled,
    isIOS,
    promptInstall,
  };
};
