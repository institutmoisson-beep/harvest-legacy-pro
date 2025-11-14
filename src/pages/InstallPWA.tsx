import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Download, Bell, ArrowLeft, Smartphone, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { requestNotificationPermission, sendTestNotification } from '@/utils/pushNotifications';

export default function InstallPWA() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Vérifier si déjà installé
    const checkInstalled = () => {
      // Vérifier le mode d'affichage standalone
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return true;
      }
      
      // Vérifier si c'est une PWA installée (alternative)
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return true;
      }
      
      return false;
    };

    checkInstalled();

    // Détecter iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      console.log('📱 Événement beforeinstallprompt détecté');
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Vérifier si le service worker est enregistré
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        console.log('✅ Service Worker prêt:', registration.active?.state);
      });
    }

    // Vérifier la permission des notifications
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    console.log('🔘 Bouton d\'installation cliqué');
    console.log('📱 deferredPrompt disponible:', !!deferredPrompt);
    
    if (!deferredPrompt) {
      // Vérifier si déjà installé
      if (isInstalled) {
        toast({ 
          title: 'Déjà installée', 
          description: 'L\'application est déjà installée sur votre appareil',
        });
        return;
      }
      
      // Donner des instructions pour l'installation manuelle
      toast({ 
        title: 'Installation manuelle requise', 
        description: isIOS 
          ? 'Sur iOS, utilisez le bouton Partager puis "Sur l\'écran d\'accueil"'
          : 'Dans le menu de votre navigateur, cherchez "Installer l\'application" ou "Ajouter à l\'écran d\'accueil"',
        duration: 6000
      });
      return;
    }

    try {
      console.log('🚀 Déclenchement du prompt d\'installation...');
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('📊 Résultat de l\'installation:', outcome);

      if (outcome === 'accepted') {
        toast({ title: '✅ Succès', description: 'Application installée avec succès!' });
        setIsInstalled(true);
      } else {
        toast({ title: 'Installation annulée', description: 'Vous pouvez installer l\'app plus tard' });
      }

      setDeferredPrompt(null);
    } catch (error) {
      console.error('❌ Erreur lors de l\'installation:', error);
      toast({ 
        title: 'Erreur', 
        description: 'Une erreur s\'est produite lors de l\'installation',
        variant: 'destructive'
      });
    }
  };

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);

    if (permission === 'granted') {
      toast({ title: 'Succès', description: 'Notifications activées!' });
      await sendTestNotification();
    } else {
      toast({ 
        title: 'Permission refusée', 
        description: 'Vous pouvez activer les notifications dans les paramètres de votre navigateur',
        variant: 'destructive'
      });
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="container mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <h1 className="text-3xl font-bold gradient-text-cosmic">Installer l'App</h1>
          <div className="w-24"></div>
        </header>

        {isInstalled && (
          <Card className="border-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-green-600">
                <Check className="h-6 w-6" />
                <p className="font-semibold">Application déjà installée!</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-6 w-6" />
              Installer Les Moissonneurs
            </CardTitle>
            <CardDescription>
              Installez notre app sur votre appareil pour une expérience native et un accès hors ligne
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Avantages de l'installation:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Accès rapide depuis votre écran d'accueil</li>
                <li>Fonctionne hors ligne</li>
                <li>Chargement plus rapide</li>
                <li>Notifications push pour les rappels importants</li>
                <li>Expérience native sans navigateur</li>
              </ul>
            </div>

            {isIOS ? (
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <h4 className="font-semibold mb-2">Instructions pour iOS:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Appuyez sur le bouton "Partager" <span className="inline-block">📤</span></li>
                  <li>Faites défiler et sélectionnez "Sur l'écran d'accueil"</li>
                  <li>Appuyez sur "Ajouter"</li>
                </ol>
              </div>
            ) : (
              <Button 
                onClick={handleInstall} 
                disabled={isInstalled || !deferredPrompt}
                className="w-full gap-2"
                size="lg"
              >
                <Download className="h-5 w-5" />
                {isInstalled ? 'Déjà installée' : 'Installer maintenant'}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Notifications Push
            </CardTitle>
            <CardDescription>
              Recevez des rappels pour vos tontines, investissements et paiements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="notifications">Activer les notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Statut: <Badge variant={notificationPermission === 'granted' ? 'default' : 'secondary'}>
                    {notificationPermission === 'granted' ? 'Activées' : 
                     notificationPermission === 'denied' ? 'Refusées' : 'Non configurées'}
                  </Badge>
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notificationPermission === 'granted'}
                onCheckedChange={handleEnableNotifications}
                disabled={notificationPermission === 'denied'}
              />
            </div>

            {notificationPermission === 'denied' && (
              <p className="text-xs text-destructive">
                Les notifications sont bloquées. Modifiez les paramètres de votre navigateur pour les activer.
              </p>
            )}

            {notificationPermission === 'granted' && (
              <Button 
                variant="outline" 
                onClick={sendTestNotification}
                className="w-full"
              >
                Envoyer une notification de test
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructions Android</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Ouvrez le menu de votre navigateur (⋮)</li>
              <li>Sélectionnez "Ajouter à l'écran d'accueil" ou "Installer l'application"</li>
              <li>Confirmez l'installation</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
