import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Coins, Plus, Users, Calendar, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Tontine {
  id: string;
  name: string;
  amount: number;
  max_participants: number;
  frequency: string;
  start_date: string;
  creator_id: string;
  status: string;
  current_cycle: number;
  participant_count?: number;
}

export default function Tontines() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tontines, setTontines] = useState<Tontine[]>([]);
  const [myTontines, setMyTontines] = useState<Tontine[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    max_participants: '',
    frequency: 'monthly',
    start_date: '',
  });

  useEffect(() => {
    if (user) {
      fetchTontines();
      fetchMyTontines();
    }
  }, [user]);

  const fetchTontines = async () => {
    const { data } = await supabase
      .from('tontines')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (data) {
      // Get participant counts
      const tontinesWithCounts = await Promise.all(
        data.map(async (tontine) => {
          const { count } = await supabase
            .from('tontine_participants')
            .select('*', { count: 'exact', head: true })
            .eq('tontine_id', tontine.id);
          return { ...tontine, participant_count: count || 0 };
        })
      );
      setTontines(tontinesWithCounts);
    }
  };

  const fetchMyTontines = async () => {
    const { data: participations } = await supabase
      .from('tontine_participants')
      .select('tontine_id')
      .eq('user_id', user?.id);

    if (participations && participations.length > 0) {
      const tontineIds = participations.map(p => p.tontine_id);
      const { data } = await supabase
        .from('tontines')
        .select('*')
        .in('id', tontineIds);

      setMyTontines(data || []);
    }
  };

  const createTontine = async () => {
    if (!formData.name || !formData.amount || !formData.max_participants || !formData.start_date) {
      toast({ title: 'Erreur', description: 'Tous les champs sont requis', variant: 'destructive' });
      return;
    }

    const { data, error } = await supabase.from('tontines').insert({
      name: formData.name,
      amount: parseFloat(formData.amount),
      max_participants: parseInt(formData.max_participants),
      frequency: formData.frequency,
      start_date: new Date(formData.start_date).toISOString(),
      creator_id: user?.id,
    }).select().single();

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      // Auto-join creator
      await supabase.from('tontine_participants').insert({
        tontine_id: data.id,
        user_id: user?.id,
      });

      toast({ title: 'Succès', description: 'Tontine créée avec succès' });
      setCreateDialogOpen(false);
      setFormData({ name: '', amount: '', max_participants: '', frequency: 'monthly', start_date: '' });
      fetchTontines();
      fetchMyTontines();
    }
  };

  const joinTontine = async (tontineId: string) => {
    const { error } = await supabase.from('tontine_participants').insert({
      tontine_id: tontineId,
      user_id: user?.id,
    });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Déjà inscrit', description: 'Vous participez déjà à cette tontine' });
      } else {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'Succès', description: 'Vous avez rejoint la tontine' });
      fetchTontines();
      fetchMyTontines();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold gradient-text-cosmic flex items-center gap-2">
            <Coins className="h-8 w-8" />
            Tontines Moissonneurs
          </h1>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Créer une tontine
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une nouvelle tontine</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nom de la tontine</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Tontine Moissonneurs 2024"
                  />
                </div>
                <div>
                  <Label>Montant par cycle (FCFA)</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="Ex: 50000"
                  />
                </div>
                <div>
                  <Label>Nombre maximum de participants</Label>
                  <Input
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                    placeholder="Ex: 10"
                  />
                </div>
                <div>
                  <Label>Fréquence</Label>
                  <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Quotidien</SelectItem>
                      <SelectItem value="weekly">Hebdomadaire</SelectItem>
                      <SelectItem value="monthly">Mensuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date de début</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <Button onClick={createTontine} className="w-full">Créer</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* My Tontines */}
        {myTontines.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Mes Tontines</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myTontines.map(tontine => (
                <Card key={tontine.id} className="glass-card hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate(`/tontines/${tontine.id}`)}>
                  <CardHeader>
                    <CardTitle className="text-lg">{tontine.name}</CardTitle>
                    <CardDescription>
                      Cycle {tontine.current_cycle} • {tontine.frequency === 'monthly' ? 'Mensuel' : tontine.frequency === 'weekly' ? 'Hebdomadaire' : 'Quotidien'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-primary" />
                        <span>{tontine.amount.toLocaleString()} FCFA / cycle</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-accent" />
                        <span>{tontine.max_participants} participants max</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-secondary" />
                        <span>Début: {new Date(tontine.start_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Tontines */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Tontines disponibles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tontines.map(tontine => {
              const isParticipant = myTontines.some(mt => mt.id === tontine.id);
              const isFull = (tontine.participant_count || 0) >= tontine.max_participants;

              return (
                <Card key={tontine.id} className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">{tontine.name}</CardTitle>
                    <CardDescription>
                      {tontine.frequency === 'monthly' ? 'Mensuel' : tontine.frequency === 'weekly' ? 'Hebdomadaire' : 'Quotidien'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Coins className="h-4 w-4 text-primary" />
                          <span>{tontine.amount.toLocaleString()} FCFA / cycle</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-accent" />
                          <span>{tontine.participant_count || 0}/{tontine.max_participants} participants</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-secondary" />
                          <span>Début: {new Date(tontine.start_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {isParticipant ? (
                        <Button className="w-full" onClick={() => navigate(`/tontines/${tontine.id}`)}>
                          Voir détails
                        </Button>
                      ) : isFull ? (
                        <Button className="w-full" disabled>Complet</Button>
                      ) : (
                        <Button className="w-full" onClick={() => joinTontine(tontine.id)}>
                          Rejoindre
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
