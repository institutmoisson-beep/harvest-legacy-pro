import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp } from 'lucide-react';

interface AgentPerformanceComparisonProps {
  currentAgentId: string;
}

interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  performance_month: string;
  monthly_transactions: number;
  monthly_volume: number;
  monthly_deposits: number;
  monthly_withdrawals: number;
  monthly_commissions: number;
  avg_transaction_amount: number;
}

interface ComparisonData {
  month: string;
  [key: string]: number | string;
}

export default function AgentPerformanceComparison({ currentAgentId }: AgentPerformanceComparisonProps) {
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    if (currentAgentId && selectedAgent) {
      fetchComparisonData();
    }
  }, [currentAgentId, selectedAgent]);

  const fetchAgents = async () => {
    try {
      // Get all agents who have transactions
      const { data, error } = await supabase
        .from('agent_performance_comparison')
        .select('agent_id, agent_name')
        .neq('agent_id', currentAgentId);

      if (error) throw error;

      // Remove duplicates
      const uniqueAgents = Array.from(
        new Map(data?.map(item => [item.agent_id, { id: item.agent_id, name: item.agent_name }])).values()
      );

      setAgents(uniqueAgents);
      
      if (uniqueAgents.length > 0) {
        setSelectedAgent(uniqueAgents[0].id);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComparisonData = async () => {
    try {
      // Fetch performance data for both agents (last 6 months)
      const { data: currentData, error: currentError } = await supabase
        .from('agent_performance_comparison')
        .select('*')
        .eq('agent_id', currentAgentId)
        .order('performance_month', { ascending: false })
        .limit(6);

      const { data: compareData, error: compareError } = await supabase
        .from('agent_performance_comparison')
        .select('*')
        .eq('agent_id', selectedAgent)
        .order('performance_month', { ascending: false })
        .limit(6);

      if (currentError) throw currentError;
      if (compareError) throw compareError;

      // Merge data by month
      const monthMap = new Map<string, ComparisonData>();

      currentData?.forEach(item => {
        const month = new Date(item.performance_month).toLocaleDateString('fr-FR', {
          month: 'short',
          year: 'numeric'
        });
        
        monthMap.set(item.performance_month, {
          month,
          moi_transactions: item.monthly_transactions,
          moi_volume: Number(item.monthly_volume),
          moi_commissions: Number(item.monthly_commissions),
        });
      });

      compareData?.forEach(item => {
        const month = new Date(item.performance_month).toLocaleDateString('fr-FR', {
          month: 'short',
          year: 'numeric'
        });
        
        const existing = monthMap.get(item.performance_month) || { month };
        monthMap.set(item.performance_month, {
          ...existing,
          autre_transactions: item.monthly_transactions,
          autre_volume: Number(item.monthly_volume),
          autre_commissions: Number(item.monthly_commissions),
        });
      });

      const sortedData = Array.from(monthMap.values())
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      setComparisonData(sortedData);
    } catch (error) {
      console.error('Error fetching comparison data:', error);
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

  if (agents.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Comparaison de Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Pas assez d'agents pour effectuer une comparaison
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedAgentName = agents.find(a => a.id === selectedAgent)?.name || 'Autre agent';

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Comparaison de Performance
          </CardTitle>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sélectionner un agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Transactions Comparison */}
        <div>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Nombre de Transactions (6 derniers mois)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="moi_transactions" fill="hsl(var(--primary))" name="Moi" />
              <Bar dataKey="autre_transactions" fill="hsl(var(--secondary))" name={selectedAgentName} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Volume Comparison */}
        <div>
          <h3 className="text-sm font-semibold mb-4">Volume de Transactions (MSN)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="moi_volume" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Moi"
              />
              <Line 
                type="monotone" 
                dataKey="autre_volume" 
                stroke="hsl(var(--secondary))" 
                strokeWidth={2}
                name={selectedAgentName}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Commissions Comparison */}
        <div>
          <h3 className="text-sm font-semibold mb-4">Commissions Gagnées (MSN)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="moi_commissions" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Moi"
              />
              <Line 
                type="monotone" 
                dataKey="autre_commissions" 
                stroke="hsl(var(--secondary))" 
                strokeWidth={2}
                name={selectedAgentName}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
