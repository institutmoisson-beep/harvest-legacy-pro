import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, DollarSign, PieChart, BarChart3 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MSN_TO_FCFA = 750;

interface InvestmentAnalyticsProps {
  userId: string;
}

export default function InvestmentAnalytics({ userId }: InvestmentAnalyticsProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [userId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    
    // Fetch all investments
    const { data: investments } = await supabase
      .from('investment_products')
      .select('*')
      .eq('investor_id', userId)
      .order('created_at', { ascending: true });

    if (investments) {
      // Calculate statistics
      const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.investment_amount), 0);
      const totalEarnings = investments.reduce((sum, inv) => sum + Number(inv.investor_earnings), 0);
      const activeInvestments = investments.filter(inv => inv.status === 'active');
      const completedInvestments = investments.filter(inv => inv.status === 'completed');
      
      const roi = totalInvested > 0 ? ((totalEarnings / totalInvested) * 100).toFixed(2) : 0;
      const avgInvestment = investments.length > 0 ? (totalInvested / investments.length) : 0;

      // Prepare data for charts
      const monthlyData = prepareMonthlyData(investments);
      const productDistribution = prepareProductDistribution(investments);
      const statusData = [
        { name: 'Actif', value: activeInvestments.length, color: '#22c55e' },
        { name: 'Terminé', value: completedInvestments.length, color: '#3b82f6' }
      ];

      setAnalytics({
        totalInvested,
        totalEarnings,
        roi,
        avgInvestment,
        activeCount: activeInvestments.length,
        completedCount: completedInvestments.length,
        monthlyData,
        productDistribution,
        statusData,
        investments
      });
    }
    
    setLoading(false);
  };

  const prepareMonthlyData = (investments: any[]) => {
    const monthlyMap = new Map();
    
    investments.forEach(inv => {
      const date = new Date(inv.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { month: monthKey, invested: 0, earnings: 0 });
      }
      
      const data = monthlyMap.get(monthKey);
      data.invested += Number(inv.investment_amount);
      data.earnings += Number(inv.investor_earnings);
    });

    return Array.from(monthlyMap.values()).map(data => ({
      month: new Date(data.month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
      invested: data.invested / MSN_TO_FCFA,
      earnings: data.earnings / MSN_TO_FCFA
    }));
  };

  const prepareProductDistribution = (investments: any[]) => {
    const productMap = new Map();
    
    investments.forEach(inv => {
      const name = inv.product_name;
      if (!productMap.has(name)) {
        productMap.set(name, { name, value: 0, count: 0 });
      }
      const data = productMap.get(name);
      data.value += Number(inv.investment_amount);
      data.count += 1;
    });

    const colors = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899'];
    return Array.from(productMap.values()).map((data, idx) => ({
      ...data,
      value: data.value / MSN_TO_FCFA,
      color: colors[idx % colors.length]
    }));
  };

  if (loading) {
    return <Card><CardContent className="p-6">Chargement...</CardContent></Card>;
  }

  if (!analytics) {
    return <Card><CardContent className="p-6">Aucune donnée disponible</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Investi</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(analytics.totalInvested / MSN_TO_FCFA).toFixed(2)} MSN</div>
            <p className="text-xs text-muted-foreground">{analytics.totalInvested.toLocaleString()} FCFA</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Gains</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{(analytics.totalEarnings / MSN_TO_FCFA).toFixed(2)} MSN</div>
            <p className="text-xs text-muted-foreground">{analytics.totalEarnings.toLocaleString()} FCFA</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ROI Moyen</CardTitle>
            <PieChart className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.roi}%</div>
            <p className="text-xs text-muted-foreground">Retour sur investissement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Investissement Moyen</CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(analytics.avgInvestment / MSN_TO_FCFA).toFixed(2)} MSN</div>
            <p className="text-xs text-muted-foreground">{analytics.avgInvestment.toLocaleString()} FCFA</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution Mensuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="invested" stroke="#3b82f6" name="Investi (MSN)" />
                <Line type="monotone" dataKey="earnings" stroke="#22c55e" name="Gains (MSN)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Product Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Produit</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={analytics.productDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value.toFixed(0)} MSN`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.productDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Statut des Investissements</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Nombre">
                  {analytics.statusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Résumé Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Investissements actifs</span>
              <span className="font-bold text-green-600">{analytics.activeCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Investissements terminés</span>
              <span className="font-bold text-blue-600">{analytics.completedCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total investissements</span>
              <span className="font-bold">{analytics.investments.length}</span>
            </div>
            <div className="h-px bg-border my-4" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Rendement total</span>
              <span className="text-xl font-bold text-green-600">
                +{(analytics.totalEarnings / MSN_TO_FCFA).toFixed(2)} MSN
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
