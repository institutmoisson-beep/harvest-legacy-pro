import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ShoppingCart, TrendingUp, Package, Wallet } from 'lucide-react';
import { showBrowserNotification } from '@/utils/pushNotifications';

interface Pack {
  id: string;
  name: string;
  description: string | null;
  price: number;
  benefit_amount: number;
  images: string[] | null;
  partner_name: string | null;
  partner_logo_url: string | null;
  partner_image_url: string | null;
  base_commission_percentage: number;
  decay_rate: number;
  max_levels: number;
}

export default function MLMPackDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    document.title = pack ? `${pack.name} — Pack Moissonneur` : 'Pack Moissonneur';
  }, [pack]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any).from('mlm_packs').select('*').eq('id', id).maybeSingle();
      setPack(data as Pack);
      if (user) {
        const { data: w } = await supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
        setBalance(Number(w?.balance ?? 0));
      }
      setLoading(false);
    })();
  }, [id, user]);

  const buy = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!pack) return;
    setBuying(true);
    const { data, error } = await (supabase as any).rpc('purchase_mlm_pack', { p_pack_id: pack.id });
    setBuying(false);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    const r = Array.isArray(data) ? data[0] : data;
    if (!r?.success) {
      toast({ title: 'Achat impossible', description: r?.message || 'Erreur', variant: 'destructive' });
      if (r?.message?.toLowerCase().includes('solde')) setTimeout(() => navigate('/dashboard'), 1500);
      return;
    }
    toast({ title: '✅ Pack acheté', description: `${pack.name} activé.` });
    showBrowserNotification('Pack acheté', `${pack.name} — ${pack.price} FCFA`);
    setTimeout(() => navigate('/packs'), 1200);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!pack) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <Package className="w-12 h-12 text-muted-foreground" />
      <p className="text-muted-foreground">Pack introuvable.</p>
      <Button onClick={() => navigate('/packs')}><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button>
    </div>
  );

  const lvl = (n: number) => (pack.benefit_amount * pack.base_commission_percentage * Math.pow(pack.decay_rate, n - 1)) / 100;
  const insufficient = balance !== null && balance < pack.price;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-6 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <Button variant="ghost" onClick={() => navigate('/packs')}><ArrowLeft className="w-4 h-4 mr-2" />Tous les packs</Button>

        <Card className="overflow-hidden">
          {pack.images && pack.images.length > 0 && (
            <div>
              <img src={pack.images[activeImg]} alt={pack.name} className="w-full h-64 md:h-96 object-cover" />
              {pack.images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {pack.images.map((u, i) => (
                    <button key={i} onClick={() => setActiveImg(i)}
                      className={`flex-shrink-0 rounded border-2 ${i === activeImg ? 'border-primary' : 'border-transparent'}`}>
                      <img src={u} className="w-16 h-16 object-cover rounded" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{pack.name}</h1>
                {pack.partner_name && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    {pack.partner_logo_url && <img src={pack.partner_logo_url} className="w-6 h-6 rounded object-cover" />}
                    Par {pack.partner_name}
                  </div>
                )}
              </div>
              <Badge className="text-base px-3 py-1">{pack.price.toLocaleString()} FCFA</Badge>
            </div>

            {pack.description && <p className="text-muted-foreground whitespace-pre-line">{pack.description}</p>}

            {pack.partner_image_url && (
              <img src={pack.partner_image_url} alt={pack.partner_name || ''} className="w-full max-h-64 object-cover rounded-lg" />
            )}

            <div className="rounded-lg bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <TrendingUp className="w-5 h-5" /> Bénéfice du pack : {pack.benefit_amount.toLocaleString()} FCFA
              </div>
              <div className="text-sm">Commission niveau 1 : <strong>{lvl(1).toLocaleString()} FCFA</strong> ({pack.base_commission_percentage}%)</div>
              <div className="text-sm">Décroissance : {((1 - pack.decay_rate) * 100).toFixed(0)}% par niveau · jusqu'au niveau {pack.max_levels}</div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
                {[1, 2, 3, 4, 5].map(n => (
                  <div key={n} className="rounded bg-background p-2 text-center text-xs">
                    <div className="text-muted-foreground">N{n}</div>
                    <div className="font-semibold">{Math.round(lvl(n)).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {user && balance !== null && (
              <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span className="flex items-center gap-2"><Wallet className="w-4 h-4" /> Solde portefeuille</span>
                <span className={`font-semibold ${insufficient ? 'text-destructive' : 'text-primary'}`}>
                  {balance.toLocaleString()} FCFA
                </span>
              </div>
            )}

            <Button className="w-full" size="lg" onClick={buy} disabled={buying}>
              {buying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
              {insufficient ? 'Recharger & Acheter' : 'Acheter avec mon portefeuille'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
