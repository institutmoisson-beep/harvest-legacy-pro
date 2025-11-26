import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Check, X, History } from 'lucide-react';

const MSN_TO_FCFA = 750;

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  status: string;
  description: string;
  created_at: string;
  from_user_id: string | null;
  to_user_id: string | null;
  payment_method: string | null;
  payment_contact: string | null;
  user_name?: string;
}

export default function AdminTransactionsSection() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchPendingTransactions = async () => {
    try {
      const { data: txData, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user names separately
      const transactionsWithNames = await Promise.all(
        (txData || []).map(async (tx) => {
          if (tx.from_user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', tx.from_user_id)
              .single();
            
            return { ...tx, user_name: profile?.full_name };
          }
          return tx;
        })
      );

      setTransactions(transactionsWithNames);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTransactions();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin-transaction-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_transactions'
        },
        () => {
          fetchPendingTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprove = async (transactionId: string) => {
    setProcessing(transactionId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { error } = await supabase.functions.invoke('approve-transaction', {
        body: { transactionId, status: 'approved' }
      });

      if (error) throw error;

      toast({
        title: "Transaction approuvée",
        description: "La transaction a été approuvée avec succès",
      });

      fetchPendingTransactions();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (transactionId: string) => {
    setProcessing(transactionId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { error } = await supabase.functions.invoke('approve-transaction', {
        body: { transactionId, status: 'rejected' }
      });

      if (error) throw error;

      toast({
        title: "Transaction rejetée",
        description: "La transaction a été rejetée",
      });

      fetchPendingTransactions();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return <div className="text-center">Chargement...</div>;
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Demandes de transactions
        </CardTitle>
        <CardDescription>Gérer les demandes de dépôts et retraits</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Moyen de paiement</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Date et Heure</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Aucune demande en attente
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    {tx.user_name || 'Utilisateur inconnu'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tx.transaction_type === 'deposit' ? 'default' : 'secondary'}>
                      {tx.transaction_type === 'deposit' ? 'Dépôt' : 'Retrait'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{tx.amount.toFixed(2)} MSN</div>
                    <div className="text-xs text-muted-foreground">
                      {(tx.amount * MSN_TO_FCFA).toLocaleString()} FCFA
                    </div>
                  </TableCell>
                  <TableCell>{tx.payment_method || '-'}</TableCell>
                  <TableCell>{tx.payment_contact || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString('fr-FR')} {new Date(tx.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApprove(tx.id)}
                        disabled={processing === tx.id}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(tx.id)}
                        disabled={processing === tx.id}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Rejeter
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
