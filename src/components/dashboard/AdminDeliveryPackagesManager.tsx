import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Package, MapPin, User, Phone } from 'lucide-react';

interface DeliveryPackage {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  delivery_method: string;
  pickup_code: string;
  delivery_code: string;
  status: string;
  created_at: string;
  relay_point_id: string;
  deliverer_id: string;
}

export default function AdminDeliveryPackagesManager() {
  const [packages, setPackages] = useState<DeliveryPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_packages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPackages(data || []);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('delivery_packages')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Statut mis à jour',
      });

      fetchPackages();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: '⏳ En attente', variant: 'secondary' },
      awaiting_pickup: { label: '📦 Prêt au retrait', variant: 'default' },
      in_transit: { label: '🚚 En transit', variant: 'outline' },
      delivered: { label: '✅ Livré', variant: 'default' },
      cancelled: { label: '❌ Annulé', variant: 'destructive' },
    };

    const statusInfo = statusMap[status] || statusMap.pending;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getDeliveryMethodLabel = (method: string) => {
    const methodMap: Record<string, string> = {
      relay_point: '🏪 Point Relais',
      community_delivery: '🤝 Livraison Communautaire',
      direct: '🚗 Livraison Directe',
    };
    return methodMap[method] || method;
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Gestion des Colis et Livraisons ({packages.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span className="font-medium">{pkg.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {pkg.customer_phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start gap-1 text-sm">
                      <MapPin className="w-3 h-3 mt-0.5" />
                      <div>
                        <div>{pkg.customer_address}</div>
                        <div className="text-xs text-muted-foreground">{pkg.customer_city}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getDeliveryMethodLabel(pkg.delivery_method)}</TableCell>
                  <TableCell>
                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {pkg.pickup_code || pkg.delivery_code || 'N/A'}
                    </code>
                  </TableCell>
                  <TableCell>{getStatusBadge(pkg.status)}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(pkg.created_at).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {pkg.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(pkg.id, 'awaiting_pickup')}
                        >
                          Prêt
                        </Button>
                      )}
                      {pkg.status === 'awaiting_pickup' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(pkg.id, 'in_transit')}
                        >
                          En transit
                        </Button>
                      )}
                      {pkg.status === 'in_transit' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(pkg.id, 'delivered')}
                        >
                          Livré
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
