import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, MapPin, Navigation, ArrowLeft, Star, Phone, MessageSquare, X, Car } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiY2VsdnVzIiwiYSI6ImNtZjVvcm1zejA2dWsyanM5cGdxOTM5NWkifQ.1I0VU-32Ek6bg3sZvpUS0w';

interface LocationSuggestion {
  place_name: string;
  center: [number, number];
}

export default function BookRide() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);

  const [pickupQuery, setPickupQuery] = useState('');
  const [dropoffQuery, setDropoffQuery] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState<LocationSuggestion[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<LocationSuggestion[]>([]);
  const [pickup, setPickup] = useState<{ address: string; lat: number; lng: number } | null>(null);
  const [dropoff, setDropoff] = useState<{ address: string; lat: number; lng: number } | null>(null);
  const [vehicleType, setVehicleType] = useState('vehicule');
  const [serviceClass, setServiceClass] = useState('standard');
  const [estimatedFare, setEstimatedFare] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [booking, setBooking] = useState(false);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [rideDriver, setRideDriver] = useState<any>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [showRating, setShowRating] = useState(false);
  const [rideHistory, setRideHistory] = useState<any[]>([]);

  useEffect(() => { document.title = 'Commander un transport'; }, []);
  useEffect(() => { if (!user) navigate('/auth'); }, [user, navigate]);

  // Check for active ride
  const fetchActiveRide = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any).from('transport_rides')
      .select('*').eq('rider_id', user.id)
      .in('status', ['pending', 'accepted', 'driver_arriving', 'in_progress'])
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    setActiveRide(data);
    if (data?.driver_id) {
      const { data: d } = await (supabase as any).from('transport_drivers')
        .select('*').eq('id', data.driver_id).maybeSingle();
      setRideDriver(d);
    }
    if (data?.status === 'completed' && !data.rider_rating) setShowRating(true);
  }, [user]);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any).from('transport_rides')
      .select('*').eq('rider_id', user.id)
      .in('status', ['completed', 'cancelled'])
      .order('created_at', { ascending: false }).limit(20);
    setRideHistory(data || []);
  }, [user]);

  useEffect(() => { fetchActiveRide(); fetchHistory(); }, [fetchActiveRide, fetchHistory]);

  // Realtime ride updates
  useEffect(() => {
    if (!user) return;
    const ch = (supabase as any).channel('rider-rides').on(
      'postgres_changes', { event: '*', schema: 'public', table: 'transport_rides', filter: `rider_id=eq.${user.id}` },
      (payload: any) => {
        fetchActiveRide();
        if (payload.new?.status === 'accepted') toast({ title: '🚖 Chauffeur trouvé !', description: 'Un conducteur a accepté votre course' });
        if (payload.new?.status === 'driver_arriving') toast({ title: '📍 Chauffeur en route', description: 'Le conducteur arrive vers vous' });
        if (payload.new?.status === 'completed') { toast({ title: '✅ Course terminée' }); setShowRating(true); fetchHistory(); }
      }
    ).subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [user, fetchActiveRide, fetchHistory]);

  // Track driver location on map
  useEffect(() => {
    if (!activeRide?.driver_id || !rideDriver || !mapInstanceRef.current) return;
    const interval = setInterval(async () => {
      const { data } = await (supabase as any).from('transport_drivers')
        .select('current_latitude, current_longitude').eq('id', activeRide.driver_id).maybeSingle();
      if (data?.current_latitude && mapInstanceRef.current) {
        const lngLat = [data.current_longitude, data.current_latitude];
        if (driverMarkerRef.current) {
          driverMarkerRef.current.setLngLat(lngLat);
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeRide, rideDriver]);

  // Geocoding search
  const searchLocation = async (query: string, type: 'pickup' | 'dropoff') => {
    if (query.length < 3) { type === 'pickup' ? setPickupSuggestions([]) : setDropoffSuggestions([]); return; }
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5&language=fr`);
      const data = await res.json();
      const suggestions = (data.features || []).map((f: any) => ({ place_name: f.place_name, center: f.center }));
      type === 'pickup' ? setPickupSuggestions(suggestions) : setDropoffSuggestions(suggestions);
    } catch { /* ignore */ }
  };

  const selectLocation = (suggestion: LocationSuggestion, type: 'pickup' | 'dropoff') => {
    const loc = { address: suggestion.place_name, lat: suggestion.center[1], lng: suggestion.center[0] };
    if (type === 'pickup') { setPickup(loc); setPickupQuery(suggestion.place_name); setPickupSuggestions([]); }
    else { setDropoff(loc); setDropoffQuery(suggestion.place_name); setDropoffSuggestions([]); }
  };

  const useMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&limit=1&language=fr`);
          const data = await res.json();
          const name = data.features?.[0]?.place_name || 'Ma position';
          setPickup({ address: name, lat: latitude, lng: longitude });
          setPickupQuery(name);
        } catch {
          setPickup({ address: 'Ma position', lat: latitude, lng: longitude });
          setPickupQuery('Ma position');
        }
      },
      () => toast({ title: 'Erreur GPS', variant: 'destructive' }),
      { enableHighAccuracy: true }
    );
  };

  // Calculate fare
  useEffect(() => {
    if (!pickup || !dropoff) { setEstimatedFare(null); return; }
    const calcRoute = async () => {
      try {
        const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?access_token=${MAPBOX_TOKEN}`);
        const data = await res.json();
        const route = data.routes?.[0];
        if (route) {
          const km = route.distance / 1000;
          const min = route.duration / 60;
          setDistanceKm(Math.round(km * 10) / 10);
          setDurationMin(Math.round(min));
          calculateFare(km, min);
        }
      } catch { /* ignore */ }
    };
    const calculateFare = async (km: number, min: number) => {
      const { data: pricing } = await (supabase as any).from('transport_pricing')
        .select('*').eq('vehicle_type', vehicleType).eq('service_class', serviceClass).eq('is_active', true).maybeSingle();
      if (!pricing) { setEstimatedFare(null); return; }
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      let multiplier = 1;
      // Night
      if (hour >= pricing.night_start_hour || hour < pricing.night_end_hour) multiplier = Math.max(multiplier, pricing.night_multiplier);
      // Weekend
      if (day === 0 || day === 6) multiplier = Math.max(multiplier, pricing.weekend_multiplier);
      // Peak hours
      if ((hour >= pricing.peak_start_hour && hour < pricing.peak_end_hour) || (hour >= pricing.peak_evening_start && hour < pricing.peak_evening_end))
        multiplier = Math.max(multiplier, pricing.peak_hour_multiplier);
      // Strike
      if (pricing.is_strike_active) multiplier = Math.max(multiplier, pricing.strike_multiplier);

      const fare = Math.max(pricing.min_fare, Math.round((pricing.base_fare + km * pricing.price_per_km + min * pricing.price_per_minute) * multiplier));
      setEstimatedFare(fare);
    };
    calcRoute();
  }, [pickup, dropoff, vehicleType, serviceClass]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const loadMap = async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: mapRef.current!,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [2.3514, 6.3703], // Cotonou default
        zoom: 13,
      });
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      mapInstanceRef.current = map;
    };
    loadMap();
    return () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null; };
  }, []);

  // Update map markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const mapboxgl = (window as any).mapboxgl;
    if (!mapboxgl) return;
    // This would update markers — simplified for now
  }, [pickup, dropoff]);

  const bookRide = async () => {
    if (!user || !pickup || !dropoff || !estimatedFare) return;
    setBooking(true);

    // Check wallet balance
    const { data: wallet } = await (supabase as any).from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
    if (!wallet || wallet.balance < estimatedFare) {
      toast({ title: 'Solde insuffisant', description: `Vous avez ${wallet?.balance || 0} FCFA. La course coûte ${estimatedFare} FCFA.`, variant: 'destructive' });
      setBooking(false); return;
    }

    // Get rider profile for MSN channel
    const { data: profile } = await (supabase as any).from('profiles').select('referral_code').eq('id', user.id).maybeSingle();

    const { data: ride, error } = await (supabase as any).from('transport_rides').insert({
      rider_id: user.id,
      vehicle_type: vehicleType,
      service_class: serviceClass,
      pickup_address: pickup.address,
      pickup_latitude: pickup.lat,
      pickup_longitude: pickup.lng,
      dropoff_address: dropoff.address,
      dropoff_latitude: dropoff.lat,
      dropoff_longitude: dropoff.lng,
      distance_km: distanceKm,
      duration_minutes: durationMin,
      estimated_fare: estimatedFare,
      fare_multiplier: 1,
      msn_channel_id: profile?.referral_code || null,
    }).select().single();

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '🚖 Course commandée !', description: 'Recherche d\'un conducteur...' });
      setActiveRide(ride);
    }
    setBooking(false);
  };

  const cancelRide = async () => {
    if (!activeRide) return;
    await (supabase as any).from('transport_rides').update({
      status: 'cancelled', cancelled_by: user?.id, cancelled_at: new Date().toISOString(), cancellation_reason: 'Annulé par le client'
    }).eq('id', activeRide.id);
    setActiveRide(null);
    toast({ title: 'Course annulée' });
    fetchHistory();
  };

  const submitRating = async () => {
    if (!activeRide) return;
    await (supabase as any).from('transport_rides').update({ rider_rating: ratingValue }).eq('id', activeRide.id);
    // Update driver rating
    if (activeRide.driver_id) {
      const { data: allRides } = await (supabase as any).from('transport_rides')
        .select('rider_rating').eq('driver_id', activeRide.driver_id).not('rider_rating', 'is', null);
      if (allRides?.length) {
        const avg = allRides.reduce((s: number, r: any) => s + r.rider_rating, 0) / allRides.length;
        await (supabase as any).from('transport_drivers').update({ rating: Math.round(avg * 100) / 100, total_rides: allRides.length }).eq('id', activeRide.driver_id);
      }
    }
    setShowRating(false);
    setActiveRide(null);
    toast({ title: '⭐ Merci pour votre note !' });
    fetchHistory();
  };

  const statusLabels: Record<string, string> = {
    pending: '⏳ Recherche d\'un chauffeur...',
    accepted: '✅ Chauffeur trouvé !',
    driver_arriving: '🚗 Le chauffeur arrive...',
    in_progress: '🛣️ Course en cours',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto max-w-4xl py-6 px-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-2xl font-bold">🚖 Commander un transport</h1>
        </div>

        {/* Active ride tracker */}
        {activeRide && (
          <Card className="border-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{statusLabels[activeRide.status] || activeRide.status}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm"><MapPin className="h-3 w-3 inline text-green-500" /> {activeRide.pickup_address}</p>
                <p className="text-sm"><MapPin className="h-3 w-3 inline text-red-500" /> {activeRide.dropoff_address}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge>{(activeRide.estimated_fare || 0).toLocaleString()} FCFA</Badge>
                <Badge variant="outline">{activeRide.distance_km} km</Badge>
              </div>
              {rideDriver && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{rideDriver.full_name}</p>
                    <div className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500" /><span className="text-sm">{rideDriver.rating}</span></div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate('/messages')}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {['pending', 'accepted'].includes(activeRide.status) && (
                <Button variant="destructive" onClick={cancelRide} className="w-full"><X className="h-4 w-4 mr-1" /> Annuler la course</Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Rating modal */}
        {showRating && (
          <Card className="border-yellow-500">
            <CardHeader><CardTitle>⭐ Notez votre course</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <button key={v} onClick={() => setRatingValue(v)} className="text-3xl">
                    {v <= ratingValue ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
              <Button onClick={submitRating} className="w-full">Envoyer la note</Button>
            </CardContent>
          </Card>
        )}

        {/* Booking form */}
        {!activeRide && !showRating && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Pickup */}
              <div className="relative">
                <Label>📍 Point de départ</Label>
                <div className="flex gap-2">
                  <Input value={pickupQuery} onChange={e => { setPickupQuery(e.target.value); searchLocation(e.target.value, 'pickup'); }} placeholder="Entrez une adresse..." />
                  <Button size="sm" variant="outline" onClick={useMyLocation}><Navigation className="h-4 w-4" /></Button>
                </div>
                {pickupSuggestions.length > 0 && (
                  <div className="absolute z-20 w-full bg-background border rounded-md mt-1 shadow-lg max-h-48 overflow-y-auto">
                    {pickupSuggestions.map((s, i) => (
                      <button key={i} onClick={() => selectLocation(s, 'pickup')} className="w-full text-left px-3 py-2 hover:bg-muted text-sm">{s.place_name}</button>
                    ))}
                  </div>
                )}
                {pickup && <p className="text-xs text-green-600 mt-1">✅ {pickup.address}</p>}
              </div>

              {/* Dropoff */}
              <div className="relative">
                <Label>🏁 Destination</Label>
                <Input value={dropoffQuery} onChange={e => { setDropoffQuery(e.target.value); searchLocation(e.target.value, 'dropoff'); }} placeholder="Entrez la destination..." />
                {dropoffSuggestions.length > 0 && (
                  <div className="absolute z-20 w-full bg-background border rounded-md mt-1 shadow-lg max-h-48 overflow-y-auto">
                    {dropoffSuggestions.map((s, i) => (
                      <button key={i} onClick={() => selectLocation(s, 'dropoff')} className="w-full text-left px-3 py-2 hover:bg-muted text-sm">{s.place_name}</button>
                    ))}
                  </div>
                )}
                {dropoff && <p className="text-xs text-green-600 mt-1">✅ {dropoff.address}</p>}
              </div>

              {/* Vehicle type & class */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type de véhicule</Label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="moto">🏍️ Moto</SelectItem>
                      <SelectItem value="vehicule">🚗 Véhicule</SelectItem>
                      <SelectItem value="mini_remorque">🚛 Mini Remorque</SelectItem>
                      <SelectItem value="remorque">🚚 Remorque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Classe</Label>
                  <Select value={serviceClass} onValueChange={setServiceClass}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="vvip">VVIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fare estimate */}
              {estimatedFare !== null && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Tarif estimé</p>
                  <p className="text-3xl font-bold text-primary">{estimatedFare.toLocaleString()} FCFA</p>
                  <div className="flex justify-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>📏 {distanceKm} km</span>
                    <span>⏱️ ~{durationMin} min</span>
                  </div>
                </div>
              )}

              <Button onClick={bookRide} disabled={!pickup || !dropoff || !estimatedFare || booking} className="w-full h-12 text-lg">
                {booking ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Car className="h-5 w-5 mr-2" />}
                Commander la course
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Map */}
        <Card>
          <CardContent className="p-0">
            <div ref={mapRef} className="w-full h-[300px] rounded-lg" />
          </CardContent>
        </Card>

        {/* History */}
        {rideHistory.length > 0 && (
          <Card>
            <CardHeader><CardTitle>📋 Historique des courses</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {rideHistory.map(r => (
                <div key={r.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="text-sm truncate max-w-[200px]">{r.dropoff_address}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'dd/MM/yy HH:mm', { locale: fr })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{(r.final_fare || r.estimated_fare || 0).toLocaleString()} F</p>
                    <Badge variant={r.status === 'completed' ? 'default' : 'destructive'} className="text-xs">
                      {r.status === 'completed' ? '✅' : '❌'}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
