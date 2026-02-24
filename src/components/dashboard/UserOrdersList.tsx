import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState, useMemo, memo } from 'react';
import { TrendingUp, ChevronDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useOrdersData } from '@/hooks/useOrdersData';

const ITEMS_PER_PAGE = 10;

function UserOrdersListComponent({ userId }: { userId: string }) {
  const MSN_TO_FCFA = 750;
  const { orders, loading } = useOrdersData(userId);
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredOrders = useMemo(() =>
    orders.filter(order =>
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.broker_code.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [orders, searchQuery]
  );

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              <CardTitle>Mes commandes initiées</CardTitle>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CardDescription>Vos commandes et leurs statuts ({filteredOrders.length} total)</CardDescription>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par client, produit ou code..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Chargement...</div>
            ) : (
              <>
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
                      {paginatedOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            {searchQuery ? 'Aucun résultat trouvé' : 'Aucune commande'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>{order.customer_name}</TableCell>
                            <TableCell className="max-w-xs truncate">{order.product_name}</TableCell>
                            <TableCell>{(order.purchase_price * MSN_TO_FCFA).toLocaleString()} FCFA</TableCell>
                            <TableCell className="text-secondary">{(order.profit * MSN_TO_FCFA).toLocaleString()} FCFA</TableCell>
                            <TableCell className="font-mono text-sm">{order.broker_code}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${
                                order.status === 'completed' || order.status === 'validated' ? 'bg-secondary/20 text-secondary' :
                                order.status === 'pending' ? 'bg-accent/20 text-accent' :
                                order.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {order.status === 'validated' ? 'Validée' :
                                 order.status === 'pending' ? 'En attente' :
                                 order.status === 'rejected' ? 'Rejetée' :
                                 order.status === 'completed' ? 'Terminée' :
                                 order.status}
                              </span>
                            </TableCell>
                            <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filteredOrders.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} sur {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
      </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default memo(UserOrdersListComponent);
