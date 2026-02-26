import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CallCenterStats from '@/components/call-center/CallCenterStats';
import AgentStatusManager from '@/components/call-center/AgentStatusManager';
import CallQueue from '@/components/call-center/CallQueue';
import CallHistory from '@/components/call-center/CallHistory';
import CallCenterSettingsPanel from '@/components/call-center/CallCenterSettingsPanel';
import ActiveCallPanel from '@/components/call-center/ActiveCallPanel';
import { Button } from '@/components/ui/button';

export default function CallCenter() {
  const { user, signOut } = useAuth();
  const { hasAccessLevel, loading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (rolesLoading) return;
    if (!hasAccessLevel(80)) {
      toast({ title: 'Accès refusé', description: 'Réservé aux administrateurs', variant: 'destructive' });
      navigate('/dashboard');
      return;
    }
    setHasAccess(true);
    setLoading(false);
  }, [user, rolesLoading, hasAccessLevel, navigate]);

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold gradient-text-cosmic flex items-center gap-3">
              📞 Centre d'Appel
            </h1>
            <p className="text-muted-foreground mt-1">Gestion des appels, agents et file d'attente</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/admin')} variant="outline">← Admin</Button>
            <Button onClick={() => navigate('/dashboard')} variant="outline">Dashboard</Button>
          </div>
        </div>

        <CallCenterStats />

        <Tabs defaultValue="agents" className="mt-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="agents">👥 Agents</TabsTrigger>
            <TabsTrigger value="queue">📋 File d'attente</TabsTrigger>
            <TabsTrigger value="active">🔴 Appels actifs</TabsTrigger>
            <TabsTrigger value="history">📜 Historique</TabsTrigger>
            <TabsTrigger value="settings">⚙️ Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="agents"><AgentStatusManager /></TabsContent>
          <TabsContent value="queue"><CallQueue /></TabsContent>
          <TabsContent value="active"><ActiveCallPanel /></TabsContent>
          <TabsContent value="history"><CallHistory /></TabsContent>
          <TabsContent value="settings"><CallCenterSettingsPanel /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
