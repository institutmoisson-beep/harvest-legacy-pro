import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';

interface Order {
  id: string;
  customer_name: string;
  product_name: string;
  purchase_price: number;
  profit: number;
  status: string;
  created_at: string;
  broker_code: string;
}

export default function UserOrdersList({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('broker_id', userId)
      .order('created_at', { ascending: false });
    setOrders(data || []);
  };

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('user-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `broker_id=eq.${userId}` }, () => fetchOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-accent" />
          Mes commandes initiées
        </CardTitle>
        <CardDescription>Vos commandes et leurs statuts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">Aucune commande</TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.customer_name}</TableCell>
                    <TableCell className="max-w-xs truncate">{order.product_name}</TableCell>
                    <TableCell>{order.purchase_price.toLocaleString()} FCFA</TableCell>
                    <TableCell className="text-secondary">{order.profit.toLocaleString()} FCFA</TableCell>
                    <TableCell className="font-mono text-sm">{order.broker_code}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        order.status === 'completed' ? 'bg-secondary/20 text-secondary' :
                        order.status === 'pending' ? 'bg-accent/20 text-accent' :
                        order.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
