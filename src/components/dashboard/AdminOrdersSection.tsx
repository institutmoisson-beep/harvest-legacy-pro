import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Check, X, Loader2, MapPin, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Order {
  id: string;
  product_name: string;
  customer_name: string;
  quantity: number;
  purchase_price: number;
  profit: number;
  status: string;
  country: string | null;
  city: string | null;
  geographic_zone: string | null;
  created_at: string;
  broker_id: string;
  broker_name?: string;
}

export default function AdminOrdersSection() {
  const MSN_TO_FCFA = 750;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [orderImages, setOrderImages] = useState<Record<string, any[]>>({});
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const fetchOrderImages = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('order_images')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrderImages(prev => ({ ...prev, [orderId]: data || [] }));
    } catch (error: any) {
      console.error('Error fetching images:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les images",
        variant: "destructive",
      });
    }
  };

  const fetchPendingOrders = async () => {
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch broker names
      const ordersWithNames = await Promise.all(
        ((ordersData || []) as any[]).map(async (order: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', order.broker_id)
            .single();
          
          return { 
            ...order, 
            broker_name: profile?.full_name,
            country: order.country || null,
            city: order.city || null,
          };
        })
      );

      setOrders(ordersWithNames as Order[]);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les commandes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingOrders();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin-order-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          fetchPendingOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprove = async (orderId: string) => {
    setApproving(orderId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { error } = await supabase.functions.invoke('approve-order', {
        body: { orderId, action: 'approve' }
      });

      if (error) throw error;

      toast({
        title: "Commande approuvée",
        description: "La commande a été validée et les commissions distribuées",
      });

      fetchPendingOrders();
    } catch (error: any) {
      console.error('Error approving order:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'approuver la commande",
        variant: "destructive",
      });
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (orderId: string) => {
    setRejecting(orderId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { error } = await supabase.functions.invoke('approve-order', {
        body: { orderId, action: 'reject' }
      });

      if (error) throw error;

      toast({
        title: "Commande rejetée",
        description: "La commande a été rejetée",
      });

      fetchPendingOrders();
    } catch (error: any) {
      console.error('Error rejecting order:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de rejeter la commande",
        variant: "destructive",
      });
    } finally {
      setRejecting(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commandes en attente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commandes en attente de validation</CardTitle>
        <CardDescription>
          Validez ou rejetez les commandes soumises par les membres
        </CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune commande en attente
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Broker</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead className="text-right">Prix achat</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-center">Images</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(order.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell className="font-medium">{order.broker_name}</TableCell>
                    <TableCell>{order.product_name}</TableCell>
                    <TableCell>{order.customer_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3" />
                        {order.city && order.country ? (
                          <span>{order.city}, {order.country}</span>
                        ) : order.geographic_zone ? (
                          <span>{order.geographic_zone}</span>
                        ) : (
                          <span className="text-muted-foreground">Non spécifiée</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{order.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.purchase_price * MSN_TO_FCFA)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(order.profit * MSN_TO_FCFA)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fetchOrderImages(order.id)}
                          >
                            <ImageIcon className="h-4 w-4 mr-1" />
                            Voir
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>
                              Images du produit - {order.product_name}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            {(!orderImages[order.id] || orderImages[order.id].length === 0) ? (
                              <p className="text-center text-muted-foreground py-8">
                                Aucune image disponible
                              </p>
                            ) : (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {orderImages[order.id].map((img) => (
                                  <div key={img.id} className="rounded-lg overflow-hidden border">
                                    <img
                                      src={img.image_url}
                                      alt={img.file_name}
                                      className="w-full h-48 object-cover"
                                    />
                                    <div className="p-2 bg-secondary text-sm">
                                      <p className="truncate font-medium">{img.file_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {format(new Date(img.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-3">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApprove(order.id)}
                          disabled={approving === order.id || rejecting === order.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {approving === order.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(order.id)}
                          disabled={approving === order.id || rejecting === order.id}
                        >
                          {rejecting === order.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
