import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, TrendingUp, DollarSign, Activity } from 'lucide-react';

interface LeaderboardEntry {
  agent_id: string;
  agent_name: string;
  total_transactions: number;
  total_volume: number;
  deposit_count: number;
  withdrawal_count: number;
  total_commissions: number;
  current_tier: string;
  rank_by_transactions: number;
  rank_by_volume: number;
  rank_by_commissions: number;
}

export default function AgentLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_leaderboard' as any)
        .select('*')
        .limit(10);

      if (error) throw error;
      setLeaderboard((data || []) as unknown as LeaderboardEntry[]);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: '🥇', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    if (rank === 2) return { icon: '🥈', color: 'text-gray-400', bg: 'bg-gray-400/10' };
    if (rank === 3) return { icon: '🥉', color: 'text-orange-700', bg: 'bg-orange-700/10' };
    return { icon: `#${rank}`, color: 'text-muted-foreground', bg: 'bg-muted' };
  };

  const LeaderboardTable = ({ 
    rankField, 
    sortField,
    valueFormatter 
  }: { 
    rankField: 'rank_by_transactions' | 'rank_by_volume' | 'rank_by_commissions';
    sortField: 'total_transactions' | 'total_volume' | 'total_commissions';
    valueFormatter: (value: number) => string;
  }) => {
    const sortedData = [...leaderboard].sort((a, b) => a[rankField] - b[rankField]);

    return (
      <div className="space-y-2">
        {sortedData.map((entry) => {
          const badge = getRankBadge(entry[rankField]);
          
          return (
            <div
              key={entry.agent_id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                entry[rankField] <= 3 ? badge.bg + ' border-2' : 'bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${badge.bg}`}>
                  <span className={`text-lg font-bold ${badge.color}`}>
                    {badge.icon}
                  </span>
                </div>
                
                <div className="flex-1">
                  <p className="font-semibold">{entry.agent_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{entry.total_transactions} transactions</span>
                    <span>•</span>
                    <span>Palier: {entry.current_tier || 'Bronze'}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className={`text-2xl font-bold ${
                  entry[rankField] <= 3 ? badge.color : ''
                }`}>
                  {valueFormatter(entry[sortField])}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.deposit_count} dépôts • {entry.withdrawal_count} retraits
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
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

  if (leaderboard.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Classement des Agents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Aucune donnée disponible pour le moment
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          Classement des Agents - Ce Mois
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="volume" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Volume
            </TabsTrigger>
            <TabsTrigger value="commissions" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Commissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-6">
            <LeaderboardTable
              rankField="rank_by_transactions"
              sortField="total_transactions"
              valueFormatter={(value) => `${value}`}
            />
          </TabsContent>

          <TabsContent value="volume" className="mt-6">
            <LeaderboardTable
              rankField="rank_by_volume"
              sortField="total_volume"
              valueFormatter={(value) => `${Number(value).toFixed(0)} MSN`}
            />
          </TabsContent>

          <TabsContent value="commissions" className="mt-6">
            <LeaderboardTable
              rankField="rank_by_commissions"
              sortField="total_commissions"
              valueFormatter={(value) => `${Number(value).toFixed(2)} MSN`}
            />
          </TabsContent>
        </Tabs>

        {/* Top 3 Highlight */}
        <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
          <p className="text-sm font-medium text-center mb-2">🏆 Top 3 du Mois 🏆</p>
          <div className="flex items-center justify-around">
            {leaderboard.slice(0, 3).map((entry, index) => {
              const badges = ['🥇', '🥈', '🥉'];
              return (
                <div key={entry.agent_id} className="text-center">
                  <div className="text-3xl mb-1">{badges[index]}</div>
                  <p className="font-semibold text-sm">{entry.agent_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.total_transactions} trans
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
