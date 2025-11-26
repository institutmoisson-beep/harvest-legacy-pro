import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { History, ArrowUpRight, ArrowDownLeft, Send, ChevronDown, Search, TrendingUp } from 'lucide-react';

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
}

interface TransactionHistorySectionProps {
  userId: string;
}

export default function TransactionHistorySection({ userId }: TransactionHistorySectionProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('transaction-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `from_user_id=eq.${userId}`
        },
        () => {
          fetchTransactions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `to_user_id=eq.${userId}`
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const getTransactionIcon = (type: string, fromUserId: string | null) => {
    if (type === 'deposit') return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    if (type === 'withdrawal') return <ArrowUpRight className="h-4 w-4 text-red-500" />;
    if (type === 'transfer') {
      return fromUserId === userId
        ? <Send className="h-4 w-4 text-blue-500" />
        : <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    }
    if (type === 'order_payment') return <ArrowUpRight className="h-4 w-4 text-orange-500" />;
    if (type === 'commission') return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <History className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default">Approuvé</Badge>;
      case 'pending':
        return <Badge variant="outline">En attente</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center">Chargement...</div>;
  }

  const filteredTransactions = transactions.filter(tx => 
    tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.transaction_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <CardTitle>Historique des transactions</CardTitle>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CardDescription>Vos 20 dernières transactions</CardDescription>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par description, type ou statut..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {searchQuery ? 'Aucun résultat trouvé' : 'Aucune transaction'}
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTransactionIcon(tx.transaction_type, tx.from_user_id)}
                      <span className="capitalize">{tx.transaction_type}</span>
                    </div>
                  </TableCell>
                  <TableCell>{tx.description}</TableCell>
                  <TableCell>
                    <div className="font-semibold">
                      {tx.amount.toFixed(2)} MSN
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(tx.amount * MSN_TO_FCFA).toLocaleString()} FCFA
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(tx.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>{new Date(tx.created_at).toLocaleDateString('fr-FR')}</div>
                    <div className="text-xs">{new Date(tx.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
