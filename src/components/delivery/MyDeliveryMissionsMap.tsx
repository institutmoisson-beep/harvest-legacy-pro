import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Package, MapPin, Phone, User, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiY2VsdnVzIiwiYSI6ImNtZjVvcm1zejA2dWsyanM5cGdxOTM5NWkifQ.1I0VU-32Ek6bg3sZvpUS0w';

mapboxgl.accessToken = MAPBOX_TOKEN;

interface DeliveryMission {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_latitude: number;
  customer_longitude: number;
  delivery_code: string;
  delivery_commission: number;
  status: string;
  assigned_at: string;
}

interface ActiveDeliverer {
  id: string;
  full_name: string;
  latitude: number;
  longitude: number;
  last_updated: string;
}

export default function MyDeliveryMissionsMap() {
  const { user } = useAuth();
  const { location: userLocation } = useGeolocation();
  const [missions, setMissions] = useState<DeliveryMission[]>([]);
  const [activeDeliverers, setActiveDeliverers] = useState<ActiveDeliverer[]>([]);
  const [loading, setLoading] = useState(true);
  const [verificationCode, setVerificationCode] = useState('');
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [proposing, setProposing] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const missionMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const delivererMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [0, 0],
      zoom: 2,
    });

    map.current.addControl(new mapboxgl.NavigationControl());
  }, []);

  // Fetch user's missions with limit
  const fetchMyMissions = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('delivery_packages')
        .select('*')
        .eq('deliverer_id', user.id)
        .in('status', ['awaiting_pickup', 'in_transit', 'delivered'])
        .limit(50)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setMissions(data || []);
    } catch (error: any) {
      console.error('Error fetching missions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger vos missions',
        variant: 'destructive',
      });
    }
  };

  // Fetch active deliverers with locations
  const fetchActiveDeliverers = async () => {
    try {
      // Query user_locations table for active deliverers
      const locationsResult = await supabase
        .from('active_locations')
        .select('user_id, latitude, longitude, last_updated')
        .eq('location_type', 'delivery')
        .eq('is_active', true)
        .limit(50);

      const locData = locationsResult.data;
      const locError = locationsResult.error;

      if (locError && locError.code !== 'PGRST116') throw locError;

      if (locData && locData.length > 0) {
        const userIds = locData.map((d: any) => d.user_id);
        const profilesResult = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds)
          .limit(50);

        const profiles = profilesResult.data;
        const profileError = profilesResult.error;

        if (!profileError && profiles) {
          const profileMap: Record<string, string> = {};
          profiles.forEach((p: any) => {
            profileMap[p.id] = p.full_name;
          });

          const deliverers = locData.map((d: any) => ({
            id: d.user_id,
            full_name: profileMap[d.user_id] || 'Unknown',
            latitude: d.latitude,
            longitude: d.longitude,
            last_updated: d.last_updated,
          }));

          setActiveDeliverers(deliverers);
        }
      }
    } catch (error: any) {
      console.error('Error fetching active deliverers:', error);
    }
  };

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchMyMissions(), fetchActiveDeliverers()]);
      setLoading(false);
    };

    if (user) {
      load();
    }
  }, [user]);

  // Subscribe to realtime updates for missions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`delivery-missions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_packages',
          filter: `deliverer_id=eq.${user.id}`
        },
        () => fetchMyMissions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Subscribe to realtime updates for active deliverers
  useEffect(() => {
    const channel = supabase
      .channel('active-deliverers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_locations',
        },
        () => {
          fetchActiveDeliverers();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchActiveDeliverers();
    }, 30000); // Refresh every 30 seconds

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

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

    setProposing(true);
    try {
      const mission = missions.find((m) => m.id === missionId);

      const { error: updateError } = await supabase
        .from('delivery_packages')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', missionId);

      if (updateError) throw updateError;

      // Pay commission to deliverer
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
    } finally {
      setProposing(false);
    }
  };

  // Update user marker
  useEffect(() => {
    if (!map.current || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    const el = document.createElement('div');
    el.className = 'w-10 h-10 bg-blue-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center';
    el.innerHTML = '<div class="text-lg">📍</div>';

    userMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([userLocation.longitude, userLocation.latitude])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<div class="font-bold">Votre position</div>'))
      .addTo(map.current);
  }, [userLocation]);

  // Update mission markers
  useEffect(() => {
    if (!map.current) return;

    missionMarkersRef.current.forEach((marker) => {
      marker.remove();
    });
    missionMarkersRef.current.clear();

    missions.forEach((mission) => {
      const statusColor = {
        awaiting_pickup: 'bg-yellow-500',
        in_transit: 'bg-orange-500',
        delivered: 'bg-green-500',
      };

      const el = document.createElement('div');
      el.className = `w-9 h-9 rounded-full border-2 border-white shadow-md ${statusColor[mission.status as keyof typeof statusColor] || 'bg-gray-500'} flex items-center justify-center cursor-pointer`;
      el.innerHTML = '<div class="text-lg">📦</div>';

      el.addEventListener('click', () => {
        setSelectedMission(mission.id);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([mission.customer_longitude, mission.customer_latitude])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div class="p-2 text-sm">
            <div class="font-semibold">${mission.customer_name}</div>
            <div class="text-gray-600">${mission.customer_address}</div>
            <div class="text-orange-600 font-bold mt-1">${mission.delivery_commission} FCFA</div>
          </div>`
        ))
        .addTo(map.current!);

      missionMarkersRef.current.set(mission.id, marker);
    });
  }, [missions]);

  // Update deliverer markers
  useEffect(() => {
    if (!map.current) return;

    delivererMarkersRef.current.forEach((marker) => {
      marker.remove();
    });
    delivererMarkersRef.current.clear();

    activeDeliverers.forEach((deliverer) => {
      if (deliverer.id === user?.id) return; // Don't show self twice

      const el = document.createElement('div');
      el.className = 'w-8 h-8 bg-purple-500 rounded-full border-2 border-white shadow-md flex items-center justify-center';
      el.innerHTML = '<div class="text-lg">👤</div>';

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([deliverer.longitude, deliverer.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div class="p-2 text-sm">
            <div class="font-semibold">${deliverer.full_name}</div>
            <div class="text-gray-600">Livreur actif</div>
          </div>`
        ))
        .addTo(map.current!);

      delivererMarkersRef.current.set(deliverer.id, marker);
    });
  }, [activeDeliverers, user?.id]);

  // Fit bounds
  useEffect(() => {
    if (!map.current) return;

    const allPoints = [
      ...(userLocation ? [[userLocation.longitude, userLocation.latitude]] : []),
      ...missions.map(m => [m.customer_longitude, m.customer_latitude]),
      ...activeDeliverers.map(d => [d.longitude, d.latitude]),
    ];

    if (allPoints.length > 0) {
      const firstPoint = allPoints[0] as [number, number];
      const bounds = new mapboxgl.LngLatBounds(firstPoint, firstPoint);
      allPoints.forEach(point => bounds.extend(point as [number, number]));
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [missions, userLocation, activeDeliverers]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p>Chargement des missions...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="map">🗺️ Vue Carte</TabsTrigger>
          <TabsTrigger value="list">📋 Vue Liste</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="space-y-4">
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              📍 Bleu = Votre position | 📦 Couleurs = État de la livraison | 👤 Violet = Autres livreurs
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Carte en Temps Réel ({missions.length} missions, {activeDeliverers.filter(d => d.id !== user?.id).length} livreurs actifs)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {missions.length === 0 && activeDeliverers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune mission ou livreur disponible</p>
                </div>
              ) : (
                <div ref={mapContainer} className="w-full h-[600px] rounded-lg border-t overflow-hidden" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Mes Missions de Livraison ({missions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {missions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Vous n'avez pas de mission en cours</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[700px] overflow-y-auto">
                  {missions.map((mission) => (
                    <Card key={mission.id} className="border-2">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2 flex-1">
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
                                  <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                      Entrez le code fourni par le client pour confirmer la livraison
                                    </AlertDescription>
                                  </Alert>
                                  <div className="space-y-2">
                                    <Label>Code de vérification du client</Label>
                                    <Input
                                      type="text"
                                      placeholder="Entrez le code du client"
                                      value={verificationCode}
                                      onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleCompleteDelivery(mission.id, mission.delivery_code)}
                                      className="flex-1"
                                      disabled={proposing}
                                    >
                                      {proposing ? (
                                        <>
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                          Traitement...
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          Confirmer la livraison
                                        </>
                                      )}
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
                                >
                                  ✅ Confirmer la livraison
                                </Button>
                              )}
                            </div>
                          )}

                          {mission.status === 'delivered' && (
                            <Alert className="bg-green-50 border-green-200">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <AlertDescription className="text-green-700">
                                ✅ Livraison complétée avec succès
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {activeDeliverers.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  👥 Livreurs Actifs ({activeDeliverers.filter(d => d.id !== user?.id).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activeDeliverers
                    .filter(d => d.id !== user?.id)
                    .map(deliverer => (
                      <div key={deliverer.id} className="flex items-center justify-between p-2 bg-purple-50 rounded border border-purple-200">
                        <span className="font-medium text-sm">{deliverer.full_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(deliverer.last_updated).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
