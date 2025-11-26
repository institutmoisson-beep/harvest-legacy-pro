import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import VisitLogger from "@/components/VisitLogger";
import { AuthProvider } from "@/hooks/useAuth";
import { usePWABadge } from "@/hooks/usePWABadge";
import LoadingScreen from "@/components/LoadingScreen";
import { supabase } from '@/integrations/supabase/client';

// Lazy load des pages pour réduire le bundle initial
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const ProposerProduit = lazy(() => import("./pages/ProposerProduit"));
const AgentDashboard = lazy(() => import("./pages/AgentDashboard"));
const Messages = lazy(() => import("./pages/Messages"));
const Tontines = lazy(() => import("./pages/Tontines"));
const TontineDetail = lazy(() => import("./pages/TontineDetail"));
const Investments = lazy(() => import("./pages/Investments"));
const InvestorDashboard = lazy(() => import("./pages/InvestorDashboard"));
const MerchantDashboard = lazy(() => import("./pages/MerchantDashboard"));
const MyShop = lazy(() => import("./pages/MyShop"));
const ShopsDashboard = lazy(() => import("./pages/ShopsDashboard"));
const ShopDashboard = lazy(() => import("./pages/ShopDashboard"));
const PublicShop = lazy(() => import("./pages/PublicShop"));
const CreditRequest = lazy(() => import("./pages/CreditRequest"));
const MyCredits = lazy(() => import("./pages/MyCredits"));
const AdminCredits = lazy(() => import("./pages/AdminCredits"));
const MySavings = lazy(() => import("./pages/MySavings"));
const PartnerDashboard = lazy(() => import("./pages/PartnerDashboard"));
const SupportChat = lazy(() => import("./pages/SupportChat"));
const TontineDashboard = lazy(() => import("./pages/TontineDashboard"));
const OrdersDashboard = lazy(() => import("./pages/OrdersDashboard"));
const NotificationsCenter = lazy(() => import("./pages/NotificationsCenter"));
const InstallPWA = lazy(() => import("./pages/InstallPWA"));
const LevelAdmin = lazy(() => import("./pages/LevelAdmin"));
const CommunityDelivery = lazy(() => import("./pages/CommunityDelivery"));
const AdminJobDomains = lazy(() => import("./pages/AdminJobDomains"));
const AdminDelivery = lazy(() => import("./pages/AdminDelivery"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const EstablishmentDashboard = lazy(() => import("./pages/EstablishmentDashboard"));
const QRMenu = lazy(() => import("./pages/QRMenu"));
const QRCheckout = lazy(() => import("./pages/QRCheckout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const ProductPayment = lazy(() => import("./pages/ProductPayment"));
const OrderDownloads = lazy(() => import("./pages/OrderDownloads"));
const AdminPayments = lazy(() => import("./pages/AdminPayments"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Composant interne pour utiliser les hooks après AuthProvider
const AppContent = () => {
  const { updateBadgeFromNotifications, isBadgeSupported } = usePWABadge();

  useEffect(() => {
    if (isBadgeSupported) {
      console.log('✅ Badge API supportée - activation du système de badges');
      updateBadgeFromNotifications();
    } else {
      console.log('⚠️ Badge API non supportée sur ce navigateur');
    }
  }, [isBadgeSupported, updateBadgeFromNotifications]);

  return (
    <Suspense fallback={<LoadingScreen message="Chargement de la page..." />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/proposer" element={<ProposerProduit />} />
        <Route path="/agent" element={<AgentDashboard />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/tontines" element={<Tontines />} />
        <Route path="/tontines/:id" element={<TontineDetail />} />
        <Route path="/investments" element={<Investments />} />
        <Route path="/investor-dashboard" element={<InvestorDashboard />} />
        <Route path="/merchant" element={<MerchantDashboard />} />
        <Route path="/my-shop" element={<ShopDashboard />} />
        <Route path="/shops-dashboard" element={<ShopsDashboard />} />
        <Route path="/shop/:shopSlug" element={<PublicShop />} />
        <Route path="/credit-request" element={<CreditRequest />} />
        <Route path="/my-credits" element={<MyCredits />} />
        <Route path="/my-savings" element={<MySavings />} />
        <Route path="/admin/credits" element={<AdminCredits />} />
        <Route path="/partner-dashboard" element={<PartnerDashboard />} />
        <Route path="/tontine-dashboard" element={<TontineDashboard />} />
        <Route path="/orders-dashboard" element={<OrdersDashboard />} />
        <Route path="/notifications" element={<NotificationsCenter />} />
        <Route path="/install" element={<InstallPWA />} />
        <Route path="/support" element={<SupportChat />} />
        <Route path="/level-admin" element={<LevelAdmin />} />
        <Route path="/community-delivery" element={<CommunityDelivery />} />
        <Route path="/admin/job-domains" element={<AdminJobDomains />} />
        <Route path="/admin/deliveries" element={<AdminDelivery />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/product/:productId" element={<ProductDetail />} />
        <Route path="/establish" element={<EstablishmentDashboard />} />
        <Route path="/menu/:slug" element={<QRMenu />} />
        <Route path="/checkout" element={<QRCheckout />} />
        <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
        <Route path="/product/:productId/payment" element={<ProductPayment />} />
        <Route path="/order/:orderId/downloads" element={<OrderDownloads />} />
        <Route path="/admin/payments" element={<AdminPayments />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => {
  useEffect(() => {
    // Visit logging asynchrone et non bloquant
    const sessionId = localStorage.getItem('visit_session') || crypto.randomUUID();
    localStorage.setItem('visit_session', sessionId);
    
    // Defer visit logging to not block initial render
    setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const sb: any = supabase;
        await (sb.from as any)('visits').insert({
          session_id: sessionId,
          path: window.location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          user_id: user?.id || null,
        });
      } catch (e) {
        // Silently ignore logging errors
      }
    }, 0);
  }, []);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <VisitLogger />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
