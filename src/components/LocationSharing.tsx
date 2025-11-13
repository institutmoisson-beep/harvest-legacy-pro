import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { MapPin, Share2, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface UserLocation {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  shared_with_user_id?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    referral_code: string;
  };
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTNtZDJiMGswMDh3MmpxeWlnbmlsYjBmIn0.VPJ3C1vhfTqzSGevKDZ1_g';

export default function LocationSharing() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [allActiveLocations, setAllActiveLocations] = useState<UserLocation[]>([]);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const sharedMarkers = useRef<{ [key: string]: mapboxgl.Marker }>({});

  useEffect(() => {
    if (!user || !mapContainer.current) return;

    // Initialize map
    mapboxgl.accessToken = MAPBOX_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [0, 0],
      zoom: 2
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Listen to ALL active locations (like Yango)
    const channel = supabase
      .channel('all-locations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_locations'
      }, () => fetchAllLocations())
      .subscribe();

    fetchAllLocations();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchAllLocations = async () => {
    // Fetch all active locations
    const { data: locations } = await supabase
      .from('user_locations')
      .select('*')
      .eq('is_active', true)
      .neq('user_id', user?.id);

    if (locations) {
      // Fetch profiles separately
      const userIds = locations.map(l => l.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, referral_code')
        .in('id', userIds);

      const enrichedLocations = locations.map(loc => ({
        ...loc,
        profiles: profiles?.find(p => p.id === loc.user_id)
      })) as UserLocation[];

      setAllActiveLocations(enrichedLocations);
      updateLocationMarkers(enrichedLocations);
    }
  };

  const updateLocationMarkers = (locations: UserLocation[]) => {
    if (!map.current) return;

    // Remove old markers
    Object.values(sharedMarkers.current).forEach(marker => marker.remove());
    sharedMarkers.current = {};

    // Add new markers for each active location
    locations.forEach(loc => {
      const profile = loc.profiles as any;
      const marker = new mapboxgl.Marker({ color: '#ff6b6b', scale: 0.8 })
        .setLngLat([Number(loc.longitude), Number(loc.latitude)])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-3">
            <p class="font-semibold text-sm">${profile?.full_name || 'Moissonneur'}</p>
            <p class="text-xs text-gray-600">${profile?.referral_code || ''}</p>
            <p class="text-xs text-gray-500 mt-1">${new Date(loc.updated_at).toLocaleString()}</p>
            <button 
              onclick="navigator.clipboard.writeText('${profile?.referral_code}')"
              class="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded"
            >
              Copier le code
            </button>
          </div>
        `))
        .addTo(map.current!);

      sharedMarkers.current[loc.id] = marker;
    });

    // Fit bounds if there are locations
    if (locations.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      locations.forEach(loc => {
        bounds.extend([Number(loc.longitude), Number(loc.latitude)]);
      });
      if (currentLocation) {
        bounds.extend([currentLocation.lng, currentLocation.lat]);
      }
      map.current?.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }
  };

  const startSharing = async () => {
    try {
      // Request geolocation
      if (!navigator.geolocation) {
        toast({ title: 'Erreur', description: 'Géolocalisation non disponible', variant: 'destructive' });
        return;
      }

      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });

          // Update location in database - visible to everyone
          await supabase
            .from('user_locations')
            .upsert({
              user_id: user?.id,
              latitude,
              longitude,
              accuracy,
              is_active: true,
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
            });

          // Update user marker on map
          if (map.current) {
            if (!userMarker.current) {
              userMarker.current = new mapboxgl.Marker({ color: '#3b82f6' })
                .setLngLat([longitude, latitude])
                .setPopup(new mapboxgl.Popup().setHTML('<p>Votre position</p>'))
                .addTo(map.current);
            } else {
              userMarker.current.setLngLat([longitude, latitude]);
            }
            map.current.flyTo({ center: [longitude, latitude], zoom: 14 });
          }
        },
        (error) => {
          toast({ title: 'Erreur de localisation', description: error.message, variant: 'destructive' });
        },
        { enableHighAccuracy: true, maximumAge: 0 }
      );

      setWatchId(id);
      setIsSharing(true);
      toast({ 
        title: 'Position activée', 
        description: 'Vous êtes maintenant visible sur la carte par tous les Moissonneurs' 
      });

    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  const stopSharing = async () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    // Deactivate location sharing
    await supabase
      .from('user_locations')
      .update({ is_active: false })
      .eq('user_id', user?.id);

    userMarker.current?.remove();
    userMarker.current = null;
    setIsSharing(false);
    setCurrentLocation(null);
    toast({ title: 'Partage arrêté', description: 'Votre position n\'est plus partagée' });
  };

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        variant="outline" 
        size="sm"
        className="w-full sm:w-auto"
      >
        <MapPin className="h-4 w-4 mr-2" />
        Localisation
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[95vw] h-[85vh] sm:h-[80vh] max-w-4xl p-3 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg sm:text-xl">Partage de localisation</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 h-full overflow-hidden">
            {/* Map showing all active Moissonneurs */}
            <div ref={mapContainer} className="flex-1 rounded-lg border-2 border-primary/20 min-h-[250px]" />

            <div className="p-2 sm:p-3 bg-primary/10 border border-primary/20 rounded text-xs sm:text-sm flex-shrink-0">
              <p className="font-semibold mb-1">🗺️ Carte des Moissonneurs</p>
              <p className="text-xs text-muted-foreground">
                Tous les Moissonneurs actifs sont visibles. Activez votre position pour être visible.
              </p>
            </div>

            {!isSharing ? (
              <Button onClick={startSharing} className="w-full h-11 text-base" size="lg">
                <Share2 className="h-5 w-5 mr-2" />
                Activer ma position
              </Button>
            ) : (
              <div className="space-y-2 flex-shrink-0">
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    ✓ Votre position est active
                  </p>
                  {currentLocation && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Lat: {currentLocation.lat.toFixed(4)}, Lng: {currentLocation.lng.toFixed(4)}
                    </p>
                  )}
                </div>
                <Button onClick={stopSharing} variant="destructive" className="w-full h-11 text-base">
                  <X className="h-5 w-5 mr-2" />
                  Désactiver ma position
                </Button>
              </div>
            )}

            {allActiveLocations.length > 0 && (
              <div className="border-t pt-2 flex-shrink-0">
                <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Moissonneurs actifs ({allActiveLocations.length})
                </h3>
                <ScrollArea className="h-24 sm:h-32">
                  <div className="space-y-1.5">
                    {allActiveLocations.map(loc => {
                      const profile = loc.profiles as any;
                      return (
                        <div key={loc.id} className="p-2 bg-accent/10 rounded-lg flex justify-between items-center text-xs sm:text-sm">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate">{profile?.full_name || 'Moissonneur'}</p>
                            <p className="text-xs text-muted-foreground">{profile?.referral_code}</p>
                          </div>
                          <p className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                            {new Date(loc.updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}