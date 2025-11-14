import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Package, DollarSign, Star } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BrokerDetailsModalProps {
  brokerId: string | null;
  onClose: () => void;
}

interface BrokerStats {
  name: string;
  totalOrders: number;
  completedOrders: number;
  totalProfit: number;
  averageProfit: number;
  bestMonth: string;
  badges: string[];
  monthlyData: Array<{ month: string; orders: number; profit: number }>;
}

export default function BrokerDetailsModal({ brokerId, onClose }: BrokerDetailsModalProps) {
  const [stats, setStats] = useState<BrokerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (brokerId) {
      fetchBrokerStats();
    }
  }, [brokerId]);

  const fetchBrokerStats = async () => {
    if (!brokerId) return;

    try {
      // Récupérer le profil
      const { data: profile } = await supabase
        .from('profiles' as any)
        .select('full_name')
        .eq('id', brokerId)
        .single() as any;

      // Récupérer toutes les commandes
      const { data: orders } = await supabase
        .from('orders' as any)
        .select('*')
        .eq('broker_id', brokerId)
        .in('status', ['completed', 'validated']);

      if (!orders || orders.length === 0) {
        setLoading(false);
        return;
      }

      // Calculer les statistiques
      const totalOrders = orders.length;
      const completedOrders = orders.filter((o: any) => o.status === 'completed' || o.status === 'validated').length;
      const totalProfit = orders.reduce((sum: number, o: any) => sum + (Number(o.profit) || 0), 0);
      const averageProfit = totalProfit / completedOrders;

      // Données mensuelles
      const monthlyMap = new Map<string, { orders: number; profit: number }>();
      orders.forEach((order: any) => {
        const month = new Date(order.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' });
        const current = monthlyMap.get(month) || { orders: 0, profit: 0 };
        monthlyMap.set(month, {
          orders: current.orders + 1,
          profit: current.profit + (Number(order.profit) || 0)
        });
      });

      const monthlyData = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
        .slice(-6);

      // Meilleur mois
      const bestMonth = monthlyData.reduce((best, current) => 
        current.profit > best.profit ? current : best
      , monthlyData[0] || { month: 'N/A', profit: 0 });

      // Badges automatiques
      const badges = [];
      if (totalProfit > 1000000) badges.push('🏆 Million Maker');
      if (completedOrders > 50) badges.push('⭐ Super Vendeur');
      if (averageProfit > 20000) badges.push('💎 Profit Master');
      if (monthlyData.length >= 3) badges.push('🎯 Régulier');

      setStats({
        name: profile?.full_name || 'Inconnu',
        totalOrders,
        completedOrders,
        totalProfit,
        averageProfit,
        bestMonth: bestMonth.month,
        badges,
        monthlyData
      });
    } catch (error) {
      console.error('Erreur récupération stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!brokerId) return null;

  return (
    <Dialog open={!!brokerId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="h-6 w-6 text-accent" />
            Statistiques Détaillées - {stats?.name || 'Chargement...'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Badges */}
            {stats.badges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {stats.badges.map((badge, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {badge}
                  </Badge>
                ))}
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Commandes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalOrders}</div>
                  <p className="text-xs text-muted-foreground">{stats.completedOrders} validées</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Profit Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalProfit.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">FCFA</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Profit Moyen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(stats.averageProfit).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">FCFA</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Meilleur Mois
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{stats.bestMonth}</div>
                  <p className="text-xs text-muted-foreground">Performance max</p>
                </CardContent>
              </Card>
            </div>

            {/* Graphiques */}
            <Card>
              <CardHeader>
                <CardTitle>Évolution des Profits (6 derniers mois)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Profit (FCFA)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nombre de Commandes par Mois</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="orders" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={2}
                      name="Commandes"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">Aucune donnée disponible</p>
        )}
      </DialogContent>
    </Dialog>
  );
}