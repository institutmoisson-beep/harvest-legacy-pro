import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShoppingCart, Store, Package, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const themeClasses = {
  'gradient-purple': 'bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-900',
  'gradient-blue': 'bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-900',
  'gradient-green': 'bg-gradient-to-br from-green-900 via-emerald-700 to-teal-900',
  'gradient-orange': 'bg-gradient-to-br from-orange-900 via-orange-700 to-red-900',
  'gradient-pink': 'bg-gradient-to-br from-pink-900 via-rose-700 to-purple-900',
  'solid-dark': 'bg-gray-950',
  'solid-light': 'bg-gray-50',
  'pattern-dots': 'bg-gray-900',
  'pattern-grid': 'bg-gray-900',
};

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

    const { data: shopData, error: shopError } = await supabase
      .from('shop_settings')
      .select('*')
      .eq('shop_url_slug', shopSlug)
      .eq('active', true)
      .maybeSingle();

    if (shopError || !shopData) {
      toast({
        title: 'Erreur',
        description: 'Boutique introuvable',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    setShop(shopData);

    const { data: productsData } = await supabase
      .from('shop_products')
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

    const { error } = await supabase.from('shop_orders').insert({
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Store className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-foreground">Chargement de la boutique...</p>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Boutique introuvable</h2>
            <p className="text-muted-foreground mb-6">
              Cette boutique n'existe pas ou n'est plus active.
            </p>
            <Button onClick={() => navigate('/')}>
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const theme = shop.background_theme || 'gradient-purple';
  const themeClass = themeClasses[theme as keyof typeof themeClasses];
  const isDarkTheme = !theme.includes('light');

  return (
    <div className={`min-h-screen ${themeClass} relative overflow-hidden`}>
      {/* Pattern Overlays */}
      {theme === 'pattern-dots' && (
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }} />
      )}
      {theme === 'pattern-grid' && (
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      )}

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-sm bg-black/20">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-4">
              <Store className={`h-8 w-8 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`} />
              <div>
                <h1 className={`text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                  {shop.shop_name}
                </h1>
                {shop.description && (
                  <p className={`text-sm ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                    {shop.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Products Grid */}
        <div className="container mx-auto px-4 py-8">
          {products.length === 0 ? (
            <Card className="max-w-md mx-auto bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="py-12 text-center">
                <Package className={`h-12 w-12 mx-auto mb-4 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`} />
                <p className={isDarkTheme ? 'text-gray-300' : 'text-gray-600'}>
                  Aucun produit disponible pour le moment
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card 
                  key={product.id} 
                  className="overflow-hidden bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className={isDarkTheme ? 'text-white' : 'text-gray-900'}>
                          {product.product_name}
                        </CardTitle>
                        <CardDescription className={isDarkTheme ? 'text-gray-300' : 'text-gray-600'}>
                          {product.description}
                        </CardDescription>
                      </div>
                      <Badge variant={product.stock > 0 ? 'default' : 'destructive'}>
                        {product.stock > 0 ? `Stock: ${product.stock}` : 'Rupture'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={`text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                        {product.price.toLocaleString()} FCFA
                      </span>
                      <Badge variant="outline" className="border-white/30">
                        {product.product_type === 'physical' && 'Physique'}
                        {product.product_type === 'digital' && 'Numérique'}
                        {product.product_type === 'service' && 'Service'}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleOrderClick(product)}
                        disabled={product.stock === 0}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Commander
                      </Button>
                      {product.payment_link && (
                        <Button
                          variant="outline"
                          onClick={() => window.open(product.payment_link, '_blank')}
                          className="border-white/30"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passer une commande</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold">{selectedProduct.product_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedProduct.price.toLocaleString()} FCFA
                </p>
              </div>

              <div>
                <Label>Votre nom</Label>
                <Input
                  value={orderData.buyer_name}
                  onChange={(e) => setOrderData({ ...orderData, buyer_name: e.target.value })}
                  placeholder="Jean Dupont"
                />
              </div>

              <div>
                <Label>Numéro de téléphone</Label>
                <Input
                  value={orderData.buyer_phone}
                  onChange={(e) => setOrderData({ ...orderData, buyer_phone: e.target.value })}
                  placeholder="+242 06 123 4567"
                />
              </div>

              <div>
                <Label>Quantité</Label>
                <Input
                  type="number"
                  min="1"
                  max={selectedProduct.stock}
                  value={orderData.quantity}
                  onChange={(e) => setOrderData({ ...orderData, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold">Total:</span>
                  <span className="text-2xl font-bold">
                    {(selectedProduct.price * orderData.quantity).toLocaleString()} FCFA
                  </span>
                </div>
                <Button onClick={handlePlaceOrder} className="w-full">
                  Confirmer la commande
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
