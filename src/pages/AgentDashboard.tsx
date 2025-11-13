import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Scan } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import MemberManagement from '@/components/dashboard/MemberManagement';
import AgentTransactionHistory from '@/components/dashboard/AgentTransactionHistory';
import AgentAnalytics from '@/components/dashboard/AgentAnalytics';

interface Transaction {
  id: string;
  member_id: string;
  transaction_type: string;
  amount: number;
  status: string;
  created_at: string;
  member_name?: string;
}

export default function AgentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [memberCode, setMemberCode] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal'>('deposit');

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('agent_transactions')
        .select(`
          *,
          profiles!agent_transactions_member_id_fkey(full_name)
        `)
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const transactionsWithNames = data?.map(t => ({
        ...t,
        member_name: (t.profiles as any)?.full_name || 'Inconnu'
      })) || [];

      setTransactions(transactionsWithNames);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleTransaction = async () => {
    if (!user || !memberCode || !amount) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const functionName = transactionType === 'deposit' ? 'agent-deposit' : 'agent-withdrawal';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          memberCode,
          amount: parseFloat(amount)
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Succès",
        description: data?.message || "Transaction effectuée avec succès",
      });

      setMemberCode('');
      setAmount('');
      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la transaction",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-4xl font-bold gradient-text-cosmic">
            Tableau de Bord Agent
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Transaction Form */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5 text-primary" />
                Nouvelle Transaction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Code QR Membre</label>
                <Input
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value)}
                  placeholder="MSN-12345678"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Type de Transaction</label>
                <Select value={transactionType} onValueChange={(v: any) => setTransactionType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">Dépôt</SelectItem>
                    <SelectItem value="withdrawal">Retrait</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Montant (MSN)</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              <Button
                onClick={handleTransaction}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Effectuer la Transaction'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Transactions Récentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune transaction
                  </p>
                ) : (
                  transactions.map(transaction => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 glass-card rounded-lg">
                      <div>
                        <p className="font-medium">{transaction.member_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.transaction_type === 'deposit' ? 'Dépôt' : 'Retrait'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${transaction.transaction_type === 'deposit' ? 'text-green-500' : 'text-red-500'}`}>
                          {transaction.transaction_type === 'deposit' ? '+' : '-'}{transaction.amount} MSN
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Dashboard */}
        <AgentAnalytics agentId={user?.id || ''} />

        {/* Transaction History */}
        <AgentTransactionHistory agentId={user?.id || ''} />

        {/* Member Management */}
        <MemberManagement />
      </div>
    </div>
  );
}
