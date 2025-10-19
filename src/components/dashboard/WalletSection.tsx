import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, ArrowUpRight, ArrowDownLeft, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const MSN_TO_FCFA = 750;

interface WalletSectionProps {
  balance: number;
  userId: string;
  onBalanceUpdate: () => void;
}

export default function WalletSection({ balance, userId, onBalanceUpdate }: WalletSectionProps) {
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [recipientIdentifier, setRecipientIdentifier] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentContact, setPaymentContact] = useState('');
  const [loading, setLoading] = useState(false);

  const paymentMethods = [
    'Orange Money',
    'MTN Money',
    'Wave',
    'Push CI',
    'Bitcoin',
    'Ethereum'
  ];

  const convertToFCFA = (msn: number) => msn * MSN_TO_FCFA;
  const convertToMSN = (fcfa: number) => fcfa / MSN_TO_FCFA;

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast({
        title: "Montant invalide",
        description: "Veuillez entrer un montant valide",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(depositAmount);
      
      // Create transaction record
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          to_user_id: userId,
          amount: amount,
          transaction_type: 'deposit',
          description: `Dépôt de ${amount} MSN (${convertToFCFA(amount)} FCFA)`
        });

      if (transactionError) throw transactionError;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: balance + amount })
        .eq('user_id', userId);

      if (walletError) throw walletError;

      toast({
        title: "Dépôt réussi",
        description: `${amount} MSN (${convertToFCFA(amount)} FCFA) ajoutés à votre portefeuille`,
      });

      setDepositAmount('');
      onBalanceUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast({
        title: "Montant invalide",
        description: "Veuillez entrer un montant valide",
        variant: "destructive",
      });
      return;
    }

    if (!paymentMethod || !paymentContact) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez sélectionner un moyen de paiement et entrer votre contact",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (amount > balance) {
      toast({
        title: "Solde insuffisant",
        description: "Vous n'avez pas assez de fonds",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create transaction record
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          from_user_id: userId,
          amount: amount,
          transaction_type: 'withdrawal',
          description: `Retrait de ${amount} MSN (${convertToFCFA(amount)} FCFA) via ${paymentMethod}`,
          payment_method: paymentMethod,
          payment_contact: paymentContact
        });

      if (transactionError) throw transactionError;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: balance - amount })
        .eq('user_id', userId);

      if (walletError) throw walletError;

      toast({
        title: "Retrait réussi",
        description: `${amount} MSN (${convertToFCFA(amount)} FCFA) retirés de votre portefeuille`,
      });

      setWithdrawAmount('');
      setPaymentMethod('');
      setPaymentContact('');
      onBalanceUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferAmount || parseFloat(transferAmount) <= 0 || !recipientIdentifier) {
      toast({
        title: "Informations invalides",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(transferAmount);
    if (amount > balance) {
      toast({
        title: "Solde insuffisant",
        description: "Vous n'avez pas assez de fonds",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Find recipient by ID, email, or phone
      const { data: recipientProfile, error: findError } = await supabase
        .from('profiles')
        .select('id')
        .or(`id.eq.${recipientIdentifier},email.eq.${recipientIdentifier},phone.eq.${recipientIdentifier}`)
        .single();

      if (findError || !recipientProfile) {
        toast({
          title: "Destinataire introuvable",
          description: "Aucun utilisateur trouvé avec cet identifiant",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const recipientId = recipientProfile.id;

      // Get recipient wallet
      const { data: recipientWallet, error: recipientWalletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', recipientId)
        .single();

      if (recipientWalletError) throw recipientWalletError;

      // Create transaction
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          from_user_id: userId,
          to_user_id: recipientId,
          amount: amount,
          transaction_type: 'transfer',
          description: `Transfert de ${amount} MSN (${convertToFCFA(amount)} FCFA)`
        });

      if (transactionError) throw transactionError;

      // Update sender wallet
      const { error: senderWalletError } = await supabase
        .from('wallets')
        .update({ balance: balance - amount })
        .eq('user_id', userId);

      if (senderWalletError) throw senderWalletError;

      // Update recipient wallet
      const { error: recipientUpdateError } = await supabase
        .from('wallets')
        .update({ balance: recipientWallet.balance + amount })
        .eq('user_id', recipientId);

      if (recipientUpdateError) throw recipientUpdateError;

      toast({
        title: "Transfert réussi",
        description: `${amount} MSN (${convertToFCFA(amount)} FCFA) envoyés`,
      });

      setTransferAmount('');
      setRecipientIdentifier('');
      onBalanceUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Portefeuille
        </CardTitle>
        <CardDescription>Gérez vos fonds MSN</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-6 glass-card rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-2">Solde disponible</p>
          <p className="text-4xl font-bold gradient-text-primary">{balance.toFixed(2)} MSN</p>
          <p className="text-lg text-muted-foreground mt-2">{convertToFCFA(balance).toLocaleString()} FCFA</p>
          <p className="text-xs text-muted-foreground mt-2">1 MSN = 750 FCFA</p>
        </div>

        <Tabs defaultValue="deposit" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="deposit">Dépôt</TabsTrigger>
            <TabsTrigger value="withdraw">Retrait</TabsTrigger>
            <TabsTrigger value="transfer">Transfert</TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deposit">Montant (MSN)</Label>
              <Input
                id="deposit"
                type="number"
                placeholder="0.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                min="0"
                step="0.01"
              />
              {depositAmount && (
                <p className="text-sm text-muted-foreground">
                  ≈ {convertToFCFA(parseFloat(depositAmount) || 0).toLocaleString()} FCFA
                </p>
              )}
            </div>
            <Button onClick={handleDeposit} disabled={loading} className="w-full">
              <ArrowDownLeft className="h-4 w-4 mr-2" />
              Effectuer un dépôt
            </Button>
          </TabsContent>

          <TabsContent value="withdraw" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Moyen de paiement</Label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Sélectionner un moyen</option>
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentContact">Contact / Adresse</Label>
              <Input
                id="paymentContact"
                placeholder="Numéro ou adresse crypto"
                value={paymentContact}
                onChange={(e) => setPaymentContact(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdraw">Montant (MSN)</Label>
              <Input
                id="withdraw"
                type="number"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min="0"
                step="0.01"
                max={balance}
              />
              {withdrawAmount && (
                <p className="text-sm text-muted-foreground">
                  ≈ {convertToFCFA(parseFloat(withdrawAmount) || 0).toLocaleString()} FCFA
                </p>
              )}
            </div>
            <Button onClick={handleWithdraw} disabled={loading} className="w-full" variant="secondary">
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Effectuer un retrait
            </Button>
          </TabsContent>

          <TabsContent value="transfer" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Destinataire (ID, Email ou Téléphone)</Label>
              <Input
                id="recipient"
                placeholder="user@email.com"
                value={recipientIdentifier}
                onChange={(e) => setRecipientIdentifier(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer">Montant (MSN)</Label>
              <Input
                id="transfer"
                type="number"
                placeholder="0.00"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                min="0"
                step="0.01"
                max={balance}
              />
              {transferAmount && (
                <p className="text-sm text-muted-foreground">
                  ≈ {convertToFCFA(parseFloat(transferAmount) || 0).toLocaleString()} FCFA
                </p>
              )}
            </div>
            <Button onClick={handleTransfer} disabled={loading} className="w-full" variant="cosmic">
              <Send className="h-4 w-4 mr-2" />
              Envoyer
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}