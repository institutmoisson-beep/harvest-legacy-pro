import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Coins, FileEdit, Trash2, Send } from 'lucide-react';

const CATEGORIES = ['cinema', 'agrobusiness', 'tech', 'immobilier', 'autre'];
const STATUSES = ['collecte', 'production', 'distribution', 'termine', 'annule'];

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

export default function MoissonProjectsManager() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState<any>(null);
  const [updateOpen, setUpdateOpen] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from('moisson_projects').select('*').order('created_at', { ascending: false });
    setProjects(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from('moisson_projects').update({ status }).eq('id', id);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Statut mis à jour' }); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce projet ?')) return;
    const { error } = await (supabase as any).from('moisson_projects').delete().eq('id', id);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Projet supprimé' }); load(); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">🌾 Le Grenier — Orchestration</CardTitle>
          <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Nouveau projet</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun projet. Créez-en un pour démarrer.</p>
          ) : (
            <div className="space-y-3">
              {projects.map((p) => (
                <div key={p.id} className="border rounded-xl p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">{p.title}</h4>
                        <Badge variant="outline">{p.category}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                        <span>{p.shares_sold}/{p.total_shares} parts</span>
                        <span>Cible: {fmt(p.global_target)}</span>
                        <span>ROI: +{p.estimated_roi}%</span>
                        {Number(p.total_distributed) > 0 && <span className="text-emerald-600">Distribué: {fmt(p.total_distributed)}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={p.status} onValueChange={(v) => setStatus(p.id, v)}>
                        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setUpdateOpen(p)}>
                        <FileEdit className="w-3.5 h-3.5" /> Journal
                      </Button>
                      <Button size="sm" variant="default" className="gap-1 bg-amber-500 hover:bg-amber-600" onClick={() => setPayoutOpen(p)}>
                        <Coins className="w-3.5 h-3.5" /> Distribuer
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateProjectDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      {payoutOpen && <PayoutDialog project={payoutOpen} onClose={() => setPayoutOpen(null)} onDone={load} />}
      {updateOpen && <UpdateDialog project={updateOpen} userId={user?.id} onClose={() => setUpdateOpen(null)} />}
    </div>
  );
}

function CreateProjectDialog({ open, onClose, onCreated }: any) {
  const [form, setForm] = useState({
    title: '', category: 'cinema', description: '',
    global_target: '', share_price: '', total_shares: '',
    estimated_roi: '', cover_image: '', end_date: '',
  });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!form.title || !form.description || !form.global_target || !form.share_price || !form.total_shares) {
      toast({ title: 'Champs requis manquants', variant: 'destructive' }); return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from('moisson_projects').insert({
      title: form.title, category: form.category, description: form.description,
      global_target: Number(form.global_target), share_price: Number(form.share_price),
      total_shares: Number(form.total_shares), estimated_roi: Number(form.estimated_roi) || 0,
      cover_image: form.cover_image || null,
      end_date: form.end_date || null,
    });
    setSaving(false);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '✅ Projet créé' });
    onCreated(); onClose();
    setForm({ title: '', category: 'cinema', description: '', global_target: '', share_price: '', total_shares: '', estimated_roi: '', cover_image: '', end_date: '' });
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nouveau projet du Grenier</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Titre</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Catégorie</Label>
            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Cible (FCFA)</Label><Input type="number" value={form.global_target} onChange={e => setForm({ ...form, global_target: e.target.value })} /></div>
            <div><Label>Prix part (FCFA)</Label><Input type="number" value={form.share_price} onChange={e => setForm({ ...form, share_price: e.target.value })} /></div>
            <div><Label>Total parts</Label><Input type="number" value={form.total_shares} onChange={e => setForm({ ...form, total_shares: e.target.value })} /></div>
            <div><Label>ROI estimé (%)</Label><Input type="number" value={form.estimated_roi} onChange={e => setForm({ ...form, estimated_roi: e.target.value })} /></div>
          </div>
          <div><Label>URL image de couverture</Label><Input value={form.cover_image} onChange={e => setForm({ ...form, cover_image: e.target.value })} placeholder="/moisson/..." /></div>
          <div><Label>Date de clôture</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayoutDialog({ project, onClose, onDone }: any) {
  const [revenue, setRevenue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const perShare = project.shares_sold > 0 && revenue ? Number(revenue) / project.shares_sold : 0;
  const submit = async () => {
    const amt = Number(revenue);
    if (!amt || amt <= 0) { toast({ title: 'Montant invalide', variant: 'destructive' }); return; }
    if (!confirm(`Distribuer ${fmt(amt)} entre ${project.shares_sold} parts ?`)) return;
    setSubmitting(true);
    const { data, error } = await (supabase as any).rpc('distribute_moisson_dividends', { p_project_id: project.id, p_total_revenue: amt });
    setSubmitting(false);
    if (error || !data?.[0]?.success) {
      toast({ title: 'Erreur', description: data?.[0]?.message || error?.message, variant: 'destructive' }); return;
    }
    toast({ title: '✅ Dividendes distribués', description: `${fmt(data[0].total_distributed)} crédités à ${data[0].beneficiaries} investisseur(s)` });
    onDone(); onClose();
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Coins className="w-5 h-5 text-amber-500" /> Distribuer les dividendes</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <div><strong>{project.title}</strong></div>
            <div className="text-muted-foreground">Parts vendues: {project.shares_sold} · Déjà distribué: {fmt(project.total_distributed || 0)}</div>
          </div>
          <div>
            <Label>Revenus totaux générés par le GIE (FCFA)</Label>
            <Input type="number" value={revenue} onChange={e => setRevenue(e.target.value)} placeholder="ex: 5000000" />
          </div>
          {perShare > 0 && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm">
              ↳ <strong>{fmt(perShare)}</strong> par part · répartition automatique au prorata
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={submitting} className="bg-amber-500 hover:bg-amber-600 gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Distribuer maintenant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpdateDialog({ project, userId, onClose }: any) {
  const [updates, setUpdates] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', content: '', image_url: '' });
  const [saving, setSaving] = useState(false);
  const load = async () => {
    const { data } = await (supabase as any).from('moisson_project_updates').select('*').eq('project_id', project.id).order('created_at', { ascending: false });
    setUpdates(data || []);
  };
  useEffect(() => { load(); }, []);
  const post = async () => {
    if (!form.title || !form.content) { toast({ title: 'Titre et contenu requis', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await (supabase as any).from('moisson_project_updates').insert({
      project_id: project.id, title: form.title, content: form.content,
      image_url: form.image_url || null, posted_by: userId,
    });
    setSaving(false);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '📢 Publié' });
    setForm({ title: '', content: '', image_url: '' });
    load();
  };
  const del = async (id: string) => {
    await (supabase as any).from('moisson_project_updates').delete().eq('id', id);
    load();
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Journal de bord — {project.title}</DialogTitle></DialogHeader>
        <Tabs defaultValue="new">
          <TabsList><TabsTrigger value="new">Nouvelle mise à jour</TabsTrigger><TabsTrigger value="list">Historique ({updates.length})</TabsTrigger></TabsList>
          <TabsContent value="new" className="space-y-3 mt-4">
            <div><Label>Titre</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Contenu</Label><Textarea rows={4} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></div>
            <div><Label>URL image (optionnel)</Label><Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} /></div>
            <Button onClick={post} disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Publier</Button>
          </TabsContent>
          <TabsContent value="list" className="space-y-3 mt-4">
            {updates.length === 0 ? <p className="text-sm text-muted-foreground">Aucune mise à jour.</p> :
              updates.map(u => (
                <div key={u.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="font-semibold">{u.title}</div>
                      <div className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString('fr-FR')}</div>
                      <p className="text-sm mt-2 whitespace-pre-line">{u.content}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => del(u.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </div>
                </div>
              ))
            }
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
