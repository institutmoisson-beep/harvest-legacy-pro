import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import TontinePaymentCalendar from '@/components/dashboard/TontinePaymentCalendar';

export default function TontineDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/auth');
    document.title = 'Tableau de bord Tontine | Moissonneurs';
  }, [user, navigate]);

  if (!user) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="container mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold gradient-text-cosmic">Tableau de bord Tontine</h1>
          <button onClick={() => navigate('/tontines')} className="inline-flex items-center rounded-md border px-3 py-2 text-sm">Voir les Tontines</button>
        </header>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Calendrier de Paiement</CardTitle>
            </CardHeader>
            <CardContent>
              <TontinePaymentCalendar userId={user.id} />
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
