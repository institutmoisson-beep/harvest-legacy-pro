import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Wallet, Calendar, DollarSign } from 'lucide-react';
import InvestmentPaymentHistory from '@/components/dashboard/InvestmentPaymentHistory';
import NotificationsPanel from '@/components/dashboard/NotificationsPanel';
import InvestmentAnalytics from '@/components/dashboard/InvestmentAnalytics';
import TontinePaymentCalendar from '@/components/dashboard/TontinePaymentCalendar';
import AchievementBadges from '@/components/dashboard/AchievementBadges';
import PromoCodesDisplay from '@/components/dashboard/PromoCodesDisplay';

const MSN_TO_FCFA = 750;

export default function InvestorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalInvested: 0,
    totalEarnings: 0,
    activeInvestments: 0,
    completedInvestments: 0,
  });
  const [investments, setInvestments] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchInvestmentStats();
      fetchInvestments();
    }
  }, [user]);

  const fetchInvestmentStats = async () => {
    const { data: investments } = await supabase
      .from('investment_products')
      .select('*')
      .eq('investor_id', user?.id);

    if (investments) {
      const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.investment_amount), 0);
      const totalEarnings = investments.reduce((sum, inv) => sum + Number(inv.investor_earnings), 0);
      const activeInvestments = investments.filter(inv => inv.status === 'active').length;
      const completedInvestments = investments.filter(inv => inv.status === 'completed').length;

      setStats({
        totalInvested,
        totalEarnings,
        activeInvestments,
        completedInvestments,
      });
    }
  };

  const fetchInvestments = async () => {
    const { data } = await supabase
      .from('investment_products')
      .select('*')
      .eq('investor_id', user?.id)
      .order('created_at', { ascending: false });

    if (data) setInvestments(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold">Tableau de Bord Investisseur</h1>
        </div>

        <PromoCodesDisplay />

        <div className="grid gap-6 md:grid-cols-4 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Investi</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInvested.toFixed(2)} MSN</div>
              <p className="text-xs text-muted-foreground">
                {(stats.totalInvested * MSN_TO_FCFA).toLocaleString()} FCFA
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Gains</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.totalEarnings.toFixed(2)} MSN</div>
              <p className="text-xs text-muted-foreground">
                {(stats.totalEarnings * MSN_TO_FCFA).toLocaleString()} FCFA
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Investissements Actifs</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeInvestments}</div>
              <p className="text-xs text-muted-foreground">En cours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Investissements Terminés</CardTitle>
              <Wallet className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedInvestments}</div>
              <p className="text-xs text-muted-foreground">Complétés</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="analytics" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="calendar">Calendrier</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-6">
            <InvestmentAnalytics userId={user?.id || ''} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <TontinePaymentCalendar userId={user?.id || ''} />
          </TabsContent>

          <TabsContent value="badges" className="mt-6">
            <AchievementBadges userId={user?.id || ''} />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <NotificationsPanel userId={user?.id || ''} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
