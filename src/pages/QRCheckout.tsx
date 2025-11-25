import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Phone, Mail, MapPin } from 'lucide-react';

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
  email?: string;
}

interface LocationState {
  establishment: Establishment;
  cart: CartItem[];
  total: number;
}

export default function QRCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const state = location.state as LocationState;
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const [formData, setFormData] = useState({
    customer_name: user?.user_metadata?.full_name || '',
    customer_phone: '',
    customer_email: user?.email || '',
    delivery_address: '',
    order_notes: '',
  });

  useEffect(() => {
    if (!state?.establishment || !state?.cart) {
      toast({
        title: 'Erreur',
        description: 'Session expirée, veuillez recommencer',
        variant: 'destructive',
      });
      navigate('/marketplace');
    }
  }, [state, navigate]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form
      if (!formData.customer_name || !formData.customer_phone || !formData.delivery_address) {
        toast({
          title: 'Erreur',
          description: 'Veuillez remplir tous les champs requis',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('qr_menu_orders')
        .insert({
          establishment_id: state.establishment.id,
          user_id: user?.id || null,
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          customer_email: formData.customer_email,
          delivery_address: formData.delivery_address,
          order_notes: formData.order_notes,
          total_amount: state.total,
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'cash' ? 'pending' : 'pending',
          order_status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = state.cart.map((item) => ({
        order_id: orderData.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('qr_menu_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast({
        title: 'Commande créée!',
        description: `Commande #${orderData.id.slice(0, 8)} confirmée`,
      });

      // Redirect to order confirmation
      navigate('/order-confirmation', {
        state: {
          orderId: orderData.id,
          establishment: state.establishment,
          cart: state.cart,
          total: state.total,
          paymentMethod,
        },
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer la commande',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!state?.establishment || !state?.cart) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Confirmation de la commande</CardTitle>
                <CardDescription>
                  Remplissez vos coordonnées de livraison
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePlaceOrder} className="space-y-6">
                  {/* Establishment Info */}
                  <div className="bg-primary/10 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">{state.establishment.name}</h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {state.establishment.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {state.establishment.location}
                        </div>
                      )}
                      {state.establishment.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {state.establishment.phone}
                        </div>
                      )}
                      {state.establishment.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {state.establishment.email}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nom complet *</Label>
                      <Input
                        id="name"
                        value={formData.customer_name}
                        onChange={(e) =>
                          setFormData({ ...formData, customer_name: e.target.value })
                        }
                        placeholder="Votre nom"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Téléphone *</Label>
                      <Input
                        id="phone"
                        value={formData.customer_phone}
                        onChange={(e) =>
                          setFormData({ ...formData, customer_phone: e.target.value })
                        }
                        placeholder="+237 6XX XXX XXX"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.customer_email}
                        onChange={(e) =>
                          setFormData({ ...formData, customer_email: e.target.value })
                        }
                        placeholder="votre@email.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="address">Adresse de livraison *</Label>
                      <Textarea
                        id="address"
                        value={formData.delivery_address}
                        onChange={(e) =>
                          setFormData({ ...formData, delivery_address: e.target.value })
                        }
                        placeholder="Quartier, rue, numéro de maison..."
                        rows={3}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes de commande (optionnel)</Label>
                      <Textarea
                        id="notes"
                        value={formData.order_notes}
                        onChange={(e) =>
                          setFormData({ ...formData, order_notes: e.target.value })
                        }
                        placeholder="Ex: Sans sauce, extra épices..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="font-semibold">Mode de paiement</h3>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="cash" id="cash" />
                        <Label htmlFor="cash" className="cursor-pointer flex-1">
                          <div className="font-medium">Paiement à la livraison</div>
                          <p className="text-sm text-muted-foreground">
                            Payez directement au livreur
                          </p>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer opacity-50">
                        <RadioGroupItem value="orange_money" id="orange" disabled />
                        <Label htmlFor="orange" className="cursor-pointer flex-1">
                          <div className="font-medium">Orange Money</div>
                          <p className="text-sm text-muted-foreground">
                            Prochainement disponible
                          </p>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer opacity-50">
                        <RadioGroupItem value="mtn" id="mtn" disabled />
                        <Label htmlFor="mtn" className="cursor-pointer flex-1">
                          <div className="font-medium">MTN Mobile Money</div>
                          <p className="text-sm text-muted-foreground">
                            Prochainement disponible
                          </p>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer opacity-50">
                        <RadioGroupItem value="crypto" id="crypto" disabled />
                        <Label htmlFor="crypto" className="cursor-pointer flex-1">
                          <div className="font-medium">Crypto-monnaie</div>
                          <p className="text-sm text-muted-foreground">
                            Prochainement disponible
                          </p>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading
                      ? 'Traitement...'
                      : `Confirmer la commande - ${state.total.toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: 'XAF',
                        })}`}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-lg">Résumé</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {state.cart.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.name} x{item.quantity}
                      </span>
                      <span>
                        {(item.price * item.quantity).toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: 'XAF',
                        })}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Sous-total</span>
                    <span>
                      {state.total.toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'XAF',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frais de livraison</span>
                    <span className="text-muted-foreground">Gratuit</span>
                  </div>

                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary text-lg">
                      {state.total.toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'XAF',
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
