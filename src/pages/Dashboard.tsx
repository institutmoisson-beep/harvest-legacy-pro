import { useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, TrendingUp, Users, Wallet, ShoppingBag } from 'lucide-react';
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
import UserQRCode from '@/components/dashboard/UserQRCode';
import CryptoPaymentOptions from '@/components/dashboard/CryptoPaymentOptions';
import PromoCodesWidget from '@/components/dashboard/PromoCodesWidget';
import OfflineIndicator from '@/components/OfflineIndicator';
import CommunityDeliveryDashboardCard from '@/components/dashboard/CommunityDeliveryDashboardCard';
import DashboardGateway from '@/components/dashboard/DashboardGateway';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useQueryClient } from '@tanstack/react-query';

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
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { profile, wallet, stats, hasAdminAccess, hasMerchantRole, hasDriverRole, isLoading } = useDashboardData(user?.id);

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`dashboard-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['wallet', user.id] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commissions', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['dashboard-stats', user.id] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_commission_earnings', filter: `agent_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['dashboard-stats', user.id] }))
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const copyReferralLink = useCallback(() => {
    if (!profile?.referral_code) return;
    navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${profile.referral_code}`);
    toast({ title: "Lien copié !", description: "Le lien de parrainage a été copié" });
  }, [profile?.referral_code]);

  const formattedBalance = useMemo(() => wallet?.balance?.toFixed(2) || '0.00', [wallet?.balance]);
  const formattedCommissions = useMemo(() => stats?.totalCommissions?.toFixed(2) || '0.00', [stats?.totalCommissions]);

  if (authLoading || isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="min-w-0">
            <Button 
              onClick={() => navigate('/')} 
              variant="link" 
              className="p-0 mb-1 text-2xl font-bold gradient-text-cosmic hover:no-underline"
            >
              Les Moissonneurs
            </Button>
            <h1 className="text-xl sm:text-3xl font-bold gradient-text-cosmic">
              Bienvenue, {profile?.full_name}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Votre tableau de bord Moissonneur</p>
          </div>
          <OfflineIndicator />
        </div>

        {/* Gateway - Centre d'appel + Menu */}
        <div className="mb-8">
          <DashboardGateway 
            hasAdminAccess={hasAdminAccess} 
            hasMerchantRole={hasMerchantRole}
            hasDriverRole={hasDriverRole}
            onSignOut={signOut} 
          />
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
              <p className="text-3xl font-bold">{stats?.directReferrals ?? 0}</p>
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
              <p className="text-3xl font-bold">{formattedCommissions} MSN</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(((stats?.totalCommissions ?? 0) * 750)).toLocaleString()} FCFA
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Promo Codes Widget */}
        <div className="mb-8">
          <PromoCodesWidget />
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
              <Button onClick={copyReferralLink} variant="outline">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 p-4 bg-primary/10 rounded-lg">
              <p className="text-sm font-semibold">Votre code: {profile?.referral_code}</p>
            </div>
          </CardContent>
        </Card>

        {/* Career Progress Section */}
        {user?.id && (
          <div className="mb-8">
            <CareerProgressSection userId={user.id} />
          </div>
        )}

        {/* Community Delivery Dashboard Card */}
        <div className="mb-8">
          <CommunityDeliveryDashboardCard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {user?.id && <WalletSection balance={wallet?.balance || 0} userId={user.id} />}
          <CryptoPaymentOptions />
          <MoissonneurFund />
          {user?.id && <OrdersSection userId={user.id} brokerCode={profile?.referral_code || ''} />}
          <ShareButtons referralCode={profile?.referral_code || ''} />
          <UserQRCode />
          {user?.id && <ReferralTreeSection userId={user.id} />}
        </div>

        {/* User Orders - Full Width */}
        {user?.id && (
          <div className="mb-8">
            <UserOrdersList userId={user.id} />
          </div>
        )}

        {/* Transaction History - Full Width */}
        {user?.id && <TransactionHistorySection userId={user.id} />}
      </div>
    </div>
  );
}
