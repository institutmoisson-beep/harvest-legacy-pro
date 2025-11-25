import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation, useDistance } from '@/hooks/useGeolocation';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { AlertCircle, Loader2, Users, Navigation, Phone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MapSearch from './MapSearch';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiY2VsdnVzIiwiYSI6ImNtZjVvcm1zejA2dWsyanM5cGdxOTM5NWkifQ.1I0VU-32Ek6bg3sZvpUS0w';

mapboxgl.accessToken = MAPBOX_TOKEN;

interface NearbyMember {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  distance: number;
  user_name?: string;
  user_phone?: string;
  user_avatar?: string;
  last_updated: string;
}

export default function MembersNearby() {
  const { user } = useAuth();
  const { location, getCurrentLocation, loading: geoLoading } = useGeolocation();
  const { calculateDistance } = useDistance();

  const [nearbyMembers, setNearbyMembers] = useState<NearbyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [searchLocation, setSearchLocation] = useState<{ latitude: number; longitude: number; name: string } | null>(null);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const searchMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !location) return;

    if (map.current) {
      // Update center if location changes
      if (map.current.isStyleLoaded()) {
        map.current.flyTo({
          center: [location.longitude, location.latitude],
          zoom: 13,
          duration: 1000,
        });
      }
      return;
    }

    const initializeMap = async () => {
      if (!mapContainer.current) return;

      try {
        // Wait a tick to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 0));

        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [location.longitude, location.latitude],
          zoom: 13,
          preserveDrawingBuffer: true,
          antialias: true,
        });

        map.current.on('load', () => {
          if (map.current) {
            try {
              map.current.addControl(
                new mapboxgl.GeolocateControl({
                  positionOptions: {
                    enableHighAccuracy: true,
                  },
                  trackUserLocation: false,
                }),
                'top-left'
              );

              map.current.addControl(
                new mapboxgl.NavigationControl(),
                'top-right'
              );
            } catch (error) {
              console.warn('Error adding controls:', error);
            }
          }
        });

        map.current.on('error', (error) => {
          console.error('Map error:', error);
        });
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initializeMap();

    return () => {
      // Don't destroy the map on unmount to prevent flickering
    };
  }, [location]);

  // Fetch nearby members
  const fetchNearbyMembers = async () => {
    if (!location || !user) return;

    setLoading(true);
    try {
      const { data: locationsData, error: locError } = await supabase
        .from('user_locations')
        .select('id, user_id, latitude, longitude, accuracy, created_at, updated_at')
        .eq('is_active', true)
        .neq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (locError) throw locError;

      if (!locationsData) {
        setNearbyMembers([]);
        return;
      }

      // Filter by distance and fetch user info
      const nearby: NearbyMember[] = [];

      for (const memberLoc of locationsData) {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          memberLoc.latitude,
          memberLoc.longitude
        );

        if (distance <= radiusKm) {
          // Fetch user info
          const { data: userData } = await supabase
            .from('profiles')
            .select('full_name, phone_number, avatar_url')
            .eq('id', memberLoc.user_id)
            .single();

          nearby.push({
            id: memberLoc.id,
            user_id: memberLoc.user_id,
            latitude: memberLoc.latitude,
            longitude: memberLoc.longitude,
            accuracy: memberLoc.accuracy,
            distance,
            user_name: userData?.full_name || 'Membre',
            user_phone: userData?.phone_number,
            user_avatar: userData?.avatar_url,
            last_updated: new Date(memberLoc.updated_at).toLocaleTimeString('fr-FR'),
          });
        }
      }

      // Sort by distance
      nearby.sort((a, b) => a.distance - b.distance);
      setNearbyMembers(nearby);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des membres proches:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get location on mount
  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  // Fetch members when location changes
  useEffect(() => {
    if (location) {
      fetchNearbyMembers();
      const interval = setInterval(fetchNearbyMembers, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [location, radiusKm]);

  // Update user marker
  useEffect(() => {
    if (!map.current || !location) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    const el = document.createElement('div');
    el.style.width = '32px';
    el.style.height = '32px';
    el.style.backgroundColor = '#3b82f6';
    el.style.borderRadius = '50%';
    el.style.border = '4px solid white';
    el.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.cursor = 'pointer';
    el.style.zIndex = '10';

    const innerDot = document.createElement('div');
    innerDot.style.width = '8px';
    innerDot.style.height = '8px';
    innerDot.style.backgroundColor = 'white';
    innerDot.style.borderRadius = '50%';
    el.appendChild(innerDot);

    userMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map.current);

    // Add popup for user location
    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
      `<div style="padding: 8px; font-size: 12px;">
        <div style="font-weight: bold;">Votre position</div>
        <div style="color: #666; margin-top: 4px;">Lat: ${location.latitude.toFixed(4)}</div>
        <div style="color: #666;">Lng: ${location.longitude.toFixed(4)}</div>
        <div style="color: #999;">Précision: ±${location.accuracy?.toFixed(0) || '?'}m</div>
      </div>`
    );
    userMarkerRef.current.setPopup(popup);
  }, [location]);

  // Update member markers
  useEffect(() => {
    if (!map.current) return;

    markersRef.current.forEach((marker) => {
      marker.remove();
    });
    markersRef.current.clear();

    nearbyMembers.forEach((member) => {
      const el = document.createElement('div');
      el.style.width = '28px';
      el.style.height = '28px';
      el.style.backgroundColor = '#a855f7';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.2)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.cursor = 'pointer';

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '14');
      svg.setAttribute('height', '14');
      svg.setAttribute('viewBox', '0 0 20 20');
      svg.setAttribute('fill', 'white');
      svg.innerHTML = '<path d="M10 10a3 3 0 100-6 3 3 0 000 6zM3 10a7 7 0 1114 0 7 7 0 01-14 0z"/>';
      el.appendChild(svg);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([member.longitude, member.latitude])
        .addTo(map.current!);

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div style="padding: 8px; font-size: 12px;">
          <div style="font-weight: bold;">${member.user_name}</div>
          <div style="color: #666; margin-top: 4px;">${member.distance.toFixed(1)} km</div>
          <div style="color: #999;">Mis à jour: ${member.last_updated}</div>
        </div>`
      );

      marker.setPopup(popup);
      markersRef.current.set(member.id, marker);
    });
  }, [nearbyMembers]);

  // Handle search location - zoom and place marker
  useEffect(() => {
    if (!map.current || !searchLocation) return;

    // Remove old search marker
    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
    }

    // Create search location marker
    const el = document.createElement('div');
    el.style.width = '36px';
    el.style.height = '36px';
    el.style.backgroundColor = '#ef4444';
    el.style.borderRadius = '50%';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.cursor = 'pointer';
    el.style.zIndex = '20';

    const innerDot = document.createElement('div');
    innerDot.style.width = '6px';
    innerDot.style.height = '6px';
    innerDot.style.backgroundColor = 'white';
    innerDot.style.borderRadius = '50%';
    el.appendChild(innerDot);

    searchMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([searchLocation.longitude, searchLocation.latitude])
      .addTo(map.current);

    // Add popup for search location
    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
      `<div style="padding: 8px; font-size: 12px;">
        <div style="font-weight: bold; color: #ef4444;">📍 Résultat de recherche</div>
        <div style="color: #666; margin-top: 4px;">${searchLocation.name}</div>
        <div style="color: #999; font-size: 11px;">Lat: ${searchLocation.latitude.toFixed(4)}</div>
        <div style="color: #999; font-size: 11px;">Lng: ${searchLocation.longitude.toFixed(4)}</div>
      </div>`
    );
    searchMarkerRef.current.setPopup(popup);

    // Zoom to search location
    map.current.flyTo({
      center: [searchLocation.longitude, searchLocation.latitude],
      zoom: 15,
      duration: 1500,
    });
  }, [searchLocation]);

  // Fit bounds
  useEffect(() => {
    if (!map.current || nearbyMembers.length === 0 || !location || searchLocation) return;

    const bounds = new mapboxgl.LngLatBounds(
      [location.longitude, location.latitude],
      [location.longitude, location.latitude]
    );

    nearbyMembers.forEach((member) => {
      bounds.extend([member.longitude, member.latitude]);
    });

    map.current.fitBounds(bounds, { padding: 50 });
  }, [nearbyMembers, location, searchLocation]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Membres Disponibles Près de Vous
            </CardTitle>
            <Button onClick={getCurrentLocation} variant="outline" size="sm" disabled={geoLoading}>
              {geoLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : '🔄'}
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {location && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {nearbyMembers.length} membre(s) disponible(s) dans un rayon de {radiusKm} km
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium flex justify-between">
              Rayon de recherche: {radiusKm} km
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

      {location && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              {nearbyMembers.length} membre(s)
              {loading && <Loader2 className="w-4 h-4 ml-auto animate-spin" />}
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
                <div style={{ width: '100%', height: '500px', position: 'relative' }} className="rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                  <div
                    ref={mapContainer}
                    style={{
                      width: '100%',
                      height: '100%',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                    }}
                  />
                </div>
                {nearbyMembers.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                    <div className="text-center text-white">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-70" />
                      <p>Aucun membre disponible pour le moment</p>
                      <p className="text-sm text-gray-300 mt-2">La carte s'affichera quand d'autres membres seront à proximité</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="list" className="p-4">
                {nearbyMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun membre trouvé</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {nearbyMembers.map((member) => (
                      <Card key={member.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <div className="font-semibold text-sm">{member.user_name}</div>
                              <div className="flex items-center gap-3 mt-1">
                                {member.user_phone && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {member.user_phone}
                                  </div>
                                )}
                                <div className="text-xs text-orange-600 flex items-center gap-1">
                                  <Navigation className="w-3 h-3" />
                                  {member.distance.toFixed(1)} km
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Mis à jour: {member.last_updated}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-green-600 border-green-300">
                              Disponible
                            </Badge>
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
    </div>
  );
}
