import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface UseGeolocationOptions {
  enableTracking?: boolean;
  updateInterval?: number;
  highAccuracy?: boolean;
}

export const useGeolocation = (options: UseGeolocationOptions = {}) => {
  const { enableTracking = false, updateInterval = 10000, highAccuracy = true } = options;
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Get current location once
  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    return new Promise<UserLocation>((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = 'Geolocation non supportée par votre navigateur';
        setError(err);
        reject(new Error(err));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
          };
          setLocation(userLocation);
          setLoading(false);
          resolve(userLocation);
        },
        (err) => {
          const errorMsg = `Erreur géolocalisation: ${err.message}`;
          setError(errorMsg);
          setLoading(false);
          reject(new Error(errorMsg));
        },
        { enableHighAccuracy: highAccuracy, timeout: 10000 }
      );
    });
  }, [highAccuracy]);

  // Save location to database
  const saveLocationToDatabase = useCallback(
    async (loc: UserLocation, shareWithUserId?: string) => {
      if (!user) return;

      try {
        const { error: insertError } = await supabase
          .from('user_locations')
          .upsert(
            {
              user_id: user.id,
              latitude: loc.latitude,
              longitude: loc.longitude,
              accuracy: loc.accuracy,
              shared_with_user_id: shareWithUserId || null,
              is_active: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

        if (insertError) throw insertError;
      } catch (err: any) {
        console.error('Erreur lors de la sauvegarde de la localisation:', err);
      }
    },
    [user]
  );

  // Watch location continuously
  useEffect(() => {
    if (!enableTracking || !user || !navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        // Throttle updates to prevent excessive database writes
        if (now - lastUpdateRef.current >= updateInterval) {
          const userLocation: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: now,
          };
          setLocation(userLocation);
          saveLocationToDatabase(userLocation);
          lastUpdateRef.current = now;
        }
      },
      (err) => {
        console.error('Erreur de suivi géolocalisation:', err);
        setError(err.message);
      },
      { enableHighAccuracy: highAccuracy, timeout: 5000, maximumAge: 0 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enableTracking, user, updateInterval, highAccuracy, saveLocationToDatabase]);

  return {
    location,
    error,
    loading,
    getCurrentLocation,
    saveLocationToDatabase,
  };
};

// Hook to calculate distance between two points using Haversine formula
export const useDistance = () => {
  const calculateDistance = useCallback((
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Rayon de la Terre en kilomètres
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  return { calculateDistance };
};

// Hook to get nearby deliveries based on user location
export const useNearbyDeliveries = () => {
  const [nearbyDeliveries, setNearbyDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { calculateDistance } = useDistance();

  const getNearbyDeliveries = useCallback(
    async (
      userLocation: UserLocation,
      radiusKm: number = 10
    ) => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('delivery_packages')
          .select('*')
          .eq('delivery_method', 'community_delivery')
          .eq('status', 'pending')
          .is('deliverer_id', null)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Filter by distance
        const nearby = (data || []).filter((pkg) => {
          if (!pkg.customer_latitude || !pkg.customer_longitude) return false;

          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            pkg.customer_latitude,
            pkg.customer_longitude
          );

          return distance <= radiusKm;
        });

        // Sort by distance
        const sorted = nearby.sort((a, b) => {
          const distA = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            a.customer_latitude,
            a.customer_longitude
          );
          const distB = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            b.customer_latitude,
            b.customer_longitude
          );
          return distA - distB;
        });

        setNearbyDeliveries(
          sorted.map((pkg) => ({
            ...pkg,
            distance: calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              pkg.customer_latitude,
              pkg.customer_longitude
            ),
          }))
        );
      } catch (err) {
        console.error('Erreur lors de la récupération des livraisons proches:', err);
      } finally {
        setLoading(false);
      }
    },
    [calculateDistance]
  );

  return { nearbyDeliveries, loading, getNearbyDeliveries };
};
