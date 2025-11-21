import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Package, MapPin, Phone, User, CheckCircle } from 'lucide-react';

interface DeliveryMission {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  delivery_code: string;
  delivery_commission: number;
  status: string;
  assigned_at: string;
}

export default function MyDeliveryMissions() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<DeliveryMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [verificationCode, setVerificationCode] = useState('');
  const [selectedMission, setSelectedMission] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchMyMissions();
    }
  }, [user]);

  const fetchMyMissions = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_packages')
        .select('*')
        .eq('deliverer_id', user?.id)
        .in('status', ['in_transit', 'awaiting_pickup'])
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setMissions(data || []);
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

  const handleStartDelivery = async (missionId: string) => {
    try {
      const { error } = await supabase
        .from('delivery_packages')
        .update({
          status: 'in_transit',
          picked_up_at: new Date().toISOString(),
        })
        .eq('id', missionId);

      if (error) throw error;

      toast({
        title: 'Mission démarrée! 🚀',
        description: 'Bonne livraison!',
      });

      fetchMyMissions();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCompleteDelivery = async (missionId: string, deliveryCode: string) => {
    if (verificationCode !== deliveryCode) {
      toast({
        title: 'Code incorrect',
        description: 'Le code de livraison ne correspond pas',
        variant: 'destructive',
      });
      return;
    }

    try {
      const mission = missions.find(m => m.id === missionId);
      
      const { error: updateError } = await supabase
        .from('delivery_packages')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', missionId);

      if (updateError) throw updateError;

      // Créer une transaction pour payer la commission au livreur
      const { error: walletError } = await supabase.rpc('increment_wallet_balance', {
        p_user_id: user?.id,
        p_amount: mission?.delivery_commission || 500,
      });

      if (walletError) throw walletError;

      toast({
        title: 'Livraison terminée! 🎉',
        description: `Vous avez gagné ${mission?.delivery_commission || 500} FCFA`,
      });

      setVerificationCode('');
      setSelectedMission(null);
      fetchMyMissions();
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Mes Missions de Livraison ({missions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {missions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Vous n'avez pas de mission en cours</p>
          </div>
        ) : (
          <div className="space-y-4">
            {missions.map((mission) => (
              <Card key={mission.id} className="border-2">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span className="font-medium">{mission.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          {mission.customer_phone}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-primary" />
                          <div>
                            <div>{mission.customer_address}</div>
                            <div className="text-muted-foreground">{mission.customer_city}</div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <Badge variant="default" className="mb-2">
                          💰 {mission.delivery_commission} FCFA
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          Code: <code className="font-mono">{mission.delivery_code}</code>
                        </div>
                      </div>
                    </div>

                    {mission.status === 'awaiting_pickup' && (
                      <Button
                        onClick={() => handleStartDelivery(mission.id)}
                        className="w-full"
                      >
                        🚀 Démarrer la livraison
                      </Button>
                    )}

                    {mission.status === 'in_transit' && (
                      <div className="space-y-3 pt-3 border-t">
                        {selectedMission === mission.id ? (
                          <>
                            <Label>Code de vérification du client</Label>
                            <Input
                              type="text"
                              placeholder="Entrez le code du client"
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleCompleteDelivery(mission.id, mission.delivery_code)}
                                className="flex-1"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Confirmer la livraison
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedMission(null);
                                  setVerificationCode('');
                                }}
                              >
                                Annuler
                              </Button>
                            </div>
                          </>
                        ) : (
                          <Button
                            onClick={() => setSelectedMission(mission.id)}
                            className="w-full"
                            variant="default"
                          >
                            ✅ Livraison effectuée
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
