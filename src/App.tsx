import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, Suspense, lazy } from 'react';
import { requestNotificationPermission } from '@/utils/pushNotifications';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import VisitLogger from "@/components/VisitLogger";
import { AuthProvider } from "@/hooks/useAuth";
import { UserCurrencyProvider } from "@/hooks/useUserCurrency";
import { usePWABadge } from "@/hooks/usePWABadge";
import LoadingScreen from "@/components/LoadingScreen";
import VoiceCall from '@/components/VoiceCall';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
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

const OrdersDashboard = lazy(() => import("./pages/OrdersDashboard"));
const NotificationsCenter = lazy(() => import("./pages/NotificationsCenter"));
const InstallPWA = lazy(() => import("./pages/InstallPWA"));
const LevelAdmin = lazy(() => import("./pages/LevelAdmin"));
const CommunityDelivery = lazy(() => import("./pages/CommunityDelivery"));
const AdminJobDomains = lazy(() => import("./pages/AdminJobDomains"));
const AdminDelivery = lazy(() => import("./pages/AdminDelivery"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const ProductPayment = lazy(() => import("./pages/ProductPayment"));
const OrderDownloads = lazy(() => import("./pages/OrderDownloads"));
const AdminPayments = lazy(() => import("./pages/AdminPayments"));
const StorageSetup = lazy(() => import("./pages/StorageSetup"));
const CallCenter = lazy(() => import("./pages/CallCenter"));
const Events = lazy(() => import("./pages/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const AdminEvents = lazy(() => import("./pages/AdminEvents"));
const Fundraisers = lazy(() => import("./pages/Fundraisers"));
const FundraiserDetail = lazy(() => import("./pages/FundraiserDetail"));
const AdminFundraisers = lazy(() => import("./pages/AdminFundraisers"));
const AdminTransport = lazy(() => import("./pages/AdminTransport"));
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const BookRide = lazy(() => import("./pages/BookRide"));
const ImmoClient = lazy(() => import("./pages/ImmoClient"));
const ImmoHost = lazy(() => import("./pages/ImmoHost"));
const AdminImmo = lazy(() => import("./pages/AdminImmo"));
const Enterprises = lazy(() => import("./pages/Enterprises"));
const EnterpriseDetail = lazy(() => import("./pages/EnterpriseDetail"));
const AdminEnterprises = lazy(() => import("./pages/AdminEnterprises"));
const MLMPacks = lazy(() => import("./pages/MLMPacks"));
const MLMPackDetail = lazy(() => import("./pages/MLMPackDetail"));
const AdminMLMPacks = lazy(() => import("./pages/AdminMLMPacks"));
const MyRelayDeliveries = lazy(() => import("./pages/MyRelayDeliveries"));
const BroadcastChannel = lazy(() => import("./pages/BroadcastChannel"));
const MoissonGrenier = lazy(() => import("./pages/MoissonGrenier"));
const MoissonProjectDetail = lazy(() => import("./pages/MoissonProjectDetail"));
const CarteMoissonneur = lazy(() => import("./pages/CarteMoissonneur"));
const VerifierMoissonneur = lazy(() => import("./pages/VerifierMoissonneur"));
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
        <Route path="/merchant" element={<MerchantDashboard />} />
        <Route path="/my-shop" element={<ShopDashboard />} />
        <Route path="/shops-dashboard" element={<ShopsDashboard />} />
        <Route path="/shop/:shopSlug" element={<PublicShop />} />
        <Route path="/credit-request" element={<CreditRequest />} />
        <Route path="/my-credits" element={<MyCredits />} />
        <Route path="/my-savings" element={<MySavings />} />
        <Route path="/admin/credits" element={<AdminCredits />} />
        <Route path="/partner-dashboard" element={<PartnerDashboard />} />
        
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
        <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
        <Route path="/product/:productId/payment" element={<ProductPayment />} />
        <Route path="/order/:orderId/downloads" element={<OrderDownloads />} />
        <Route path="/admin/payments" element={<AdminPayments />} />
        <Route path="/setup/storage" element={<StorageSetup />} />
        <Route path="/admin/call-center" element={<CallCenter />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:eventId" element={<EventDetail />} />
        <Route path="/admin/events" element={<AdminEvents />} />
        <Route path="/fundraisers" element={<Fundraisers />} />
        <Route path="/fundraisers/:fundraiserId" element={<FundraiserDetail />} />
        <Route path="/admin/fundraisers" element={<AdminFundraisers />} />
        <Route path="/admin/transport" element={<AdminTransport />} />
        <Route path="/driver" element={<DriverDashboard />} />
        <Route path="/book-ride" element={<BookRide />} />
        <Route path="/immo" element={<ImmoClient />} />
        <Route path="/immo/host" element={<ImmoHost />} />
        <Route path="/admin/immo" element={<AdminImmo />} />
        <Route path="/enterprises" element={<Enterprises />} />
        <Route path="/enterprise/:slug" element={<EnterpriseDetail />} />
        <Route path="/admin/enterprises" element={<AdminEnterprises />} />
        <Route path="/packs" element={<MLMPacks />} />
        <Route path="/packs/:id" element={<MLMPackDetail />} />
        <Route path="/admin/packs" element={<AdminMLMPacks />} />
        <Route path="/mes-livraisons" element={<MyRelayDeliveries />} />
        <Route path="/canal" element={<BroadcastChannel />} />
        <Route path="/grenier" element={<MoissonGrenier />} />
        <Route path="/grenier/:id" element={<MoissonProjectDetail />} />
        <Route path="/ma-carte" element={<CarteMoissonneur />} />
        <Route path="/verifier" element={<VerifierMoissonneur />} />
        <Route path="/verify" element={<VerifierMoissonneur />} />
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

  useEffect(() => {
    // Request notification permission on first visit
    requestNotificationPermission();
  }, []);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <VisitLogger />
        <AuthProvider>
          <UserCurrencyProvider>
            <VoiceCall hideTrigger />
            <PWAInstallPrompt />
            <AppContent />
          </UserCurrencyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
