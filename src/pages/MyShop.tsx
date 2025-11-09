import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Store, Package, ShoppingBag, QrCode, Copy, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function MyShop() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createShopOpen, setCreateShopOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);

  const [shopData, setShopData] = useState({
    shop_name: '',
    shop_url_slug: '',
    description: '',
  });

  const [productData, setProductData] = useState({
    product_name: '',
    description: '',
    price: '',
    stock: '',
    product_type: 'physical',
  });

  useEffect(() => {
    if (user) {
      fetchShopData();
    }
  }, [user]);

  const fetchShopData = async () => {
    setLoading(true);
    const { data: shopData } = await (supabase.from as any)('shop_settings')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    setShop(shopData);

    if (shopData) {
      await Promise.all([fetchProducts(shopData.id), fetchOrders(shopData.id)]);
    }

    setLoading(false);
  };

  const fetchProducts = async (shopId: string) => {
    const { data } = await (supabase.from as any)('shop_products')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    setProducts(data || []);
  };

  const fetchOrders = async (shopId: string) => {
    const { data } = await (supabase.from as any)('shop_orders')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    setOrders(data || []);
  };

  const createShop = async () => {
    if (!shopData.shop_name || !shopData.shop_url_slug) {
      toast({ title: 'Erreur', description: 'Nom et URL requis', variant: 'destructive' });
      return;
    }

    const { data, error } = await (supabase.from as any)('shop_settings').insert({
      user_id: user?.id,
      shop_name: shopData.shop_name,
      shop_url_slug: shopData.shop_url_slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      description: shopData.description,
    }).select().single();

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Boutique créée!' });
      setShop(data);
      setCreateShopOpen(false);
    }
  };

  const addProduct = async () => {
    if (!productData.product_name || !productData.price || !productData.stock) {
      toast({ title: 'Erreur', description: 'Tous les champs requis', variant: 'destructive' });
      return;
    }

    const { error } = await (supabase.from as any)('shop_products').insert({
      shop_id: shop.id,
      product_name: productData.product_name,
      description: productData.description,
      price: parseFloat(productData.price),
      stock: parseInt(productData.stock),
      product_type: productData.product_type,
    });

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Produit ajouté!' });
      setAddProductOpen(false);
      setProductData({ product_name: '', description: '', price: '', stock: '', product_type: 'physical' });
      fetchProducts(shop.id);
    }
  };

  const copyShopUrl = () => {
    const url = `${window.location.origin}/shop/${shop.shop_url_slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Copié!', description: 'Lien de la boutique copié' });
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await (supabase.from as any)('shop_orders')
      .update({ order_status: status })
      .eq('id', orderId);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Statut mis à jour' });
      fetchOrders(shop.id);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  }

  if (!shop) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Button onClick={() => navigate('/dashboard')} variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-6 w-6" />
              Créer votre boutique
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nom de la boutique</Label>
              <Input
                value={shopData.shop_name}
                onChange={(e) => setShopData({ ...shopData, shop_name: e.target.value })}
                placeholder="Ma Super Boutique"
              />
            </div>
            <div>
              <Label>URL de la boutique</Label>
              <Input
                value={shopData.shop_url_slug}
                onChange={(e) => setShopData({ ...shopData, shop_url_slug: e.target.value })}
                placeholder="ma-boutique"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Votre boutique sera accessible via: /shop/ma-boutique
              </p>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={shopData.description}
                onChange={(e) => setShopData({ ...shopData, description: e.target.value })}
                placeholder="Décrivez votre boutique..."
              />
            </div>
            <Button onClick={createShop} className="w-full">
              <Store className="h-4 w-4 mr-2" />
              Créer ma boutique
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const shopUrl = `${window.location.origin}/shop/${shop.shop_url_slug}`;

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Button onClick={() => navigate('/dashboard')} variant="ghost" className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour
      </Button>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold gradient-text-primary">{shop.shop_name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyShopUrl}>
            <Copy className="h-4 w-4 mr-2" />
            Copier le lien
          </Button>
          <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un produit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un produit</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nom du produit</Label>
                  <Input
                    value={productData.product_name}
                    onChange={(e) => setProductData({ ...productData, product_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={productData.description}
                    onChange={(e) => setProductData({ ...productData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Prix (FCFA)</Label>
                  <Input
                    type="number"
                    value={productData.price}
                    onChange={(e) => setProductData({ ...productData, price: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    value={productData.stock}
                    onChange={(e) => setProductData({ ...productData, stock: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Type de produit</Label>
                  <Select value={productData.product_type} onValueChange={(v) => setProductData({ ...productData, product_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physical">Produit physique</SelectItem>
                      <SelectItem value="digital">Produit digital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addProduct} className="w-full">Ajouter</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Lien de partage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={shopUrl} readOnly />
            <Button onClick={copyShopUrl}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 flex justify-center">
            <div className="p-4 bg-white rounded">
              <QrCode className="h-32 w-32 text-black" />
              <p className="text-center text-xs mt-2">QR Code (à implémenter)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Produits ({products.length})</TabsTrigger>
          <TabsTrigger value="orders">Commandes ({orders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(product => (
              <Card key={product.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{product.product_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                  <div className="space-y-1">
                    <p className="font-bold text-lg">{product.price.toLocaleString()} FCFA</p>
                    <p className="text-sm">Stock: {product.stock}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.product_type === 'physical' ? 'Produit physique' : 'Produit digital'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-1 rounded ${product.is_approved ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}>
                        {product.is_approved ? 'Approuvé' : 'En attente'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${product.is_active ? 'bg-blue-500/10 text-blue-600' : 'bg-gray-500/10 text-gray-600'}`}>
                        {product.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <div className="space-y-3">
            {orders.map(order => (
              <Card key={order.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">{order.buyer_name}</p>
                      <p className="text-sm text-muted-foreground">{order.buyer_phone}</p>
                      <p className="text-sm">Quantité: {order.quantity}</p>
                      <p className="font-bold text-lg">{order.total_amount.toLocaleString()} FCFA</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <span className={`text-xs px-2 py-1 rounded block ${
                        order.order_status === 'confirmed' ? 'bg-green-500/10 text-green-600' :
                        order.order_status === 'cancelled' ? 'bg-red-500/10 text-red-600' :
                        'bg-yellow-500/10 text-yellow-600'
                      }`}>
                        {order.order_status}
                      </span>
                      {order.order_status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => updateOrderStatus(order.id, 'confirmed')}>
                            Confirmer
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => updateOrderStatus(order.id, 'cancelled')}>
                            Annuler
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
