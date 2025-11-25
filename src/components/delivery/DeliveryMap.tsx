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

    if (map.current) return; // Prevent multiple initializations

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 13,
    });

    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: false,
      })
    );

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
    el.className = 'w-8 h-8 bg-blue-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center';
    el.innerHTML = '<div class="w-2 h-2 bg-white rounded-full"></div>';

    userMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([userLocation.longitude, userLocation.latitude])
      .addTo(map.current);

    // Center map on user if it's the first time
    if (map.current.getZoom() < 5) {
      map.current.flyTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 13,
        duration: 1000,
      });
    }
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
      el.className = `w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
        isSelected
          ? 'bg-orange-500 border-white shadow-xl scale-125'
          : 'bg-green-500 border-white shadow-md hover:scale-110'
      }`;
      el.innerHTML =
        '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.5 1.5H9.5V3h1V1.5zM14.5 5.5L13.5 6.5L14.9 7.9L15.9 6.9L14.5 5.5zM5.5 5.5L4.1 6.9L5.1 7.9L6.5 6.5L5.5 5.5zM10 5C7.24 5 5 7.24 5 10s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 1c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4z"/></svg>';

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
      el.className = 'w-7 h-7 bg-orange-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center';
      el.innerHTML = '<span class="text-white font-bold text-xs">👤</span>';

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

  return (
    <div className="space-y-4">
      <div style={{ width: '100%', height: '600px' }} className="rounded-lg overflow-hidden border border-gray-200">
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
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
