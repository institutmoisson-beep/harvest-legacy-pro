import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Store, Plus, ExternalLink, Copy, CheckCircle, Package, ShoppingBag } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function ShopsDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createShopOpen, setCreateShopOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [shopData, setShopData] = useState({
    shop_name: '',
    shop_url_slug: '',
    description: '',
  });

  useEffect(() => {
    if (user) {
      fetchShopData();
    }
  }, [user]);

  const fetchShopData = async () => {
    setLoading(true);
    
    const { data: shopData, error } = await supabase
      .from('shop_settings')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching shop:', error);
    }

    setShop(shopData);

    if (shopData) {
      await Promise.all([fetchProducts(String(shopData.id)), fetchOrders(String(shopData.id))]);
    }

    setLoading(false);
  };

  const fetchProducts = async (shopId: string) => {
    const { data } = await (supabase.from as any)('shop_products')
      .select('*')
      .eq('shop_id', parseInt(shopId))
      .order('created_at', { ascending: false });

    setProducts(data || []);
  };

  const fetchOrders = async (shopId: string) => {
    const { data } = await (supabase.from as any)('shop_orders')
      .select('*')
      .eq('shop_id', parseInt(shopId))
      .order('created_at', { ascending: false });

    setOrders(data || []);
  };

  const createShop = async () => {
    if (!shopData.shop_name || !shopData.shop_url_slug) {
      toast({ title: 'Erreur', description: 'Nom et URL requis', variant: 'destructive' });
      return;
    }

    const slug = shopData.shop_url_slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const { data, error } = await supabase
      .from('shop_settings')
      .insert({
        user_id: user?.id,
        shop_name: shopData.shop_name,
        shop_url_slug: slug,
        description: shopData.description,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Boutique créée avec succès!' });
      setShop(data);
      setCreateShopOpen(false);
      setShopData({ shop_name: '', shop_url_slug: '', description: '' });
    }
  };

  const copyShopUrl = () => {
    const url = `${window.location.origin}/shop/${shop.shop_url_slug}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    toast({ title: 'Copié!', description: 'Lien de la boutique copié' });
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 md:p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold">Ma Boutique</h1>
          </div>

          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-6 h-6" />
                Créer Ma Boutique
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="shop_name">Nom de la Boutique *</Label>
                <Input
                  id="shop_name"
                  value={shopData.shop_name}
                  onChange={(e) => setShopData({ ...shopData, shop_name: e.target.value })}
                  placeholder="Ma Super Boutique"
                />
              </div>
              <div>
                <Label htmlFor="shop_url_slug">URL de la Boutique *</Label>
                <Input
                  id="shop_url_slug"
                  value={shopData.shop_url_slug}
                  onChange={(e) => setShopData({ ...shopData, shop_url_slug: e.target.value })}
                  placeholder="ma-boutique"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Votre boutique sera accessible à: /shop/{shopData.shop_url_slug || 'votre-url'}
                </p>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={shopData.description}
                  onChange={(e) => setShopData({ ...shopData, description: e.target.value })}
                  placeholder="Décrivez votre boutique..."
                  rows={4}
                />
              </div>
              <Button onClick={createShop} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Créer Ma Boutique
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const shopUrl = `${window.location.origin}/shop/${shop.shop_url_slug}`;
  const pendingOrders = orders.filter(o => o.order_status === 'pending').length;
  const activeProducts = products.filter(p => p.is_active && p.is_approved).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold">{shop.shop_name}</h1>
          <Badge variant={shop.is_active ? 'default' : 'secondary'}>
            {shop.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Produits Actifs</CardTitle>
              <Package className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeProducts}</div>
              <p className="text-xs text-muted-foreground">sur {products.length} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Commandes en Attente</CardTitle>
              <ShoppingBag className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingOrders}</div>
              <p className="text-xs text-muted-foreground">à traiter</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Lien de la Boutique</CardTitle>
              <Store className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyShopUrl}
                  className="flex-1"
                >
                  {copiedUrl ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Copié!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copier
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                >
                  <a href={shopUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Actions Rapides</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button onClick={() => navigate('/my-shop')}>
                <Package className="w-4 h-4 mr-2" />
                Gérer les Produits
              </Button>
              <Button variant="outline" onClick={() => navigate('/my-shop')}>
                <ShoppingBag className="w-4 h-4 mr-2" />
                Voir les Commandes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
