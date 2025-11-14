import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, TrendingUp, DollarSign, Package } from 'lucide-react';
import InvestmentPaymentHistory from '@/components/dashboard/InvestmentPaymentHistory';
import InvestmentAnalytics from '@/components/dashboard/InvestmentAnalytics';

const PRODUCTS = [
  { name: 'Manioc', profitRate: 16 },
  { name: 'Igname', profitRate: 16 },
  { name: 'Maïs', profitRate: 16 },
  { name: 'Mil', profitRate: 16 },
  { name: 'Piment sec', profitRate: 16 },
  { name: 'Piment frais', profitRate: 16 },
  { name: 'Aubergine', profitRate: 16 },
  { name: 'Boeuf', profitRate: 16 },
  { name: 'Arachides', profitRate: 16 },
  { name: 'Attieké', profitRate: 16 },
  { name: 'Riz local', profitRate: 16 },
  { name: 'Huile 25L', profitRate: 16 }
];

const PAYOUT_FREQUENCIES = [
  { value: 'two_days', label: 'Deux jours' },
  { value: 'weekly', label: 'Semaine' },
  { value: 'two_weeks', label: 'Deux semaines' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'two_months', label: 'Deux mois' },
  { value: 'six_months', label: 'Six mois' }
];

export default function Investments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [productName, setProductName] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [payoutFrequency, setPayoutFrequency] = useState('');
  const [myInvestments, setMyInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) fetchInvestments();
  }, [user]);

  const fetchInvestments = async () => {
    const { data } = await supabase
      .from('investment_products')
      .select('*')
      .eq('investor_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (data) setMyInvestments(data);
  };

  const handleProcessPayouts = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://swefwubntyyfqaerlwym.supabase.co/functions/v1/investment-payout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3ZWZ3dWJudHl5ZnFhZXJsd3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NjcxNDcsImV4cCI6MjA3NjM0MzE0N30.IBM6AP9C-45n4_rDLENNCJxcB6_A5Uxjqnuj0e0R16o`,
          },
          body: JSON.stringify({}),
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Succès',
          description: `${data.payoutsProcessed} paiement(s) traité(s)`,
        });
        fetchInvestments();
      } else {
        throw new Error(data.error || 'Erreur lors du traitement');
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateExpectedEarnings = () => {
    const amount = parseFloat(investmentAmount) || 0;
    const profit = amount * 0.16; // 16% profit
    const investorShare = profit * 0.46; // 46% of profit
    return investorShare;
  };

  const handleCreateInvestment = async () => {
    if (!productName || !investmentAmount || !payoutFrequency) {
      toast({ title: 'Erreur', description: 'Remplissez tous les champs', variant: 'destructive' });
      return;
    }

    const amount = parseFloat(investmentAmount);
    if (amount <= 0) {
      toast({ title: 'Erreur', description: 'Montant invalide', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Check wallet balance first
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user?.id)
        .single();

      if (walletError) throw walletError;

      if (!wallet || wallet.balance < amount) {
        toast({ 
          title: 'Solde insuffisant', 
          description: 'Veuillez recharger votre portefeuille', 
          variant: 'destructive' 
        });
        setLoading(false);
        return;
      }

      // Deduct from wallet
      const { error: deductError } = await supabase
        .from('wallets')
        .update({ balance: wallet.balance - amount })
        .eq('user_id', user?.id);

      if (deductError) throw deductError;

      // Create investment
      const { error } = await supabase
        .from('investment_products')
        .insert({
          investor_id: user?.id,
          product_name: productName,
          investment_amount: amount,
          profit_percentage: 16,
          investor_share_percentage: 46,
          payout_frequency: payoutFrequency,
          status: 'active'
        });

      if (error) {
        // Rollback wallet deduction if investment creation fails
        await supabase
          .from('wallets')
          .update({ balance: wallet.balance })
          .eq('user_id', user?.id);
        throw error;
      }

      toast({ title: 'Succès', description: 'Investissement créé avec succès' });
      setProductName('');
      setInvestmentAmount('');
      setPayoutFrequency('');
      fetchInvestments();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center justify-between mb-4">
        <Button onClick={() => navigate('/dashboard')} variant="ghost">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au tableau de bord
        </Button>
        <Button 
          onClick={handleProcessPayouts} 
          disabled={loading}
          variant="outline"
          size="sm"
        >
          {loading ? 'Traitement...' : 'Traiter les paiements en attente'}
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-6 gradient-text-primary">J'achète, Vous vendez pour moi</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Nouveau produit
            </CardTitle>
            <CardDescription>Investissez dans un produit, nous le vendons pour vous</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Produit</Label>
              <Select value={productName} onValueChange={setProductName}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un produit" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTS.map(product => (
                    <SelectItem key={product.name} value={product.name}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Montant d'investissement (FCFA)</Label>
              <Input
                type="number"
                placeholder="100000"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                min="0"
              />
              {investmentAmount && (
                <p className="text-sm text-muted-foreground mt-1">
                  Vos gains estimés: <span className="font-semibold text-green-600">
                    {calculateExpectedEarnings().toLocaleString()} FCFA
                  </span> (46% du bénéfice)
                </p>
              )}
            </div>

            <div>
              <Label>Fréquence de paiement</Label>
              <Select value={payoutFrequency} onValueChange={setPayoutFrequency}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir la fréquence" />
                </SelectTrigger>
                <SelectContent>
                  {PAYOUT_FREQUENCIES.map(freq => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Comment ça marche?</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• Vous investissez dans un produit en gros</li>
                <li>• Nous le vendons pour vous</li>
                <li>• Bénéfice = 16% du prix</li>
                <li>• Vous recevez 46% du bénéfice (46% de 16%)</li>
                <li>• Capital + gains versés automatiquement après période choisie</li>
              </ul>
            </div>

            <Button onClick={handleCreateInvestment} disabled={loading} className="w-full">
              <TrendingUp className="h-4 w-4 mr-2" />
              Créer l'investissement
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Mes investissements
            </CardTitle>
            <CardDescription>Suivez vos investissements et gains</CardDescription>
          </CardHeader>
          <CardContent>
            {myInvestments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucun investissement pour le moment
              </p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {myInvestments.map(inv => (
                  <div key={inv.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{inv.product_name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {PAYOUT_FREQUENCIES.find(f => f.value === inv.payout_frequency)?.label}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        inv.status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-600'
                      }`}>
                        {inv.status === 'active' ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Investissement</p>
                        <p className="font-semibold">{inv.investment_amount.toLocaleString()} FCFA</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Gains totaux</p>
                        <p className="font-semibold text-green-600">{inv.investor_earnings?.toLocaleString() || 0} FCFA</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Créé le {new Date(inv.created_at).toLocaleDateString('fr-FR')}</p>
                      <p className="font-semibold">à {new Date(inv.created_at).toLocaleTimeString('fr-FR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics and History */}
      <div className="space-y-6">
        <InvestmentAnalytics userId={user?.id || ''} />
        <InvestmentPaymentHistory userId={user?.id || ''} />
      </div>
    </div>
  );
}