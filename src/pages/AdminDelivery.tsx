import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AdminDeliveryDashboard from '@/components/delivery/AdminDeliveryDashboard';

export default function AdminDelivery() {
  const { user } = useAuth();
  const { hasAccessLevel, loading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Gestion des Livraisons — Moissonneur';
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (rolesLoading) return;

    if (!hasAccessLevel(80)) {
      toast({
        title: 'Accès refusé',
        description: 'Vous n\'avez pas les permissions nécessaires',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [user, rolesLoading, hasAccessLevel, navigate]);

  if (rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={() => navigate('/admin')} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour Admin
          </Button>
          <div>
            <h1 className="text-4xl font-bold gradient-text-cosmic">
              📦 Gestion des Livraisons Communautaires
            </h1>
            <p className="text-muted-foreground mt-2">
              Vue complète de toutes les livraisons avec géolocalisation en temps réel des membres
            </p>
          </div>
        </div>

        <AdminDeliveryDashboard />
      </div>
    </div>
  );
}
