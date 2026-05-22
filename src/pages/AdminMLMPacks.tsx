import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Upload, Home, Package } from 'lucide-react';

interface Pack {
  id: string;
  name: string;
  description: string | null;
  price: number;
  benefit_amount: number;
  images: string[];
  partner_name: string | null;
  partner_logo_url: string | null;
  partner_image_url: string | null;
  base_commission_percentage: number;
  decay_rate: number;
  max_levels: number;
  is_active: boolean;
}

const emptyForm = {
  name: '', description: '', price: 0, benefit_amount: 0,
  images: [] as string[], partner_name: '', partner_logo_url: '', partner_image_url: '',
  base_commission_percentage: 30, decay_rate: 0.85, max_levels: 20, is_active: true,
};

export default function AdminMLMPacks() {
  const { user } = useAuth();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Admin — Packs MLM';
    if (!user) { navigate('/auth'); return; }
    if (rolesLoading) return;
    if (!isAdmin()) { navigate('/dashboard'); return; }
    load();
  }, [user, rolesLoading]);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from('mlm_packs').select('*').order('created_at', { ascending: false });
    setPacks((data as Pack[]) || []);
    setLoading(false);
  };

  const uploadImage = async (file: File, kind: 'images' | 'partner_logo_url' | 'partner_image_url') => {
    if (!user) return;
    setUploading(kind);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('mlm-packs').upload(path, file);
    if (error) { toast({ title: 'Upload échoué', description: error.message, variant: 'destructive' }); setUploading(null); return; }
    const { data: pub } = supabase.storage.from('mlm-packs').getPublicUrl(path);
    if (kind === 'images') setForm(f => ({ ...f, images: [...f.images, pub.publicUrl] }));
    else setForm(f => ({ ...f, [kind]: pub.publicUrl }));
    setUploading(null);
  };

  const save = async () => {
    setSaving(true);
    const payload = { ...form, created_by: user?.id };
    let err;
    if (editingId) {
      ({ error: err } = await (supabase as any).from('mlm_packs').update(payload).eq('id', editingId));
    } else {
      ({ error: err } = await (supabase as any).from('mlm_packs').insert(payload));
    }
    setSaving(false);
    if (err) { toast({ title: 'Erreur', description: err.message, variant: 'destructive' }); return; }
    toast({ title: editingId ? 'Pack mis à jour' : 'Pack créé' });
    setForm(emptyForm); setEditingId(null); load();
  };

  const edit = (p: Pack) => {
    setEditingId(p.id);
    setForm({
      name: p.name, description: p.description || '', price: p.price, benefit_amount: p.benefit_amount,
      images: p.images || [], partner_name: p.partner_name || '', partner_logo_url: p.partner_logo_url || '',
      partner_image_url: p.partner_image_url || '', base_commission_percentage: p.base_commission_percentage,
      decay_rate: p.decay_rate, max_levels: p.max_levels, is_active: p.is_active,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce pack ?')) return;
    const { error } = await (supabase as any).from('mlm_packs').delete().eq('id', id);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Pack supprimé' });
    load();
  };

  const level1Preview = (form.benefit_amount * form.base_commission_percentage) / 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="container mx-auto max-w-5xl space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold flex items-center gap-2"><Package className="w-7 h-7" /> Packs MLM</h1>
          <Button variant="outline" onClick={() => navigate('/admin')}><Home className="w-4 h-4 mr-2" />Admin</Button>
        </div>

        <Card>
          <CardHeader><CardTitle>{editingId ? 'Modifier le pack' : 'Nouveau pack'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Nom *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Partenaire / Producteur</Label><Input value={form.partner_name} onChange={e => setForm({ ...form, partner_name: e.target.value })} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><Label>Prix (FCFA) *</Label><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })} /></div>
              <div><Label>Bénéfice (FCFA) *</Label><Input type="number" value={form.benefit_amount} onChange={e => setForm({ ...form, benefit_amount: +e.target.value })} /></div>
              <div><Label>% Niveau 1</Label><Input type="number" step="0.1" value={form.base_commission_percentage} onChange={e => setForm({ ...form, base_commission_percentage: +e.target.value })} /></div>
              <div><Label>Taux décroissance (0-1)</Label><Input type="number" step="0.01" value={form.decay_rate} onChange={e => setForm({ ...form, decay_rate: +e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nb max niveaux</Label><Input type="number" value={form.max_levels} onChange={e => setForm({ ...form, max_levels: +e.target.value })} /></div>
              <div className="flex items-center gap-2 mt-6"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Actif</Label></div>
            </div>

            <div className="rounded-lg bg-primary/5 p-3 text-sm">
              📊 Aperçu : Bénéfice {form.benefit_amount.toLocaleString()} FCFA →
              <strong> Niveau 1 = {level1Preview.toLocaleString()} FCFA</strong>,
              Niveau 2 ≈ {(level1Preview * form.decay_rate).toFixed(0)} FCFA,
              Niveau 3 ≈ {(level1Preview * form.decay_rate ** 2).toFixed(0)} FCFA…
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Images du pack</Label>
                <Input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'images')} />
                {uploading === 'images' && <Loader2 className="w-4 h-4 animate-spin mt-1" />}
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.images.map((u, i) => (
                    <div key={i} className="relative">
                      <img src={u} className="w-16 h-16 object-cover rounded" />
                      <button onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))}
                              className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 text-xs">×</button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Logo partenaire</Label>
                <Input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'partner_logo_url')} />
                {form.partner_logo_url && <img src={form.partner_logo_url} className="w-16 h-16 mt-2 object-cover rounded" />}
              </div>
              <div>
                <Label>Image partenaire</Label>
                <Input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'partner_image_url')} />
                {form.partner_image_url && <img src={form.partner_image_url} className="w-16 h-16 mt-2 object-cover rounded" />}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={save} disabled={saving || !form.name || !form.price}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {editingId ? 'Mettre à jour' : 'Créer le pack'}
              </Button>
              {editingId && <Button variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Annuler</Button>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Packs existants ({packs.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
              <div className="space-y-3">
                {packs.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] && <img src={p.images[0]} className="w-12 h-12 object-cover rounded" />}
                      <div>
                        <div className="font-semibold">{p.name} {!p.is_active && <Badge variant="secondary">Inactif</Badge>}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.price} FCFA · Bénéfice {p.benefit_amount} · {p.base_commission_percentage}% N1 · {p.max_levels} niveaux
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => edit(p)}>Modifier</Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(p.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
