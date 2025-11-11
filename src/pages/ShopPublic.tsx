import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ShopPublic() {
  const { slug } = useParams();
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(()=>{
    const load = async () => {
      const { data: s } = await supabase.from('shops').select('*').eq('slug', slug).maybeSingle();
      setShop(s || null);
      if (s) {
        const { data: p } = await supabase.from('shop_products').select('*').eq('shop_id', s.id).eq('is_active', true);
        setProducts(p || []);
      }
    };
    load();
  }, [slug]);

  if (!shop) return <div className="min-h-screen bg-background"><div className="container mx-auto px-4 py-20"><div>Boutique introuvable.</div></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-3xl font-bold mb-6">{shop.name}</h1>
        <div className="grid md:grid-cols-3 gap-6">
          {products.map(p => (
            <Card key={p.id} className="glass-card">
              <CardHeader><CardTitle>{p.name}</CardTitle></CardHeader>
              <CardContent>
                <div className="text-sm mb-2">{p.description}</div>
                <div className="font-bold">{p.price} MSN</div>
              </CardContent>
            </Card>
          ))}
          {products.length===0 && <div className="text-sm text-muted-foreground">Aucun produit.</div>}
        </div>
      </div>
    </div>
  );
}
