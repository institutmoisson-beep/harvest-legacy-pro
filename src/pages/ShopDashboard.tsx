import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export default function ShopDashboard() {
  const { user } = useAuth();
  const [shop, setShop] = useState<any>(null);
  const [form, setForm] = useState({ name:'', slug:'', description:'' });
  const [products, setProducts] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data: s } = await supabase.from('shops').select('*').eq('user_id', user.id).maybeSingle();
    setShop(s || null);
    if (s) {
      const { data: p } = await supabase.from('shop_products').select('*').eq('shop_id', s.id).order('created_at',{ascending:false});
      setProducts(p || []);
    }
  };
  useEffect(()=>{ load(); }, [user]);

  const createShop = async () => {
    if (!user) return;
    if (!form.name || !form.slug) { toast({ title:'Champs requis', variant:'destructive' }); return; }
    const { error } = await supabase.from('shops').insert({ user_id: user.id, name: form.name, slug: form.slug, description: form.description });
    if (error) { toast({ title:'Erreur', description:error.message, variant:'destructive' }); return; }
    toast({ title:'Boutique créée' });
    setForm({ name:'', slug:'', description:'' });
    await load();
  };

  const addProduct = async () => {
    if (!shop) return;
    const name = prompt('Nom du produit ?');
    const priceStr = prompt('Prix ?');
    if (!name || !priceStr) return;
    const price = Number(priceStr);
    const { error } = await supabase.from('shop_products').insert({ shop_id: shop.id, name, price, stock: 0, type: 'physical' });
    if (error) { toast({ title:'Erreur', description:error.message, variant:'destructive' }); return; }
    await load();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-3xl font-bold mb-6">Ma Boutique</h1>
        {!shop ? (
          <Card className="glass-card max-w-lg">
            <CardHeader><CardTitle>Créer ma boutique</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Nom</Label><Input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} /></div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={(e)=>setForm({...form,slug:e.target.value})} placeholder="MSN123456" /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} /></div>
              <Button onClick={createShop}>Créer</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
              <CardContent>
                <div className="text-sm">Nom: {shop.name}</div>
                <div className="text-sm">URL: {window.location.origin}/shop/{shop.slug}</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="flex items-center justify-between"><CardTitle>Produits</CardTitle><Button onClick={addProduct}>Ajouter</Button></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {products.map(p => (<div key={p.id} className="p-2 border rounded flex justify-between"><span>{p.name}</span><span>{p.price} MSN</span></div>))}
                  {products.length===0 && <div className="text-sm text-muted-foreground">Aucun produit.</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
