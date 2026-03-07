import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Loader2, MapPin, Navigation, Phone, MessageSquare, Star, ArrowLeft, Check, X, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function DriverDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);
  const [pendingRides, setPendingRides] = useState<any[]>([]);
  const [myRides, setMyRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => { document.title = 'Tableau de bord Conducteur'; }, []);
  useEffect(() => { if (!user) navigate('/auth'); }, [user, navigate]);

  const fetchDriver = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any).from('transport_drivers')
      .select('*').eq('user_id', user.id).maybeSingle();
    setDriver(data);
    if (data) {
      setIsOnline(data.status === 'available');
      const { data: v } = await (supabase as any).from('transport_vehicles')
        .select('*').eq('driver_id', data.id).eq('is_active', true).maybeSingle();
      setVehicle(v);
    }
    setLoading(false);
  }, [user]);

  const fetchPendingRides = useCallback(async () => {
    const { data } = await (supabase as any).from('transport_rides')
      .select('*').eq('status', 'pending').order('created_at', { ascending: false });
    setPendingRides(data || []);
  }, []);

  const fetchMyRides = useCallback(async () => {
    if (!driver) return;
    const { data } = await (supabase as any).from('transport_rides')
      .select('*').eq('driver_id', driver.id)
      .in('status', ['accepted', 'driver_arriving', 'in_progress'])
      .order('created_at', { ascending: false });
    setMyRides(data || []);
  }, [driver]);

  useEffect(() => { fetchDriver(); }, [fetchDriver]);
  useEffect(() => {
    if (driver) { fetchPendingRides(); fetchMyRides(); }
  }, [driver, fetchPendingRides, fetchMyRides]);

  // Realtime subscriptions
  useEffect(() => {
    const ch = (supabase as any).channel('driver-rides').on(
      'postgres_changes', { event: '*', schema: 'public', table: 'transport_rides' },
      () => { fetchPendingRides(); fetchMyRides(); }
    ).subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [fetchPendingRides, fetchMyRides]);

  // GPS tracking
  useEffect(() => {
    if (!isOnline || !driver || !navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(loc);
        await (supabase as any).from('transport_drivers').update({
          current_latitude: loc.lat, current_longitude: loc.lng,
          last_location_update: new Date().toISOString()
        }).eq('id', driver.id);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [isOnline, driver]);

  const toggleOnline = async () => {
    if (!driver) return;
    const newStatus = isOnline ? 'offline' : 'available';
    await (supabase as any).from('transport_drivers').update({ status: newStatus }).eq('id', driver.id);
    setIsOnline(!isOnline);
    toast({ title: !isOnline ? '🟢 Vous êtes en ligne' : '🔴 Vous êtes hors ligne' });
  };

  const acceptRide = async (rideId: string) => {
    if (!driver) return;
    setAccepting(rideId);
    const { error } = await (supabase as any).from('transport_rides').update({
      driver_id: driver.id, status: 'accepted', accepted_at: new Date().toISOString()
    }).eq('id', rideId).eq('status', 'pending');
    if (error) toast({ title: 'Erreur', description: 'Course déjà prise', variant: 'destructive' });
    else {
      toast({ title: '✅ Course acceptée !' });
      await (supabase as any).from('transport_drivers').update({ status: 'busy' }).eq('id', driver.id);
      setIsOnline(false);
      fetchPendingRides(); fetchMyRides();
    }
    setAccepting(null);
  };

  const updateRideStatus = async (rideId: string, status: string) => {
    const updates: any = { status };
    if (status === 'driver_arriving') updates.driver_arrived_at = null;
    if (status === 'in_progress') updates.started_at = new Date().toISOString();
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
      updates.payment_status = 'completed';
      // Set driver back to available
      await (supabase as any).from('transport_drivers').update({ status: 'available' }).eq('id', driver.id);
      setIsOnline(true);
    }
    await (supabase as any).from('transport_rides').update(updates).eq('id', rideId);
    fetchMyRides();
    toast({ title: status === 'completed' ? '✅ Course terminée' : '📍 Statut mis à jour' });
  };

  const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!driver) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full"><CardContent className="py-12 text-center">
        <p className="text-lg font-medium mb-2">Vous n'êtes pas inscrit comme conducteur</p>
        <p className="text-muted-foreground mb-4">Contactez l'administrateur pour être ajouté.</p>
        <Button onClick={() => navigate('/dashboard')}>Retour au tableau de bord</Button>
      </CardContent></Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-6 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-2xl font-bold">🚖 Conducteur</h1>
              <p className="text-sm text-muted-foreground">{driver.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">{isOnline ? '🟢 En ligne' : '🔴 Hors ligne'}</span>
            <Switch checked={isOnline} onCheckedChange={toggleOnline} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="pt-4 text-center"><Star className="h-5 w-5 mx-auto text-yellow-500" /><p className="text-xl font-bold">{driver.rating}</p><p className="text-xs text-muted-foreground">Note</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><Navigation className="h-5 w-5 mx-auto text-primary" /><p className="text-xl font-bold">{driver.total_rides}</p><p className="text-xs text-muted-foreground">Courses</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><DollarSign className="h-5 w-5 mx-auto text-green-500" /><p className="text-xl font-bold">{(driver.total_earnings || 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">FCFA</p></CardContent></Card>
        </div>

        {vehicle && (
          <Card><CardContent className="py-3 flex items-center gap-3">
            <span className="text-2xl">{vehicle.vehicle_type === 'moto' ? '🏍️' : vehicle.vehicle_type === 'mini_remorque' ? '🚛' : vehicle.vehicle_type === 'remorque' ? '🚚' : '🚗'}</span>
            <div>
              <p className="font-medium">{vehicle.brand} {vehicle.model} — {vehicle.plate_number}</p>
              <p className="text-xs text-muted-foreground">{vehicle.color} · {vehicle.service_class?.toUpperCase()}</p>
            </div>
          </CardContent></Card>
        )}

        {/* Active rides */}
        {myRides.length > 0 && (
          <Card>
            <CardHeader><CardTitle>🎯 Course en cours</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {myRides.map(r => (
                <div key={r.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm"><MapPin className="h-3 w-3 inline text-green-500" /> {r.pickup_address}</p>
                      <p className="text-sm"><MapPin className="h-3 w-3 inline text-red-500" /> {r.dropoff_address}</p>
                    </div>
                    <Badge>{(r.estimated_fare || 0).toLocaleString()} F</Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {r.status === 'accepted' && (
                      <Button size="sm" onClick={() => updateRideStatus(r.id, 'driver_arriving')}>
                        <Navigation className="h-3 w-3 mr-1" /> En route vers client
                      </Button>
                    )}
                    {r.status === 'driver_arriving' && (
                      <Button size="sm" onClick={() => updateRideStatus(r.id, 'in_progress')}>
                        <Check className="h-3 w-3 mr-1" /> Démarrer la course
                      </Button>
                    )}
                    {r.status === 'in_progress' && (
                      <Button size="sm" onClick={() => updateRideStatus(r.id, 'completed')}>
                        <Check className="h-3 w-3 mr-1" /> Terminer la course
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => navigate('/messages')}>
                      <MessageSquare className="h-3 w-3 mr-1" /> Chat
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Pending rides */}
        {isOnline && (
          <Card>
            <CardHeader><CardTitle>📦 Courses disponibles ({pendingRides.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {pendingRides.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Aucune course en attente</p>
              ) : pendingRides.map(r => {
                const dist = myLocation ? calcDistance(myLocation.lat, myLocation.lng, r.pickup_latitude, r.pickup_longitude) : null;
                return (
                  <div key={r.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium"><MapPin className="h-3 w-3 inline text-green-500" /> {r.pickup_address}</p>
                        <p className="text-sm"><MapPin className="h-3 w-3 inline text-red-500" /> {r.dropoff_address}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{r.vehicle_type} · {r.service_class}</Badge>
                          {dist !== null && <Badge variant="outline" className="text-xs">📍 {dist.toFixed(1)} km</Badge>}
                          {r.distance_km && <Badge variant="outline" className="text-xs">🛣️ {r.distance_km} km</Badge>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{(r.estimated_fare || 0).toLocaleString()} F</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'HH:mm', { locale: fr })}</p>
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => acceptRide(r.id)} disabled={accepting === r.id}>
                      {accepting === r.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                      Accepter la course
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
