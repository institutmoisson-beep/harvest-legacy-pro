import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ShoppingCart, Store, Package } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function PublicShop() {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [orderData, setOrderData] = useState({
    buyer_name: '',
    buyer_phone: '',
    quantity: 1,
  });

  useEffect(() => {
    if (shopSlug) {
      fetchShopData();
    }
  }, [shopSlug]);

  const fetchShopData = async () => {
    setLoading(true);

    // Fetch shop by slug
    const { data: shopData, error: shopError } = await (supabase.from as any)('shop_settings')
      .select('*')
      .eq('shop_url_slug', shopSlug)
      .eq('active', true)
      .single();

    if (shopError || !shopData) {
      toast({
        title: 'Erreur',
        description: 'Boutique introuvable',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    setShop(shopData);

    // Fetch products
    const { data: productsData } = await (supabase.from as any)('shop_products')
      .select('*')
      .eq('shop_id', shopData.id)
      .eq('is_approved', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    setProducts(productsData || []);
    setLoading(false);
  };

  const handleOrderClick = (product: any) => {
    setSelectedProduct(product);
    setOrderDialogOpen(true);
  };

  const handlePlaceOrder = async () => {
    if (!orderData.buyer_name || !orderData.buyer_phone) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs',
        variant: 'destructive',
      });
      return;
    }

    if (orderData.quantity > selectedProduct.stock) {
      toast({
        title: 'Erreur',
        description: 'Stock insuffisant',
        variant: 'destructive',
      });
      return;
    }

    const totalAmount = selectedProduct.price * orderData.quantity;

    const { error } = await (supabase.from as any)('shop_orders').insert({
      shop_id: shop.id,
      product_id: selectedProduct.id,
      buyer_name: orderData.buyer_name,
      buyer_phone: orderData.buyer_phone,
      quantity: orderData.quantity,
      total_amount: totalAmount,
      order_status: 'pending',
    });

    if (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Succès',
        description: 'Commande créée! Le vendeur vous contactera.',
      });
      setOrderDialogOpen(false);
      setOrderData({ buyer_name: '', buyer_phone: '', quantity: 1 });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Store className="h-12 w-12 mx-auto mb-4 animate-pulse" />
          <p>Chargement de la boutique...</p>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-center text-muted-foreground">Boutique introuvable</p>
            <Button onClick={() => navigate('/')} className="w-full mt-4">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Shop Header */}
      <div className="bg-gradient-to-r from-primary to-secondary py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {shop.banner_url && (
            <img 
              src={shop.banner_url} 
              alt="Bannière" 
              className="w-full h-48 object-cover rounded-lg mb-6"
            />
          )}
          <div className="flex items-center gap-4">
            {shop.logo_url && (
              <img 
                src={shop.logo_url} 
                alt="Logo" 
                className="h-20 w-20 rounded-full border-4 border-white shadow-lg"
              />
            )}
            <div className="text-white">
              <h1 className="text-4xl font-bold">{shop.shop_name}</h1>
              {shop.description && (
                <p className="text-white/90 mt-2">{shop.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto max-w-6xl px-4 py-12">
        {products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Aucun produit disponible pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-6">Produits disponibles</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  {product.image_url && (
                    <img 
                      src={product.image_url} 
                      alt={product.product_name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  )}
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{product.product_name}</CardTitle>
                      <Badge variant={product.product_type === 'digital' ? 'secondary' : 'default'}>
                        {product.product_type === 'digital' ? 'Digital' : 'Physique'}
                      </Badge>
                    </div>
                    {product.description && (
                      <CardDescription>{product.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold gradient-text-primary">
                          {product.price.toLocaleString()} FCFA
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Stock: {product.stock}
                        </span>
                      </div>
                      <Button 
                        onClick={() => handleOrderClick(product)} 
                        className="w-full"
                        disabled={product.stock === 0}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {product.stock === 0 ? 'Rupture de stock' : 'Commander'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Commander {selectedProduct?.product_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Votre nom</Label>
              <Input
                value={orderData.buyer_name}
                onChange={(e) => setOrderData({ ...orderData, buyer_name: e.target.value })}
                placeholder="Nom complet"
              />
            </div>
            <div>
              <Label>Votre téléphone</Label>
              <Input
                value={orderData.buyer_phone}
                onChange={(e) => setOrderData({ ...orderData, buyer_phone: e.target.value })}
                placeholder="+225 XX XX XX XX XX"
              />
            </div>
            <div>
              <Label>Quantité</Label>
              <Input
                type="number"
                min="1"
                max={selectedProduct?.stock || 1}
                value={orderData.quantity}
                onChange={(e) => setOrderData({ ...orderData, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span>Prix unitaire:</span>
                <span className="font-semibold">{selectedProduct?.price.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span className="gradient-text-primary">
                  {((selectedProduct?.price || 0) * orderData.quantity).toLocaleString()} FCFA
                </span>
              </div>
            </div>
            <Button onClick={handlePlaceOrder} className="w-full">
              Confirmer la commande
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
