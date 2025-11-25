import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ArrowLeft, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Establishment {
  id: string;
  name: string;
  location: string;
  phone?: string;
}

interface LocationState {
  orderId: string;
  establishment: Establishment;
  cart: CartItem[];
  total: number;
  paymentMethod: string;
}

export default function OrderConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as LocationState;

  useEffect(() => {
    if (!state?.orderId) {
      navigate('/marketplace');
    }
  }, [state, navigate]);

  if (!state?.establishment || !state?.cart) {
    return null;
  }

  const copyOrderId = () => {
    navigator.clipboard.writeText(state.orderId.slice(0, 12).toUpperCase());
    toast({
      title: 'Copié!',
      description: 'Numéro de commande copié',
    });
  };

  const paymentMethodLabel: Record<string, string> = {
    cash: 'Paiement à la livraison',
    orange_money: 'Orange Money',
    mtn: 'MTN Mobile Money',
    crypto: 'Crypto-monnaie',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <Button
          variant="ghost"
          className="mb-8"
          onClick={() => navigate('/marketplace')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la marketplace
        </Button>

        {/* Success Message */}
        <Card className="border-green-200 bg-green-50 mb-8">
          <CardContent className="pt-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Commande confirmée!</h1>
            <p className="text-muted-foreground mb-6">
              Votre commande a été reçue et est en cours de préparation
            </p>

            <div className="bg-white p-4 rounded-lg border border-green-200 mb-6">
              <p className="text-xs text-muted-foreground mb-1">Numéro de commande</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-2xl font-bold tracking-wider">
                  {state.orderId.slice(0, 12).toUpperCase()}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyOrderId}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Establishment & Delivery */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Livraison à</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">{state.establishment.name}</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>📍 {state.establishment.location}</p>
                  {state.establishment.phone && (
                    <p>📞 {state.establishment.phone}</p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground mb-2">Statut estimé</p>
                <div className="flex items-center gap-2">
                  <Badge>En préparation</Badge>
                  <span className="text-xs text-muted-foreground">
                    Environ 20-30 minutes
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Paiement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Mode de paiement</p>
                <Badge variant="outline">
                  {paymentMethodLabel[state.paymentMethod] ||
                    state.paymentMethod}
                </Badge>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground mb-1">Montant total</p>
                <p className="text-2xl font-bold text-primary">
                  {state.total.toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: 'XAF',
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Détails de la commande</CardTitle>
            <CardDescription>
              {state.cart.length} article{state.cart.length > 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {state.cart.map((item) => (
                <div key={item.id} className="flex justify-between pb-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Quantité: {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {(item.price * item.quantity).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'XAF',
                    })}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">
                  {state.total.toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: 'XAF',
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">Prochaines étapes</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              <li className="flex gap-3">
                <span className="font-bold flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center">
                  1
                </span>
                <span>Gardez votre numéro de commande pour la livraison</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center">
                  2
                </span>
                <span>
                  Vous recevrez votre commande à l'adresse indiquée
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center">
                  3
                </span>
                <span>
                  Vous pouvez contacter le restaurant pour toute question
                </span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          <Button
            className="w-full"
            onClick={() => navigate('/marketplace')}
          >
            Retour à la marketplace
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/dashboard')}
          >
            Aller au tableau de bord
          </Button>
        </div>
      </div>
    </div>
  );
}
