import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity } from 'lucide-react';

interface OrdersAnalyticsProps {
  userId: string;
}

const COLORS = {
  pending: 'hsl(var(--accent))',
  completed: 'hsl(var(--secondary))',
  rejected: 'hsl(var(--destructive))',
  cancelled: 'hsl(var(--muted))'
};

export default function OrdersAnalytics({ userId }: OrdersAnalyticsProps) {
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [profitTrend, setProfitTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchAnalytics();
    }
  }, [userId]);

  const fetchAnalytics = async () => {
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('broker_id', userId)
        .order('created_at', { ascending: false });

      if (!orders) return;

      // Status distribution
      const statusCount = orders.reduce((acc: any, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      const statusChartData = Object.entries(statusCount).map(([status, count]) => ({
        name: status === 'pending' ? 'En attente' : 
              status === 'completed' ? 'Complétée' :
              status === 'rejected' ? 'Rejetée' : 'Annulée',
        value: count as number,
        status
      }));

      setStatusData(statusChartData);

      // Last 30 days trend
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toISOString().split('T')[0];
      });

      const dailyData = last30Days.map(date => {
        const dayOrders = orders.filter(o => o.created_at.startsWith(date));
        const completed = dayOrders.filter(o => o.status === 'completed');
        
        return {
          date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          commandes: dayOrders.length,
          validées: completed.length
        };
      });

      setOrdersData(dailyData);

      // Profit trend (last 12 months)
      const last12Months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (11 - i));
        return {
          month: date.toISOString().slice(0, 7),
          label: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
        };
      });

      const profitMonthly = last12Months.map(({ month, label }) => {
        const monthOrders = orders.filter(o => 
          o.created_at.startsWith(month) && o.status === 'completed'
        );
        
        return {
          month: label,
          profit: monthOrders.reduce((sum, o) => sum + Number(o.profit), 0)
        };
      });

      setProfitTrend(profitMonthly);
    } catch (error) {
      console.error('Error fetching orders analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card mb-8">
        <CardContent className="flex items-center justify-center py-12">
          <Activity className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Trend */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Évolution des Commandes (30 jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ordersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 10 }}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="commandes" 
                  stroke="hsl(var(--primary))" 
                  name="Total Commandes" 
                  strokeWidth={2} 
                />
                <Line 
                  type="monotone" 
                  dataKey="validées" 
                  stroke="hsl(var(--secondary))" 
                  name="Validées" 
                  strokeWidth={2} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Répartition par Statut</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.status as keyof typeof COLORS]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Profit Evolution */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-secondary" />
            Évolution des Profits (12 mois)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={profitTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => `${value.toLocaleString()} FCFA`}
              />
              <Legend />
              <Bar dataKey="profit" fill="hsl(var(--secondary))" name="Profits (FCFA)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
