import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation, useDistance, useNearbyDeliveries } from '@/hooks/useGeolocation';
import { useRealtimeLocation } from '@/hooks/useRealtimeLocation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Package, MapPin, Navigation, AlertCircle, Loader2, Zap } from 'lucide-react';
import DeliveryMap from './DeliveryMap';
import MapSearch from './MapSearch';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AvailableDeliveriesMap() {
  const { user } = useAuth();
  const { location: staticLocation, error: geoError, getCurrentLocation, loading: geoLoading } = useGeolocation();
  const { location: realtimeLocation, isTracking, error: trackingError, startTracking, stopTracking } = useRealtimeLocation();
  const { nearbyDeliveries, getNearbyDeliveries, loading: nearbyLoading } = useNearbyDeliveries();
  const { calculateDistance } = useDistance();

  // Use realtime location if available, fallback to static location
  const location = realtimeLocation || staticLocation;

  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [proposing, setProposing] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [refetchInterval, setRefetchInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [searchLocation, setSearchLocation] = useState<{ latitude: number; longitude: number; name: string } | null>(null);

  // Get initial location on mount
  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  // Fetch nearby deliveries and active users when location changes
  useEffect(() => {
    if (location) {
      getNearbyDeliveries(location, radiusKm);
      fetchActiveUsers();

      // Set up continuous refetch of nearby deliveries and active users every 10 seconds
      const interval = setInterval(() => {
        getNearbyDeliveries(location, radiusKm);
        fetchActiveUsers();
      }, 10000);

      setRefetchInterval(interval);

      return () => clearInterval(interval);
    }
  }, [location, radiusKm]);

  const fetchActiveUsers = async () => {
    if (!location) return;

    try {
      const { data, error } = await supabase
        .from('active_locations')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      // Filter out current user and calculate distances
      const nearbyUsers = (data || [])
        .filter((u: any) => u.user_id !== user?.id)
        .map((u: any) => ({
          ...u,
          distance: calculateDistance(
            location.latitude,
            location.longitude,
            u.latitude,
            u.longitude
          ),
        }))
        .filter((u: any) => u.distance <= radiusKm);

      setActiveUsers(nearbyUsers);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des utilisateurs actifs:', err);
    }
  };

  const handleToggleTracking = async () => {
    try {
      if (isTracking) {
        await stopTracking();
        toast({
          title: 'Suivi en temps réel arrêté',
          description: 'Votre position n\'est plus mise à jour en continu',
        });
      } else {
        await startTracking();
        toast({
          title: 'Suivi en temps réel activé',
          description: 'Votre position se met à jour en continu',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handlePropose = async (deliveryId: string) => {
    if (!user) return;

    setProposing(true);
    try {
      const { error } = await supabase.from('delivery_offers').insert({
        package_id: deliveryId,
        deliverer_id: user.id,
        message: message || null,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Proposition envoyée! 🎉',
        description: 'Le client recevra votre proposition de livraison',
      });

      setSelectedDeliveryId(null);
      setMessage('');
      getNearbyDeliveries(location!, radiusKm);
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

  const selectedDelivery = nearbyDeliveries.find((d) => d.id === selectedDeliveryId);

  return (
    <div className="space-y-4">
      {/* Status and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Gestionnaire de Livraisons
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={handleToggleTracking}
                variant={isTracking ? 'default' : 'outline'}
                size="sm"
                className={isTracking ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {isTracking ? (
                  <>
                    <Zap className="w-4 h-4 mr-2 animate-pulse" />
                    Suivi actif
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 mr-2" />
                    Activer suivi
                  </>
                )}
              </Button>
              <Button onClick={getCurrentLocation} variant="outline" size="sm" disabled={geoLoading}>
                {geoLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : '🔄'}
                Actualiser position
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(geoError || trackingError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{geoError || trackingError}</AlertDescription>
            </Alert>
          )}

          {isTracking && (
            <Alert className="border-green-200 bg-green-50">
              <Zap className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Suivi en temps réel activé - Votre position se met à jour automatiquement
              </AlertDescription>
            </Alert>
          )}

          {location && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Position: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)} ±{' '}
                {location.accuracy.toFixed(0)}m {isTracking && '(en direct)'}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium flex justify-between">
              Rayon de recherche: {radiusKm} km
              <span className="text-xs text-muted-foreground">Glissez pour ajuster</span>
            </label>
            <Slider
              value={[radiusKm]}
              onValueChange={(value) => setRadiusKm(value[0])}
              min={1}
              max={50}
              step={1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* View Mode Tabs */}
      {location && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                {nearbyDeliveries.length} livraison(s) trouvée(s)
              </div>
              {nearbyLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-full">
              <TabsList className="w-full rounded-none border-b">
                <TabsTrigger value="map" className="flex-1">
                  🗺️ Vue Carte
                </TabsTrigger>
                <TabsTrigger value="list" className="flex-1">
                  📋 Vue Liste
                </TabsTrigger>
              </TabsList>

              <TabsContent value="map" className="p-0">
                <div className="p-4">
                  <MapSearch
                    onLocationFound={setSearchLocation}
                    placeholder="Rechercher une adresse pour les livraisons..."
                    searchType="delivery"
                  />
                </div>
                {nearbyDeliveries.length > 0 || activeUsers.length > 0 ? (
                  <div className="space-y-3 p-4">
                    {activeUsers.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-blue-900">
                          👥 {activeUsers.length} livreur(s) actif(s) à proximité
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {activeUsers.map((user) => (
                            <Badge key={user.id} variant="secondary" className="bg-blue-100">
                              📍 {user.distance.toFixed(1)} km
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <DeliveryMap
                      userLocation={location}
                      deliveries={nearbyDeliveries}
                      activeUsers={activeUsers}
                      selectedDeliveryId={selectedDeliveryId}
                      onSelectDelivery={setSelectedDeliveryId}
                      onPropose={handlePropose}
                      searchLocation={searchLocation}
                    />
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune livraison disponible dans un rayon de {radiusKm} km</p>
                    {activeUsers.length === 0 && (
                      <p className="text-sm mt-2">Aucun livreur actif à proximité</p>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="list" className="p-4 space-y-3">
                {nearbyDeliveries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune livraison disponible</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {nearbyDeliveries.map((delivery) => (
                      <Card key={delivery.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-semibold">{delivery.customer_address}</div>
                                <div className="text-sm text-muted-foreground">{delivery.customer_city}</div>
                              </div>
                              <Badge variant="default">
                                {delivery.delivery_commission} FCFA
                              </Badge>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2 text-orange-600">
                                <Navigation className="w-4 h-4" />
                                {delivery.distance.toFixed(1)} km
                              </div>
                              <div className="text-muted-foreground">
                                {delivery.customer_phone}
                              </div>
                            </div>

                            <Button
                              onClick={() => {
                                setSelectedDeliveryId(delivery.id);
                              }}
                              className="w-full"
                            >
                              📦 Proposer de livrer
                            </Button>

                            {selectedDeliveryId === delivery.id && (
                              <div className="space-y-3 pt-3 border-t">
                                <Textarea
                                  placeholder="Message au client (optionnel)"
                                  value={message}
                                  onChange={(e) => setMessage(e.target.value)}
                                  rows={2}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handlePropose(delivery.id)}
                                    className="flex-1"
                                    disabled={proposing}
                                  >
                                    {proposing ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Envoi...
                                      </>
                                    ) : (
                                      'Confirmer la proposition'
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedDeliveryId(null);
                                      setMessage('');
                                    }}
                                  >
                                    Annuler
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {!location && !geoLoading && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Activez la géolocalisation pour voir les livraisons disponibles près de vous
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
