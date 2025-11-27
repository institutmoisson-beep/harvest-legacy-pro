import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, ShoppingCart, AlertCircle } from 'lucide-react';

export default function ProductPayment() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [buyerData, setBuyerData] = useState({
    buyer_name: '',
    buyer_phone: '',
  });

  useEffect(() => {
    if (productId) {
      fetchProductData();
    }
  }, [productId]);

  const fetchProductData = async () => {
    setLoading(true);
    try {
      const { data: productData, error: productError } = await supabase
        .from('shop_products')
        .select('*')
        .eq('id', parseInt(productId!))
        .single();

      if (productError) throw productError;

      if (!productData || !productData.is_active || !productData.is_approved) {
        toast({ title: 'Erreur', description: 'Produit indisponible', variant: 'destructive' });
        navigate('/');
        return;
      }

      setProduct(productData);

      const { data: shopData, error: shopError } = await supabase
        .from('shop_settings')
        .select('*')
        .eq('id', productData.shop_id)
        .eq('active', true)
        .single();

      if (shopError) throw shopError;
      setShop(shopData);
    } catch (err: any) {
      console.error('Erreur:', err);
      toast({ title: 'Erreur', description: 'Impossible de charger le produit', variant: 'destructive' });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!buyerData.buyer_name.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez entrer votre nom', variant: 'destructive' });
      return false;
    }
    if (!buyerData.buyer_phone.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez entrer votre numéro de téléphone', variant: 'destructive' });
      return false;
    }
    if (product.product_type !== 'digital' && quantity > product.stock) {
      toast({ title: 'Erreur', description: `Stock insuffisant. Disponible: ${product.stock}`, variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handlePaymentRedirect = async () => {
    if (!validateForm() || !product) return;

    setProcessing(true);
    try {
      const totalAmount = product.price * quantity;

      if (product.payment_link) {
        const { data: order, error: orderError } = await supabase
          .from('shop_orders')
          .insert({
            shop_id: product.shop_id,
            product_id: product.id,
            quantity,
            total_amount: totalAmount,
            buyer_name: buyerData.buyer_name,
            buyer_phone: buyerData.buyer_phone,
            order_status: 'pending',
            payment_mode: 'online',
          })
          .select()
          .single();

        if (orderError) throw orderError;

        const orderSummary = `Produit: ${product.product_name}, Quantité: ${quantity}, Total: ${totalAmount} FCFA, Commande #${order.id}`;
        const paymentUrl = `${product.payment_link}${product.payment_link.includes('?') ? '&' : '?'}description=${encodeURIComponent(orderSummary)}&amount=${totalAmount}&order_id=${order.id}`;

        window.location.href = paymentUrl;
      } else {
        const { error: orderError } = await supabase
          .from('shop_orders')
          .insert({
            shop_id: product.shop_id,
            product_id: product.id,
            quantity,
            total_amount: totalAmount,
            buyer_name: buyerData.buyer_name,
            buyer_phone: buyerData.buyer_phone,
            order_status: 'completed',
            payment_mode: 'manual',
          });

        if (orderError) throw orderError;

        toast({ title: 'Succès', description: 'Commande créée! Vous serez contacté pour le paiement.' });

        setTimeout(() => {
          navigate(`/shop/${shop.shop_url_slug}`);
        }, 2000);
      }
    } catch (err: any) {
      console.error('Erreur:', err);
      toast({ title: 'Erreur', description: err.message || 'Impossible de créer la commande', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!product || !shop) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-muted-foreground">Produit indisponible</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalAmount = product.price * quantity;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/shop/${shop.shop_url_slug}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la boutique
        </Button>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="text-center">
                  <h1 className="text-3xl font-bold mb-2">{product.product_name}</h1>
                  <Badge variant="outline" className="text-base px-3 py-1">
                    {product.product_type === 'digital' ? 'Produit numérique' : 'Produit physique'}
                  </Badge>
                </div>

                {product.image_url && (
                  <div className="w-full h-80 bg-muted rounded-lg overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.product_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {product.description && (
                  <div>
                    <h2 className="font-semibold mb-2">Description</h2>
                    <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Résumé de la commande</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prix unitaire</span>
                  <span className="font-semibold">{product.price.toLocaleString()} FCFA</span>
                </div>

                <div>
                  <Label className="mb-2 block">Quantité</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={product.product_type === 'digital'}
                    >
                      −
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      max={product.product_type === 'digital' ? 1 : product.stock}
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        if (product.product_type === 'digital') {
                          setQuantity(1);
                        } else {
                          setQuantity(Math.min(product.stock || 1, Math.max(1, val)));
                        }
                      }}
                      className="text-center"
                      disabled={product.product_type === 'digital'}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(Math.min(product.stock || 1, quantity + 1))}
                      disabled={product.product_type === 'digital' || quantity >= product.stock}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary">
                      {totalAmount.toLocaleString()} FCFA
                    </span>
                  </div>

                  {product.product_type !== 'digital' && product.stock && (
                    <p className="text-xs text-muted-foreground mb-4">
                      Stock disponible: {product.stock}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="buyer-name">Votre nom</Label>
                    <Input
                      id="buyer-name"
                      placeholder="Jean Dupont"
                      value={buyerData.buyer_name}
                      onChange={(e) => setBuyerData({ ...buyerData, buyer_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="buyer-phone">Numéro de téléphone</Label>
                    <Input
                      id="buyer-phone"
                      placeholder="+223 XX XX XX XX"
                      value={buyerData.buyer_phone}
                      onChange={(e) => setBuyerData({ ...buyerData, buyer_phone: e.target.value })}
                    />
                  </div>
                </div>

                <Button
                  onClick={handlePaymentRedirect}
                  disabled={processing || !product}
                  className="w-full"
                  size="lg"
                >
                  {processing ? 'Traitement...' : product.payment_link ? 'Procéder au paiement' : 'Passer la commande'}
                </Button>

                {product.payment_link && (
                  <p className="text-xs text-muted-foreground text-center">
                    Vous serez redirigé vers la page de paiement
                  </p>
                )}
              </CardContent>
            </Card>

            {shop && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm font-semibold mb-1">Vendeur</p>
                  <p className="text-sm text-muted-foreground">{shop.shop_name}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
