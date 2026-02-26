import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, PhoneIncoming, Clock, Users } from 'lucide-react';

interface Stats {
  totalAgents: number;
  availableAgents: number;
  queueSize: number;
  activeCalls: number;
  todayCalls: number;
  avgWaitSeconds: number;
}

export default function CallCenterStats() {
  const [stats, setStats] = useState<Stats>({
    totalAgents: 0, availableAgents: 0, queueSize: 0, activeCalls: 0, todayCalls: 0, avgWaitSeconds: 0
  });

  const fetchStats = async () => {
    const [agents, queue, activeCalls, todayHistory] = await Promise.all([
      supabase.from('call_center_agents').select('status'),
      supabase.from('call_center_queue').select('id').eq('status', 'waiting'),
      supabase.from('call_center_queue').select('id').eq('status', 'connected'),
      supabase.from('call_center_history').select('wait_seconds').gte('created_at', new Date().toISOString().split('T')[0]),
    ]);

    const agentsList = agents.data || [];
    const avgWait = todayHistory.data?.length
      ? todayHistory.data.reduce((s, h) => s + (h.wait_seconds || 0), 0) / todayHistory.data.length
      : 0;

    setStats({
      totalAgents: agentsList.length,
      availableAgents: agentsList.filter(a => a.status === 'available').length,
      queueSize: queue.data?.length || 0,
      activeCalls: activeCalls.data?.length || 0,
      todayCalls: todayHistory.data?.length || 0,
      avgWaitSeconds: Math.round(avgWait),
    });
  };

  useEffect(() => {
    fetchStats();
    const ch = supabase
      .channel('call-center-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_center_agents' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_center_queue' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_center_history' }, fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const cards = [
    { label: 'Agents disponibles', value: `${stats.availableAgents}/${stats.totalAgents}`, icon: Users, color: 'text-primary' },
    { label: 'En file d\'attente', value: stats.queueSize, icon: PhoneIncoming, color: 'text-accent' },
    { label: 'Appels actifs', value: stats.activeCalls, icon: Phone, color: 'text-destructive' },
    { label: 'Appels aujourd\'hui', value: stats.todayCalls, icon: Phone, color: 'text-secondary' },
    { label: 'Attente moyenne', value: `${stats.avgWaitSeconds}s`, icon: Clock, color: 'text-muted-foreground' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map(c => (
        <Card key={c.label} className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <c.icon className={`h-3 w-3 ${c.color}`} />
              {c.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
