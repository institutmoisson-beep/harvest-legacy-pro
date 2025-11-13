import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Calendar } from 'lucide-react';

const MSN_TO_FCFA = 750;

interface InvestmentPaymentHistoryProps {
  userId: string;
}

export default function InvestmentPaymentHistory({ userId }: InvestmentPaymentHistoryProps) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, [userId]);

  const fetchPayments = async () => {
    setLoading(true);
    const { data } = await (supabase.from as any)('investment_payment_history')
      .select(`
        *,
        investment_products (
          product_name,
          investment_amount
        )
      `)
      .eq('investor_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) setPayments(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historique des Paiements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Historique des Paiements d'Investissement
        </CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucun paiement pour le moment</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.investment_products?.product_name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={payment.payment_type === 'payout' ? 'default' : 'secondary'}>
                      {payment.payment_type === 'payout' ? 'Gains' : 'Retour Capital'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-semibold">{payment.amount_paid.toFixed(2)} MSN</div>
                      <div className="text-xs text-muted-foreground">
                        {(payment.amount_paid * MSN_TO_FCFA).toLocaleString()} FCFA
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={payment.payment_status === 'completed' ? 'default' : 'secondary'}>
                      {payment.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(payment.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
