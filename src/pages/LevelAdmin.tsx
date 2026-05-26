import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import AdminTransactionsSection from '@/components/dashboard/AdminTransactionsSection';
import AdminOrdersSection from '@/components/dashboard/AdminOrdersSection';
import AdminOrdersExport from '@/components/dashboard/AdminOrdersExport';
import VisitsAnalyticsSection from '@/components/dashboard/VisitsAnalyticsSection';
import PaymentContactsManager from '@/components/dashboard/PaymentContactsManager';
import MemberManagement from '@/components/dashboard/MemberManagement';
import TreasurySection from '@/components/dashboard/TreasurySection';
import FundWithdrawalsHistory from '@/components/dashboard/FundWithdrawalsHistory';
import MoissonneurFund from '@/components/dashboard/MoissonneurFund';
import AdminCryptoWalletsManager from '@/components/dashboard/AdminCryptoWalletsManager';
import AdminPromoCodesManager from '@/components/dashboard/AdminPromoCodesManager';
import AdminTontineAnalytics from '@/components/dashboard/AdminTontineAnalytics';
import RoleManagement from '@/components/dashboard/RoleManagement';
import PermissionsManager from '@/components/dashboard/PermissionsManager';
import GeographicRepresentativesManager from '@/components/dashboard/GeographicRepresentativesManager';
import AuditLogsViewer from '@/components/dashboard/AuditLogsViewer';
import AdminCredits from '@/pages/AdminCredits';
import AdminDeliveryRelaysManager from '@/components/dashboard/AdminDeliveryRelaysManager';
import AdminDeliveryPackagesManager from '@/components/dashboard/AdminDeliveryPackagesManager';
import AdminEventsInline from '@/components/dashboard/AdminEventsInline';
import AdminFundraisersInline from '@/components/dashboard/AdminFundraisersInline';
import AdminTaskHub from '@/components/dashboard/AdminTaskHub';
import BroadcastChannelAdmin from '@/components/dashboard/BroadcastChannelAdmin';
import { useState as useStateReact } from 'react';

export default function LevelAdmin() {
  const { user } = useAuth();
  const { isSuperAdmin, loading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Level Admin — Super Tableau de Bord';
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (rolesLoading) return;
    const allowed = user.email === 'picelvus@gmail.com' || isSuperAdmin();
    if (!allowed) {
      toast({ title: 'Accès refusé', description: "Ce tableau de bord est réservé au Super Administrateur.", variant: 'destructive' });
      navigate('/dashboard');
    }
  }, [user, rolesLoading, isSuperAdmin, navigate]);

  if (!user || rolesLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card><CardHeader><CardTitle>Chargement…</CardTitle></CardHeader><CardContent><p>Vérification des accès administrateur…</p></CardContent></Card>
      </div>
    );
  }

  const allowed = user.email === 'picelvus@gmail.com' || isSuperAdmin();
  if (!allowed) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="gap-2">
            <Home className="w-4 h-4" /> Retour au Tableau de Bord
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader><CardTitle>Level Admin — Contrôle total</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm opacity-80">
              Accès exclusif pour le Super Administrateur. Gérez l'ensemble du site: rôles, permissions,
              transactions, tontines, trésorerie, fonds, promotions, événements, cagnottes, etc.
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="roles" className="w-full">
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="roles">Rôles & Accès</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="geographic">Représentants</TabsTrigger>
            <TabsTrigger value="events">🎫 Événements</TabsTrigger>
            <TabsTrigger value="fundraisers">💝 Cagnottes</TabsTrigger>
            <TabsTrigger value="credits">Crédits & Épargnes</TabsTrigger>
            <TabsTrigger value="orders">Commandes</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="tontines">Tontines</TabsTrigger>
            <TabsTrigger value="treasury">Trésorerie</TabsTrigger>
            <TabsTrigger value="fund">Fonds Moissonneur</TabsTrigger>
            <TabsTrigger value="delivery">Livraison</TabsTrigger>
            <TabsTrigger value="promo">Codes Promo</TabsTrigger>
            <TabsTrigger value="payments">Contacts Mobile Money</TabsTrigger>
            <TabsTrigger value="crypto">Adresses Crypto</TabsTrigger>
            <TabsTrigger value="visits">Visites</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="members">Membres</TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="mt-4 space-y-6"><RoleManagement /></TabsContent>
          <TabsContent value="permissions"><PermissionsManager /></TabsContent>
          <TabsContent value="geographic"><GeographicRepresentativesManager /></TabsContent>
          <TabsContent value="events" className="mt-4"><AdminEventsInline /></TabsContent>
          <TabsContent value="fundraisers" className="mt-4"><AdminFundraisersInline /></TabsContent>
          <TabsContent value="credits" className="mt-4"><AdminCredits /></TabsContent>
          <TabsContent value="orders" className="mt-4 space-y-6"><AdminOrdersExport /><AdminOrdersSection /></TabsContent>
          <TabsContent value="transactions"><AdminTransactionsSection /></TabsContent>
          <TabsContent value="tontines" className="mt-4 space-y-6"><AdminTontineAnalytics /></TabsContent>
          <TabsContent value="treasury" className="mt-4 space-y-6"><TreasurySection /><FundWithdrawalsHistory /></TabsContent>
          <TabsContent value="fund" className="mt-4 space-y-6"><MoissonneurFund /></TabsContent>
          <TabsContent value="delivery" className="mt-4 space-y-6"><AdminDeliveryRelaysManager /><AdminDeliveryPackagesManager /></TabsContent>
          <TabsContent value="promo" className="mt-4 space-y-6"><AdminPromoCodesManager /></TabsContent>
          <TabsContent value="payments" className="mt-4 space-y-6"><PaymentContactsManager /></TabsContent>
          <TabsContent value="crypto" className="mt-4 space-y-6"><AdminCryptoWalletsManager /></TabsContent>
          <TabsContent value="visits" className="mt-4 space-y-6"><VisitsAnalyticsSection /></TabsContent>
          <TabsContent value="audit" className="mt-4 space-y-6"><AuditLogsViewer /></TabsContent>
          <TabsContent value="members" className="mt-4 space-y-6"><MemberManagement /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
