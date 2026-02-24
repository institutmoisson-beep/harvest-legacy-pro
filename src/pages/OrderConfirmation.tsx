import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'error'>('loading');

  useEffect(() => {
    if (!user || !orderId) {
      navigate('/dashboard');
      return;
    }
    fetchOrderDetails();
  }, [orderId, user, navigate]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);

      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('broker_id', user?.id)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Fetch payment transaction
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (!paymentError && paymentData) {
        setPayment(paymentData);
        
        // Determine status
        if (paymentData.status === 'completed' || paymentData.status === 'pending_delivery') {
          setStatus('success');
        } else if (paymentData.status === 'pending') {
          setStatus('pending');
        } else {
          setStatus('error');
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error);
      setStatus('error');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-center">Vérification de votre commande...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        {status === 'success' && (
          <>
            <Card className="border-secondary/30 bg-secondary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-secondary">
                  <CheckCircle className="h-6 w-6" />
                  Commande Confirmée!
                </CardTitle>
                <CardDescription>
                  Votre commande a été créée avec succès
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {order && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 p-3 bg-card rounded-lg border">
                      <div>
                        <p className="text-sm text-muted-foreground">Commande</p>
                        <p className="font-mono text-sm font-semibold">#{order.id?.slice(0, 8)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Produit</p>
                        <p className="font-semibold">{order.product_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Client</p>
                        <p className="font-semibold">{order.customer_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Quantité</p>
                        <p className="font-semibold">{order.quantity}</p>
                      </div>
                      {order.customer_phone && (
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">Téléphone</p>
                          <p className="font-semibold">{order.customer_phone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {payment && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Détails du Paiement</h3>
                    <div className="p-3 bg-card rounded-lg border space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Montant</span>
                        <span className="font-semibold">{payment.amount.toLocaleString()} {payment.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Statut</span>
                        <span className="font-semibold text-secondary">
                          {payment.status === 'completed' ? '✅ Complété' : '⏳ En attente'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <Alert className="bg-primary/10 border-primary/30">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-primary">
                    {payment?.status === 'completed' 
                      ? 'Votre paiement a été traité avec succès!'
                      : 'Votre paiement est en cours de traitement. Vous recevrez une confirmation par SMS/email.'}
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => navigate('/orders-dashboard')}
                    variant="outline"
                    className="flex-1"
                  >
                    Voir toutes les commandes
                  </Button>
                  <Button 
                    onClick={() => navigate('/dashboard')}
                    className="flex-1"
                  >
                    Retour au tableau de bord
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {status === 'pending' && (
          <Card className="border-accent/30 bg-accent/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-accent">
                <Clock className="h-6 w-6" />
                Paiement en Attente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-accent">
                Votre commande a été créée, mais le paiement est toujours en attente.
                Veuillez compléter le paiement sur l'interface du prestataire.
              </p>
              <Button onClick={() => navigate('/orders-dashboard')} className="w-full">
                Voir mes commandes
              </Button>
            </CardContent>
          </Card>
        )}

        {status === 'error' && (
          <Card className="border-destructive/30 bg-destructive/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-6 w-6" />
                Erreur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-destructive">
                Il y a eu un problème avec votre commande. Veuillez contacter le support.
              </p>
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Retour au tableau de bord
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
