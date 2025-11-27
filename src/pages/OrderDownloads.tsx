import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Download, Package, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function OrderDownloads() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderData();
    }
  }, [orderId]);

  const fetchOrderData = async () => {
    setLoading(true);
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('shop_orders')
        .select('*')
        .eq('id', parseInt(orderId!))
        .single();

      if (orderError) throw orderError;

      if (!orderData) {
        toast({ title: 'Erreur', description: 'Commande non trouvée', variant: 'destructive' });
        navigate('/');
        return;
      }

      setOrder(orderData);

      const { data: productData, error: productError } = await supabase
        .from('shop_products')
        .select('*')
        .eq('id', orderData.product_id)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      const { data: shopData, error: shopError } = await supabase
        .from('shop_settings')
        .select('*')
        .eq('id', orderData.shop_id)
        .single();

      if (shopError) throw shopError;
      setShop(shopData);
    } catch (err: any) {
      console.error('Erreur:', err);
      toast({ title: 'Erreur', description: 'Impossible de charger la commande', variant: 'destructive' });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!product?.file_url) {
      toast({ title: 'Erreur', description: 'Fichier non disponible', variant: 'destructive' });
      return;
    }

    try {
      setDownloading(true);

      await supabase
        .from('product_downloads')
        .insert({
          order_id: order.id,
          product_id: product.id,
          download_url: product.file_url,
          download_count: 1,
        })
        .then(() => {
          const link = document.createElement('a');
          link.href = product.file_url;
          link.download = `${product.product_name}-${Date.now()}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          toast({
            title: 'Succès',
            description: 'Votre fichier a été téléchargé avec succès',
          });
        });
    } catch (err: any) {
      console.error('Erreur:', err);
      toast({ title: 'Erreur', description: 'Erreur lors du téléchargement', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!order || !product || !shop) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-muted-foreground">Commande non trouvée</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCompleted = order.order_status === 'completed';
  const isDigital = product.product_type === 'digital';

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">Commande #{order.id}</CardTitle>
                <CardDescription>
                  Passée le {new Date(order.created_at).toLocaleString('fr-FR')}
                </CardDescription>
              </div>
              <Badge variant={isCompleted ? 'default' : 'secondary'}>
                {isCompleted ? 'Payée' : order.order_status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                {isCompleted && isDigital ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Fichier disponible au téléchargement
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    En attente de paiement
                  </>
                )}
              </h3>

              {!isCompleted && (
                <p className="text-sm text-muted-foreground">
                  Votre paiement est en cours de traitement. Le fichier sera disponible une fois le paiement confirmé.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Détails du produit</h3>
              <div className="border rounded-lg p-4 space-y-3">
                {product.image_url && (
                  <div className="w-full h-48 bg-muted rounded-lg overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.product_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Produit</p>
                  <p className="font-semibold text-lg">{product.product_name}</p>
                </div>

                {product.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm">{product.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Quantité</p>
                    <p className="font-semibold">{order.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="font-semibold">{order.total_amount.toLocaleString()} FCFA</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Informations client</h3>
              <div className="border rounded-lg p-4 space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Nom</p>
                  <p>{order.buyer_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Téléphone</p>
                  <p>{order.buyer_phone}</p>
                </div>
              </div>
            </div>

            {isCompleted && isDigital && product.file_url && (
              <Button
                onClick={handleDownload}
                disabled={downloading}
                size="lg"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {downloading ? 'Téléchargement en cours...' : 'Télécharger le fichier'}
              </Button>
            )}

            {!isCompleted && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Veuillez compléter votre paiement pour accéder à vos fichiers téléchargeables.
                </p>
              </div>
            )}

            {shop && (
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Vendeur</p>
                <p className="font-semibold">{shop.shop_name}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
