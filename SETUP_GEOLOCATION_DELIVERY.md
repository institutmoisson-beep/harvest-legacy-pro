# Setup Guide - Community Delivery Geolocation System

## Quick Start

### 1. Environment Setup
The Mapbox API key is already configured in the components:
```
pk.eyJ1IjoiY2VsdnVzIiwiYSI6ImNtZjVvcm1zejA6dWsyanM5cGdxOTM5NWkifQ.1I0VU-32Ek6bg3sZvpUS0w
```

### 2. Database Migration
Apply the migration to create necessary indexes and functions:
```sql
supabase/migrations/20251121170000_enhance_user_locations.sql
```

Run the migration:
```bash
supabase migration up
```

### 3. Dependencies
All required packages are already installed:
- `mapbox-gl` (^3.16.0)
- `@supabase/supabase-js` (^2.75.1)
- React and TypeScript

### 4. Navigation & Routing

**User Routes:**
- `/community-delivery` - Main community delivery interface
  - Tab: "Available Deliveries" - Find nearby deliveries with map
  - Tab: "My Missions" - View current delivery missions
  - Tab: "Members Available" - See nearby available members

**Admin Routes:**
- `/admin/deliveries` - Admin delivery dashboard
  - Map view of all deliveries and members
  - Statistics and filtering
  - Real-time updates

### 5. Key Features Implemented

#### A. User-Facing Features
1. **Available Deliveries Tab**
   - Real-time GPS location tracking
   - Adjustable search radius (1-50 km)
   - Map and list views
   - Distance-based sorting
   - One-click delivery proposal

2. **My Missions Tab**
   - Track active delivery missions
   - Map view of delivery locations
   - Delivery status management
   - Completion verification with codes

3. **Members Available Tab**
   - See nearby members with locations
   - Real-time member status
   - Contact information
   - Distance and accuracy info

#### B. Admin Features
1. **Delivery Dashboard**
   - Full map visualization
   - All deliveries with status colors
   - All active members' locations
   - Real-time statistics
   - Search and filtering

2. **Statistics**
   - Total deliveries
   - Pending vs assigned vs in-transit vs delivered
   - Active members count

### 6. Usage Examples

#### For Users - Find Deliveries
```javascript
// Users navigate to /community-delivery
// Click on "Available Deliveries" tab
// System auto-detects location (with permission)
// Shows nearby deliveries sorted by distance
// Users can adjust search radius with slider
// Click on delivery to propose or view on map
```

#### For Admins - Manage Deliveries
```javascript
// Navigate to /admin/deliveries
// View all deliveries and members on map
// Filter by delivery status
// Search for specific customers
// View real-time statistics
```

#### For Developers - Use Hooks
```javascript
import { useGeolocation, useDistance, useNearbyDeliveries } from '@/hooks/useGeolocation';
import { useRealtimeLocations, useLocationTracking } from '@/hooks/useRealtimeLocations';

// Get user location once
const { location, getCurrentLocation } = useGeolocation();

// Track user location continuously
const { location } = useGeolocation({ 
  enableTracking: true,
  updateInterval: 10000 
});

// Get nearby deliveries
const { nearbyDeliveries, getNearbyDeliveries } = useNearbyDeliveries();

// Real-time member locations
const { locations, isConnected } = useRealtimeLocations();

// Track current user location
const { isTracking, startTracking, stopTracking } = useLocationTracking(true);
```

### 7. Component Structure

```
src/
├── hooks/
│   ├── useGeolocation.tsx          # Location tracking & distance
│   └── useRealtimeLocations.tsx     # Real-time subscriptions
├── components/delivery/
│   ├── DeliveryMap.tsx             # Mapbox map visualization
│   ├── AvailableDeliveriesMap.tsx   # User delivery selection
│   ├── MembersNearby.tsx           # Member location view
│   ├── MyDeliveryMissionsMap.tsx    # User missions tracking
│   └── AdminDeliveryDashboard.tsx   # Admin full dashboard
├── pages/
│   ├── CommunityDelivery.tsx        # Main delivery page
│   └── AdminDelivery.tsx            # Admin delivery page
└── App.tsx                          # Routes configuration
```

### 8. Database Schema

**user_locations Table:**
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key)
- `latitude`: NUMERIC(10,8)
- `longitude`: NUMERIC(11,8)
- `accuracy`: NUMERIC
- `shared_with_user_id`: UUID (Optional)
- `is_active`: BOOLEAN
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP (Auto-updated)

**Indexes:**
- `idx_user_locations_is_active`
- `idx_user_locations_user_id`
- `idx_user_locations_updated_at`
- `idx_user_locations_coordinates`

**Functions:**
- `get_nearby_users(latitude, longitude, radius_km)`
- `get_nearby_deliveries(latitude, longitude, radius_km)`
- `update_user_locations_updated_at()`

### 9. Security & Privacy

**Row Level Security (RLS) Policies:**
1. Users can view their own location
2. Users can view locations shared with them
3. Agents can view all active locations
4. Users can insert/update/delete their own locations

**Location Sharing:**
- Users control location visibility with toggle
- Locations marked as `is_active = false` are hidden
- No location data shared without user consent

### 10. Performance Considerations

**Frontend:**
- Location updates throttled to 5-10 seconds
- Lazy loading of Mapbox components
- Efficient marker clustering
- React hook optimization

**Database:**
- Indexed queries for fast lookups
- Haversine formula in SQL for calculations
- Auto-timestamp triggers
- Real-time subscriptions instead of polling

### 11. Testing Checklist

- [ ] Users can view available deliveries on map
- [ ] Users can adjust search radius
- [ ] Users can see member locations
- [ ] Admins can see all deliveries and members
- [ ] Real-time updates work (check browser DevTools > Network)
- [ ] Location sharing toggle works
- [ ] Distance calculations are correct
- [ ] Delivery proposals are created
- [ ] Mission status updates work
- [ ] Delivery completion with code works

### 12. Troubleshooting

**Geolocation Not Working:**
- Ensure HTTPS is used
- Check browser permissions
- Verify Mapbox token is valid
- Check RLS policies

**Map Not Loading:**
- Verify Mapbox token in components
- Check browser console for errors
- Ensure map container has dimensions
- Check CSS import in components

**Real-Time Updates Not Working:**
- Verify Supabase realtime enabled
- Check RLS policies
- Check network tab for subscriptions
- Ensure user is authenticated

### 13. Future Enhancements

- Route optimization algorithm
- Push notifications for nearby deliveries
- User rating system
- Analytics dashboard
- Offline delivery viewing
- In-app messaging between members
- Delivery history tracking
- Earnings analytics dashboard

## Support

For issues or questions, refer to:
- `COMMUNITY_DELIVERY_GEOLOCATION.md` - Full documentation
- Component files for implementation details
- Hook files for usage examples
