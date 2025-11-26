import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import PaymentWebhookTester from '@/components/payment/PaymentWebhookTester';
import PaymentHistoryDashboard from '@/components/dashboard/PaymentHistoryDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminPayments() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Administration des Paiements — Moissonneur';
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-4xl font-bold gradient-text-cosmic">
            💳 Administration des Paiements
          </h1>
        </div>

        <Tabs defaultValue="test" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="test">🧪 Test des Webhooks</TabsTrigger>
            <TabsTrigger value="history">📊 Historique des Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="test" className="mt-6">
            <PaymentWebhookTester />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <PaymentHistoryDashboard userId={user.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
