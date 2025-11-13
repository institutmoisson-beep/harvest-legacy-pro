import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Users, DollarSign, Calendar, Award } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from '@/hooks/use-toast';

export default function AdminTontineAnalytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeTontines: 0,
    totalParticipants: 0,
    totalRevenue: 0,
    paymentRate: 0,
    overdue: 0,
  });
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [topParticipants, setTopParticipants] = useState<any[]>([]);
  const [tontinesByFrequency, setTontinesByFrequency] = useState<any[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Active tontines
      const { data: tontines } = await supabase
        .from('tontines')
        .select('*')
        .eq('status', 'active');

      const activeTontines = tontines?.length || 0;

      // Total participants
      const { data: participants, error: partError } = await supabase
        .from('tontine_participants')
        .select('id, user_id');

      if (partError) {
        console.error('Error fetching participants:', partError);
      }

      const totalParticipants = participants?.length || 0;

      // Total revenue from payments
      const { data: payments } = await supabase
        .from('tontine_payments')
        .select('amount, status, created_at')
        .eq('status', 'validated');

      const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // Payment schedule
      const { data: schedule } = await (supabase.from as any)('tontine_payment_schedule')
        .select('*');

      // Calculate payment rate
      const totalDue = schedule?.length || 1;
      const totalPaid = payments?.length || 0;
      const paymentRate = Math.round((totalPaid / totalDue) * 100);

      // Overdue payments
      const now = new Date();
      const overdue = schedule?.filter((s: any) => 
        new Date(s.due_date) < now && 
        !payments?.some(p => p.created_at && new Date(p.created_at) >= new Date(s.due_date))
      ).length || 0;

      setStats({
        activeTontines,
        totalParticipants,
        totalRevenue,
        paymentRate,
        overdue,
      });

      // Monthly revenue
      const monthlyMap = new Map();
      payments?.forEach((p: any) => {
        const month = new Date(p.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        monthlyMap.set(month, (monthlyMap.get(month) || 0) + p.amount);
      });
      const monthly = Array.from(monthlyMap.entries()).map(([month, revenue]) => ({ month, revenue }));
      setMonthlyRevenue(monthly);

      // Top participants (most active)
      const participantMap = new Map();
      payments?.forEach((p: any) => {
        const userId = (p as any).user_id;
        participantMap.set(userId, (participantMap.get(userId) || 0) + 1);
      });
      
      const topUserIds = Array.from(participantMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([userId]) => userId);

      if (topUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', topUserIds);

        const top = topUserIds.map(userId => ({
          name: profiles?.find(p => p.id === userId)?.full_name || 'Utilisateur',
          payments: participantMap.get(userId),
        }));
        setTopParticipants(top);
      }

      // Tontines by frequency
      const freqMap = new Map();
      tontines?.forEach((t: any) => {
        freqMap.set(t.frequency, (freqMap.get(t.frequency) || 0) + 1);
      });
      const freq = Array.from(freqMap.entries()).map(([name, value]) => ({ name, value }));
      setTontinesByFrequency(freq);

      // Payment status distribution
      const statusMap = new Map([
        ['Validés', payments?.length || 0],
        ['En attente', (schedule?.length || 0) - (payments?.length || 0)],
        ['En retard', overdue],
      ]);
      const statusData = Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));
      setPaymentStatus(statusData);

    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Chargement des analytics...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold gradient-text-cosmic mb-2">Analytics Tontines - Admin</h2>
        <p className="text-sm text-muted-foreground">Vue d'ensemble des statistiques globales</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Tontines actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTontines}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParticipants}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Revenus totaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} FCFA</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-500" />
              Taux de paiement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paymentRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-red-500" />
              En retard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">Revenus</TabsTrigger>
          <TabsTrigger value="participants">Top Participants</TabsTrigger>
          <TabsTrigger value="frequency">Fréquences</TabsTrigger>
          <TabsTrigger value="status">Statuts</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenus mensuels</CardTitle>
              <CardDescription>Évolution des paiements validés</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} name="Revenus (FCFA)" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Aucune donnée disponible</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Participants</CardTitle>
              <CardDescription>Les membres les plus actifs</CardDescription>
            </CardHeader>
            <CardContent>
              {topParticipants.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topParticipants}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="payments" fill="#06b6d4" name="Paiements effectués" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Aucune donnée disponible</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="frequency">
          <Card>
            <CardHeader>
              <CardTitle>Répartition par fréquence</CardTitle>
              <CardDescription>Distribution des tontines</CardDescription>
            </CardHeader>
            <CardContent>
              {tontinesByFrequency.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={tontinesByFrequency}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {tontinesByFrequency.map((entry, index) => (
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

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>Statut des paiements</CardTitle>
              <CardDescription>Distribution des paiements</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={paymentStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentStatus.map((entry, index) => (
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
  );
}
