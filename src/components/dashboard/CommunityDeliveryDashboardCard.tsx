import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';

interface DeliveryStats {
  availableDeliveries: number;
  myMissions: number;
  totalEarnings: number;
}

export default function CommunityDeliveryDashboardCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DeliveryStats>({
    availableDeliveries: 0,
    myMissions: 0,
    totalEarnings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      // Disponible deliveries
      const { count: available } = await supabase
        .from('delivery_packages')
        .select('*', { count: 'exact', head: true })
        .eq('delivery_method', 'community_delivery')
        .eq('status', 'pending')
        .is('deliverer_id', null);

      // My missions
      const { count: missions } = await supabase
        .from('delivery_packages')
        .select('*', { count: 'exact', head: true })
        .eq('deliverer_id', user?.id)
        .in('status', ['awaiting_pickup', 'in_transit']);

      // Total earnings from delivery
      const { data: earnings } = await supabase
        .from('delivery_packages')
        .select('delivery_commission')
        .eq('deliverer_id', user?.id)
        .eq('status', 'delivered');

      const totalEarnings = earnings?.reduce(
        (sum, pkg) => sum + (pkg.delivery_commission || 0),
        0
      ) || 0;

      setStats({
        availableDeliveries: available || 0,
        myMissions: missions || 0,
        totalEarnings,
      });
    } catch (error) {
      console.error('Erreur fetchStats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20 hover:border-primary/40 transition">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Package className="w-6 h-6 text-primary" />
          Livraison Communautaire
          <Badge variant="secondary">MLP</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Gagnez de l'argent en livrant des colis à proximité
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Available Deliveries */}
          <div className="bg-blue-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {loading ? '-' : stats.availableDeliveries}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Livraisons disponibles
            </div>
          </div>

          {/* My Missions */}
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {loading ? '-' : stats.myMissions}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Missions en cours
            </div>
          </div>

          {/* Earnings */}
          <div className="bg-purple-500/10 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-purple-600 flex items-center justify-center gap-1">
              <DollarSign className="w-4 h-4" />
              {loading ? '-' : stats.totalEarnings.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Revenus totaux
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            onClick={() => navigate('/community-delivery')}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Package className="w-4 h-4 mr-2" />
            Voir les livraisons
          </Button>
          <Button
            onClick={() => navigate('/community-delivery')}
            variant="outline"
            size="sm"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Mes missions
          </Button>
        </div>

        {/* Info Box */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs space-y-1">
          <p>
            ✅ <strong>Automatique:</strong> Les points relais sont assignés selon votre localisation
          </p>
          <p>
            💰 <strong>Rémunération:</strong> 500+ FCFA par livraison complète
          </p>
          <p>
            🏆 <strong>Badges:</strong> Débloquez des badges et statuts spéciaux
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
