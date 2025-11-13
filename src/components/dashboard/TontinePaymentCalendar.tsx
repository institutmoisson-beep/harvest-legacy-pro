import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, AlertCircle, CheckCircle, Bell } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TontinePaymentCalendarProps {
  userId: string;
}

export default function TontinePaymentCalendar({ userId }: TontinePaymentCalendarProps) {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [tontines, setTontines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('tontine-schedule')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tontine_payment_schedule' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tontine_payments' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch user's tontines
    const { data: participations } = await supabase
      .from('tontine_participants')
      .select('tontine_id')
      .eq('user_id', userId);

    if (participations && participations.length > 0) {
      const tontineIds = participations.map(p => p.tontine_id);

      // Fetch tontines details
      const { data: tontinesData } = await supabase
        .from('tontines')
        .select('*')
        .in('id', tontineIds);

      setTontines(tontinesData || []);

      // Fetch payment schedule
      const { data: scheduleData } = await supabase
        .from('tontine_payment_schedule')
        .select('*')
        .in('tontine_id', tontineIds)
        .order('due_date', { ascending: true });

      // Fetch actual payments
      const { data: paymentsData } = await supabase
        .from('tontine_payments')
        .select('*')
        .eq('user_id', userId)
        .in('tontine_id', tontineIds);

      // Merge schedule with actual payments
      const enrichedSchedule = (scheduleData || []).map(item => {
        const payment = paymentsData?.find(
          p => p.tontine_id === item.tontine_id && p.cycle_number === item.cycle_number
        );
        const tontine = tontinesData?.find(t => t.id === item.tontine_id);
        
        return {
          ...item,
          tontine_name: tontine?.name || 'Tontine',
          payment_made: !!payment,
          payment_status: payment?.status || item.status
        };
      });

      setSchedule(enrichedSchedule);
    }

    setLoading(false);
  };

  const getStatusBadge = (item: any) => {
    const now = new Date();
    const dueDate = new Date(item.due_date);
    
    if (item.payment_made && item.payment_status === 'validated') {
      return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Payé</Badge>;
    }
    
    if (dueDate < now && !item.payment_made) {
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />En retard</Badge>;
    }
    
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue <= 3) {
      return <Badge variant="secondary" className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Urgent ({daysUntilDue}j)</Badge>;
    }
    
    return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />À venir ({daysUntilDue}j)</Badge>;
  };

  const enableReminders = async (tontineId: string) => {
    const { error } = await (supabase.from as any)('notifications')
      .insert({
        user_id: userId,
        title: 'Rappels activés',
        message: 'Vous recevrez des notifications pour les paiements de cette tontine',
        type: 'tontine',
        related_id: tontineId
      });

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Rappels activés pour cette tontine' });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">Chargement du calendrier...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paiements à venir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schedule.filter(s => !s.payment_made && new Date(s.due_date) >= new Date()).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En retard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {schedule.filter(s => !s.payment_made && new Date(s.due_date) < new Date()).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Payés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {schedule.filter(s => s.payment_made).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendrier des Paiements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {schedule.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun paiement programmé
            </p>
          ) : (
            <div className="space-y-3">
              {schedule.map((item) => (
                <Card key={item.id} className="border-l-4" style={{
                  borderLeftColor: item.payment_made ? '#22c55e' : 
                    new Date(item.due_date) < new Date() ? '#ef4444' : '#3b82f6'
                }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.tontine_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Cycle {item.cycle_number} • {item.amount.toLocaleString()} FCFA
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Échéance: {new Date(item.due_date).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(item)}
                        {!item.reminder_sent && !item.payment_made && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => enableReminders(item.tontine_id)}
                          >
                            <Bell className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tontines List with Reminders */}
      <Card>
        <CardHeader>
          <CardTitle>Mes Tontines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tontines.map((tontine) => (
              <div key={tontine.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <h4 className="font-semibold">{tontine.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {tontine.amount.toLocaleString()} FCFA • {tontine.frequency}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => enableReminders(tontine.id)}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Activer rappels
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
