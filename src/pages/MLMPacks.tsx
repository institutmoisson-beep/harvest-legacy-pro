import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Package, ShoppingCart, TrendingUp } from 'lucide-react';
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

export default function MLMPacks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Packs Moissonneur — Investir & Gagner';
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('mlm_packs')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    setPacks((data as Pack[]) || []);
    setLoading(false);
  };

  const buy = async (pack: Pack) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setBuyingId(pack.id);
    const { data, error } = await (supabase as any).rpc('purchase_mlm_pack', { p_pack_id: pack.id });
    setBuyingId(null);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.success) {
      toast({ title: 'Achat impossible', description: result?.message || 'Erreur', variant: 'destructive' });
      if (result?.message?.toLowerCase().includes('solde')) {
        setTimeout(() => navigate('/dashboard'), 1500);
      }
      return;
    }
    toast({ title: '✅ Pack acheté', description: `Le pack ${pack.name} est désormais activé.` });
    showBrowserNotification('Pack acheté', `${pack.name} — ${pack.price} FCFA`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 text-center space-y-3">
          <h1 className="text-4xl font-bold gradient-text-cosmic">Packs Moissonneur</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Achetez un pack avec votre portefeuille Moissonneur. Votre parrain et toute votre chaîne ascendante
            reçoivent automatiquement une commission sur le bénéfice du pack.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : packs.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            Aucun pack disponible pour le moment.
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packs.map((p) => {
              const level1 = (p.benefit_amount * p.base_commission_percentage) / 100;
              return (
                <Card
                  key={p.id}
                  className="overflow-hidden glass-card hover:glow-primary transition-all cursor-pointer"
                  onClick={() => navigate(`/packs/${p.id}`)}
                >
                  {p.images?.[0] && (
                    <img src={p.images[0]} alt={p.name} loading="lazy"
                         className="w-full h-48 object-cover" />
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-xl">{p.name}</CardTitle>
                      <Badge variant="secondary">{p.price.toLocaleString()} FCFA</Badge>
                    </div>
                    {p.partner_name && (
                      <div className="flex items-center gap-2 mt-2">
                        {p.partner_logo_url && (
                          <img src={p.partner_logo_url} alt={p.partner_name} className="h-6 w-6 rounded object-cover" />
                        )}
                        <span className="text-xs text-muted-foreground">Par {p.partner_name}</span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {p.description && <p className="text-sm text-muted-foreground line-clamp-3">{p.description}</p>}
                    <div className="rounded-lg bg-primary/5 p-3 space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-primary font-semibold">
                        <TrendingUp className="w-4 h-4" />
                        Bénéfice : {p.benefit_amount.toLocaleString()} FCFA
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Commission niveau 1 : <span className="font-semibold text-foreground">{level1.toLocaleString()} FCFA</span> ({p.base_commission_percentage}%)
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Décroissance : {((1 - p.decay_rate) * 100).toFixed(0)}% par niveau · jusqu'au niveau {p.max_levels}
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={(e) => { e.stopPropagation(); buy(p); }}
                      disabled={buyingId === p.id}
                    >
                      {buyingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
                      Acheter avec mon portefeuille
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
