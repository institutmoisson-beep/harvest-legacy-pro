import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface UseRealtimeLocationReturn {
  location: LocationData | null;
  isTracking: boolean;
  error: string | null;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
}

export const useRealtimeLocation = (): UseRealtimeLocationReturn => {
  const { user } = useAuth();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedTrackingState = localStorage.getItem('location_tracking_active');
    if (savedTrackingState === 'true') {
      startTracking();
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  const updateLocationInDatabase = async (lat: number, lon: number, acc: number) => {
    if (!user) return;

    try {
      const existingLocation = await supabase
        .from('active_locations')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (existingLocation.data) {
        await supabase
          .from('active_locations')
          .update({
            latitude: lat,
            longitude: lon,
            accuracy: acc,
            last_updated: new Date().toISOString(),
          })
          .eq('id', existingLocation.data.id);
      } else {
        await supabase
          .from('active_locations')
          .insert({
            user_id: user.id,
            latitude: lat,
            longitude: lon,
            accuracy: acc,
            location_type: 'user',
            is_active: true,
          });
      }
    } catch (err: any) {
      console.error('Error updating location in database:', err);
    }
  };

  const startTracking = async () => {
    if (!navigator.geolocation) {
      setError('Géolocalisation non supportée par votre navigateur');
      return;
    }

    if (isTracking) return;

    try {
      setIsTracking(true);
      setError(null);
      localStorage.setItem('location_tracking_active', 'true');

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(newLocation);
          updateLocationInDatabase(
            newLocation.latitude,
            newLocation.longitude,
            Math.round(newLocation.accuracy)
          );
        },
        (geoError) => {
          let errorMessage = 'Erreur de géolocalisation';
          switch (geoError.code) {
            case geoError.PERMISSION_DENIED:
              errorMessage = 'Permission de géolocalisation refusée';
              break;
            case geoError.POSITION_UNAVAILABLE:
              errorMessage = 'Position non disponible';
              break;
            case geoError.TIMEOUT:
              errorMessage = 'Délai d\'attente dépassé';
              break;
          }
          setError(errorMessage);
          console.error('Geolocation error:', geoError);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );

      updateIntervalRef.current = setInterval(() => {
        if (location && user) {
          updateLocationInDatabase(location.latitude, location.longitude, Math.round(location.accuracy));
        }
      }, 10000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du démarrage du suivi');
      setIsTracking(false);
    }
  };

  const stopTracking = async () => {
    try {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }

      if (user) {
        await supabase
          .from('active_locations')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('is_active', true);
      }

      setIsTracking(false);
      localStorage.setItem('location_tracking_active', 'false');
    } catch (err: any) {
      console.error('Error stopping tracking:', err);
    }
  };

  return {
    location,
    isTracking,
    error,
    startTracking,
    stopTracking,
  };
};
