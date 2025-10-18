import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Plus, TrendingUp, Users, Wallet } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Profile {
  full_name: string;
  referral_code: string;
  phone: string | null;
}

interface WalletData {
  balance: number;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchUserData = async () => {
      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, referral_code, phone')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch wallet
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (walletError) throw walletError;
        setWallet(walletData);
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

    fetchUserData();
  }, [user, navigate]);

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      const referralLink = `${window.location.origin}/auth?ref=${profile.referral_code}`;
      navigator.clipboard.writeText(referralLink);
      toast({
        title: "Lien copié !",
        description: "Le lien de parrainage a été copié dans le presse-papier.",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text-cosmic">
              Bienvenue, {profile?.full_name}
            </h1>
            <p className="text-muted-foreground mt-2">Votre tableau de bord Moissonneur</p>
          </div>
          <Button onClick={signOut} variant="outline">
            Déconnexion
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Solde Portefeuille
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold gradient-text-primary">
                {wallet?.balance?.toLocaleString() || 0} FCFA
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                Réseau
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Filleuls directs</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-secondary" />
                Commissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0 FCFA</p>
              <p className="text-sm text-muted-foreground">Total gagné</p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Section */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle>Votre lien de parrainage</CardTitle>
            <CardDescription>
              Partagez ce lien pour inviter de nouveaux Moissonneurs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1 glass-card p-4 rounded-lg">
                <p className="font-mono text-sm break-all">
                  {window.location.origin}/auth?ref={profile?.referral_code}
                </p>
              </div>
              <Button onClick={copyReferralCode} variant="outline">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 p-4 bg-primary/10 rounded-lg">
              <p className="text-sm font-semibold">Votre code: {profile?.referral_code}</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass-card hover:glow-primary transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Initier une commande
              </CardTitle>
              <CardDescription>
                Créez une nouvelle commande pour votre client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="cosmic">
                Nouvelle commande
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Mon réseau
              </CardTitle>
              <CardDescription>
                Consultez vos filleuls et votre structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                Voir le réseau
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
