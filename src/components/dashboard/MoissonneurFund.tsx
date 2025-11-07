import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { TrendingUp, Users, DollarSign } from 'lucide-react';

export default function MoissonneurFund() {
  const { user } = useAuth();
  const [fundTotal, setFundTotal] = useState(0);
  const [myContributions, setMyContributions] = useState(0);
  const [contributionAmount, setContributionAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFundData();
      subscribeToFundUpdates();
    }
  }, [user]);

  const fetchFundData = async () => {
    // Fetch total fund
    const { data: fundData } = await supabase
      .from('moissonneur_fund')
      .select('total_amount')
      .single();
    
    if (fundData) {
      setFundTotal(fundData.total_amount);
    }

    // Fetch my contributions
    const { data: contributions } = await supabase
      .from('fund_contributions')
      .select('amount')
      .eq('user_id', user?.id);
    
    if (contributions) {
      const total = contributions.reduce((sum, c) => sum + Number(c.amount), 0);
      setMyContributions(total);
    }
  };

  const subscribeToFundUpdates = () => {
    const channel = supabase
      .channel('fund-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'moissonneur_fund'
      }, () => fetchFundData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const handleContribute = async () => {
    const amount = parseFloat(contributionAmount);
    if (!amount || amount <= 0) {
      toast({ title: 'Erreur', description: 'Montant invalide', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Check wallet balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user?.id)
        .single();

      if (!wallet || wallet.balance < amount) {
        toast({ title: 'Erreur', description: 'Solde insuffisant', variant: 'destructive' });
        setLoading(false);
        return;
      }

      // Use fund-contribute edge function
      const { data, error } = await supabase.functions.invoke('fund-contribute', {
        body: { amount }
      });

      if (error) throw error;

      toast({ 
        title: 'Contribution enregistrée', 
        description: `${amount} MSN ajoutés au Fond Moissonneur` 
      });
      
      setContributionAmount('');
      fetchFundData();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Fond Moissonneur
        </CardTitle>
        <CardDescription>
          Fond commun alimenté par tous les Moissonneurs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Fund Display */}
        <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg text-center border border-primary/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <p className="text-sm text-muted-foreground">Montant Total du Fond</p>
          </div>
          <p className="text-4xl font-bold gradient-text-primary mb-2">
            {fundTotal.toFixed(2)} MSN
          </p>
          <p className="text-lg text-muted-foreground">
            ≈ {(fundTotal * 750).toLocaleString()} FCFA
          </p>
        </div>

        {/* My Contributions */}
        <div className="p-4 bg-card border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <p className="text-sm font-semibold">Mes contributions</p>
          </div>
          <p className="text-2xl font-bold">{myContributions.toFixed(2)} MSN</p>
          <p className="text-sm text-muted-foreground">
            ≈ {(myContributions * 750).toLocaleString()} FCFA
          </p>
        </div>

        {/* Contribute Form */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="contribution">Contribuer au fond (MSN)</Label>
            <Input
              id="contribution"
              type="number"
              placeholder="Montant à contribuer"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
              min="0"
              step="0.01"
            />
            {contributionAmount && (
              <p className="text-sm text-muted-foreground mt-1">
                ≈ {(parseFloat(contributionAmount) * 750).toLocaleString()} FCFA
              </p>
            )}
          </div>
          <Button onClick={handleContribute} disabled={loading} className="w-full">
            <TrendingUp className="h-4 w-4 mr-2" />
            Injecter dans le fond
          </Button>
        </div>

        <div className="p-3 bg-primary/5 border border-primary/20 rounded text-xs space-y-1">
          <p className="font-semibold">À propos du Fond Moissonneur</p>
          <ul className="text-muted-foreground space-y-1">
            <li>• Se met à jour automatiquement à chaque dépôt</li>
            <li>• Visible par tous les Moissonneurs</li>
            <li>• Contribuez pour soutenir la communauté</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}