import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { getUserPaymentTransactions } from '@/services/paymentService';
import PaymentStatusBadge from '@/components/payment/PaymentStatusBadge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PaymentHistoryDashboardProps {
  userId: string;
}

export default function PaymentHistoryDashboard({ userId }: PaymentHistoryDashboardProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    completedAmount: 0,
    pendingAmount: 0,
    failedAmount: 0,
  });

  useEffect(() => {
    if (userId) {
      fetchTransactions();
    }
  }, [userId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getUserPaymentTransactions(userId);
      setTransactions(data);

      // Calculer les statistiques
      const stats = {
        totalTransactions: data.length,
        completedAmount: data
          .filter((t: any) => t.status === 'completed')
          .reduce((sum: number, t: any) => sum + (t.amount || 0), 0),
        pendingAmount: data
          .filter((t: any) => t.status === 'pending' || t.status === 'processing')
          .reduce((sum: number, t: any) => sum + (t.amount || 0), 0),
        failedAmount: data
          .filter((t: any) => t.status === 'failed' || t.status === 'cancelled')
          .reduce((sum: number, t: any) => sum + (t.amount || 0), 0),
      };

      setStats(stats);
    } catch (err: any) {
      console.error('Erreur:', err);
      setError('Impossible de charger l\'historique des paiements');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total de transactions</p>
              <p className="text-3xl font-bold">{stats.totalTransactions}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Complétées</p>
              <p className="text-3xl font-bold text-green-600">{stats.completedAmount.toLocaleString()} FCFA</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">En attente</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pendingAmount.toLocaleString()} FCFA</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Échouées</p>
              <p className="text-3xl font-bold text-red-600">{stats.failedAmount.toLocaleString()} FCFA</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Historique des paiements
          </CardTitle>
          <CardDescription>Liste de toutes vos transactions de paiement</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune transaction trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Commande</TableHead>
                    <TableHead>Moyen de paiement</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction: any) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-sm">
                        {transaction.created_at
                          ? format(new Date(transaction.created_at), 'd MMM yyyy HH:mm', {
                              locale: fr,
                            })
                          : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {transaction.orders?.customer_name || (transaction.order_id ? transaction.order_id.substring(0, 8) : '-')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {transaction.payment_methods?.icon && (
                            <span>{transaction.payment_methods.icon}</span>
                          )}
                          <span className="text-sm">
                            {transaction.payment_methods?.display_name || 'Inconnu'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {transaction.amount.toLocaleString()} {transaction.currency}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={transaction.status} size="sm" />
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Détails
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bouton de rafraîchissement */}
      <div className="flex justify-center">
        <Button onClick={fetchTransactions} variant="outline" disabled={loading}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Rafraîchir
        </Button>
      </div>
    </div>
  );
}
