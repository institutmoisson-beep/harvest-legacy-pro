import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Loader2, Send, Trash2, Image as ImageIcon, ExternalLink, User as UserIcon, Users } from 'lucide-react';

interface Msg {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  link_url: string | null;
  link_label: string | null;
  category: string;
  published_at: string;
  target_user_id: string | null;
}

interface ProfileLite {
  id: string;
  full_name: string | null;
  phone: string | null;
}

export default function BroadcastChannelAdmin() {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [form, setForm] = useState({
    title: '', body: '', link_url: '', link_label: '', category: 'info',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [targeted, setTargeted] = useState(false);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<ProfileLite[]>([]);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [searching, setSearching] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('broadcast_channel_messages')
      .select('*')
      .order('published_at', { ascending: false });
    setMsgs((data || []) as Msg[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!targeted || search.trim().length < 2) { setUsers([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const q = search.trim();
      const { data } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, phone')
        .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(15);
      setUsers((data || []) as ProfileLite[]);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search, targeted]);

  const publish = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast({ title: 'Titre et message requis', variant: 'destructive' }); return;
    }
    if (targeted && !targetUserId) {
      toast({ title: 'Sélectionnez un destinataire', variant: 'destructive' }); return;
    }
    setPosting(true);
    let image_url: string | null = null;
    if (imageFile) {
      const path = `${user!.id}/${Date.now()}-${imageFile.name}`;
      const { error: upErr } = await (supabase as any).storage.from('broadcast').upload(path, imageFile);
      if (upErr) { toast({ title: 'Erreur image', description: upErr.message, variant: 'destructive' }); setPosting(false); return; }
      const { data: pub } = (supabase as any).storage.from('broadcast').getPublicUrl(path);
      image_url = pub.publicUrl;
    }
    const { error } = await (supabase as any).from('broadcast_channel_messages').insert({
      author_id: user!.id,
      title: form.title.trim(),
      body: form.body.trim(),
      image_url,
      link_url: form.link_url.trim() || null,
      link_label: form.link_label.trim() || null,
      category: form.category,
      target_user_id: targeted ? targetUserId : null,
    });
    setPosting(false);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({
      title: targeted ? '✉️ Message privé envoyé' : '📢 Message diffusé',
      description: targeted ? 'Seul le destinataire le verra dans son canal.' : 'Tous les membres le verront dans leur canal.',
    });
    setForm({ title: '', body: '', link_url: '', link_label: '', category: 'info' });
    setImageFile(null);
    setTargetUserId('');
    setSearch('');
    setUsers([]);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce message ?')) return;
    await (supabase as any).from('broadcast_channel_messages').delete().eq('id', id);
    load();
  };

  const selectedUser = users.find(u => u.id === targetUserId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Send className="w-5 h-5 text-primary" />Publier sur le Canal</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-md border p-3 bg-muted/30">
            <div className="flex items-center gap-3">
              {targeted ? <UserIcon className="w-4 h-4 text-primary" /> : <Users className="w-4 h-4 text-primary" />}
              <div>
                <Label className="cursor-pointer">{targeted ? 'Message privé à un utilisateur' : 'Diffusion à tous les membres'}</Label>
                <p className="text-xs text-muted-foreground">{targeted ? 'Seul le destinataire choisi verra ce message.' : 'Activez pour cibler un seul utilisateur.'}</p>
              </div>
            </div>
            <Switch checked={targeted} onCheckedChange={(v) => { setTargeted(v); setTargetUserId(''); setSearch(''); }} />
          </div>

          {targeted && (
            <div className="space-y-2 rounded-md border p-3">
              <Label>Rechercher un utilisateur (nom ou téléphone)</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tapez au moins 2 caractères..." />
              {searching && <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" />Recherche...</div>}
              {users.length > 0 && (
                <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                  {users.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setTargetUserId(u.id)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${targetUserId === u.id ? 'bg-primary/10' : ''}`}
                    >
                      <div className="font-medium">{u.full_name || 'Sans nom'}</div>
                      <div className="text-xs text-muted-foreground">{u.phone || '—'}</div>
                    </button>
                  ))}
                </div>
              )}
              {selectedUser && (
                <Badge variant="outline" className="mt-1">Destinataire : {selectedUser.full_name || selectedUser.phone || selectedUser.id.slice(0, 8)}</Badge>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Annonce officielle..." />
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Information</SelectItem>
                  <SelectItem value="annonce">Annonce</SelectItem>
                  <SelectItem value="reunion">Réunion / Zoom</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea rows={5} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Détails de l'annonce..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Lien (Zoom, Meet, etc.)</Label>
              <Input value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })} placeholder="https://zoom.us/..." />
            </div>
            <div className="space-y-2">
              <Label>Libellé du bouton</Label>
              <Input value={form.link_label} onChange={e => setForm({ ...form, link_label: e.target.value })} placeholder="Rejoindre la réunion" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Image (optionnel)</Label>
            <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
          </div>
          <Button onClick={publish} disabled={posting} className="w-full" style={{ background: 'linear-gradient(135deg,#00A859,#7C3AED)' }}>
            {posting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            {targeted ? 'Envoyer le message privé' : 'Diffuser à tous les membres'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historique du canal ({msgs.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          {msgs.map(m => (
            <div key={m.id} className="border rounded-md p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="capitalize">{m.category}</Badge>
                    {m.target_user_id ? (
                      <Badge variant="outline" className="text-primary border-primary"><UserIcon className="w-3 h-3 mr-1" />Privé</Badge>
                    ) : (
                      <Badge variant="outline"><Users className="w-3 h-3 mr-1" />Public</Badge>
                    )}
                    <span className="font-semibold">{m.title}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(m.published_at).toLocaleString('fr-FR')}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(m.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              <p className="text-sm whitespace-pre-line">{m.body}</p>
              {m.image_url && <img src={m.image_url} className="max-h-40 rounded" />}
              {m.link_url && <a href={m.link_url} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" />{m.link_label || m.link_url}</a>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
