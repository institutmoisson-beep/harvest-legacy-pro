import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TontinePaymentCalendar from '@/components/dashboard/TontinePaymentCalendar';
import { ArrowLeft, TrendingUp, AlertCircle, Coins, Calendar, Download } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from '@/hooks/use-toast';

export default function TontineDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    joined: 0,
    overdue: 0,
    totalContributed: 0,
    upcoming: 0,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [frequencyData, setFrequencyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    try {
      // Fetch user's tontines
      const { data: participations } = await supabase
        .from('tontine_participants')
        .select('tontine_id')
        .eq('user_id', user?.id);

      if (!participations || participations.length === 0) {
        setLoading(false);
        return;
      }

      const tontineIds = participations.map(p => p.tontine_id);

      // Fetch tontines details
      const { data: tontines } = await supabase
        .from('tontines')
        .select('*')
        .in('id', tontineIds);

      // Fetch payment schedule
      const { data: schedule } = await (supabase.from as any)('tontine_payment_schedule')
        .select('*')
        .in('tontine_id', tontineIds);

      // Fetch actual payments
      const { data: payments } = await supabase
        .from('tontine_payments')
        .select('*')
        .eq('user_id', user?.id)
        .in('tontine_id', tontineIds);

      // Calculate stats
      const now = new Date();
      const overdueCount = schedule?.filter(
        (s: any) => new Date(s.due_date) < now && !payments?.some((p: any) => p.tontine_id === s.tontine_id && p.cycle_number === s.cycle_number)
      ).length || 0;

      const upcomingCount = schedule?.filter(
        (s: any) => new Date(s.due_date) >= now && !payments?.some((p: any) => p.tontine_id === s.tontine_id && p.cycle_number === s.cycle_number)
      ).length || 0;

      const totalContributed = payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

      setStats({
        joined: tontines?.length || 0,
        overdue: overdueCount,
        totalContributed,
        upcoming: upcomingCount,
      });

      // Monthly data for chart
      const monthlyMap = new Map();
      payments?.forEach((p: any) => {
        const month = new Date(p.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        monthlyMap.set(month, (monthlyMap.get(month) || 0) + p.amount);
      });
      const monthly = Array.from(monthlyMap.entries()).map(([month, amount]) => ({ month, amount }));
      setMonthlyData(monthly);

      // Frequency distribution
      const freqMap = new Map();
      tontines?.forEach((t: any) => {
        freqMap.set(t.frequency, (freqMap.get(t.frequency) || 0) + 1);
      });
      const freq = Array.from(freqMap.entries()).map(([name, value]) => ({ name, value }));
      setFrequencyData(freq);

    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = [
      ['Métrique', 'Valeur'],
      ['Tontines rejointes', stats.joined],
      ['Paiements en retard', stats.overdue],
      ['Total cotisé (FCFA)', stats.totalContributed],
      ['Paiements à venir', stats.upcoming],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tontines_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast({ title: 'Export réussi', description: 'Rapport CSV téléchargé' });
  };

  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="container mx-auto max-w-7xl space-y-6">
        <header className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/tontines')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour aux Tontines
          </Button>
          <h1 className="text-3xl font-bold gradient-text-cosmic">Tableau de bord Tontine</h1>
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Exporter CSV
          </Button>
        </header>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" />
                Tontines rejointes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.joined}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                En retard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Total cotisé
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalContributed.toLocaleString()} FCFA</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                À venir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcoming}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendar">Calendrier</TabsTrigger>
            <TabsTrigger value="charts">Graphiques</TabsTrigger>
            <TabsTrigger value="frequency">Répartition</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <TontinePaymentCalendar userId={user?.id || ''} />
          </TabsContent>

          <TabsContent value="charts">
            <Card>
              <CardHeader>
                <CardTitle>Cotisations mensuelles</CardTitle>
                <CardDescription>Évolution de vos paiements dans le temps</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2} name="Montant (FCFA)" />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="mt-6">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="amount" fill="#06b6d4" name="Montant (FCFA)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Aucune donnée de paiement disponible</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="frequency">
            <Card>
              <CardHeader>
                <CardTitle>Répartition par fréquence</CardTitle>
                <CardDescription>Distribution de vos tontines selon la fréquence</CardDescription>
              </CardHeader>
              <CardContent>
                {frequencyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={frequencyData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {frequencyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Aucune donnée disponible</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
