import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2 } from 'lucide-react';
import AdminDriversManager from '@/components/transport/AdminDriversManager';
import AdminPricingManager from '@/components/transport/AdminPricingManager';
import AdminRidesMonitor from '@/components/transport/AdminRidesMonitor';
import AdminTransportSettings from '@/components/transport/AdminTransportSettings';

export default function AdminTransport() {
  const { user } = useAuth();
  const { hasAccessLevel, loading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();

  useEffect(() => { document.title = 'Transport — Administration'; }, []);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (rolesLoading) return;
    if (!hasAccessLevel(80)) {
      toast({ title: 'Accès refusé', variant: 'destructive' });
      navigate('/dashboard');
    }
  }, [user, rolesLoading, hasAccessLevel, navigate]);

  if (rolesLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={() => navigate('/admin')} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour Admin
          </Button>
          <div>
            <h1 className="text-3xl font-bold">🚖 Gestion Transport</h1>
            <p className="text-muted-foreground mt-1">Gérez les conducteurs, véhicules, tarifs et courses</p>
          </div>
        </div>

        <Tabs defaultValue="drivers" className="w-full">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="drivers">👨‍✈️ Conducteurs</TabsTrigger>
            <TabsTrigger value="rides">🗺️ Courses</TabsTrigger>
            <TabsTrigger value="pricing">💰 Tarification</TabsTrigger>
            <TabsTrigger value="settings">⚙️ Paramètres</TabsTrigger>
          </TabsList>
          <TabsContent value="drivers" className="mt-4"><AdminDriversManager /></TabsContent>
          <TabsContent value="rides" className="mt-4"><AdminRidesMonitor /></TabsContent>
          <TabsContent value="pricing" className="mt-4"><AdminPricingManager /></TabsContent>
          <TabsContent value="settings" className="mt-4"><AdminTransportSettings /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
