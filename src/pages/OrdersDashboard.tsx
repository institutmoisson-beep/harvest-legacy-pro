import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import OrdersKPICards from '@/components/dashboard/OrdersKPICards';
import OrdersAnalytics from '@/components/dashboard/OrdersAnalytics';
import OrdersBadges from '@/components/dashboard/OrdersBadges';
import OrdersLeaderboard from '@/components/dashboard/OrdersLeaderboard';
import OrdersSection from '@/components/dashboard/OrdersSection';
import UserOrdersList from '@/components/dashboard/UserOrdersList';
import { supabase } from '@/integrations/supabase/client';

export default function OrdersDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [brokerCode, setBrokerCode] = useState('');

  useEffect(() => {
    if (user) {
      fetchBrokerCode();
    }
  }, [user]);

  const fetchBrokerCode = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setBrokerCode(data.referral_code);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-4xl font-bold gradient-text-cosmic">
            Tableau de Bord des Commandes
          </h1>
        </div>

        {/* KPI Cards */}
        <OrdersKPICards userId={user?.id || ''} />

        {/* Create Order Section */}
        <div className="mb-8">
          <OrdersSection userId={user?.id || ''} brokerCode={brokerCode} />
        </div>

        {/* My Orders List */}
        <div className="mb-8">
          <UserOrdersList userId={user?.id || ''} />
        </div>

        {/* Badges/Achievements */}
        <OrdersBadges userId={user?.id || ''} />

        {/* Analytics Charts */}
        <OrdersAnalytics userId={user?.id || ''} />

        {/* Leaderboard */}
        <OrdersLeaderboard />
      </div>
    </div>
  );
}
