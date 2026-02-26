import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Phone, PhoneOff, Clock, Crown } from 'lucide-react';

interface QueueEntry {
  id: string;
  caller_id: string;
  caller_code: string;
  caller_name: string | null;
  priority: number;
  is_vip: boolean;
  status: string;
  wait_start_at: string;
  assigned_agent_id: string | null;
  created_at: string;
}

export default function CallQueue() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);

  const fetchQueue = async () => {
    const { data } = await supabase
      .from('call_center_queue')
      .select('*')
      .in('status', ['waiting', 'connecting'])
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });
    setQueue(data || []);
  };

  useEffect(() => {
    fetchQueue();
    const ch = supabase
      .channel('call-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_center_queue' }, fetchQueue)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const routeCall = async (queueId: string) => {
    try {
      const { data, error } = await supabase.rpc('route_call_to_agent', { p_queue_id: queueId });
      if (error) throw error;
      if (!data) {
        toast({ title: 'Aucun agent disponible', description: 'Tous les agents sont occupés', variant: 'destructive' });
      } else {
        toast({ title: 'Appel routé', description: 'L\'appel a été assigné à un agent' });
      }
      fetchQueue();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const abandonCall = async (queueId: string) => {
    await supabase.from('call_center_queue').update({
      status: 'abandoned',
      completed_at: new Date().toISOString(),
      abandon_reason: 'Admin cancelled',
    }).eq('id', queueId);
    fetchQueue();
  };

  const getWaitTime = (start: string) => {
    const seconds = Math.floor((Date.now() - new Date(start).getTime()) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📋 File d'attente
          <Badge variant="outline">{queue.length} en attente</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {queue.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Aucun appel en attente</p>
        ) : (
          <div className="space-y-3">
            {queue.map((entry, idx) => (
              <div key={entry.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                entry.is_vip ? 'border-accent bg-accent/5' : 'bg-card'
              }`}>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-muted-foreground">#{idx + 1}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{entry.caller_name || 'Appelant'}</p>
                      {entry.is_vip && (
                        <Badge className="bg-accent/20 text-accent">
                          <Crown className="h-3 w-3 mr-1" /> VIP
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{entry.caller_code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {getWaitTime(entry.wait_start_at)}
                  </div>
                  <Badge className={entry.status === 'connecting' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'}>
                    {entry.status === 'connecting' ? 'Connexion...' : 'En attente'}
                  </Badge>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => routeCall(entry.id)} disabled={entry.status === 'connecting'}>
                      <Phone className="h-4 w-4 mr-1" /> Router
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => abandonCall(entry.id)}>
                      <PhoneOff className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
