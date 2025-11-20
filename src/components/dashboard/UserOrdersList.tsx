import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { TrendingUp, ChevronDown, Search } from 'lucide-react';

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
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredOrders = orders.filter(order => 
    order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.broker_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            <CardTitle>Mes commandes initiées</CardTitle>
          </div>
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
        <CardDescription>Vos commandes et leurs statuts</CardDescription>
      </CardHeader>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <CardContent>
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par client, produit ou code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
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
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {searchQuery ? 'Aucun résultat trouvé' : 'Aucune commande'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
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
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
