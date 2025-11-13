import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import VisitLogger from "@/components/VisitLogger";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import ProposerProduit from "./pages/ProposerProduit";
import AgentDashboard from "./pages/AgentDashboard";
import Messages from "./pages/Messages";
import Tontines from "./pages/Tontines";
import TontineDetail from "./pages/TontineDetail";
import Investments from "./pages/Investments";
import InvestorDashboard from "./pages/InvestorDashboard";
import MerchantDashboard from "./pages/MerchantDashboard";
import MyShop from "./pages/MyShop";
import ShopsDashboard from "./pages/ShopsDashboard";
import PublicShop from "./pages/PublicShop";
import SupportChat from "./pages/SupportChat";
import TontineDashboard from "./pages/TontineDashboard";
import NotificationsCenter from "./pages/NotificationsCenter";
import NotFound from "./pages/NotFound";
import { supabase } from '@/integrations/supabase/client';

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const sessionId = localStorage.getItem('visit_session') || crypto.randomUUID();
    localStorage.setItem('visit_session', sessionId);
    const sb: any = supabase;
    const log = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
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
    };
    log();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <VisitLogger />
          <AuthProvider>
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
              <Route path="/my-shop" element={<MyShop />} />
              <Route path="/shops-dashboard" element={<ShopsDashboard />} />
              <Route path="/shop/:shopSlug" element={<PublicShop />} />
              <Route path="/tontine-dashboard" element={<TontineDashboard />} />
              <Route path="/notifications" element={<NotificationsCenter />} />
              <Route path="/support" element={<SupportChat />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
