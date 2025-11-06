import { useState, useEffect } from 'react';
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
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentContacts, setPaymentContacts] = useState<any[]>([]);

  useEffect(() => {
    fetchPaymentContacts();
  }, []);

  const fetchPaymentContacts = async () => {
    const { data } = await supabase
      .from('payment_contacts')
      .select('*')
      .eq('is_active', true)
      .order('payment_method');
    
    if (data) setPaymentContacts(data);
  };

  const convertToFCFA = (msn: number) => msn * MSN_TO_FCFA;
  const convertToMSN = (fcfa: number) => fcfa / MSN_TO_FCFA;

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0 || !transactionId) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(depositAmount);
      
      const { error } = await supabase.functions.invoke('wallet-deposit', {
        body: { amount, transactionId }
      });

      if (error) throw error;

      toast({
        title: "Demande de dépôt créée",
        description: "Votre demande est en attente de validation. Nous vérifions l'ID de transaction.",
      });

      setDepositAmount('');
      setTransactionId('');
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
      const { error } = await supabase.functions.invoke('wallet-withdraw', {
        body: { amount, paymentMethod, paymentContact }
      });

      if (error) throw error;

      toast({
        title: "Demande de retrait créée",
        description: "Votre demande est en attente de validation par un administrateur",
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
      const { error } = await supabase.functions.invoke('wallet-transfer', {
        body: { amount, recipientIdentifier }
      });

      if (error) throw error;

      toast({
        title: "Transfert réussi",
        description: `${amount} MSN (${convertToFCFA(amount)} FCFA) envoyés avec succès`,
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
            {/* Payment Contacts Display */}
            {paymentContacts.length > 0 && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                <p className="font-semibold text-sm mb-2">Numéros pour le rechargement:</p>
                {paymentContacts.map(contact => (
                  <div key={contact.id} className="flex justify-between items-center p-2 bg-background rounded">
                    <div>
                      <p className="font-medium text-sm">{contact.payment_method}</p>
                      <p className="text-xs text-muted-foreground">{contact.contact_name}</p>
                    </div>
                    <p className="font-mono text-sm">{contact.contact_number}</p>
                  </div>
                ))}
              </div>
            )}

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

            <div className="space-y-2">
              <Label htmlFor="transactionId">ID de la transaction</Label>
              <Input
                id="transactionId"
                placeholder="Ex: 1234567890"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Entrez l'ID de transaction après avoir effectué le paiement
              </p>
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
                {['Orange Money', 'MTN Money', 'Wave', 'Push CI', 'Moov Money'].map((method) => (
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