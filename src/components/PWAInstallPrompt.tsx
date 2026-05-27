import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Share, Plus } from 'lucide-react';

const DISMISS_KEY = 'pwa-install-dismissed-until';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Detect standalone (installed)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    // Skip in iframes (Lovable preview)
    try {
      if (window.self !== window.top) return;
    } catch {
      return;
    }

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const dismissedActive = dismissedUntil > Date.now();

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!dismissedActive) setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const handleInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
      localStorage.removeItem(DISMISS_KEY);
    };
    window.addEventListener('appinstalled', handleInstalled);

    // iOS doesn't fire beforeinstallprompt — show manual instructions
    if (iOS && !dismissedActive) {
      const t = setTimeout(() => setVisible(true), 2500);
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  // Re-check periodically; if user hasn't installed and dismissal expired, show again
  useEffect(() => {
    if (installed) return;
    const id = setInterval(() => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      if (standalone) {
        setInstalled(true);
        setVisible(false);
        return;
      }
      const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (dismissedUntil <= Date.now() && (deferredPrompt || isIOS)) {
        setVisible(true);
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [installed, deferredPrompt, isIOS]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
        setVisible(false);
      }
      setDeferredPrompt(null);
    } catch (e) {
      console.error('PWA install error', e);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    // Re-show in 24h
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
  };

  if (installed || !visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] sm:left-auto sm:right-4 sm:max-w-sm animate-in slide-in-from-bottom-4">
      <div className="rounded-2xl border border-border bg-card shadow-2xl p-4 relative">
        <button
          onClick={handleDismiss}
          aria-label="Fermer"
          className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div
            className="rounded-xl p-2 text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #00A859, #7C3AED)' }}
          >
            <Download className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-sm">
              Installer Les Moissonneurs
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isIOS
                ? "Appuyez sur Partager puis « Sur l'écran d'accueil »."
                : 'Ajoutez l\'app à votre écran d\'accueil pour un accès rapide et hors-ligne.'}
            </p>

            {isIOS ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Share className="w-4 h-4" />
                <span>→</span>
                <Plus className="w-4 h-4" />
                <span>Écran d'accueil</span>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={handleInstall} disabled={!deferredPrompt} className="flex-1">
                  <Download className="w-4 h-4 mr-1" />
                  Installer
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss}>
                  Plus tard
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
