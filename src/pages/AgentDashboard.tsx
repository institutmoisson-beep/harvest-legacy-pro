import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Loader2, Scan, DollarSign, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AgentDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasAgentAccess, setHasAgentAccess] = useState(false);
  
  // Transaction states
  const [customerCode, setCustomerCode] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState<'cashin' | 'cashout'>('cashin');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const checkAgentAccess = async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isAgent = roles?.some(r => ['agent', 'representant', 'marchand', 'admin'].includes(r.role));
      setHasAgentAccess(isAgent || false);
      setLoading(false);

      if (!isAgent) {
        toast({
          title: "Accès refusé",
          description: "Vous devez être agent pour accéder à cette page",
          variant: "destructive",
        });
        navigate('/dashboard');
      }
    };

    checkAgentAccess();
  }, [user, navigate]);

  const handleTransaction = async () => {
    if (!customerCode || !secretCode || !amount) {
      toast({ title: 'Erreur', description: 'Tous les champs sont requis', variant: 'destructive' });
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      toast({ title: 'Erreur', description: 'Montant invalide', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      // Find customer by code
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', customerCode.toUpperCase())
        .single();

      if (profileError || !profile) {
        throw new Error('Code Moissonneur invalide');
      }

      // Verify secret code
      const { data: qrData, error: qrError } = await supabase
        .from('user_qr_codes' as any)
        .select('secret_code')
        .eq('user_id', profile.id)
        .single();

      if (qrError || !qrData || (qrData as any).secret_code !== secretCode) {
        throw new Error('Code secret invalide');
      }

      // Get customer wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', profile.id)
        .single();

      if (walletError) throw walletError;

      // Check balance for cashout
      if (transactionType === 'cashout' && wallet.balance < amountNum) {
        throw new Error('Solde insuffisant');
      }

      // Update wallet balance
      const newBalance = transactionType === 'cashin' 
        ? wallet.balance + amountNum 
        : wallet.balance - amountNum;

      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', profile.id);

      if (updateError) throw updateError;

      // Record transaction
      await supabase
        .from('agent_transactions' as any)
        .insert({
          agent_id: user.id,
          customer_id: profile.id,
          transaction_type: transactionType,
          amount: amountNum,
          status: 'completed'
        } as any);

      toast({ 
        title: 'Succès', 
        description: `${transactionType === 'cashin' ? 'Dépôt' : 'Retrait'} de ${amountNum} MSN effectué` 
      });

      // Reset form
      setCustomerCode('');
      setSecretCode('');
      setAmount('');

    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAgentAccess) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text-cosmic">Dashboard Agent</h1>
            <p className="text-muted-foreground mt-2">Effectuez des transactions pour vos clients</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
              Tableau de bord
            </Button>
            <Button onClick={signOut} variant="outline" size="sm">
              Déconnexion
            </Button>
          </div>
        </div>

        {/* Transaction Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Nouvelle Transaction
            </CardTitle>
            <CardDescription>
              Effectuez un dépôt ou un retrait pour un client
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={transactionType} onValueChange={(v) => setTransactionType(v as 'cashin' | 'cashout')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="cashin">
                  <ArrowDownToLine className="h-4 w-4 mr-2" />
                  Dépôt (Cash In)
                </TabsTrigger>
                <TabsTrigger value="cashout">
                  <ArrowUpFromLine className="h-4 w-4 mr-2" />
                  Retrait (Cash Out)
                </TabsTrigger>
              </TabsList>

              <TabsContent value={transactionType} className="space-y-4">
                <div>
                  <Label htmlFor="customerCode">Code Moissonneur du client</Label>
                  <Input
                    id="customerCode"
                    placeholder="MSN123456"
                    value={customerCode}
                    onChange={(e) => setCustomerCode(e.target.value.toUpperCase())}
                  />
                </div>

                <div>
                  <Label htmlFor="secretCode">Code secret du client</Label>
                  <Input
                    id="secretCode"
                    type="password"
                    placeholder="••••••"
                    value={secretCode}
                    onChange={(e) => setSecretCode(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="amount">Montant (MSN)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  {amount && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ≈ {(parseFloat(amount) * 750).toLocaleString()} FCFA
                    </p>
                  )}
                </div>

                <Button 
                  onClick={handleTransaction} 
                  disabled={processing}
                  className="w-full"
                  size="lg"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : transactionType === 'cashin' ? (
                    <ArrowDownToLine className="h-4 w-4 mr-2" />
                  ) : (
                    <ArrowUpFromLine className="h-4 w-4 mr-2" />
                  )}
                  {processing ? 'Traitement...' : transactionType === 'cashin' ? 'Effectuer le dépôt' : 'Effectuer le retrait'}
                </Button>
              </TabsContent>
            </Tabs>

            <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm font-semibold mb-2">Instructions</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Demandez au client son code Moissonneur (MSN...)</li>
                <li>• Le client doit fournir son code secret à 6 chiffres</li>
                <li>• Vérifiez le montant avant de valider</li>
                <li>• Le client recevra une notification SMS</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
