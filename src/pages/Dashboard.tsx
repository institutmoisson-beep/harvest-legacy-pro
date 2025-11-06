import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, TrendingUp, Users, Wallet, Shield, User, MessageCircle, Coins, Phone, MapPin, ShoppingBag } from 'lucide-react';
import VoiceCall from '@/components/VoiceCall';
import LocationSharing from '@/components/LocationSharing';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import WalletSection from '@/components/dashboard/WalletSection';
import MoissonneurFund from '@/components/dashboard/MoissonneurFund';
import OrdersSection from '@/components/dashboard/OrdersSection';
import UserOrdersList from '@/components/dashboard/UserOrdersList';
import ShareButtons from '@/components/dashboard/ShareButtons';
import ReferralTreeSection from '@/components/dashboard/ReferralTreeSection';
import TransactionHistorySection from '@/components/dashboard/TransactionHistorySection';
import { CareerProgressSection } from '@/components/dashboard/CareerProgressSection';

interface Profile {
  full_name: string;
  referral_code: string;
  phone: string | null;
}

interface WalletData {
  balance: number;
}

interface Stats {
  directReferrals: number;
  totalCommissions: number;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [stats, setStats] = useState<Stats>({ directReferrals: 0, totalCommissions: 0 });
  const [loading, setLoading] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

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

        // Check admin access
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const hasAccess = roles?.some(r => r.role === 'admin' || r.role === 'financier');
        setHasAdminAccess(hasAccess || false);

        // Fetch stats
        await fetchStats();

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

  const fetchWalletBalance = async () => {
    const { data } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();
    if (data) setWallet(data);
  };

  const fetchStats = async () => {
    if (!user) return;

    // Count direct referrals
    const { count: referralCount } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', user.id)
      .eq('level', 1);

    // Sum total commissions
    const { data: commissionsData } = await supabase
      .from('commissions')
      .select('amount')
      .eq('user_id', user.id);

    const totalCommissions = commissionsData?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

    setStats({
      directReferrals: referralCount || 0,
      totalCommissions: totalCommissions,
    });
  };

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` }, () => fetchWalletBalance())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commissions', filter: `user_id=eq.${user.id}` }, () => fetchStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

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
            <Button 
              onClick={() => navigate('/')} 
              variant="link" 
              className="p-0 mb-2 text-3xl font-bold gradient-text-cosmic hover:no-underline"
            >
              Les Moissonneurs
            </Button>
            <h1 className="text-4xl font-bold gradient-text-cosmic">
              Bienvenue, {profile?.full_name}
            </h1>
            <p className="text-muted-foreground mt-2">Votre tableau de bord Moissonneur</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => navigate('/profile')} variant="outline" size="sm">
              <User className="h-4 w-4 mr-2" />
              Profil
            </Button>
            <Button onClick={() => navigate('/messages')} variant="outline" size="sm">
              <MessageCircle className="h-4 w-4 mr-2" />
              Messages
            </Button>
            <VoiceCall />
            <LocationSharing />
            <Button onClick={() => navigate('/tontines')} variant="outline" size="sm">
              <Coins className="h-4 w-4 mr-2" />
              Tontines
            </Button>
            <Button onClick={() => navigate('/proposer')} variant="default" size="sm">
              Mettre à disposition
            </Button>
            {hasAdminAccess && (
              <Button onClick={() => navigate('/admin')} variant="cosmic" size="sm">
                <Shield className="h-4 w-4 mr-2" />
                Super Dashboard
              </Button>
            )}
            <Button onClick={signOut} variant="outline" size="sm">
              Déconnexion
            </Button>
          </div>
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
                {(wallet?.balance || 0).toFixed(2)} MSN
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {((wallet?.balance || 0) * 750).toLocaleString()} FCFA
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
              <p className="text-3xl font-bold">{stats.directReferrals}</p>
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
              <p className="text-3xl font-bold">{stats.totalCommissions.toFixed(2)} MSN</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(stats.totalCommissions * 750).toLocaleString()} FCFA
              </p>
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

        {/* Career Progress Section - Full Width */}
        <div className="mb-8">
          <CareerProgressSection userId={user.id} />
        </div>

        {/* Investment Button */}
        <div className="mb-8">
          <Button 
            onClick={() => navigate('/investments')} 
            className="w-full" 
            size="lg"
            variant="default"
          >
            <ShoppingBag className="h-5 w-5 mr-2" />
            J'achète, Vous vendez pour moi
          </Button>
        </div>

        {/* Main Content - Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Wallet Section */}
          <WalletSection 
            balance={wallet?.balance || 0} 
            userId={user.id}
            onBalanceUpdate={fetchWalletBalance}
          />

          {/* Moissonneur Fund */}
          <MoissonneurFund />

          {/* Orders Section */}
          <OrdersSection 
            userId={user.id}
            brokerCode={profile?.referral_code || ''}
          />

          {/* Share Buttons */}
          <ShareButtons referralCode={profile?.referral_code || ''} />

          {/* Referral Tree */}
          <ReferralTreeSection userId={user.id} />
        </div>

        {/* User Orders - Full Width */}
        <div className="mb-8">
          <UserOrdersList userId={user.id} />
        </div>

        {/* Transaction History - Full Width */}
        <TransactionHistorySection userId={user.id} />
      </div>
    </div>
  );
}
