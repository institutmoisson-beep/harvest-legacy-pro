import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import PaymentMethodSelector from '@/components/payment/PaymentMethodSelector';
import OrderImageUploader from '@/components/dashboard/OrderImageUploader';
import { redirectToWavePayment, redirectToLygosPayment, redirectToCoinPaymentsPayment } from '@/services/paymentService';
import { useState, memo } from 'react';

interface OrdersSectionProps {
  userId: string;
  brokerCode: string;
}

function OrdersSectionComponent({ userId, brokerCode }: OrdersSectionProps) {
  const MSN_TO_FCFA = 750;

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [productName, setProductName] = useState('');
  const [purchasePriceMSN, setPurchasePriceMSN] = useState('');
  const [purchasePriceFCFA, setPurchasePriceFCFA] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [geographicZone, setGeographicZone] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [paymentMethodName, setPaymentMethodName] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderImages, setOrderImages] = useState<any[]>([]);

  // Conversion MSN -> FCFA
  const handleMSNChange = (value: string) => {
    setPurchasePriceMSN(value);
    if (value && !isNaN(parseFloat(value))) {
      const fcfa = parseFloat(value) * MSN_TO_FCFA;
      setPurchasePriceFCFA(fcfa.toFixed(0));
    } else {
      setPurchasePriceFCFA('');
    }
  };

  // Conversion FCFA -> MSN
  const handleFCFAChange = (value: string) => {
    setPurchasePriceFCFA(value);
    if (value && !isNaN(parseFloat(value))) {
      const msn = parseFloat(value) / MSN_TO_FCFA;
      setPurchasePriceMSN(msn.toFixed(2));
    } else {
      setPurchasePriceMSN('');
    }
  };

  const handleSubmit = async () => {
    if (!customerName || !productName || !purchasePriceMSN || !quantity || !paymentMethodId) {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs obligatoires, y compris le moyen de paiement",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Calculer automatiquement le profit = 5% du prix total
      const totalPrice = parseFloat(purchasePriceMSN) * parseInt(quantity);
      const calculatedProfit = totalPrice * 0.05;
      const amountFCFA = totalPrice * MSN_TO_FCFA;

      // Check wallet balance if paying with wallet
      if (paymentMethodName === 'wallet') {
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', userId)
          .single();

        if (walletError || !walletData) {
          throw new Error('Impossible de vérifier le solde du portefeuille');
        }

        // Check if balance is sufficient (balance is in MSN)
        if (walletData.balance < totalPrice) {
          throw new Error(`Solde insuffisant. Vous avez ${walletData.balance.toFixed(2)} MSN mais la commande coûte ${totalPrice.toFixed(2)} MSN`);
        }
      }

      const { data: orderData, error } = await supabase
        .from('orders')
        .insert({
          broker_id: userId,
          broker_code: brokerCode,
          customer_name: customerName,
          customer_phone: customerPhone || null,
          product_name: productName,
          purchase_price: parseFloat(purchasePriceMSN),
          quantity: parseInt(quantity),
          profit: calculatedProfit,
          geographic_zone: geographicZone || null,
          status: 'pending'
        })
        .select();

      if (error) throw error;

      // Créer une transaction de paiement
      if (orderData && orderData.length > 0) {
        const orderId = orderData[0].id;

        // Try to create payment transaction (table may not exist yet)
        try {
          const { error: paymentError } = await supabase
            .from('payment_transactions')
            .insert({
              order_id: orderId,
              user_id: userId,
              payment_method_id: paymentMethodId,
              amount: amountFCFA,
              currency: 'FCFA',
              status: 'pending',
              payment_details: {}
            });

          if (paymentError) {
            console.warn('Impossible de créer la transaction de paiement:', paymentError);
            // Continue anyway, the order is created
          }
        } catch (err) {
          console.warn('payment_transactions table not yet created:', err);
          // Continue with order creation
        }

        // If paying with wallet, debit from wallet immediately
        if (paymentMethodName === 'wallet') {
          try {
            const { data: debitResult, error: walletDebitError } = await supabase
              .rpc('debit_wallet_for_payment', {
                p_user_id: userId,
                p_amount: totalPrice, // Amount in MSN
                p_order_id: orderId,
                p_product_name: productName
              });

            if (walletDebitError) {
              console.warn('Erreur lors du débit du portefeuille:', walletDebitError);
              // Continue anyway - order is created
            }
          } catch (err) {
            console.warn('debit_wallet_for_payment function not yet created:', err);
            // Continue with order creation
          }

          toast({
            title: "Commande effectuée avec succès",
            description: `${amountFCFA.toLocaleString()} FCFA débité de votre portefeuille. Votre commande est en attente de validation admin.`,
          });

          // Save pending images to database now that order is created
          if (orderImages.length > 0) {
            for (const img of orderImages) {
              if (img.isPending) {
                await supabase
                  .from('order_images')
                  .insert({
                    order_id: orderId,
                    image_url: img.image_url,
                    file_name: img.file_name,
                    file_size: img.file_size,
                    mime_type: img.mime_type,
                    uploaded_by: userId,
                  })
                  .catch(err => console.warn('Could not save image to database:', err));
              }
            }
          }

          // Reset form
          setCustomerName('');
          setCustomerPhone('');
          setProductName('');
          setPurchasePriceMSN('');
          setPurchasePriceFCFA('');
          setQuantity('1');
          setGeographicZone('');
          setPaymentMethodId('');
          setPaymentMethodName('');
          setOrderImages([]);
        } else {
          toast({
            title: "Commande effectuée avec succès",
            description: `Commande créée. En attente de validation admin. Redirection vers ${paymentMethodName === 'wave' ? 'Wave' : paymentMethodName === 'lygos' ? 'Lygos' : paymentMethodName === 'coinpayments' ? 'CoinPayments' : 'la livraison'}...`,
          });

          // Save pending images to database now that order is created
          if (orderImages.length > 0) {
            for (const img of orderImages) {
              if (img.isPending) {
                await supabase
                  .from('order_images')
                  .insert({
                    order_id: orderId,
                    image_url: img.image_url,
                    file_name: img.file_name,
                    file_size: img.file_size,
                    mime_type: img.mime_type,
                    uploaded_by: userId,
                  })
                  .catch(err => console.warn('Could not save image to database:', err));
              }
            }
          }

          // Redirect to payment provider based on payment method
          if (paymentMethodName === 'wave') {
            redirectToWavePayment(amountFCFA, orderId, customerPhone || '');
          } else if (paymentMethodName === 'lygos') {
            await redirectToLygosPayment(amountFCFA, orderId);
          } else if (paymentMethodName === 'coinpayments') {
            await redirectToCoinPaymentsPayment(amountFCFA, orderId);
          } else if (paymentMethodName === 'cash_on_delivery') {
            toast({
              title: "Commande effectuée avec succès",
              description: "Votre commande a été créée. Le paiement se fera à la livraison.",
            });

            // Reset form
            setCustomerName('');
            setCustomerPhone('');
            setProductName('');
            setPurchasePriceMSN('');
            setPurchasePriceFCFA('');
            setQuantity('1');
            setGeographicZone('');
            setPaymentMethodId('');
            setPaymentMethodName('');
            setOrderImages([]);
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-accent" />
          Initier une commande
        </CardTitle>
        <CardDescription>Créez une nouvelle commande pour un client</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="customerName">Nom du client *</Label>
          <Input
            id="customerName"
            placeholder="Jean Dupont"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerPhone">Numéro du client</Label>
          <Input
            id="customerPhone"
            type="tel"
            placeholder="+237 6XX XXX XXX"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="brokerCode">Code Moissonneur</Label>
          <Input
            id="brokerCode"
            value={brokerCode}
            disabled
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="productName">Description du produit *</Label>
          <Textarea
            id="productName"
            placeholder="Décrivez le produit..."
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="purchasePriceMSN">Prix du produit (MSN) *</Label>
            <Input
              id="purchasePriceMSN"
              type="number"
              placeholder="2"
              value={purchasePriceMSN}
              onChange={(e) => handleMSNChange(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchasePriceFCFA">Prix du produit (FCFA)</Label>
            <Input
              id="purchasePriceFCFA"
              type="number"
              placeholder="1500"
              value={purchasePriceFCFA}
              onChange={(e) => handleFCFAChange(e.target.value)}
              min="0"
              step="1"
            />
            <p className="text-xs text-muted-foreground">1 MSN = 750 FCFA</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantité *</Label>
          <Input
            id="quantity"
            type="number"
            placeholder="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
          />
        </div>

        {purchasePriceMSN && quantity && (
          <div className="p-3 bg-primary/10 rounded-lg space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Bénéfice total (5% du prix) :</p>
              <p className="text-lg font-semibold text-primary">
                {(parseFloat(purchasePriceMSN || '0') * parseInt(quantity || '1') * 0.05).toFixed(2)} MSN
                {' '}({(parseFloat(purchasePriceMSN || '0') * parseInt(quantity || '1') * 0.05 * MSN_TO_FCFA).toFixed(0)} FCFA)
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Votre commission (40% du bénéfice) :</p>
              <p className="text-lg font-semibold text-accent">
                {(parseFloat(purchasePriceMSN || '0') * parseInt(quantity || '1') * 0.05 * 0.40).toFixed(2)} MSN
                {' '}({(parseFloat(purchasePriceMSN || '0') * parseInt(quantity || '1') * 0.05 * 0.40 * MSN_TO_FCFA).toFixed(0)} FCFA)
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="geographicZone">Zone de livraison</Label>
          <Input
            id="geographicZone"
            placeholder="Exemple: Douala, Bonapriso"
            value={geographicZone}
            onChange={(e) => setGeographicZone(e.target.value)}
          />
        </div>

        {/* Image uploader for product images */}
        <div className="border-t pt-4">
          <Label className="block mb-3">Images du produit (optionnel)</Label>
          <OrderImageUploader
            orderId="pending"
            onImagesChange={setOrderImages}
            maxImages={3}
            disabled={loading}
          />
        </div>

        {/* Sélecteur de moyen de paiement */}
        <div className="border-t pt-4">
          <PaymentMethodSelector
            value={paymentMethodId}
            onChange={(methodId, methodName) => {
              setPaymentMethodId(methodId);
              setPaymentMethodName(methodName);
            }}
            disabled={loading}
          />
        </div>

        <Button onClick={handleSubmit} disabled={loading || !paymentMethodId} className="w-full" variant="cosmic">
          <Plus className="h-4 w-4 mr-2" />
          Créer la commande
        </Button>
      </CardContent>
    </Card>
  );
}

export default memo(OrdersSectionComponent);
