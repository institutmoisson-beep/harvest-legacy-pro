import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface LocationUpdate {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  updated_at: string;
}

export const useRealtimeLocations = () => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Map<string, LocationUpdate>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionRef = useRef<any>(null);

  // Subscribe to real-time location updates
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('user_locations')
          .select('*')
          .eq('is_active', true)
          .neq('user_id', user.id);

        if (error) throw error;

        const locationMap = new Map<string, LocationUpdate>();
        (data || []).forEach((loc) => {
          locationMap.set(loc.id, {
            id: loc.id,
            user_id: loc.user_id,
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
            updated_at: loc.updated_at,
          });
        });

        setLocations(locationMap);
      } catch (err) {
        console.error('Erreur lors de la récupération des localisations:', err);
      }
    };

    fetchLocations();

    // Subscribe to real-time updates
    subscriptionRef.current = supabase
      .channel('public:user_locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_locations',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newRecord = payload.new as LocationUpdate;
            if (newRecord.user_id !== user.id) {
              setLocations((prev) => {
                const updated = new Map(prev);
                updated.set(newRecord.id, newRecord);
                return updated;
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const oldRecord = payload.old as LocationUpdate;
            setLocations((prev) => {
              const updated = new Map(prev);
              updated.delete(oldRecord.id);
              return updated;
            });
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [user]);

  return { locations, isConnected };
};

// Hook to get location of a specific user
export const useUserLocation = (userId: string) => {
  const [location, setLocation] = useState<LocationUpdate | null>(null);
  const [loading, setLoading] = useState(false);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);

    const fetchLocation = async () => {
      try {
        const { data, error } = await supabase
          .from('user_locations')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found

        if (data) {
          setLocation({
            id: data.id,
            user_id: data.user_id,
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            updated_at: data.updated_at,
          });
        }
      } catch (err) {
        console.error('Erreur lors de la récupération de la localisation:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocation();

    // Subscribe to updates for this specific user
    subscriptionRef.current = supabase
      .channel(`user_location_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_locations',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newRecord = payload.new as LocationUpdate;
            setLocation({
              id: newRecord.id,
              user_id: newRecord.user_id,
              latitude: newRecord.latitude,
              longitude: newRecord.longitude,
              accuracy: newRecord.accuracy,
              updated_at: newRecord.updated_at,
            });
          } else if (payload.eventType === 'DELETE') {
            setLocation(null);
          }
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [userId]);

  return { location, loading };
};

// Hook to track current user's location in real-time
export const useLocationTracking = (enabled: boolean = false) => {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const startTracking = useCallback(() => {
    if (!user || !navigator.geolocation) {
      console.error('Geolocation not available');
      return;
    }

    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now();
        // Update every 5 seconds at most
        if (now - lastUpdateRef.current >= 5000) {
          try {
            await supabase.from('user_locations').upsert(
              {
                user_id: user.id,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                is_active: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
            lastUpdateRef.current = now;
          } catch (err) {
            console.error('Erreur lors de la mise à jour de la localisation:', err);
          }
        }
      },
      (err) => {
        console.error('Erreur de suivi géolocalisation:', err);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [user]);

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    if (user) {
      try {
        await supabase
          .from('user_locations')
          .update({ is_active: false })
          .eq('user_id', user.id);
      } catch (err) {
        console.error('Erreur lors de l\'arrêt du suivi:', err);
      }
    }

    setIsTracking(false);
  }, [user]);

  useEffect(() => {
    if (enabled && !isTracking) {
      startTracking();
    } else if (!enabled && isTracking) {
      stopTracking();
    }

    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, [enabled]);

  return { isTracking, startTracking, stopTracking };
};
