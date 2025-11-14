import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

interface AgentAnalyticsProps {
  agentId: string;
}

interface TransactionStats {
  totalDeposits: number;
  totalWithdrawals: number;
  totalTransactions: number;
  volumeDeposits: number;
  volumeWithdrawals: number;
}

interface TrendData {
  date: string;
  deposits: number;
  withdrawals: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];

export default function AgentAnalytics({ agentId }: AgentAnalyticsProps) {
  const [stats, setStats] = useState<TransactionStats>({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalTransactions: 0,
    volumeDeposits: 0,
    volumeWithdrawals: 0,
  });
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [commissionsData, setCommissionsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (agentId) {
      fetchAnalytics();
    }
  }, [agentId]);

  const fetchAnalytics = async () => {
    try {
      const { data: transactions, error } = await supabase
        .from('agent_transactions')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate stats
      const deposits = transactions?.filter(t => t.transaction_type === 'deposit') || [];
      const withdrawals = transactions?.filter(t => t.transaction_type === 'withdrawal') || [];

      setStats({
        totalDeposits: deposits.length,
        totalWithdrawals: withdrawals.length,
        totalTransactions: transactions?.length || 0,
        volumeDeposits: deposits.reduce((sum, t) => sum + Number(t.amount), 0),
        volumeWithdrawals: withdrawals.reduce((sum, t) => sum + Number(t.amount), 0),
      });

      // Calculate trend data (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const trends = last7Days.map(date => {
        const dayTransactions = transactions?.filter(t => 
          t.created_at.split('T')[0] === date
        ) || [];

        return {
          date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          deposits: dayTransactions
            .filter(t => t.transaction_type === 'deposit')
            .reduce((sum, t) => sum + Number(t.amount), 0),
          withdrawals: dayTransactions
            .filter(t => t.transaction_type === 'withdrawal')
            .reduce((sum, t) => sum + Number(t.amount), 0),
        };
      });

      setTrendData(trends);

      // Fetch commissions data for last 12 months
      const { data: commissionsHistory } = await supabase
        .from('agent_commission_earnings')
        .select('commission_amount, created_at')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: true });

      // Group by month
      const last12Months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (11 - i));
        return {
          month: date.toISOString().slice(0, 7),
          label: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
        };
      });

      const commissionsMonthly = last12Months.map(({ month, label }) => {
        const monthCommissions = commissionsHistory?.filter(c => 
          c.created_at.startsWith(month)
        ) || [];
        
        return {
          month: label,
          commissions: monthCommissions.reduce((sum, c) => sum + Number(c.commission_amount), 0)
        };
      });

      setCommissionsData(commissionsMonthly);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const pieData = [
    { name: 'Dépôts', value: stats.totalDeposits },
    { name: 'Retraits', value: stats.totalWithdrawals },
  ];

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-12">
          <Activity className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalDeposits} dépôts, {stats.totalWithdrawals} retraits
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume Dépôts</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stats.volumeDeposits.toFixed(2)} MSN
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalDeposits} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume Retraits</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {stats.volumeWithdrawals.toFixed(2)} MSN
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalWithdrawals} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Nette</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              stats.volumeDeposits - stats.volumeWithdrawals >= 0 
                ? 'text-green-500' 
                : 'text-red-500'
            }`}>
              {(stats.volumeDeposits - stats.volumeWithdrawals).toFixed(2)} MSN
            </div>
            <p className="text-xs text-muted-foreground">
              Flux net de trésorerie
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Line Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Tendances (7 derniers jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
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
                  dataKey="deposits" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Dépôts"
                />
                <Line 
                  type="monotone" 
                  dataKey="withdrawals" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  name="Retraits"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Répartition des Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Volumes Comparés (7 derniers jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
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
                <Bar dataKey="deposits" fill="hsl(var(--primary))" name="Dépôts" />
                <Bar dataKey="withdrawals" fill="hsl(var(--destructive))" name="Retraits" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
