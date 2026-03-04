import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Eye, Users, Heart } from 'lucide-react';

const emptyForm = { title: '', description: '', image_url: '', goal_amount: '', end_date: '', category: 'general', status: 'active', is_public: true, payment_link: '' };

export default function AdminFundraisers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showContribs, setShowContribs] = useState<string | null>(null);

  const { data: fundraisers, isLoading } = useQuery({
    queryKey: ['admin-fundraisers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('fundraisers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: contribs } = useQuery({
    queryKey: ['admin-contribs', showContribs],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('fundraiser_contributions')
        .select('*')
        .eq('fundraiser_id', showContribs)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!showContribs,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        description: form.description || null,
        image_url: form.image_url || null,
        goal_amount: Number(form.goal_amount) || 0,
        end_date: form.end_date,
        category: form.category,
        status: form.status,
        is_public: form.is_public,
        payment_link: form.payment_link || null,
        created_by: user?.id,
      };
      if (editingId) {
        const { error } = await (supabase as any).from('fundraisers').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('fundraisers').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-fundraisers'] });
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      toast({ title: editingId ? "Cagnotte mise à jour" : "Cagnotte créée" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const statusColor: Record<string, string> = { active: 'bg-green-500/15 text-green-600', completed: 'bg-blue-500/15 text-blue-600', paused: 'bg-amber-500/15 text-amber-600', cancelled: 'bg-destructive/15 text-destructive' };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">💝 Gestion Cagnottes</h1>
        <Button size="sm" onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...emptyForm }); }}>
          <Plus className="h-4 w-4 mr-1" /> Créer
        </Button>
      </div>

      <div className="p-4 space-y-3 max-w-3xl mx-auto">
        {isLoading && <p className="text-center text-muted-foreground py-8">Chargement...</p>}

        {fundraisers?.map((f: any) => {
          const pct = f.goal_amount > 0 ? Math.min(100, (f.current_amount / f.goal_amount) * 100) : 0;
          return (
            <Card key={f.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold">{f.title}</h3>
                  <Badge className={statusColor[f.status] || ''}>{f.status}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-primary">{f.current_amount?.toLocaleString()} FCFA</span>
                  <span className="text-muted-foreground">/ {f.goal_amount?.toLocaleString()} FCFA</span>
                </div>
                <Progress value={pct} className="h-2" />
                <p className="text-xs text-muted-foreground">{f.contributors_count || 0} contributeurs · Fin: {new Date(f.end_date).toLocaleDateString('fr')}</p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => { setEditingId(f.id); setForm({ ...f, goal_amount: String(f.goal_amount), end_date: f.end_date?.slice(0, 16) || '' }); setShowForm(true); }}>Modifier</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowContribs(f.id)}>
                    <Users className="h-3 w-3 mr-1" /> Contributions
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/fundraisers/${f.id}`)}>
                    <Eye className="h-3 w-3 mr-1" /> Voir
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Modifier' : 'Créer'} une cagnotte</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Titre *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Image URL</Label><Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Objectif (FCFA) *</Label><Input type="number" value={form.goal_amount} onChange={e => setForm({ ...form, goal_amount: e.target.value })} /></div>
              <div><Label>Date de fin *</Label><Input type="datetime-local" value={form.end_date?.slice(0, 16) || ''} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div>
              <Label>Lien de paiement (optionnel)</Label>
              <Input value={form.payment_link} onChange={e => setForm({ ...form, payment_link: e.target.value })} placeholder="https://pay.example.com/..." />
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">En pause</SelectItem>
                  <SelectItem value="completed">Terminée</SelectItem>
                  <SelectItem value="cancelled">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title || !form.goal_amount || !form.end_date}>
              {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contributions Dialog */}
      <Dialog open={!!showContribs} onOpenChange={() => setShowContribs(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Contributions ({contribs?.length || 0})</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {contribs?.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-bold text-sm">{c.is_anonymous ? 'Anonyme' : c.contributor_name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString('fr')} · {c.payment_status}</p>
                  {c.message && <p className="text-xs italic mt-1">{c.message}</p>}
                </div>
                <span className="font-bold text-primary">{c.amount?.toLocaleString()} FCFA</span>
              </div>
            ))}
            {contribs?.length === 0 && <p className="text-center text-muted-foreground py-4">Aucune contribution</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
