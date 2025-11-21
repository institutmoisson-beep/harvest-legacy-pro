import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import AvailableDeliveries from '@/components/dashboard/AvailableDeliveries';
import MyDeliveryMissions from '@/components/dashboard/MyDeliveryMissions';

export default function CommunityDelivery() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Livraison Communautaire — Moissonneur';
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-4xl font-bold gradient-text-cosmic">
              🚚 Livraison Communautaire
            </h1>
            <p className="text-muted-foreground mt-2">
              Gagnez de l'argent en livrant des colis près de chez vous
            </p>
          </div>
        </div>

        <Tabs defaultValue="available" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available">📦 Livraisons disponibles</TabsTrigger>
            <TabsTrigger value="missions">🎯 Mes missions</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-6">
            <AvailableDeliveries />
          </TabsContent>

          <TabsContent value="missions" className="mt-6">
            <MyDeliveryMissions />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
