import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ArrowDownCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function FundWithdrawalsHistory() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    const { data } = await (supabase.from as any)('fund_withdrawals')
      .select(`
        *,
        profiles:admin_id (full_name)
      `)
      .order('created_at', { ascending: false });
    
    setWithdrawals(data || []);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowDownCircle className="h-5 w-5" />
          Historique des retraits du Fond Moissonneur
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>Chargement...</div>
        ) : withdrawals.length === 0 ? (
          <p className="text-muted-foreground">Aucun retrait effectué</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell>
                    {new Date(withdrawal.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>{withdrawal.profiles?.full_name || 'Admin'}</TableCell>
                  <TableCell className="font-bold">
                    {withdrawal.amount.toLocaleString()} FCFA
                  </TableCell>
                  <TableCell>{withdrawal.reason}</TableCell>
                  <TableCell>{withdrawal.description || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
