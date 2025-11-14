import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardEntry {
  broker_id: string;
  broker_name: string;
  total_orders: number;
  completed_orders: number;
  total_profit: number;
  rank: number;
}

export default function OrdersLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      // Récupérer toutes les commandes validées
      const { data: orders, error: ordersError } = await supabase
        .from('orders' as any)
        .select('broker_id, status, profit, quantity, purchase_price')
        .in('status', ['completed', 'validated']);

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
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          Classement des Moissonneurs
        </CardTitle>
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
                className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                  entry.rank <= 3
                    ? 'border-secondary bg-secondary/10'
                    : 'border-border bg-muted/30'
                }`}
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
                    {entry.total_profit.toLocaleString()} FCFA
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
    </Card>
  );
}
