import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import PaymentMethodSelector from '@/components/payment/PaymentMethodSelector';
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
          payment_method_id: paymentMethodId,
          status: 'pending'
        })
        .select();

      if (error) throw error;

      // Créer une transaction de paiement
      if (orderData && orderData.length > 0) {
        const orderId = orderData[0].id;
        const amount = parseFloat(purchasePriceMSN) * parseInt(quantity) * MSN_TO_FCFA;

        await supabase
          .from('payment_transactions')
          .insert({
            order_id: orderId,
            user_id: userId,
            payment_method_id: paymentMethodId,
            amount: amount,
            currency: 'FCFA',
            status: paymentMethodName === 'cash_on_delivery' ? 'pending_delivery' : 'pending',
            payment_details: {}
          });
      }

      toast({
        title: "Commande créée",
        description: `Commande initiée avec le paiement ${paymentMethodName === 'cash_on_delivery' ? 'à la livraison' : 'en ligne'}`,
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
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
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

        <div className="grid grid-cols-2 gap-4">
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
