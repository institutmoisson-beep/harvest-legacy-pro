import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Trophy, Target, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AgentKPICardsProps {
  agentId: string;
}

interface KPIData {
  totalTransactions: number;
  totalCommissions: number;
  monthlyBonus: number;
  leaderboardRank: number | null;
  completedToday: number;
}

export default function AgentKPICards({ agentId }: AgentKPICardsProps) {
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData>({
    totalTransactions: 0,
    totalCommissions: 0,
    monthlyBonus: 0,
    leaderboardRank: null,
    completedToday: 0,
  });

  useEffect(() => {
    if (agentId) {
      fetchKPIData();
    }
  }, [agentId]);

  const fetchKPIData = async () => {
    setLoading(true);
    try {
      // Fetch total transactions
      const { count: totalTransactions } = await supabase
        .from('agent_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .eq('status', 'completed');

      // Fetch today's transactions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: completedToday } = await supabase
        .from('agent_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .eq('status', 'completed')
        .gte('created_at', today.toISOString());

      // Fetch total commissions
      const { data: commissionsData } = await supabase
        .from('agent_commission_earnings')
        .select('commission_amount')
        .eq('agent_id', agentId);

      const totalCommissions = commissionsData?.reduce(
        (sum, item) => sum + Number(item.commission_amount),
        0
      ) || 0;

      // Fetch current month bonus (using raw SQL query)
      const currentMonth = new Date();
      currentMonth.setDate(1);
      const monthStr = currentMonth.toISOString().split('T')[0];
      
      const { data: bonusData } = await supabase.rpc('get_agent_tier', {
        p_agent_id: agentId
      });

      // Fetch leaderboard data using aggregate count
      const { data: allAgents } = await supabase
        .from('agent_transactions')
        .select('agent_id, status')
        .eq('status', 'completed');

      // Calculate ranks
      const agentCounts = allAgents?.reduce((acc: Record<string, number>, t) => {
        acc[t.agent_id] = (acc[t.agent_id] || 0) + 1;
        return acc;
      }, {}) || {};

      const sortedAgents = Object.entries(agentCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number));
      
      const rank = sortedAgents.findIndex(([id]) => id === agentId) + 1;

      setKpiData({
        totalTransactions: totalTransactions || 0,
        totalCommissions: totalCommissions,
        monthlyBonus: 0, // Will be calculated from bonus system
        leaderboardRank: rank > 0 ? rank : null,
        completedToday: completedToday || 0,
      });
    } catch (error) {
      console.error('Error fetching KPI data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="glass-card">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpiCards = [
    {
      title: "Total Transactions",
      value: kpiData.totalTransactions,
      icon: Activity,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Aujourd'hui",
      value: kpiData.completedToday,
      icon: Target,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Commissions Totales",
      value: `${kpiData.totalCommissions.toFixed(2)} MSN`,
      icon: DollarSign,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Bonus du Mois",
      value: `${kpiData.monthlyBonus.toFixed(2)} MSN`,
      icon: TrendingUp,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Classement",
      value: kpiData.leaderboardRank ? `#${kpiData.leaderboardRank}` : 'N/A',
      icon: Trophy,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {kpiCards.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <Card key={index} className="glass-card hover:scale-105 transition-transform">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                {kpi.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
