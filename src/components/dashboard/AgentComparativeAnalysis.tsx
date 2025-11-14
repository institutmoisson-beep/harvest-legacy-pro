import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Target } from 'lucide-react';

interface AgentComparativeAnalysisProps {
  currentAgentId: string;
}

export default function AgentComparativeAnalysis({ currentAgentId }: AgentComparativeAnalysisProps) {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month');
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [topAgents, setTopAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentAgentId) {
      fetchComparativeData();
    }
  }, [currentAgentId, timeframe]);

  const fetchComparativeData = async () => {
    try {
      const now = new Date();
      let startDate = new Date();
      
      switch (timeframe) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
      }

      // Fetch all agents' transactions
      const { data: allTransactions } = await supabase
        .from('agent_transactions')
        .select('agent_id, amount, transaction_type, status, profiles!agent_transactions_agent_id_fkey(full_name)')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString());

      // Fetch commissions
      const { data: allCommissions } = await supabase
        .from('agent_commission_earnings')
        .select('agent_id, commission_amount')
        .gte('created_at', startDate.toISOString());

      if (!allTransactions) return;

      // Group by agent
      const agentStats = allTransactions.reduce((acc: any, t: any) => {
        const agentId = t.agent_id;
        if (!acc[agentId]) {
          acc[agentId] = {
            agent_id: agentId,
            agent_name: t.profiles?.full_name || 'Inconnu',
            transactions: 0,
            volume: 0,
            commissions: 0,
            deposits: 0,
            withdrawals: 0
          };
        }
        
        acc[agentId].transactions++;
        acc[agentId].volume += Number(t.amount);
        if (t.transaction_type === 'deposit') acc[agentId].deposits++;
        if (t.transaction_type === 'withdrawal') acc[agentId].withdrawals++;
        
        return acc;
      }, {});

      // Add commissions
      allCommissions?.forEach((c: any) => {
        if (agentStats[c.agent_id]) {
          agentStats[c.agent_id].commissions += Number(c.commission_amount);
        }
      });

      const agentsArray = Object.values(agentStats) as any[];
      
      // Get top 5 agents
      const sorted = [...agentsArray].sort((a, b) => b.commissions - a.commissions).slice(0, 5);
      setTopAgents(sorted);

      // Prepare comparison chart data
      const currentAgent = agentsArray.find(a => a.agent_id === currentAgentId);
      const avgStats = {
        transactions: agentsArray.reduce((sum, a) => sum + a.transactions, 0) / agentsArray.length,
        volume: agentsArray.reduce((sum, a) => sum + a.volume, 0) / agentsArray.length,
        commissions: agentsArray.reduce((sum, a) => sum + a.commissions, 0) / agentsArray.length,
        deposits: agentsArray.reduce((sum, a) => sum + a.deposits, 0) / agentsArray.length,
        withdrawals: agentsArray.reduce((sum, a) => sum + a.withdrawals, 0) / agentsArray.length
      };

      const comparison = [
        {
          metric: 'Transactions',
          'Vous': currentAgent?.transactions || 0,
          'Moyenne': Math.round(avgStats.transactions),
          'Top Agent': sorted[0]?.transactions || 0
        },
        {
          metric: 'Volume',
          'Vous': currentAgent?.volume || 0,
          'Moyenne': Math.round(avgStats.volume),
          'Top Agent': sorted[0]?.volume || 0
        },
        {
          metric: 'Commissions',
          'Vous': currentAgent?.commissions || 0,
          'Moyenne': Math.round(avgStats.commissions),
          'Top Agent': sorted[0]?.commissions || 0
        }
      ];
      setComparisonData(comparison);

      // Prepare radar chart data (normalized to 100)
      const maxValues = {
        transactions: Math.max(...agentsArray.map(a => a.transactions)),
        volume: Math.max(...agentsArray.map(a => a.volume)),
        commissions: Math.max(...agentsArray.map(a => a.commissions)),
        deposits: Math.max(...agentsArray.map(a => a.deposits)),
        withdrawals: Math.max(...agentsArray.map(a => a.withdrawals))
      };

      const radar = [
        {
          metric: 'Transactions',
          value: currentAgent ? (currentAgent.transactions / maxValues.transactions) * 100 : 0,
          moyenne: (avgStats.transactions / maxValues.transactions) * 100
        },
        {
          metric: 'Volume',
          value: currentAgent ? (currentAgent.volume / maxValues.volume) * 100 : 0,
          moyenne: (avgStats.volume / maxValues.volume) * 100
        },
        {
          metric: 'Commissions',
          value: currentAgent ? (currentAgent.commissions / maxValues.commissions) * 100 : 0,
          moyenne: (avgStats.commissions / maxValues.commissions) * 100
        },
        {
          metric: 'Dépôts',
          value: currentAgent ? (currentAgent.deposits / maxValues.deposits) * 100 : 0,
          moyenne: (avgStats.deposits / maxValues.deposits) * 100
        },
        {
          metric: 'Retraits',
          value: currentAgent ? (currentAgent.withdrawals / maxValues.withdrawals) * 100 : 0,
          moyenne: (avgStats.withdrawals / maxValues.withdrawals) * 100
        }
      ];
      setRadarData(radar);

    } catch (error) {
      console.error('Error fetching comparative data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Analyse Comparative
            </CardTitle>
            <Select value={timeframe} onValueChange={(v: any) => setTimeframe(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">7 derniers jours</SelectItem>
                <SelectItem value="month">30 derniers jours</SelectItem>
                <SelectItem value="quarter">3 derniers mois</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="Vous" fill="hsl(var(--primary))" />
              <Bar dataKey="Moyenne" fill="hsl(var(--muted))" />
              <Bar dataKey="Top Agent" fill="hsl(var(--secondary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Performance Multi-Critères
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis 
                  dataKey="metric" 
                  stroke="hsl(var(--foreground))"
                  tick={{ fontSize: 12 }}
                />
                <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" />
                <Radar 
                  name="Vous" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.6} 
                />
                <Radar 
                  name="Moyenne" 
                  dataKey="moyenne" 
                  stroke="hsl(var(--muted))" 
                  fill="hsl(var(--muted))" 
                  fillOpacity={0.3} 
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Agents */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-secondary" />
              Top 5 Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topAgents.map((agent, index) => (
                <div 
                  key={agent.agent_id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    agent.agent_id === currentAgentId 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{agent.agent_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {agent.transactions} transactions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-secondary">
                      {agent.commissions.toFixed(2)} MSN
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Volume: {agent.volume.toLocaleString()} MSN
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
