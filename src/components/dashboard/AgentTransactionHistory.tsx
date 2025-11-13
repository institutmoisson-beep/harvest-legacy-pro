import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar, Filter, Download } from 'lucide-react';

interface Transaction {
  id: string;
  member_id: string;
  transaction_type: string;
  amount: number;
  status: string;
  created_at: string;
  member_name?: string;
}

interface AgentTransactionHistoryProps {
  agentId: string;
}

export default function AgentTransactionHistory({ agentId }: AgentTransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (agentId) {
      fetchTransactions();
    }
  }, [agentId]);

  useEffect(() => {
    applyFilters();
  }, [transactions, startDate, endDate, typeFilter]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agent_transactions')
        .select(`
          *,
          profiles!agent_transactions_member_id_fkey(full_name)
        `)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transactionsWithNames = data?.map(t => ({
        ...t,
        member_name: (t.profiles as any)?.full_name || 'Inconnu'
      })) || [];

      setTransactions(transactionsWithNames);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(t => new Date(t.created_at) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(t => new Date(t.created_at) <= new Date(endDate + 'T23:59:59'));
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.transaction_type === typeFilter);
    }

    setFilteredTransactions(filtered);
  };

  const calculateTotal = () => {
    return filteredTransactions.reduce((sum, t) => {
      return t.transaction_type === 'deposit' ? sum - t.amount : sum + t.amount;
    }, 0);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Membre', 'Montant', 'Statut'];
    const rows = filteredTransactions.map(t => [
      new Date(t.created_at).toLocaleString(),
      t.transaction_type === 'deposit' ? 'Dépôt' : 'Retrait',
      t.member_name,
      t.amount,
      t.status
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          Historique Détaillé des Transactions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Date Début</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Date Fin</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Type</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="deposit">Dépôts</SelectItem>
                <SelectItem value="withdrawal">Retraits</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={exportToCSV} variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Transactions</div>
              <div className="text-2xl font-bold">{filteredTransactions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Dépôts</div>
              <div className="text-2xl font-bold text-red-500">
                {filteredTransactions.filter(t => t.transaction_type === 'deposit').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Retraits</div>
              <div className="text-2xl font-bold text-green-500">
                {filteredTransactions.filter(t => t.transaction_type === 'withdrawal').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Membre</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucune transaction trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {new Date(transaction.created_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.transaction_type === 'deposit' 
                          ? 'bg-red-500/10 text-red-500' 
                          : 'bg-green-500/10 text-green-500'
                      }`}>
                        {transaction.transaction_type === 'deposit' ? 'Dépôt' : 'Retrait'}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{transaction.member_name}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold ${
                        transaction.transaction_type === 'deposit' ? 'text-red-500' : 'text-green-500'
                      }`}>
                        {transaction.transaction_type === 'deposit' ? '-' : '+'}{transaction.amount} MSN
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'completed' 
                          ? 'bg-green-500/10 text-green-500' 
                          : 'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {transaction.status === 'completed' ? 'Complété' : 'En attente'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Net Balance */}
        <div className="flex justify-end">
          <Card className="w-fit">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Solde Net (Période)</div>
              <div className={`text-2xl font-bold ${calculateTotal() >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {calculateTotal() >= 0 ? '+' : ''}{calculateTotal().toFixed(2)} MSN
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
