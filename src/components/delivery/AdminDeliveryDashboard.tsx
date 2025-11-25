import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { AlertCircle, Loader2, MapPin, Package, Users, Filter } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiY2VsdnVzIiwiYSI6ImNtZjVvcm1zejA2dWsyanM5cGdxOTM5NWkifQ.1I0VU-32Ek6bg3sZvpUS0w';

mapboxgl.accessToken = MAPBOX_TOKEN;

interface Delivery {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_latitude: number;
  customer_longitude: number;
  delivery_commission: number;
  status: string;
  deliverer_id: string | null;
  deliverer_name?: string;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  user_name: string;
  user_phone?: string;
  user_email?: string;
  last_updated: string;
}

export default function AdminDeliveryDashboard() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'stats'>('map');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'assigned' | 'in_transit' | 'delivered'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const deliveryMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const memberMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [0, 0],
      zoom: 2,
    });

    map.current.addControl(new mapboxgl.NavigationControl());
  }, []);

  // Fetch deliveries and members
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all deliveries
      const { data: deliveriesData, error: delError } = await supabase
        .from('delivery_packages')
        .select('*')
        .eq('delivery_method', 'community_delivery')
        .order('created_at', { ascending: false });

      if (delError) throw delError;

      // Fetch deliverer names
      const enrichedDeliveries: Delivery[] = [];
      for (const delivery of deliveriesData || []) {
        let deliverer_name = null;
        if (delivery.deliverer_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', delivery.deliverer_id)
            .single();
          deliverer_name = profile?.full_name;
        }

        enrichedDeliveries.push({
          ...delivery,
          deliverer_name: deliverer_name || undefined,
        });
      }

      setDeliveries(enrichedDeliveries);

      // Fetch all active members with locations
      const { data: locationsData, error: locError } = await supabase
        .from('user_locations')
        .select('id, user_id, latitude, longitude, accuracy, updated_at')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (locError) throw locError;

      // Fetch user info for each location
      const enrichedMembers: Member[] = [];
      for (const location of locationsData || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone_number, email')
          .eq('id', location.user_id)
          .single();

        enrichedMembers.push({
          id: location.id,
          user_id: location.user_id,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          user_name: profile?.full_name || 'Membre',
          user_phone: profile?.phone_number,
          user_email: profile?.email,
          last_updated: new Date(location.updated_at).toLocaleTimeString('fr-FR'),
        });
      }

      setMembers(enrichedMembers);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des données:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update delivery markers
  useEffect(() => {
    if (!map.current) return;

    deliveryMarkersRef.current.forEach((marker) => {
      marker.remove();
    });
    deliveryMarkersRef.current.clear();

    deliveries
      .filter((d) => {
        if (statusFilter !== 'all' && d.status !== statusFilter) return false;
        if (searchTerm && !d.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        return true;
      })
      .forEach((delivery) => {
        if (!delivery.customer_latitude || !delivery.customer_longitude) return;

        const el = document.createElement('div');
        const statusColor = {
          pending: 'bg-yellow-500',
          assigned: 'bg-blue-500',
          in_transit: 'bg-orange-500',
          delivered: 'bg-green-500',
        };

        el.className = `w-7 h-7 rounded-full border-2 border-white shadow-md ${statusColor[delivery.status as keyof typeof statusColor] || 'bg-gray-500'} flex items-center justify-center cursor-pointer`;
        el.innerHTML = '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.5 1.5H9.5V3h1V1.5zM14.5 5.5L13.5 6.5L14.9 7.9L15.9 6.9L14.5 5.5zM5.5 5.5L4.1 6.9L5.1 7.9L6.5 6.5L5.5 5.5zM10 5C7.24 5 5 7.24 5 10s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 1c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4z"/></svg>';

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([delivery.customer_longitude, delivery.customer_latitude])
          .addTo(map.current!);

        const popupContent = `
          <div class="p-2 text-sm">
            <div class="font-semibold">${delivery.customer_name}</div>
            <div class="text-gray-600">${delivery.customer_address}</div>
            <div class="text-orange-600 font-bold mt-1">${delivery.delivery_commission} FCFA</div>
            <div class="text-xs text-gray-500 mt-1">Status: <span class="font-semibold">${delivery.status}</span></div>
            ${delivery.deliverer_name ? `<div class="text-xs text-gray-500">Livreur: ${delivery.deliverer_name}</div>` : ''}
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent);
        marker.setPopup(popup);
        deliveryMarkersRef.current.set(delivery.id, marker);
      });
  }, [deliveries, statusFilter, searchTerm]);

  // Update member markers
  useEffect(() => {
    if (!map.current) return;

    memberMarkersRef.current.forEach((marker) => {
      marker.remove();
    });
    memberMarkersRef.current.clear();

    members.forEach((member) => {
      const el = document.createElement('div');
      el.className = 'w-6 h-6 rounded-full border-2 border-white shadow-md bg-purple-500 flex items-center justify-center';
      el.innerHTML = '<svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10 10a3 3 0 100-6 3 3 0 000 6zM3 10a7 7 0 1114 0 7 7 0 01-14 0z"/></svg>';

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([member.longitude, member.latitude])
        .addTo(map.current!);

      const popupContent = `
        <div class="p-2 text-sm">
          <div class="font-semibold">${member.user_name}</div>
          ${member.user_phone ? `<div class="text-xs text-gray-600">${member.user_phone}</div>` : ''}
          <div class="text-xs text-gray-500">Mis à jour: ${member.last_updated}</div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent);
      marker.setPopup(popup);
      memberMarkersRef.current.set(member.id, marker);
    });
  }, [members]);

  // Fit bounds to show all markers
  useEffect(() => {
    if (!map.current || (deliveries.length === 0 && members.length === 0)) return;

    const bounds = new mapboxgl.LngLatBounds();
    let hasMarkers = false;

    deliveries.forEach((delivery) => {
      if (delivery.customer_latitude && delivery.customer_longitude) {
        bounds.extend([delivery.customer_longitude, delivery.customer_latitude]);
        hasMarkers = true;
      }
    });

    members.forEach((member) => {
      bounds.extend([member.longitude, member.latitude]);
      hasMarkers = true;
    });

    if (hasMarkers) {
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [deliveries, members]);

  const stats = {
    total: deliveries.length,
    pending: deliveries.filter((d) => d.status === 'pending').length,
    assigned: deliveries.filter((d) => d.status === 'assigned').length,
    in_transit: deliveries.filter((d) => d.status === 'in_transit').length,
    delivered: deliveries.filter((d) => d.status === 'delivered').length,
    activeMembers: members.length,
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Tableau de Bord Livraisons (Admin)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : '🔄'}
            Actualiser
          </Button>
        </CardContent>
      </Card>

      <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="map">🗺️ Carte</TabsTrigger>
          <TabsTrigger value="list">📋 Liste</TabsTrigger>
          <TabsTrigger value="stats">📊 Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div ref={mapContainer} className="w-full h-[700px] rounded-lg border overflow-hidden" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex gap-2">
                <Input
                  placeholder="Rechercher par nom de client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="assigned">Assignée</option>
                  <option value="in_transit">En transit</option>
                  <option value="delivered">Livrée</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[700px] overflow-y-auto">
              {deliveries
                .filter((d) => {
                  if (statusFilter !== 'all' && d.status !== statusFilter) return false;
                  if (searchTerm && !d.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return false;
                  }
                  return true;
                })
                .map((delivery) => (
                  <Card key={delivery.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="font-semibold">{delivery.customer_name}</div>
                            <div className="text-sm text-muted-foreground">{delivery.customer_address}</div>
                          </div>
                          <Badge variant={delivery.status === 'pending' ? 'secondary' : 'default'}>
                            {delivery.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <div className="text-muted-foreground">{delivery.customer_phone}</div>
                          <div className="font-semibold text-orange-600">{delivery.delivery_commission} FCFA</div>
                        </div>
                        {delivery.deliverer_name && (
                          <div className="text-xs text-blue-600">
                            Livreur: {delivery.deliverer_name}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
                  <div className="text-sm text-muted-foreground">En attente</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.assigned}</div>
                  <div className="text-sm text-muted-foreground">Assignées</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{stats.in_transit}</div>
                  <div className="text-sm text-muted-foreground">En transit</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{stats.delivered}</div>
                  <div className="text-sm text-muted-foreground">Livrées</div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{stats.activeMembers}</div>
                    <div className="text-sm text-muted-foreground">Membres actifs avec localisation</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
