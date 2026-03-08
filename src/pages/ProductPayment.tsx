import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, ShoppingCart, AlertCircle, Wallet, Loader2 } from 'lucide-react';

export default function ProductPayment() {
  const { productId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [walletBalance, setWalletBalance] = useState(0);
  const [buyerData, setBuyerData] = useState({ buyer_name: '', buyer_phone: '' });

  useEffect(() => {
    if (productId) fetchProductData();
  }, [productId]);

  useEffect(() => {
    if (user) fetchWallet();
  }, [user]);

  const fetchWallet = async () => {
    if (!user) return;
    const { data } = await supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
    setWalletBalance(Number(data?.balance) || 0);
  };

  const fetchProductData = async () => {
    setLoading(true);
    try {
      const { data: productData, error: productError } = await supabase
        .from('shop_products').select('*').eq('id', parseInt(productId!)).single();
      if (productError) throw productError;
      if (!productData || !productData.is_active || !productData.is_approved) {
        toast({ title: 'Erreur', description: 'Produit indisponible', variant: 'destructive' });
        navigate('/'); return;
      }
      setProduct(productData);
      const { data: shopData } = await supabase
        .from('shop_settings').select('*').eq('id', productData.shop_id).eq('active', true).single();
      setShop(shopData);

      // Pre-fill buyer data from profile
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle();
        if (profile) setBuyerData({ buyer_name: profile.full_name || '', buyer_phone: profile.phone || '' });
      }
    } catch (err: any) {
      toast({ title: 'Erreur', description: 'Impossible de charger le produit', variant: 'destructive' });
      navigate('/');
    } finally { setLoading(false); }
  };

  const validateForm = () => {
    if (!buyerData.buyer_name.trim()) { toast({ title: 'Erreur', description: 'Veuillez entrer votre nom', variant: 'destructive' }); return false; }
    if (!buyerData.buyer_phone.trim()) { toast({ title: 'Erreur', description: 'Veuillez entrer votre numéro', variant: 'destructive' }); return false; }
    if (product.product_type !== 'digital' && quantity > product.stock) { toast({ title: 'Erreur', description: `Stock insuffisant. Disponible: ${product.stock}`, variant: 'destructive' }); return false; }
    return true;
  };

  const handleWalletPayment = async () => {
    if (!validateForm() || !product || !user) return;
    setProcessing(true);
    try {
      const totalAmount = product.price * quantity;
      const totalMSN = totalAmount / 750;

      if (walletBalance < totalMSN) {
        toast({ title: 'Solde insuffisant', description: `Votre solde est de ${walletBalance.toFixed(2)} MSN. Il vous faut ${totalMSN.toFixed(2)} MSN. Rechargez votre portefeuille.`, variant: 'destructive' });
        return;
      }

      // Debit wallet
      const { error: debitError } = await supabase.rpc('decrement_wallet_balance', { p_user_id: user.id, p_amount: totalMSN });
      if (debitError) throw debitError;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('shop_orders')
        .insert({
          shop_id: product.shop_id,
          product_id: product.id,
          quantity,
          total_amount: totalAmount,
          buyer_name: buyerData.buyer_name,
          buyer_phone: buyerData.buyer_phone,
          order_status: 'confirmed',
          payment_mode: 'wallet',
        })
        .select().single();
      if (orderError) {
        // Refund on failure
        await supabase.rpc('increment_wallet_balance', { p_user_id: user.id, p_amount: totalMSN });
        throw orderError;
      }

      // Record wallet transaction
      await (supabase as any).from('wallet_transactions').insert({
        from_user_id: user.id,
        to_user_id: user.id,
        amount: totalMSN,
        transaction_type: 'withdrawal',
        description: `Achat: ${product.product_name} x${quantity} - ${totalAmount} FCFA`,
        status: 'completed',
      });

      // Update stock
      if (product.product_type !== 'digital' && product.stock) {
        await supabase.from('shop_products').update({ stock: product.stock - quantity }).eq('id', product.id);
      }

      toast({ title: '✅ Paiement réussi!', description: `${totalMSN.toFixed(2)} MSN débités de votre portefeuille.` });
      await fetchWallet();
      setTimeout(() => navigate(`/order-confirmation/${order.id}`), 1500);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Erreur lors du paiement', variant: 'destructive' });
    } finally { setProcessing(false); }
  };

  const handleExternalPayment = async () => {
    if (!validateForm() || !product) return;
    setProcessing(true);
    try {
      const totalAmount = product.price * quantity;
      if (product.payment_link) {
        const { data: order, error } = await supabase.from('shop_orders').insert({
          shop_id: product.shop_id, product_id: product.id, quantity, total_amount: totalAmount,
          buyer_name: buyerData.buyer_name, buyer_phone: buyerData.buyer_phone, order_status: 'pending', payment_mode: 'online',
        }).select().single();
        if (error) throw error;
        const paymentUrl = `${product.payment_link}${product.payment_link.includes('?') ? '&' : '?'}amount=${totalAmount}&order_id=${order.id}`;
        window.location.href = paymentUrl;
      } else {
        await supabase.from('shop_orders').insert({
          shop_id: product.shop_id, product_id: product.id, quantity, total_amount: totalAmount,
          buyer_name: buyerData.buyer_name, buyer_phone: buyerData.buyer_phone, order_status: 'completed', payment_mode: 'manual',
        });
        toast({ title: 'Succès', description: 'Commande créée! Vous serez contacté.' });
        setTimeout(() => navigate(`/shop/${shop.shop_url_slug}`), 2000);
      }
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally { setProcessing(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <ShoppingCart className="h-12 w-12 animate-pulse text-primary" />
    </div>
  );

  if (!product || !shop) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md"><CardContent className="pt-6 text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" /><p>Produit indisponible</p>
      </CardContent></Card>
    </div>
  );

  const totalAmount = product.price * quantity;
  const totalMSN = totalAmount / 750;
  const hasEnough = walletBalance >= totalMSN;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="text-center">
                  <h1 className="text-3xl font-bold mb-2">{product.product_name}</h1>
                  <Badge variant="outline">{product.product_type === 'digital' ? 'Numérique' : 'Physique'}</Badge>
                </div>
                {product.image_url && (
                  <div className="w-full h-80 bg-muted rounded-lg overflow-hidden">
                    <img src={product.image_url} alt={product.product_name} className="w-full h-full object-cover" />
                  </div>
                )}
                {product.description && <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {/* Wallet balance card */}
            {user && (
              <Card className="border-primary/30">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Mon Portefeuille</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">{walletBalance.toFixed(2)} MSN</p>
                  <p className="text-xs text-muted-foreground">{(walletBalance * 750).toLocaleString()} FCFA</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Résumé</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prix unitaire</span>
                  <span className="font-semibold">{product.price.toLocaleString()} FCFA</span>
                </div>

                <div>
                  <Label className="mb-2 block">Quantité</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={product.product_type === 'digital'}>−</Button>
                    <Input type="number" min="1" max={product.product_type === 'digital' ? 1 : product.stock} value={quantity}
                      onChange={(e) => setQuantity(Math.min(product.stock || 1, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="text-center" disabled={product.product_type === 'digital'} />
                    <Button variant="outline" size="sm" onClick={() => setQuantity(Math.min(product.stock || 1, quantity + 1))} disabled={product.product_type === 'digital' || quantity >= product.stock}>+</Button>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-1">
                  <div className="flex justify-between"><span className="font-semibold">Total</span><span className="text-2xl font-bold text-primary">{totalAmount.toLocaleString()} FCFA</span></div>
                  <div className="flex justify-between text-sm text-muted-foreground"><span>Équivalent</span><span>{totalMSN.toFixed(2)} MSN</span></div>
                </div>

                <div className="space-y-3">
                  <div><Label>Votre nom</Label><Input placeholder="Nom complet" value={buyerData.buyer_name} onChange={(e) => setBuyerData({ ...buyerData, buyer_name: e.target.value })} /></div>
                  <div><Label>Téléphone</Label><Input placeholder="+223 XX XX XX XX" value={buyerData.buyer_phone} onChange={(e) => setBuyerData({ ...buyerData, buyer_phone: e.target.value })} /></div>
                </div>

                {/* Wallet payment button */}
                {user && (
                  <Button onClick={handleWalletPayment} disabled={processing || !hasEnough} className="w-full" size="lg">
                    {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Traitement...</> : (
                      <><Wallet className="h-4 w-4 mr-2" /> Payer avec mon portefeuille ({totalMSN.toFixed(2)} MSN)</>
                    )}
                  </Button>
                )}

                {user && !hasEnough && (
                  <p className="text-xs text-destructive text-center">Solde insuffisant. <Button variant="link" className="p-0 h-auto text-xs" onClick={() => navigate('/dashboard')}>Recharger</Button></p>
                )}

                {/* External/manual payment */}
                <Button variant="outline" onClick={handleExternalPayment} disabled={processing} className="w-full">
                  {product.payment_link ? 'Payer en ligne' : 'Commander (paiement manuel)'}
                </Button>

                {!user && (
                  <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>
                    Connectez-vous pour payer avec votre portefeuille
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
