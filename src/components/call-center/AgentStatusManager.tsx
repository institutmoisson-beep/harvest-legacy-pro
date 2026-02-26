import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Trash2, Star } from 'lucide-react';

interface Agent {
  id: string;
  user_id: string;
  status: string;
  is_vip_handler: boolean;
  calls_handled_today: number;
  total_calls_handled: number;
  last_active_at: string | null;
  profile?: { full_name: string; referral_code: string };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  available: { label: 'Disponible', color: 'bg-primary/20 text-primary' },
  busy: { label: 'Occupé', color: 'bg-destructive/20 text-destructive' },
  paused: { label: 'En pause', color: 'bg-accent/20 text-accent' },
  offline: { label: 'Hors ligne', color: 'bg-muted text-muted-foreground' },
};

export default function AgentStatusManager() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [newAgentCode, setNewAgentCode] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchAgents = async () => {
    const { data } = await supabase.from('call_center_agents').select('*').order('created_at');
    if (!data) return;

    const userIds = data.map(a => a.user_id);
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, referral_code').in('id', userIds);
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    setAgents(data.map(a => ({ ...a, profile: profileMap[a.user_id] })));
  };

  useEffect(() => {
    fetchAgents();
    const ch = supabase
      .channel('agents-manager')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_center_agents' }, fetchAgents)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const addAgent = async () => {
    if (!newAgentCode.trim()) return;
    setAdding(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', newAgentCode.toUpperCase())
        .single();
      if (!profile) throw new Error('Code moissonneur introuvable');

      const { error } = await supabase.from('call_center_agents').insert({ user_id: profile.id, status: 'offline' });
      if (error) throw error;
      toast({ title: 'Agent ajouté' });
      setNewAgentCode('');
      fetchAgents();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const updateStatus = async (agentId: string, status: string) => {
    await supabase.from('call_center_agents').update({ status, last_active_at: new Date().toISOString() }).eq('id', agentId);
  };

  const toggleVIP = async (agent: Agent) => {
    await supabase.from('call_center_agents').update({ is_vip_handler: !agent.is_vip_handler }).eq('id', agent.id);
    fetchAgents();
  };

  const removeAgent = async (agentId: string) => {
    await supabase.from('call_center_agents').delete().eq('id', agentId);
    fetchAgents();
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>👥 Gestion des Agents</span>
          <div className="flex gap-2">
            <Input
              placeholder="Code Moissonneur"
              value={newAgentCode}
              onChange={e => setNewAgentCode(e.target.value.toUpperCase())}
              className="w-48"
            />
            <Button onClick={addAgent} disabled={adding} size="sm">
              <UserPlus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {agents.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Aucun agent configuré. Ajoutez des agents avec leur code moissonneur.</p>
          )}
          {agents.map(agent => (
            <div key={agent.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${
                  agent.status === 'available' ? 'bg-primary animate-pulse' :
                  agent.status === 'busy' ? 'bg-destructive' :
                  agent.status === 'paused' ? 'bg-accent' : 'bg-muted-foreground'
                }`} />
                <div>
                  <p className="font-medium">{agent.profile?.full_name || 'Agent'}</p>
                  <p className="text-xs text-muted-foreground font-mono">{agent.profile?.referral_code}</p>
                </div>
                {agent.is_vip_handler && (
                  <Badge variant="outline" className="text-accent border-accent">
                    <Star className="h-3 w-3 mr-1" /> VIP
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-sm">
                  <p className="text-muted-foreground">{agent.calls_handled_today} appels aujourd'hui</p>
                  <p className="text-xs text-muted-foreground">{agent.total_calls_handled} total</p>
                </div>
                <Badge className={STATUS_LABELS[agent.status]?.color || 'bg-muted'}>
                  {STATUS_LABELS[agent.status]?.label || agent.status}
                </Badge>
                <Select value={agent.status} onValueChange={v => updateStatus(agent.id, v)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">🟢 Disponible</SelectItem>
                    <SelectItem value="busy">🔴 Occupé</SelectItem>
                    <SelectItem value="paused">🟡 En pause</SelectItem>
                    <SelectItem value="offline">⚫ Hors ligne</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => toggleVIP(agent)} title="Handler VIP">
                  <Star className={`h-4 w-4 ${agent.is_vip_handler ? 'fill-accent text-accent' : 'text-muted-foreground'}`} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => removeAgent(agent.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
