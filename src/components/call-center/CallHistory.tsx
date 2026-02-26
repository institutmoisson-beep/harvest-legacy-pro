import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Phone, PhoneOff, PhoneMissed } from 'lucide-react';

interface HistoryEntry {
  id: string;
  caller_code: string | null;
  caller_name: string | null;
  agent_name: string | null;
  duration_seconds: number;
  wait_seconds: number;
  status: string;
  routing_method: string | null;
  was_transferred: boolean;
  notes_count: number;
  created_at: string;
}

export default function CallHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [callSessions, setCallSessions] = useState<any[]>([]);

  const fetchHistory = async () => {
    // Fetch from call_center_history
    const { data: historyData } = await supabase
      .from('call_center_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    // Also fetch from call_sessions for comprehensive view
    const { data: sessions } = await supabase
      .from('call_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (sessions && sessions.length > 0) {
      const userIds = [...new Set(sessions.flatMap(s => [s.caller_id, s.callee_id]))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, referral_code').in('id', userIds);
      const pMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

      const sessionEntries: HistoryEntry[] = sessions.map(s => ({
        id: s.id,
        caller_code: pMap[s.caller_id]?.referral_code || null,
        caller_name: pMap[s.caller_id]?.full_name || null,
        agent_name: pMap[s.callee_id]?.full_name || null,
        duration_seconds: s.updated_at && s.created_at
          ? Math.floor((new Date(s.updated_at).getTime() - new Date(s.created_at).getTime()) / 1000)
          : 0,
        wait_seconds: 0,
        status: s.status,
        routing_method: null,
        was_transferred: false,
        notes_count: 0,
        created_at: s.created_at,
      }));

      setCallSessions(sessionEntries);
    }

    setHistory(historyData || []);
  };

  useEffect(() => { fetchHistory(); }, []);

  const allEntries = [...history, ...callSessions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .filter(e => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (e.caller_name?.toLowerCase().includes(q) || e.caller_code?.toLowerCase().includes(q) || e.agent_name?.toLowerCase().includes(q));
    });

  // Deduplicate by id
  const unique = allEntries.filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i);

  const formatDuration = (secs: number) => {
    if (secs <= 0) return '-';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'accepted' || status === 'completed') return <Phone className="h-3 w-3 text-primary" />;
    if (status === 'rejected' || status === 'abandoned') return <PhoneMissed className="h-3 w-3 text-destructive" />;
    return <PhoneOff className="h-3 w-3 text-muted-foreground" />;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'En attente', accepted: 'Accepté', ended: 'Terminé',
      rejected: 'Rejeté', completed: 'Complété', abandoned: 'Abandonné',
    };
    return labels[status] || status;
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>📜 Historique des Appels</span>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Statut</TableHead>
                <TableHead>Appelant</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Attente</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unique.slice(0, 50).map(entry => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(entry.status)}
                      <Badge variant="outline" className="text-xs">
                        {getStatusLabel(entry.status)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{entry.caller_name || '-'}</TableCell>
                  <TableCell className="font-mono text-xs">{entry.caller_code || '-'}</TableCell>
                  <TableCell>{entry.agent_name || '-'}</TableCell>
                  <TableCell>{formatDuration(entry.duration_seconds)}</TableCell>
                  <TableCell>{entry.wait_seconds > 0 ? `${entry.wait_seconds}s` : '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(entry.created_at).toLocaleDateString('fr-FR')} {new Date(entry.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                </TableRow>
              ))}
              {unique.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    Aucun historique d'appel
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
