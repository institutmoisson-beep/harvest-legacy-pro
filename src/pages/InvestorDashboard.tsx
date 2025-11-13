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

        <Tabs defaultValue="investments" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="investments">Mes Investissements</TabsTrigger>
            <TabsTrigger value="history">Historique Paiements</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="investments" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Liste des Investissements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {investments.map((inv) => (
                    <Card key={inv.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{inv.product_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Investi: {inv.investment_amount} MSN
                            </p>
                            <p className="text-sm text-green-600">
                              Gains: {inv.investor_earnings} MSN
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              inv.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {inv.status === 'active' ? 'Actif' : 'Terminé'}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(inv.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {investments.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">Aucun investissement</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <InvestmentPaymentHistory userId={user?.id || ''} />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <NotificationsPanel userId={user?.id || ''} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
