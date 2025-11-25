# Community Delivery Geolocation System

## Overview

A complete proximity-based community delivery system with real-time geolocation features, similar to Yango Delivery in Côte d'Ivoire.

## Features

### 1. **User Location Tracking**
- Real-time GPS location tracking for users
- Automatic location updates every 5-10 seconds
- User consent management for location sharing
- High accuracy positioning with fallback options

### 2. **Proximity-Based Delivery Selection**
- Display available deliveries sorted by distance
- Adjustable search radius (1-50 km)
- Map view with markers for deliveries and user location
- List view with distance and details for each delivery

### 3. **Member Location Visibility**
- Members can see other available members' locations
- Real-time updates of nearby members
- Member availability status and contact info
- Distance and location accuracy information

### 4. **Admin Delivery Dashboard**
- Full map view of all deliveries and members
- Delivery status filtering and search
- Real-time statistics
- Member location tracking
- Delivery assignment and management

### 5. **Real-Time Updates**
- PostgreSQL real-time subscriptions
- Automatic location synchronization
- Live member and delivery updates
- Efficient throttling to prevent database overload

## Architecture

### Database Schema

**user_locations Table:**
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- latitude: NUMERIC(10,8)
- longitude: NUMERIC(11,8)
- accuracy: NUMERIC
- shared_with_user_id: UUID (Optional - for specific sharing)
- is_active: BOOLEAN (Default: true)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP (Auto-updated)
```

**Indexes:**
- `idx_user_locations_is_active` - For filtering active locations
- `idx_user_locations_user_id` - For user lookups
- `idx_user_locations_updated_at` - For sorting by timestamp
- `idx_user_locations_coordinates` - For geographic queries

**Functions:**
- `get_nearby_users()` - Find users within radius using Haversine formula
- `get_nearby_deliveries()` - Find deliveries within radius
- `update_user_locations_updated_at()` - Trigger for auto-updating timestamp

### Components

#### 1. **AvailableDeliveriesMap** (`src/components/delivery/AvailableDeliveriesMap.tsx`)
- Main component for users to find nearby deliveries
- Dual view: Map and List
- Location tracking with permission handling
- Distance-based filtering with adjustable radius
- Location sharing toggle for user visibility

#### 2. **DeliveryMap** (`src/components/delivery/DeliveryMap.tsx`)
- Mapbox GL JS map visualization
- Delivery markers with status colors
- User location marker
- Popup information and details
- Auto-fit bounds to show all markers

#### 3. **MembersNearby** (`src/components/delivery/MembersNearby.tsx`)
- Display nearby available members
- Map and list view options
- Real-time member location updates
- Contact information display

#### 4. **MyDeliveryMissionsMap** (`src/components/delivery/MyDeliveryMissionsMap.tsx`)
- Track current delivery missions
- Map view of delivery locations
- Mission status management
- Delivery completion with verification code

#### 5. **AdminDeliveryDashboard** (`src/components/delivery/AdminDeliveryDashboard.tsx`)
- Comprehensive admin dashboard
- All deliveries on map with status colors
- All active member locations
- Statistics and filtering
- Real-time updates

### Hooks

#### 1. **useGeolocation** (`src/hooks/useGeolocation.tsx`)
```javascript
// Get current location once
const { location, error, loading, getCurrentLocation } = useGeolocation();

// Track location continuously
const { location, error } = useGeolocation({ 
  enableTracking: true,
  updateInterval: 10000,
  highAccuracy: true 
});

// Hooks for distance calculations
const { calculateDistance } = useDistance();

// Get nearby deliveries
const { nearbyDeliveries, loading, getNearbyDeliveries } = useNearbyDeliveries();
```

#### 2. **useRealtimeLocations** (`src/hooks/useRealtimeLocations.tsx`)
```javascript
// Get all nearby active locations in real-time
const { locations, isConnected } = useRealtimeLocations();

// Get specific user location
const { location, loading } = useUserLocation(userId);

// Track current user location continuously
const { isTracking, startTracking, stopTracking } = useLocationTracking(enabled);
```

## Navigation

### Main Pages

1. **Community Delivery** (`/community-delivery`)
   - Tab 1: **Available Deliveries** - Find nearby deliveries
   - Tab 2: **My Missions** - View current delivery missions
   - Tab 3: **Members Available** - See nearby available members

2. **Admin Dashboard** (Protected)
   - Map view of all deliveries and members
   - Statistics and filters
   - Real-time status updates

## Usage Examples

### For Users - Find Nearby Deliveries

```javascript
import AvailableDeliveriesMap from '@/components/delivery/AvailableDeliveriesMap';

export default function DeliveryPage() {
  return <AvailableDeliveriesMap />;
}
```

### For Developers - Custom Location Tracking

```javascript
import { useGeolocation } from '@/hooks/useGeolocation';

export default function CustomDeliveryComponent() {
  const { location, getCurrentLocation } = useGeolocation();
  
  useEffect(() => {
    getCurrentLocation();
  }, []);
  
  if (location) {
    console.log(`User at: ${location.latitude}, ${location.longitude}`);
  }
}
```

### Real-Time Member Updates

```javascript
import { useRealtimeLocations } from '@/hooks/useRealtimeLocations';

export default function MembersTracking() {
  const { locations, isConnected } = useRealtimeLocations();
  
  return (
    <div>
      {isConnected && (
        <p>{locations.size} members online</p>
      )}
    </div>
  );
}
```

## Mapbox Configuration

**API Key:** `pk.eyJ1IjoiY2VsdnVzIiwiYSI6ImNtZjVvcm1zejA2dWsyanM5cGdxOTM5NWkifQ.1I0VU-32Ek6bg3sZvpUS0w`

The API key is configured in:
- `src/components/delivery/DeliveryMap.tsx`
- `src/components/delivery/MembersNearby.tsx`
- `src/components/delivery/MyDeliveryMissionsMap.tsx`
- `src/components/delivery/AdminDeliveryDashboard.tsx`

## Security & Privacy

### Row Level Security (RLS)

**user_locations Policies:**
1. Users can view their own location
2. Users can view locations shared with them
3. Agents can view all active locations for delivery management
4. Users can insert, update, and delete their own locations

### Location Sharing Control

- Users can toggle location sharing on/off
- Locations marked as `is_active = false` are hidden
- Automatic expiration of old locations (configurable)
- Specific user sharing with `shared_with_user_id`

## Performance Optimization

### Database Optimizations
- Indexes on frequently queried columns
- Geographic indexes for proximity queries
- Auto-timestamp triggers
- Efficient Haversine formula implementation in SQL

### Frontend Optimizations
- Location update throttling (5-10 seconds)
- Lazy loading of Mapbox components
- Marker clustering for large datasets
- Efficient re-rendering with React hooks

### Real-Time Updates
- Postgres subscriptions instead of polling
- Selective subscriptions per user
- Automatic cleanup on unmount

## Troubleshooting

### Geolocation Issues
1. Ensure HTTPS is used (required for geolocation)
2. Check browser permissions for location access
3. Verify Mapbox API key is valid
4. Check user_locations table permissions

### Map Not Loading
1. Verify Mapbox token in components
2. Check browser console for errors
3. Ensure map container has proper dimensions
4. Verify CSS is properly imported

### Real-Time Updates Not Working
1. Check Supabase realtime enabled
2. Verify RLS policies allow read access
3. Check browser network tab for subscriptions
4. Ensure user is authenticated

## Future Enhancements

1. **Route Optimization** - Calculate optimal delivery routes
2. **Delivery Notifications** - Push notifications for nearby deliveries
3. **Rating System** - User ratings based on delivery performance
4. **Analytics** - Delivery completion rates and analytics
5. **Offline Support** - Cache deliveries for offline viewing
6. **Chat System** - Direct messaging between members
7. **Delivery History** - Track completed deliveries
8. **Earnings Tracking** - Detailed earning analytics
