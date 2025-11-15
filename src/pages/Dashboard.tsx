import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, TrendingUp, Users, Wallet, Shield, User, MessageCircle, Coins, Phone, MapPin, ShoppingBag, Store, Bell, Download, ShoppingCart } from 'lucide-react';
import VoiceCall from '@/components/VoiceCall';
import LocationSharing from '@/components/LocationSharing';
import GroupVoiceCall from '@/components/GroupVoiceCall';
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
import NotificationsPanel from '@/components/dashboard/NotificationsPanel';
import OfflineIndicator from '@/components/OfflineIndicator';
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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Hook optimisé avec React Query pour cache et performance
  const { profile, wallet, stats, hasAdminAccess, hasMerchantRole, isLoading } = useDashboardData(user?.id);

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`dashboard-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` }, 
        () => queryClient.invalidateQueries({ queryKey: ['wallet', user.id] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commissions', filter: `user_id=eq.${user.id}` }, 
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

  if (isLoading) {
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
            <OfflineIndicator />
            <Button onClick={() => navigate('/profile')} variant="outline" size="sm">
              <User className="h-4 w-4 mr-2" />
              Profil
            </Button>
            <Button onClick={() => navigate('/support')} variant="outline" size="sm">
              <MessageCircle className="w-4 h-4 mr-2" />
              Support
            </Button>
            <Button onClick={() => navigate('/notifications')} variant="outline" size="sm">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </Button>
            <Button onClick={() => navigate('/install')} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Installer App
            </Button>
            <Button onClick={() => navigate('/messages')} variant="outline" size="sm">
              <MessageCircle className="w-4 h-4 mr-2" />
              Messages
            </Button>
            <VoiceCall />
            <LocationSharing />
            <GroupVoiceCall />
            <Button onClick={() => navigate('/investments')} variant="outline" size="sm">
              <Coins className="h-4 w-4 mr-2" />
              Investissements
            </Button>
            <Button onClick={() => navigate('/investor-dashboard')} variant="outline" size="sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Tableau Investisseur
            </Button>
            <Button onClick={() => navigate('/tontines')} variant="outline" size="sm">
              <Coins className="h-4 w-4 mr-2" />
              Tontines
            </Button>
            <Button onClick={() => navigate('/tontine-dashboard')} variant="outline" size="sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Dashboard Tontine
            </Button>
            <Button onClick={() => navigate('/shops-dashboard')} variant="outline" size="sm">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Ma Boutique
            </Button>
            <Button onClick={() => navigate('/proposer')} variant="default" size="sm">
              Mettre à disposition
            </Button>
            <Button onClick={() => navigate('/agent')} variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Agent Dashboard
            </Button>
            <Button onClick={() => navigate('/orders-dashboard')} variant="outline" size="sm">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Tableau Commandes
            </Button>
            {hasMerchantRole && (
              <Button onClick={() => navigate('/merchant')} variant="outline" size="sm">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Marchand
              </Button>
            )}
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

        {/* Career Progress Section - Full Width */}
        <div className="mb-8">
          <CareerProgressSection userId={user.id} />
        </div>

        {/* Investment Button */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            onClick={() => navigate('/investments')} 
            className="w-full" 
            size="lg"
            variant="default"
          >
            <ShoppingBag className="h-5 w-5 mr-2" />
            J'achète, Vous vendez pour moi
          </Button>
          
          <Button 
            onClick={() => navigate('/my-shop')} 
            className="w-full" 
            size="lg"
            variant="secondary"
          >
            <ShoppingBag className="h-5 w-5 mr-2" />
            Ma Boutique
          </Button>

          {hasMerchantRole && (
            <Button 
              onClick={() => navigate('/merchant')} 
              className="w-full md:col-span-2" 
              size="lg"
              variant="cosmic"
            >
              <Users className="h-5 w-5 mr-2" />
              Tableau de bord Marchand
            </Button>
          )}
        </div>

        {/* Main Content - Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Wallet Section */}
          <WalletSection 
            balance={wallet?.balance || 0} 
            userId={user.id}
          />

          {/* Crypto Payment Options */}
          <CryptoPaymentOptions />

          {/* Moissonneur Fund */}
          <MoissonneurFund />

          {/* Orders Section */}
          <OrdersSection 
            userId={user.id}
            brokerCode={profile?.referral_code || ''}
          />

          {/* Share Buttons */}
          <ShareButtons referralCode={profile?.referral_code || ''} />

          {/* QR Code */}
          <UserQRCode />

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
