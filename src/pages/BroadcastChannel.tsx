import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Megaphone, ExternalLink, CheckCircle2, Radio } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Msg {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  link_url: string | null;
  link_label: string | null;
  category: string;
  published_at: string;
}

export default function BroadcastChannel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = 'Canal Officiel — Moissonneur'; }, []);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    load();
    const ch = (supabase as any)
      .channel('broadcast-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcast_channel_messages' }, (payload: any) => {
        setMsgs(prev => [payload.new as Msg, ...prev]);
        toast({ title: '📢 Nouveau message du canal', description: payload.new.title });
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [user, navigate]);

  const load = async () => {
    setLoading(true);
    const [{ data }, { data: reads }] = await Promise.all([
      (supabase as any).from('broadcast_channel_messages').select('*').order('published_at', { ascending: false }),
      (supabase as any).from('broadcast_channel_reads').select('message_id').eq('user_id', user!.id),
    ]);
    setMsgs((data || []) as Msg[]);
    setReadIds(new Set((reads || []).map((r: any) => r.message_id)));
    setLoading(false);
  };

  const markRead = async (id: string) => {
    if (readIds.has(id)) return;
    await (supabase as any).from('broadcast_channel_reads').insert({ message_id: id, user_id: user!.id });
    setReadIds(prev => new Set(prev).add(id));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 py-6 px-4">
      <div className="container mx-auto max-w-3xl space-y-4">
        <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="w-4 h-4 mr-2" />Accueil</Button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Radio className="w-6 h-6 text-primary" />Canal Officiel Moissonneur</h1>
          <Badge variant="outline">{msgs.length} message{msgs.length > 1 ? 's' : ''}</Badge>
        </div>

        {msgs.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-40" />
            Aucun message pour le moment. Les annonces officielles apparaîtront ici.
          </CardContent></Card>
        )}

        {msgs.map(m => {
          const isRead = readIds.has(m.id);
          return (
            <Card key={m.id} className={!isRead ? 'border-primary shadow-md' : ''}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize">{m.category}</Badge>
                      {!isRead && <Badge className="bg-primary">Nouveau</Badge>}
                    </div>
                    <h2 className="text-lg font-bold mt-1">{m.title}</h2>
                    <div className="text-xs text-muted-foreground">{new Date(m.published_at).toLocaleString('fr-FR')}</div>
                  </div>
                </div>

                {m.image_url && (
                  <img src={m.image_url} alt={m.title} className="w-full max-h-80 object-cover rounded-md" />
                )}

                <p className="whitespace-pre-line text-sm">{m.body}</p>

                <div className="flex flex-wrap gap-2 pt-2">
                  {m.link_url && (
                    <a href={m.link_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" style={{ background: 'linear-gradient(135deg,#00A859,#7C3AED)' }} className="text-white">
                        <ExternalLink className="w-4 h-4 mr-2" />{m.link_label || 'Ouvrir le lien'}
                      </Button>
                    </a>
                  )}
                  {!isRead && (
                    <Button size="sm" variant="outline" onClick={() => markRead(m.id)}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />Marquer comme lu
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
