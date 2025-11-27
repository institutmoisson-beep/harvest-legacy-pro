import { useState, useEffect, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Medal, Award, Calendar, TrendingUp } from 'lucide-react';
import BrokerDetailsModal from './BrokerDetailsModal';

interface LeaderboardEntry {
  broker_id: string;
  broker_name: string;
  total_orders: number;
  completed_orders: number;
  total_profit: number;
  rank: number;
}

function OrdersLeaderboardComponent() {
  const MSN_TO_FCFA = 750;
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [timeFilter]);

  const fetchLeaderboard = async () => {
    try {
      // Calculer la date de début selon le filtre
      let startDate = new Date();
      if (timeFilter === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeFilter === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (timeFilter === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      // Récupérer les commandes selon le filtre temporel
      let query = supabase
        .from('orders' as any)
        .select('broker_id, status, profit, quantity, purchase_price, created_at')
        .in('status', ['completed', 'validated']);

      if (timeFilter !== 'all') {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data: orders, error: ordersError } = await query;

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        setLoading(false);
        return;
      }

      if (!orders || orders.length === 0) {
        console.log('No orders found');
        setLoading(false);
        return;
      }

      // Récupérer les profils des brokers
      const brokerIds = [...new Set((orders as any[]).map((o: any) => o.broker_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles' as any)
        .select('id, full_name')
        .in('id', brokerIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Créer un map des profils
      const profilesMap = new Map((profiles as any)?.map((p: any) => [p.id, p.full_name]) || []);

      // Grouper par broker
      const brokerStats = (orders as any[]).reduce((acc: any, order: any) => {
        const brokerId = order.broker_id;
        if (!acc[brokerId]) {
          acc[brokerId] = {
            broker_id: brokerId,
            broker_name: profilesMap.get(brokerId) || 'Inconnu',
            total_orders: 0,
            completed_orders: 0,
            total_profit: 0
          };
        }
        
        acc[brokerId].total_orders++;
        if (order.status === 'completed' || order.status === 'validated') {
          acc[brokerId].completed_orders++;
          acc[brokerId].total_profit += Number(order.profit || 0);
        }
        
        return acc;
      }, {});

      // Convertir en array et trier par profit total
      const sortedBrokers = Object.values(brokerStats)
        .sort((a: any, b: any) => b.total_profit - a.total_profit)
        .slice(0, 10)
        .map((broker: any, index: number) => ({
          ...broker,
          rank: index + 1
        }));

      console.log('Leaderboard data:', sortedBrokers);
      setLeaderboard(sortedBrokers);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-semibold text-muted-foreground">#{rank}</span>;
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            Classement des Moissonneurs
          </CardTitle>
          <Select value={timeFilter} onValueChange={(value: any) => setTimeFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
              <SelectItem value="all">Tout le temps</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune donnée disponible
            </p>
          ) : (
            leaderboard.map((entry) => (
              <div
                key={entry.broker_id}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer hover:scale-[1.02] ${
                  entry.rank <= 3
                    ? 'border-secondary bg-secondary/10'
                    : 'border-border bg-muted/30'
                }`}
                onClick={() => setSelectedBroker(entry.broker_id)}
              >
                <div className="flex items-center justify-center w-10">
                  {getRankIcon(entry.rank)}
                </div>

                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {entry.broker_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <h4 className="font-semibold">{entry.broker_name}</h4>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    <span>{entry.total_orders} commandes</span>
                    <span>•</span>
                    <span>{entry.completed_orders} validées</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-secondary">
                    {(entry.total_profit * MSN_TO_FCFA).toLocaleString()} FCFA
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Profits
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      <BrokerDetailsModal
        brokerId={selectedBroker}
        onClose={() => setSelectedBroker(null)}
      />
    </Card>
  );
}

export default memo(OrdersLeaderboardComponent);
