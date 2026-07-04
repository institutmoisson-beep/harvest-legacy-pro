import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Save, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';

const TYPES = [
  { value: 'alimentation', label: 'Alimentation (Riz, Attiéké…)' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cave', label: 'Cave / Vins' },
  { value: 'hotel', label: 'Hôtel' },
];

export default function AdminRelaisPartenaires() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useUserRoles();
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({
    name: '', slug: '', partner_type: 'alimentation', description: '',
    address: '', city: '', phone: '', owner_id: '',
    commission_rate: 10, low_stock_threshold: 5, is_active: true,
    logo_url: '', cover_url: '',
  });

  const load = async () => {
    setLoading(true);
    const sb: any = supabase;
    const { data, error } = await sb.from('relay_partners').select('*').order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setPartners(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (!isAdmin()) { navigate('/dashboard'); return; }
    load();
  }, [user, authLoading, navigate]);

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '', slug: '', partner_type: 'alimentation', description: '',
      address: '', city: '', phone: '', owner_id: '',
      commission_rate: 10, low_stock_threshold: 5, is_active: true,
      logo_url: '', cover_url: '',
    });
    setOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({ ...p });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.slug || !form.owner_id) {
      toast.error('Nom, slug et propriétaire requis');
      return;
    }
    const sb: any = supabase;
    const payload = {
      ...form,
      commission_rate: Number(form.commission_rate),
      low_stock_threshold: Number(form.low_stock_threshold),
    };
    let error;
    if (editing) {
      ({ error } = await sb.from('relay_partners').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await sb.from('relay_partners').insert(payload));
    }
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Partenaire mis à jour' : 'Partenaire créé');
    setOpen(false);
    load();
  };

  const toggleActive = async (p: any) => {
    const sb: any = supabase;
    const { error } = await sb.from('relay_partners').update({ is_active: !p.is_active }).eq('id', p.id);
    if (error) toast.error(error.message);
    else { toast.success(p.is_active ? 'Partenaire désactivé' : 'Partenaire activé'); load(); }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/relais')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h1 className="text-2xl font-bold">Partenaires Relais</h1>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nouveau partenaire</Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm">Liste des partenaires ({partners.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading ? 'Chargement…' : partners.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aucun partenaire enregistré</p>
            ) : partners.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 p-3 rounded border border-border">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{p.name}</span>
                    <Badge variant="outline">{p.partner_type}</Badge>
                    <Badge variant={p.is_active ? 'default' : 'secondary'}>
                      {p.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                    <Badge variant="outline">Commission {p.commission_rate}%</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.city || '—'} · {p.phone || '—'} · slug: {p.slug}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Modifier</Button>
                  <Button size="sm" variant={p.is_active ? 'outline' : 'default'} onClick={() => toggleActive(p)}>
                    {p.is_active ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Modifier le partenaire' : 'Nouveau partenaire'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Nom *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Slug (URL) *</Label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} />
                </div>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.partner_type} onValueChange={(v) => setForm({ ...form, partner_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ID Propriétaire (user_id) *</Label>
                <Input value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} placeholder="uuid du user marchand" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Ville</Label>
                  <Input value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Adresse</Label>
                <Input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Commission (%)</Label>
                  <Input type="number" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} />
                </div>
                <div>
                  <Label>Seuil stock bas</Label>
                  <Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Logo URL</Label>
                  <Input value={form.logo_url || ''} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
                </div>
                <div>
                  <Label>Cover URL</Label>
                  <Input value={form.cover_url || ''} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Partenaire actif</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={save}><Save className="h-4 w-4 mr-1" /> Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
