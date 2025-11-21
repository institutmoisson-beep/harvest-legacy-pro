import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Package, MapPin, DollarSign, Clock } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface AvailablePackage {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  delivery_commission: number;
  created_at: string;
  customer_latitude: number;
  customer_longitude: number;
}

export default function AvailableDeliveries() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<AvailablePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAvailablePackages();
  }, []);

  const fetchAvailablePackages = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_packages')
        .select('*')
        .eq('delivery_method', 'community_delivery')
        .eq('status', 'pending')
        .is('deliverer_id', null)
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

  const handlePropose = async (packageId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('delivery_offers').insert({
        package_id: packageId,
        deliverer_id: user.id,
        message: message || null,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Proposition envoyée! 🎉',
        description: 'Le client recevra votre proposition de livraison',
      });

      setSelectedPackage(null);
      setMessage('');
      fetchAvailablePackages();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Livraisons Disponibles ({packages.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gagnez des commissions en livrant des colis près de chez vous
          </p>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune livraison disponible pour le moment</p>
              <p className="text-sm mt-2">Revenez plus tard pour voir de nouvelles opportunités</p>
            </div>
          ) : (
            <div className="space-y-4">
              {packages.map((pkg) => (
                <Card key={pkg.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <div>
                              <div className="font-medium">{pkg.customer_address}</div>
                              <div className="text-sm text-muted-foreground">{pkg.customer_city}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            Publié il y a {Math.floor((Date.now() - new Date(pkg.created_at).getTime()) / 60000)} min
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge className="text-lg px-3 py-1">
                            <DollarSign className="w-4 h-4 mr-1" />
                            {pkg.delivery_commission} FCFA
                          </Badge>
                        </div>
                      </div>

                      {selectedPackage === pkg.id ? (
                        <div className="space-y-3 pt-3 border-t">
                          <Textarea
                            placeholder="Message au client (optionnel)"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handlePropose(pkg.id)}
                              className="flex-1"
                            >
                              Confirmer la proposition
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedPackage(null);
                                setMessage('');
                              }}
                            >
                              Annuler
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setSelectedPackage(pkg.id)}
                          className="w-full"
                        >
                          📦 Proposer de livrer
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
