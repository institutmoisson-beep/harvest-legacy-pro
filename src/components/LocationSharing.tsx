import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTNtZDJiMGswMDh3MmpxeWlnbmlsYjBmIn0.VPJ3C1vhfTqzSGevKDZ1_g';

export default function LocationSharing() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [recipientCode, setRecipientCode] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sharedLocations, setSharedLocations] = useState<UserLocation[]>([]);
  
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

    // Listen to shared locations
    const channel = supabase
      .channel('location-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_locations',
        filter: `shared_with_user_id=eq.${user.id}`
      }, () => fetchSharedLocations())
      .subscribe();

    fetchSharedLocations();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchSharedLocations = async () => {
    const { data } = await supabase
      .from('user_locations')
      .select('*')
      .eq('shared_with_user_id', user?.id)
      .eq('is_active', true);

    if (data) {
      setSharedLocations(data);
      updateSharedMarkers(data);
    }
  };

  const updateSharedMarkers = (locations: UserLocation[]) => {
    if (!map.current) return;

    // Remove old markers
    Object.values(sharedMarkers.current).forEach(marker => marker.remove());
    sharedMarkers.current = {};

    // Add new markers
    locations.forEach(loc => {
      const marker = new mapboxgl.Marker({ color: '#ff6b6b' })
        .setLngLat([Number(loc.longitude), Number(loc.latitude)])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <p class="font-semibold">Position partagée</p>
            <p class="text-sm text-gray-600">${new Date(loc.updated_at).toLocaleString()}</p>
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
      map.current?.fitBounds(bounds, { padding: 50 });
    }
  };

  const startSharing = async () => {
    if (!recipientCode) {
      toast({ title: 'Erreur', description: 'Entrez un code Moissonneur', variant: 'destructive' });
      return;
    }

    try {
      // Find recipient
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', recipientCode.toUpperCase())
        .single();

      if (!profile) {
        toast({ title: 'Introuvable', description: 'Code moissonneur invalide', variant: 'destructive' });
        return;
      }

      // Request geolocation
      if (!navigator.geolocation) {
        toast({ title: 'Erreur', description: 'Géolocalisation non disponible', variant: 'destructive' });
        return;
      }

      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });

          // Update location in database
          await supabase
            .from('user_locations')
            .upsert({
              user_id: user?.id,
              shared_with_user_id: profile.id,
              latitude,
              longitude,
              accuracy,
              is_active: true,
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
            }, {
              onConflict: 'user_id,shared_with_user_id'
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
      toast({ title: 'Partage activé', description: 'Votre position est partagée en temps réel' });

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
      <Button onClick={() => setIsOpen(true)} variant="outline" size="sm">
        <MapPin className="h-4 w-4 mr-2" />
        Localisation
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Partage de localisation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div ref={mapContainer} className="w-full h-[400px] rounded-lg" />

            {!isSharing ? (
              <div className="space-y-4">
                <div>
                  <Label>Code Moissonneur du destinataire</Label>
                  <Input
                    placeholder="MSN123456"
                    value={recipientCode}
                    onChange={(e) => setRecipientCode(e.target.value.toUpperCase())}
                  />
                </div>
                <Button onClick={startSharing} className="w-full">
                  <Share2 className="h-4 w-4 mr-2" />
                  Commencer le partage
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    ✓ Position partagée en temps réel
                  </p>
                  {currentLocation && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
                    </p>
                  )}
                </div>
                <Button onClick={stopSharing} variant="destructive" className="w-full">
                  <X className="h-4 w-4 mr-2" />
                  Arrêter le partage
                </Button>
              </div>
            )}

            {sharedLocations.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Positions partagées avec vous</h3>
                <div className="space-y-2">
                  {sharedLocations.map(loc => (
                    <div key={loc.id} className="p-3 bg-accent/10 rounded-lg">
                      <p className="text-sm">
                        Position mise à jour: {new Date(loc.updated_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}