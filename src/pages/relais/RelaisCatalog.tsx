import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, ShoppingBag, Utensils, Wine, Hotel, Ticket } from 'lucide-react';
import { formatFCFA } from '@/lib/currency';

const TYPES = [
  { key: 'alimentation', label: 'Alimentation', icon: ShoppingBag },
  { key: 'restaurant', label: 'Restaurant', icon: Utensils },
  { key: 'cave', label: 'Cave', icon: Wine },
  { key: 'hotel', label: 'Hôtel', icon: Hotel },
] as const;

export default function RelaisCatalog() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [partners, setPartners] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Points Relais — Moissonneur';
    (async () => {
      const sb: any = supabase;
      const [{ data: prods }, { data: parts }] = await Promise.all([
        sb.from('relay_products').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        sb.from('relay_partners').select('*').eq('is_active', true),
      ]);
      setProducts(prods || []);
      const map: Record<string, any> = {};
      (parts || []).forEach((p: any) => (map[p.id] = p));
      setPartners(map);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/relais/mes-tickets')}>
            <Ticket className="h-4 w-4 mr-2" /> Mes tickets
          </Button>
        </div>

        <h1 className="text-2xl font-bold text-foreground">Points Relais Partenaires</h1>
        <p className="text-sm text-muted-foreground">
          Achetez ou réservez chez nos partenaires. Payez avec votre portefeuille, retirez avec votre QR code.
        </p>

        <Tabs defaultValue="alimentation" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            {TYPES.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="text-xs">
                <t.icon className="h-3 w-3 mr-1" /> {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TYPES.map((t) => {
            const list = products.filter((p) => partners[p.partner_id]?.partner_type === t.key);
            return (
              <TabsContent key={t.key} value={t.key} className="mt-4">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Chargement…</p>
                ) : list.length === 0 ? (
                  <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
                    Aucun produit disponible pour le moment.
                  </CardContent></Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {list.map((p) => (
                      <Card key={p.id} className="overflow-hidden cursor-pointer hover:border-primary/50 transition"
                            onClick={() => navigate(`/relais/produit/${p.id}`)}>
                        {p.photo_url && (
                          <img src={p.photo_url} alt={p.name} className="w-full h-36 object-cover" loading="lazy" />
                        )}
                        <CardContent className="p-3 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-sm text-foreground line-clamp-1">{p.name}</h3>
                            <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{p.description || '—'}</p>
                          <p className="text-xs text-muted-foreground">
                            {partners[p.partner_id]?.name || '—'}
                          </p>
                          <p className="font-bold text-primary">{formatFCFA(Number(p.price_fcfa))}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}
