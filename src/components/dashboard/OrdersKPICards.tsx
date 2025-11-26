import { useState, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Clock, CheckCircle, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { useOrdersData } from '@/hooks/useOrdersData';

interface OrdersKPICardsProps {
  userId: string;
}

function OrdersKPICardsComponent({ userId }: OrdersKPICardsProps) {
  const MSN_TO_FCFA = 750;
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const { orders, kpis: allKpis, loading } = useOrdersData(userId);

  const kpis = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    switch (timeFilter) {
      case 'today':
        startDate = new Date(now.toISOString().split('T')[0]);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    const filteredOrders = orders.filter(o => new Date(o.created_at) >= startDate);
    const pending = filteredOrders.filter(o => o.status === 'pending');
    const completed = filteredOrders.filter(o => o.status === 'completed');
    const totalProfit = completed.reduce((sum, o) => sum + Number(o.profit), 0) * MSN_TO_FCFA;
    const successRate = filteredOrders.length > 0
      ? (completed.length / filteredOrders.length) * 100
      : 0;

    return {
      totalOrders: filteredOrders.length,
      pendingOrders: pending.length,
      completedOrders: completed.length,
      totalProfit,
      successRate
    };
  }, [orders, timeFilter]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="glass-card animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const filterLabels = {
    today: "Aujourd'hui",
    week: '7 derniers jours',
    month: '30 derniers jours',
    year: 'Cette année'
  };

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Indicateurs des Commandes</h2>
        <Select value={timeFilter} onValueChange={(v: any) => setTimeFilter(v)}>
          <SelectTrigger className="w-[200px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="week">7 derniers jours</SelectItem>
            <SelectItem value="month">30 derniers jours</SelectItem>
            <SelectItem value="year">Cette année</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="glass-card border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commandes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filterLabels[timeFilter]}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <Clock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{kpis.pendingOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Nécessitent validation
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-l-4 border-l-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complétées</CardTitle>
            <CheckCircle className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{kpis.completedOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Validées et payées
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-l-4 border-l-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profits Totaux</CardTitle>
            <DollarSign className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">
              {kpis.totalProfit.toLocaleString()} FCFA
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Commissions gagnées
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Réussite</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Commandes validées
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default memo(OrdersKPICardsComponent);
