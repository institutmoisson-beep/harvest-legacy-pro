import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Percent, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AgentCommissionsProps {
  agentId: string;
}

interface CommissionEarning {
  id: string;
  transaction_type: string;
  transaction_amount: number;
  commission_rate: number;
  commission_amount: number;
  created_at: string;
  level?: number;
}

interface CommissionSettings {
  deposit_rate: number;
  withdrawal_rate: number;
  min_transaction_amount: number;
}

export default function AgentCommissions({ agentId }: AgentCommissionsProps) {
  const [earnings, setEarnings] = useState<CommissionEarning[]>([]);
  const [settings, setSettings] = useState<CommissionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCommissions: 0,
    depositCommissions: 0,
    withdrawalCommissions: 0,
    transactionCount: 0,
  });

  useEffect(() => {
    if (agentId) {
      fetchData();
    }
  }, [agentId]);

  const fetchData = async () => {
    try {
      // Fetch order-based commission earnings from commissions table
      const { data: orderCommissions, error: orderError } = await supabase
        .from('commissions')
        .select('*')
        .eq('user_id', agentId)
        .order('created_at', { ascending: false });

      if (orderError) {
        console.error('Error fetching order commissions:', orderError);
      }

      // Fetch wallet transaction based commission earnings
      const { data: earningsData, error: earningsError } = await supabase
        .from('agent_commission_earnings')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (earningsError) {
        console.error('Error fetching wallet transaction commissions:', earningsError);
      }

      // Combine both types of commissions
      const combinedEarnings = [
        ...(orderCommissions?.map(oc => ({
          id: oc.id,
          transaction_type: oc.commission_type || 'order',
          transaction_amount: oc.amount,
          commission_rate: oc.commission_rate,
          commission_amount: oc.amount,
          created_at: oc.created_at,
          level: oc.level,
        })) || []),
        ...(earningsData || []),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setEarnings(combinedEarnings);

      // Calculate stats
      const total = combinedEarnings.reduce((sum, e) => sum + Number(e.commission_amount), 0);
      const deposits = combinedEarnings
        ?.filter(e => e.transaction_type === 'deposit')
        .reduce((sum, e) => sum + Number(e.commission_amount), 0) || 0;
      const withdrawals = combinedEarnings
        ?.filter(e => e.transaction_type === 'withdrawal')
        .reduce((sum, e) => sum + Number(e.commission_amount), 0) || 0;

      setStats({
        totalCommissions: total,
        depositCommissions: deposits,
        withdrawalCommissions: withdrawals,
        transactionCount: combinedEarnings?.length || 0,
      });

      // Fetch commission settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('agent_commission_settings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (settingsError) throw settingsError;
      setSettings(settingsData);
    } catch (error) {
      console.error('Error fetching commission data:', error);
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats.totalCommissions.toFixed(2)} MSN
            </div>
            <p className="text-xs text-muted-foreground">
              Sur {stats.transactionCount} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commissions Dépôts</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stats.depositCommissions.toFixed(2)} MSN
            </div>
            <p className="text-xs text-muted-foreground">
              Taux: {settings?.deposit_rate}%
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commissions Retraits</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {stats.withdrawalCommissions.toFixed(2)} MSN
            </div>
            <p className="text-xs text-muted-foreground">
              Taux: {settings?.withdrawal_rate}%
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux Moyen</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.transactionCount > 0
                ? ((stats.totalCommissions / stats.transactionCount) * 100).toFixed(2)
                : '0.00'}%
            </div>
            <p className="text-xs text-muted-foreground">
              Commission moyenne
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Settings Info */}
      {settings && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              Barème des Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Dépôts</p>
                <p className="text-2xl font-bold text-primary">{settings.deposit_rate}%</p>
              </div>
              <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
                <p className="text-sm text-muted-foreground mb-1">Retraits</p>
                <p className="text-2xl font-bold text-orange-500">{settings.withdrawal_rate}%</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground mb-1">Montant Minimum</p>
                <p className="text-2xl font-bold">{settings.min_transaction_amount} MSN</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings History */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Historique des Commissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune commission gagnée pour le moment
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Montant Transaction</TableHead>
                    <TableHead className="text-right">Taux</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell className="text-sm">
                        {format(new Date(earning.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            earning.transaction_type === 'deposit'
                              ? 'default'
                              : earning.transaction_type === 'order'
                              ? 'outline'
                              : 'secondary'
                          }
                        >
                          {earning.transaction_type === 'deposit'
                            ? 'Dépôt'
                            : earning.transaction_type === 'order'
                            ? `Commande${earning.level ? ` (Niv. ${earning.level})` : ''}`
                            : 'Retrait'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(earning.transaction_amount).toFixed(2)} MSN
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(earning.commission_rate).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        +{Number(earning.commission_amount).toFixed(2)} MSN
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
