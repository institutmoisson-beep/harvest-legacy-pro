import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Loader2, TrendingUp, Calendar, ImagePlus, Wallet, CheckCircle2 } from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'wave', label: 'Wave', color: 'text-cyan-600' },
  { id: 'orange', label: 'Orange Money', color: 'text-orange-500' },
  { id: 'mtn', label: 'MTN MoMo', color: 'text-yellow-500' },
  { id: 'moov', label: 'Moov Money', color: 'text-blue-600' },
  { id: 'card', label: 'Carte bancaire', color: 'text-foreground' },
];

const formatFCFA = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

export default function MoissonProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shares, setShares] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('wave');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!id) return;
    const [{ data: p }, { data: u }] = await Promise.all([
      (supabase as any).from('moisson_projects').select('*').eq('id', id).maybeSingle(),
      (supabase as any).from('moisson_project_updates').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    ]);
    setProject(p);
    setUpdates(u || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!project) {
    return <div className="container mx-auto py-20 text-center">Projet introuvable.</div>;
  }

  const available = project.total_shares - project.shares_sold;
  const total = shares * project.share_price;
  const estimatedGain = total * (project.estimated_roi / 100);
  const progress = (project.shares_sold / project.total_shares) * 100;

  const handleInvest = async () => {
    if (!user) { navigate('/auth'); return; }
    if (shares < 1 || shares > available) {
      toast({ title: 'Nombre de parts invalide', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { data, error } = await (supabase as any).rpc('moisson_invest_in_project', {
      p_project_id: project.id,
      p_shares: shares,
      p_payment_method: paymentMethod,
    });
    setSubmitting(false);
    if (error || !data?.[0]?.success) {
      toast({ title: 'Échec', description: data?.[0]?.message || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: '✅ Investissement confirmé', description: `${shares} part(s) acquise(s) pour ${formatFCFA(total)}` });
    setModalOpen(false);
    load();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <Button variant="ghost" onClick={() => navigate('/grenier')} className="mb-4 gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour au Grenier
        </Button>

        {project.cover_image && (
          <div className="rounded-2xl overflow-hidden mb-6 max-h-80">
            <img src={project.cover_image} alt={project.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">{project.category}</Badge>
          <Badge className="bg-amber-500 text-white border-0"><TrendingUp className="w-3 h-3 mr-1" /> +{project.estimated_roi}%</Badge>
          <Badge variant="outline">{project.status}</Badge>
        </div>
        <h1 className="text-3xl font-bold mb-3">{project.title}</h1>
        <p className="text-muted-foreground mb-8 whitespace-pre-line">{project.description}</p>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Progression de la collecte</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{project.shares_sold} / {project.total_shares} parts</span>
                  <span className="text-muted-foreground">{progress.toFixed(1)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
                <div className="grid grid-cols-3 gap-3 text-center pt-2">
                  <div><div className="text-xs text-muted-foreground">Objectif</div><div className="font-bold">{formatFCFA(project.global_target)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Prix / part</div><div className="font-bold">{formatFCFA(project.share_price)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Disponibles</div><div className="font-bold">{available}</div></div>
                </div>
                {project.end_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-3">
                    <Calendar className="w-4 h-4" /> Clôture le {new Date(project.end_date).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Journal de bord</CardTitle></CardHeader>
              <CardContent>
                {updates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune mise à jour pour le moment.</p>
                ) : (
                  <div className="space-y-4">
                    {updates.map((u) => (
                      <div key={u.id} className="border-l-2 border-primary/40 pl-4 py-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <ImagePlus className="w-3 h-3" /> {new Date(u.created_at).toLocaleDateString('fr-FR')}
                        </div>
                        <h4 className="font-semibold">{u.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{u.content}</p>
                        {u.image_url && <img src={u.image_url} alt="" loading="lazy" className="mt-2 rounded-lg max-h-60 object-cover" />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-4 border-primary/30 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" /> Simulateur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label className="text-xs text-muted-foreground">Nombre de parts</Label>
                  <Input
                    type="number"
                    min={1}
                    max={available}
                    value={shares}
                    onChange={(e) => setShares(Math.max(1, Math.min(available, Number(e.target.value) || 1)))}
                    className="text-2xl font-bold h-14 mt-1"
                  />
                  <Slider
                    value={[shares]}
                    onValueChange={(v) => setShares(v[0])}
                    min={1}
                    max={Math.max(1, available)}
                    step={1}
                    className="mt-4"
                  />
                </div>
                <div className="rounded-xl bg-gradient-to-br from-primary/10 to-amber-500/10 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Montant total</span>
                    <span className="font-bold">{formatFCFA(total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gain estimé</span>
                    <span className="font-bold text-emerald-600">+{formatFCFA(estimatedGain)}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-semibold">Retour estimé</span>
                    <span className="font-bold text-primary">{formatFCFA(total + estimatedGain)}</span>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-emerald-600 to-amber-500 hover:opacity-90"
                  disabled={available === 0 || project.status !== 'collecte'}
                  onClick={() => setModalOpen(true)}
                >
                  Soutenir ce projet via le GIE
                </Button>
                {project.status !== 'collecte' && (
                  <p className="text-xs text-center text-muted-foreground">La collecte est fermée.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer votre investissement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Projet</span><span className="font-medium">{project.title}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Parts</span><span className="font-medium">{shares}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-bold">{formatFCFA(total)}</span></div>
            </div>
            <div>
              <Label className="mb-2 block">Méthode de paiement</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 border rounded-lg p-2.5 cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value={m.id} />
                    <span className={`text-sm font-medium ${m.color}`}>{m.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleInvest} disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Valider le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
