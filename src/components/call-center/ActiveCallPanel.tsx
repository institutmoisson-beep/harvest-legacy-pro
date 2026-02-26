import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Phone, PhoneOff, ArrowRightLeft, StickyNote, MapPin } from 'lucide-react';

interface ActiveCall {
  id: string;
  caller_id: string;
  callee_id: string;
  status: string;
  created_at: string;
  caller_profile?: { full_name: string; referral_code: string };
  callee_profile?: { full_name: string; referral_code: string };
  notes: any[];
}

export default function ActiveCallPanel() {
  const [calls, setCalls] = useState<ActiveCall[]>([]);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  const fetchActiveCalls = async () => {
    const { data } = await supabase
      .from('call_sessions')
      .select('*')
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false });

    if (!data || data.length === 0) { setCalls([]); return; }

    const userIds = [...new Set(data.flatMap(c => [c.caller_id, c.callee_id]))];
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, referral_code').in('id', userIds);
    const pMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    const callIds = data.map(c => c.id);
    const { data: notes } = await supabase.from('call_center_notes').select('*').in('call_session_id', callIds);

    setCalls(data.map(c => ({
      ...c,
      caller_profile: pMap[c.caller_id],
      callee_profile: pMap[c.callee_id],
      notes: (notes || []).filter(n => n.call_session_id === c.id),
    })));
  };

  useEffect(() => {
    fetchActiveCalls();
    const ch = supabase
      .channel('active-calls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_sessions' }, fetchActiveCalls)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_center_notes' }, fetchActiveCalls)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const endCall = async (callId: string) => {
    await supabase.from('call_sessions').update({ status: 'ended' }).eq('id', callId);
    toast({ title: 'Appel terminé' });
    fetchActiveCalls();
  };

  const addNote = async (callId: string) => {
    const content = noteInputs[callId]?.trim();
    if (!content) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('call_center_notes').insert({
      call_session_id: callId,
      agent_id: user.id,
      content,
    });
    setNoteInputs(prev => ({ ...prev, [callId]: '' }));
    toast({ title: 'Note ajoutée' });
    fetchActiveCalls();
  };

  const getDuration = (start: string) => {
    const secs = Math.floor((Date.now() - new Date(start).getTime()) / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔴 Appels Actifs
          <Badge variant="outline">{calls.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {calls.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Aucun appel actif</p>
        ) : (
          <div className="space-y-4">
            {calls.map(call => (
              <div key={call.id} className="p-4 rounded-lg border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{call.caller_profile?.full_name || 'Appelant'}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{call.callee_profile?.full_name || 'Destinataire'}</span>
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground font-mono">
                        <span>{call.caller_profile?.referral_code}</span>
                        <span>→</span>
                        <span>{call.callee_profile?.referral_code}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={call.status === 'accepted' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'}>
                      {call.status === 'accepted' ? 'En cours' : 'Sonnerie'}
                    </Badge>
                    <span className="text-sm font-mono text-muted-foreground">{getDuration(call.created_at)}</span>
                    <Button size="sm" variant="destructive" onClick={() => endCall(call.id)}>
                      <PhoneOff className="h-4 w-4 mr-1" /> Terminer
                    </Button>
                  </div>
                </div>

                {/* Notes */}
                {call.notes.length > 0 && (
                  <div className="pl-7 space-y-1">
                    {call.notes.map((note: any) => (
                      <div key={note.id} className="text-sm flex items-start gap-2">
                        <StickyNote className="h-3 w-3 mt-0.5 text-accent" />
                        <span>{note.content}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(note.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add note */}
                <div className="flex gap-2 pl-7">
                  <Input
                    placeholder="Ajouter une note..."
                    value={noteInputs[call.id] || ''}
                    onChange={e => setNoteInputs(prev => ({ ...prev, [call.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addNote(call.id)}
                    className="text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={() => addNote(call.id)}>
                    <StickyNote className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
