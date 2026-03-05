import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Heart, Users, Clock, ExternalLink, Wallet } from 'lucide-react';

function CountdownTimer({ endDate }: { endDate: string }) {
  const [parts, setParts] = useState({ d: 0, h: 0, m: 0, s: 0, ended: false });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setParts({ d: 0, h: 0, m: 0, s: 0, ended: true }); return; }
      setParts({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        ended: false,
      });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (parts.ended) return <p className="text-center text-destructive font-bold text-lg">Cagnotte terminée</p>;

  const Box = ({ val, label }: { val: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-primary/10 border border-primary/20 rounded-xl w-16 h-16 flex items-center justify-center">
        <span className="text-2xl font-bold text-primary font-mono">{String(val).padStart(2, '0')}</span>
      </div>
      <span className="text-[10px] text-muted-foreground mt-1">{label}</span>
    </div>
  );

  return (
    <div className="flex justify-center gap-3">
      <Box val={parts.d} label="Jours" />
      <Box val={parts.h} label="Heures" />
      <Box val={parts.m} label="Min" />
      <Box val={parts.s} label="Sec" />
    </div>
  );
}

export default function FundraiserDetail() {
  const { fundraiserId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [payMethod, setPayMethod] = useState<'wallet' | 'external'>('wallet');
  const presets = [500, 1000, 2000, 5000, 10000, 25000];

  const { data: fundraiser, isLoading } = useQuery({
    queryKey: ['fundraiser', fundraiserId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('fundraisers').select('*').eq('id', fundraiserId).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!fundraiserId,
  });

  const { data: walletData } = useQuery({
    queryKey: ['wallet-balance', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('wallets').select('balance').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: contributions } = useQuery({
    queryKey: ['fundraiser-contributions', fundraiserId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('fundraiser_contributions')
        .select('*')
        .eq('fundraiser_id', fundraiserId)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!fundraiserId,
  });

  const contributeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Connectez-vous');
      if (!amount || Number(amount) <= 0) throw new Error('Montant invalide');
      if (!name.trim() && !anonymous) throw new Error('Nom requis');

      const numAmount = Number(amount);

      if (payMethod === 'wallet') {
        if (!walletData || walletData.balance < numAmount) {
          throw new Error(`Solde insuffisant (${walletData?.balance?.toLocaleString() || 0} FCFA). Rechargez votre portefeuille.`);
        }
        // Debit wallet
        const { error: debitError } = await (supabase.rpc as any)('decrement_wallet_balance', {
          p_user_id: user.id,
          p_amount: numAmount,
        });
        if (debitError) throw new Error('Erreur de débit: ' + debitError.message);
      } else if (fundraiser?.payment_link) {
        window.open(fundraiser.payment_link, '_blank');
      }

      const { error } = await (supabase as any).from('fundraiser_contributions').insert({
        fundraiser_id: fundraiserId,
        user_id: user.id,
        contributor_name: anonymous ? 'Anonyme' : name.trim(),
        amount: numAmount,
        message: message.trim() || null,
        is_anonymous: anonymous,
        payment_method: payMethod,
        payment_status: payMethod === 'wallet' ? 'completed' : 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fundraiser', fundraiserId] });
      qc.invalidateQueries({ queryKey: ['fundraiser-contributions', fundraiserId] });
      qc.invalidateQueries({ queryKey: ['wallet-balance'] });
      setAmount('');
      setMessage('');
      toast({ title: "🎉 Merci pour votre contribution!" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement...</div>;
  if (!fundraiser) return <div className="min-h-screen flex items-center justify-center">Cagnotte non trouvée</div>;

  const pct = fundraiser.goal_amount > 0 ? Math.min(100, (fundraiser.current_amount / fundraiser.goal_amount) * 100) : 0;
  const ended = new Date(fundraiser.end_date).getTime() <= Date.now();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/fundraisers')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1 truncate">{fundraiser.title}</h1>
      </div>

      <div className="max-w-2xl mx-auto">
        {fundraiser.image_url && (
          <div className="h-48 sm:h-64">
            <img src={fundraiser.image_url} alt={fundraiser.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-4 space-y-5">
          <h2 className="text-2xl font-bold">{fundraiser.title}</h2>
          {fundraiser.description && <p className="text-sm text-muted-foreground">{fundraiser.description}</p>}

          {/* Countdown */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4">
              <p className="text-xs text-center text-muted-foreground mb-3 flex items-center justify-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Temps restant
              </p>
              <CountdownTimer endDate={fundraiser.end_date} />
            </CardContent>
          </Card>

          {/* Progress */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{fundraiser.current_amount?.toLocaleString()} {fundraiser.currency}</p>
                <p className="text-sm text-muted-foreground">collectés sur {fundraiser.goal_amount?.toLocaleString()} {fundraiser.currency}</p>
              </div>
              <Progress value={pct} className="h-3" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{Math.round(pct)}% atteint</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {fundraiser.contributors_count || 0} contributeurs</span>
              </div>
            </CardContent>
          </Card>

          {/* Contribution Form */}
          {!ended && fundraiser.status === 'active' && (
            <Card className="border-primary/20">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-bold flex items-center gap-2"><Heart className="h-5 w-5 text-primary" /> Faire un don</h3>

                <div className="grid grid-cols-3 gap-2">
                  {presets.map(p => (
                    <Button key={p} variant={amount === String(p) ? 'default' : 'outline'} size="sm" onClick={() => setAmount(String(p))}>
                      {p.toLocaleString()}
                    </Button>
                  ))}
                </div>

                <div>
                  <Label>Montant ({fundraiser.currency})</Label>
                  <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Montant libre" className="text-lg font-bold" />
                </div>
                <div>
                  <Label>Votre nom</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nom affiché" />
                </div>
                <div>
                  <Label>Message (optionnel)</Label>
                  <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Un mot d'encouragement..." rows={2} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={anonymous} onCheckedChange={setAnonymous} />
                  <Label>Don anonyme</Label>
                </div>

                {/* Payment method */}
                <div className="space-y-2">
                  <Label>Mode de paiement</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={payMethod === 'wallet' ? 'default' : 'outline'}
                      className="h-auto py-3 flex flex-col items-center gap-1"
                      onClick={() => setPayMethod('wallet')}
                    >
                      <Wallet className="h-5 w-5" />
                      <span className="text-xs">Portefeuille Moissonneur</span>
                      <span className="text-[10px] text-muted-foreground">{walletData?.balance?.toLocaleString() || 0} FCFA</span>
                    </Button>
                    {fundraiser.payment_link && (
                      <Button
                        variant={payMethod === 'external' ? 'default' : 'outline'}
                        className="h-auto py-3 flex flex-col items-center gap-1"
                        onClick={() => setPayMethod('external')}
                      >
                        <ExternalLink className="h-5 w-5" />
                        <span className="text-xs">Paiement externe</span>
                      </Button>
                    )}
                  </div>
                </div>

                {payMethod === 'wallet' && walletData && amount && walletData.balance < Number(amount) && (
                  <p className="text-xs text-destructive">⚠️ Solde insuffisant. Rechargez votre portefeuille.</p>
                )}

                <Button className="w-full h-12 text-base" onClick={() => contributeMutation.mutate()} disabled={contributeMutation.isPending}>
                  {contributeMutation.isPending ? 'Traitement...' : `Donner ${amount ? Number(amount).toLocaleString() + ' ' + fundraiser.currency : ''}`}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Recent contributions */}
          {contributions && contributions.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold text-sm">Dernières contributions</h3>
              {contributions.map((c: any) => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Heart className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm">{c.is_anonymous ? 'Anonyme' : c.contributor_name}</p>
                      <span className="text-sm font-bold text-primary">{c.amount?.toLocaleString()} FCFA</span>
                    </div>
                    {c.message && <p className="text-xs text-muted-foreground">{c.message}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
