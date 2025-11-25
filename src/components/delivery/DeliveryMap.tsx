import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Package, Phone, DollarSign, Navigation } from 'lucide-react';
import { UserLocation } from '@/hooks/useGeolocation';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiY2VsdnVzIiwiYSI6ImNtZjVvcm1zejA2dWsyanM5cGdxOTM5NWkifQ.1I0VU-32Ek6bg3sZvpUS0w';

mapboxgl.accessToken = MAPBOX_TOKEN;

interface DeliveryMarker {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_latitude: number;
  customer_longitude: number;
  delivery_commission: number;
  distance: number;
}

interface ActiveUser {
  id: string;
  latitude: number;
  longitude: number;
  distance?: number;
}

interface DeliveryMapProps {
  userLocation: UserLocation | null;
  deliveries: DeliveryMarker[];
  activeUsers?: ActiveUser[];
  selectedDeliveryId: string | null;
  onSelectDelivery: (deliveryId: string) => void;
  onPropose: (deliveryId: string) => void;
}

export default function DeliveryMap({
  userLocation,
  deliveries,
  activeUsers = [],
  selectedDeliveryId,
  onSelectDelivery,
  onPropose,
}: DeliveryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const userMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !userLocation) return;

    if (map.current) {
      // Update center if location changes
      if (map.current.isStyleLoaded()) {
        map.current.flyTo({
          center: [userLocation.longitude, userLocation.latitude],
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
          center: [userLocation.longitude, userLocation.latitude],
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
  }, [userLocation]);

  // Update user marker
  useEffect(() => {
    if (!map.current || !userLocation) return;

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
      .setLngLat([userLocation.longitude, userLocation.latitude])
      .addTo(map.current);

    // Add popup for user location
    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
      `<div class="p-2 text-sm">
        <div class="font-semibold">Votre position</div>
        <div class="text-gray-600">Lat: ${userLocation.latitude.toFixed(4)}</div>
        <div class="text-gray-600">Lng: ${userLocation.longitude.toFixed(4)}</div>
        <div class="text-gray-600">Précision: ±${userLocation.accuracy.toFixed(0)}m</div>
      </div>`
    );
    userMarkerRef.current.setPopup(popup);
  }, [userLocation]);

  // Update delivery markers
  useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    markersRef.current.forEach((marker) => {
      marker.remove();
    });
    markersRef.current.clear();

    // Add new markers
    deliveries.forEach((delivery) => {
      const el = document.createElement('div');
      const isSelected = delivery.id === selectedDeliveryId;

      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.cursor = 'pointer';
      el.style.transition = 'all 0.3s ease';
      el.style.backgroundColor = isSelected ? '#f97316' : '#22c55e';
      el.style.boxShadow = isSelected
        ? '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
        : '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
      el.style.transform = isSelected ? 'scale(1.25)' : 'scale(1)';

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '16');
      svg.setAttribute('height', '16');
      svg.setAttribute('viewBox', '0 0 20 20');
      svg.setAttribute('fill', 'white');
      svg.innerHTML = '<path d="M10.5 1.5H9.5V3h1V1.5zM14.5 5.5L13.5 6.5L14.9 7.9L15.9 6.9L14.5 5.5zM5.5 5.5L4.1 6.9L5.1 7.9L6.5 6.5L5.5 5.5zM10 5C7.24 5 5 7.24 5 10s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 1c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4z"/>';
      el.appendChild(svg);

      el.addEventListener('click', () => {
        onSelectDelivery(delivery.id);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([delivery.customer_longitude, delivery.customer_latitude])
        .addTo(map.current!);

      markersRef.current.set(delivery.id, marker);

      // Add popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div class="p-2">
          <div class="font-semibold">${delivery.customer_address}</div>
          <div class="text-sm text-gray-600">${delivery.customer_city}</div>
          <div class="text-sm text-orange-600 font-bold">${delivery.delivery_commission} FCFA</div>
          <div class="text-xs text-gray-500">${delivery.distance.toFixed(1)} km</div>
        </div>`
      );

      marker.setPopup(popup);
    });
  }, [deliveries, selectedDeliveryId, onSelectDelivery]);

  // Update active user markers
  useEffect(() => {
    if (!map.current) return;

    // Remove old user markers
    userMarkersRef.current.forEach((marker) => {
      marker.remove();
    });
    userMarkersRef.current.clear();

    // Add new user markers
    activeUsers.forEach((user) => {
      const el = document.createElement('div');
      el.style.width = '28px';
      el.style.height = '28px';
      el.style.backgroundColor = '#f97316';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.2)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.cursor = 'pointer';
      el.innerHTML = '<span style="color: white; font-weight: bold; font-size: 12px;">👤</span>';

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([user.longitude, user.latitude])
        .addTo(map.current!);

      userMarkersRef.current.set(user.id, marker);

      // Add popup with distance
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div class="p-2">
          <div class="font-semibold text-sm">Livreur actif</div>
          <div class="text-xs text-gray-600">${user.distance?.toFixed(1) || '?'} km</div>
        </div>`
      );

      marker.setPopup(popup);
    });
  }, [activeUsers]);

  // Fit bounds when deliveries change
  useEffect(() => {
    if (!map.current || (deliveries.length === 0 && activeUsers.length === 0) || !userLocation) return;

    const bounds = new mapboxgl.LngLatBounds(
      [userLocation.longitude, userLocation.latitude],
      [userLocation.longitude, userLocation.latitude]
    );

    deliveries.forEach((delivery) => {
      bounds.extend([delivery.customer_longitude, delivery.customer_latitude]);
    });

    activeUsers.forEach((user) => {
      bounds.extend([user.longitude, user.latitude]);
    });

    map.current.fitBounds(bounds, { padding: 50 });
  }, [deliveries, activeUsers, userLocation]);

  const selectedDelivery = deliveries.find((d) => d.id === selectedDeliveryId);

  if (!userLocation) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Chargement de la localisation...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div style={{ width: '100%', height: '600px', position: 'relative' }} className="rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
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

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-4 h-4" />
              Livraisons disponibles
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {deliveries.length} livraison(s) disponible(s)
            </p>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
            {deliveries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune livraison trouvée</p>
              </div>
            ) : (
              deliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  onClick={() => onSelectDelivery(delivery.id)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedDeliveryId === delivery.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300 bg-gray-50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">
                          {delivery.customer_address}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {delivery.customer_city}
                        </div>
                      </div>
                      <Badge variant="default" className="whitespace-nowrap ml-2">
                        <DollarSign className="w-3 h-3 mr-1" />
                        {delivery.delivery_commission}
                      </Badge>
                    </div>

                    <div className="text-xs text-gray-600 flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      {delivery.distance.toFixed(1)} km
                    </div>

                    {selectedDeliveryId === delivery.id && (
                      <div className="space-y-2 pt-2 border-t">
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            {delivery.customer_phone}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            {delivery.customer_address}
                          </div>
                        </div>
                        <Button
                          onClick={() => onPropose(delivery.id)}
                          className="w-full mt-2"
                          size="sm"
                        >
                          📦 Proposer de livrer
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
