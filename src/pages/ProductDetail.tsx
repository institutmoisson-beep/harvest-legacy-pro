import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { MapPin, Heart, MessageCircle, Loader2, AlertCircle, ArrowLeft, Share2, Wallet, ShoppingCart, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

interface ProductListing {
  id: string;
  product_name: string;
  brand: string;
  quantity: number;
  price: number;
  location: string;
  user_id: string;
  status: string;
  created_at: string;
  product_images: ProductImage[];
}

export default function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductListing | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (productId) fetchProduct();
  }, [productId]);

  useEffect(() => {
    if (user) fetchWallet();
  }, [user]);

  const fetchWallet = async () => {
    if (!user) return;
    const { data } = await supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
    setWalletBalance(Number(data?.balance) || 0);
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_listings')
        .select(`id, product_name, brand, quantity, price, location, user_id, status, created_at, product_images (id, image_url, is_primary, display_order)`)
        .eq('id', productId)
        .single();

      if (error || !data) {
        toast({ title: 'Erreur', description: 'Produit introuvable', variant: 'destructive' });
        navigate('/marketplace');
        return;
      }
      setProduct(data);

      const { data: profile } = await supabase.from('profiles').select('id, full_name, referral_code').eq('id', data.user_id).single();
      if (profile) setUserProfile(profile);
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleWalletPayment = async () => {
    if (!user || !product) return;
    setProcessing(true);
    try {
      const totalAmount = product.price * quantity;
      if (walletBalance < totalAmount) {
        toast({ title: 'Solde insuffisant', description: `Il vous faut ${totalAmount.toLocaleString()} FCFA. Rechargez votre portefeuille.`, variant: 'destructive' });
        return;
      }

      const totalMSN = totalAmount / 750;

      // Debit wallet
      const { error: debitError } = await supabase.rpc('decrement_wallet_balance', { p_user_id: user.id, p_amount: totalMSN });
      if (debitError) throw debitError;

      // Record transaction
      await (supabase as any).from('wallet_transactions').insert({
        from_user_id: user.id,
        to_user_id: product.user_id,
        amount: totalMSN,
        transaction_type: 'withdrawal',
        description: `Achat Marketplace: ${product.product_name} x${quantity} - ${totalAmount.toLocaleString()} FCFA`,
        status: 'completed',
      });

      // Create notification for seller
      await (supabase as any).from('notifications').insert({
        user_id: product.user_id,
        title: '🛒 Nouvelle vente!',
        message: `${product.product_name} x${quantity} acheté pour ${totalAmount.toLocaleString()} FCFA`,
        type: 'general',
      });

      toast({ title: '✅ Achat réussi!', description: `${totalMSN.toFixed(2)} MSN débités. Le vendeur a été notifié.` });
      await fetchWallet();

      // Auto-open chat with seller
      navigate(`/messages?user=${product.user_id}`);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Erreur lors du paiement', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReservation = async () => {
    if (!user || !product) return;
    setProcessing(true);
    try {
      const code = 'RSV' + Math.floor(100000 + Math.random() * 900000);
      await (supabase as any).from('product_reservations').insert({
        product_id: product.id,
        user_id: user.id,
        quantity,
        status: 'pending',
        reservation_code: code,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      });

      await (supabase as any).from('notifications').insert({
        user_id: product.user_id,
        title: '📋 Nouvelle réservation!',
        message: `${product.product_name} réservé (code: ${code})`,
        type: 'general',
      });

      toast({ title: '✅ Réservation créée!', description: `Code: ${code}. Valable 48h. Le vendeur a été notifié.` });
      navigate(`/messages?user=${product.user_id}`);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>Produit introuvable</AlertDescription></Alert>
      </div>
    );
  }

  const images = product.product_images.sort((a, b) => a.display_order - b.display_order);
  const currentImage = images[selectedImageIndex]?.image_url || '/placeholder.svg';
  const totalAmount = product.price * quantity;
  const totalMSN = totalAmount / 750;
  const hasEnough = walletBalance >= totalMSN;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <Button variant="ghost" className="mb-6" onClick={() => navigate('/marketplace')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour à la marketplace
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Images */}
          <div className="md:col-span-2 space-y-4">
            <div className="relative bg-muted rounded-lg overflow-hidden aspect-square">
              <img src={currentImage} alt={product.product_name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }} />
              <Button size="icon" variant="ghost" className="absolute top-4 right-4 bg-white/80 hover:bg-white" onClick={() => setIsFavorite(!isFavorite)}>
                <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
              </Button>
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, index) => (
                  <button key={img.id} onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${selectedImageIndex === index ? 'border-primary' : 'border-border'}`}>
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details + Payment */}
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{product.brand}</p>
                  <h1 className="text-2xl font-bold">{product.product_name}</h1>
                </div>
                <div className="border-t pt-4">
                  <span className="text-3xl font-bold text-primary">
                    {product.price.toLocaleString('fr-FR')} FCFA
                  </span>
                  <div className="flex items-center gap-2 text-muted-foreground mt-2">
                    <MapPin className="h-4 w-4" /><span>{product.location}</span>
                  </div>
                  <p className="text-sm mt-1">Disponible: {product.quantity} unité(s)</p>
                </div>
              </CardContent>
            </Card>

            {/* Wallet + Buy */}
            {user && user.id !== product.user_id && (
              <Card className="border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" /> Paiement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Solde</span>
                    <span className="font-bold text-primary">{walletBalance.toFixed(2)} MSN</span>
                  </div>

                  <div>
                    <Label className="text-xs">Quantité</Label>
                    <div className="flex gap-2 mt-1">
                      <Button variant="outline" size="sm" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</Button>
                      <Input type="number" min={1} max={product.quantity} value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Math.min(product.quantity, parseInt(e.target.value) || 1)))}
                        className="text-center w-20" />
                      <Button variant="outline" size="sm" onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}>+</Button>
                    </div>
                  </div>

                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-primary">{totalAmount.toLocaleString()} FCFA ({totalMSN.toFixed(2)} MSN)</span>
                    </div>
                  </div>

                  <Button onClick={handleWalletPayment} disabled={processing || !hasEnough} className="w-full gap-2">
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                    Acheter ({totalMSN.toFixed(2)} MSN)
                  </Button>

                  {!hasEnough && (
                    <p className="text-xs text-destructive text-center">
                      Solde insuffisant. <Button variant="link" className="p-0 h-auto text-xs" onClick={() => navigate('/dashboard')}>Recharger</Button>
                    </p>
                  )}

                  <Button variant="outline" onClick={handleReservation} disabled={processing} className="w-full gap-2">
                    <Calendar className="h-4 w-4" /> Réserver (48h)
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Seller */}
            {userProfile && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">{userProfile.full_name?.charAt(0) || '?'}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{userProfile.full_name}</p>
                      <p className="text-xs text-muted-foreground">{userProfile.referral_code}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col gap-2">
              {user?.id !== product.user_id && (
                <Button size="lg" className="w-full gap-2" onClick={() => user ? navigate(`/messages?user=${product.user_id}`) : navigate('/auth')}>
                  <MessageCircle className="h-4 w-4" /> Contacter le vendeur
                </Button>
              )}
              <Button size="lg" variant="outline" className="w-full gap-2" onClick={() => {
                if (navigator.share) { navigator.share({ title: product.product_name, url: window.location.href }); }
                else { navigator.clipboard.writeText(window.location.href); toast({ title: 'Lien copié!' }); }
              }}>
                <Share2 className="h-4 w-4" /> Partager
              </Button>
            </div>

            {!user && (
              <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>
                Connectez-vous pour acheter
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
