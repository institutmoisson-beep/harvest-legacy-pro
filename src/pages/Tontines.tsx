import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Tontine { id: string; name: string; amount_per_cycle: number; max_participants: number; frequency: 'daily'|'weekly'|'monthly'|'custom'; start_date: string; creator_id: string; }
interface Member { user_id: string; moissonneur_code: string | null }

export default function Tontines() {
  const { user } = useAuth();
  const [tontines, setTontines] = useState<Tontine[]>([]);
  const [selected, setSelected] = useState<Tontine | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState({ name: '', amount: '', max: '', frequency: 'monthly', start: '' });
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadTontines = async () => {
    const { data, error } = await supabase.from('tontines').select('*').order('created_at',{ascending:false});
    if (error) { toast({ title:'Erreur', description:error.message, variant:'destructive' }); return; }
    setTontines(data || []);
  };

  const loadMembers = async (t: Tontine) => {
    setSelected(t);
    const { data, error } = await supabase
      .from('tontine_members')
      .select('user_id, moissonneur_code')
      .eq('tontine_id', t.id);
    if (error) { toast({ title:'Erreur', description:error.message, variant:'destructive' }); return; }
    setMembers(data || []);
  };

  useEffect(() => { loadTontines(); }, []);

  const createTontine = async () => {
    if (!user) { toast({ title:'Connexion requise', description:'Connectez-vous', variant:'destructive' }); return; }
    if (!form.name || !form.amount || !form.max || !form.start) { toast({ title:'Champs requis', description:'Veuillez remplir tous les champs', variant:'destructive' }); return; }
    setCreating(true);
    try {
      const { error } = await supabase.from('tontines').insert({
        name: form.name,
        amount_per_cycle: Number(form.amount),
        max_participants: Number(form.max),
        frequency: form.frequency as any,
        start_date: new Date(form.start).toISOString(),
        creator_id: user.id,
      });
      if (error) throw error;
      toast({ title:'Tontine créée' });
      setForm({ name:'', amount:'', max:'', frequency:'monthly', start:'' });
      await loadTontines();
    } catch (e: any) {
      toast({ title:'Erreur', description:e.message, variant:'destructive' });
    } finally { setCreating(false); }
  };

  const joinTontine = async (t: Tontine) => {
    if (!user) { toast({ title:'Connexion requise', description:'Connectez-vous', variant:'destructive' }); return; }
    setJoining(true);
    try {
      // fetch user referral_code
      const { data: profile } = await supabase.from('profiles').select('referral_code').eq('id', user.id).single();
      const moissonneur_code = profile?.referral_code || null;
      // Try insert membership (RLS ensures uniqueness by PK)
      const { error } = await supabase.from('tontine_members').insert({ tontine_id: t.id, user_id: user.id, moissonneur_code });
      if (error) throw error;
      toast({ title:'Inscription réussie' });
      await loadMembers(t);
    } catch (e: any) {
      toast({ title:'Erreur', description:e.message, variant:'destructive' });
    } finally { setJoining(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-3xl font-bold mb-6">Tontines</h1>
        <Tabs defaultValue="list">
          <TabsList className="mb-6">
            <TabsTrigger value="list">Liste</TabsTrigger>
            <TabsTrigger value="create">Créer</TabsTrigger>
          </TabsList>
          <TabsContent value="list">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Toutes les tontines</CardTitle>
                  <CardDescription>Sélectionnez une tontine pour voir les participants</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tontines.map(t => (
                      <div key={t.id} className="p-3 rounded-md border flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{t.name}</div>
                          <div className="text-xs text-muted-foreground">{t.frequency} • {t.amount_per_cycle} MSN • max {t.max_participants}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => loadMembers(t)}>Voir</Button>
                          <Button size="sm" onClick={() => joinTontine(t)} disabled={joining}>Rejoindre</Button>
                        </div>
                      </div>
                    ))}
                    {tontines.length === 0 && <div className="text-sm text-muted-foreground">Aucune tontine.</div>}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Participants</CardTitle>
                  <CardDescription>Codes Moissonneur affichés pour transparence</CardDescription>
                </CardHeader>
                <CardContent>
                  {selected ? (
                    <div className="space-y-2">
                      <div className="text-sm">{selected.name}</div>
                      <div className="rounded-md border divide-y">
                        {members.map(m => (
                          <div key={m.user_id} className="p-2 flex items-center justify-between">
                            <span className="font-mono text-xs">{m.moissonneur_code || '—'}</span>
                            <span className="text-xs text-muted-foreground">{m.user_id.slice(0,8)}…</span>
                          </div>
                        ))}
                        {members.length === 0 && <div className="p-2 text-sm text-muted-foreground">Aucun membre.</div>}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Sélectionnez une tontine.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="create">
            <Card className="glass-card max-w-lg">
              <CardHeader>
                <CardTitle>Créer une tontine</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nom</Label>
                  <Input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} />
                </div>
                <div>
                  <Label>Montant par cycle (MSN)</Label>
                  <Input type="number" value={form.amount} onChange={(e)=>setForm({...form,amount:e.target.value})} />
                </div>
                <div>
                  <Label>Nombre max de participants</Label>
                  <Input type="number" value={form.max} onChange={(e)=>setForm({...form,max:e.target.value})} />
                </div>
                <div>
                  <Label>Fréquence</Label>
                  <select className="w-full h-10 rounded-md border px-3" value={form.frequency} onChange={(e)=>setForm({...form,frequency:e.target.value})}>
                    <option value="daily">Quotidien</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuel</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <Label>Date de début</Label>
                  <Input type="date" value={form.start} onChange={(e)=>setForm({...form,start:e.target.value})} />
                </div>
                <Button onClick={createTontine} disabled={creating}>Créer</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
