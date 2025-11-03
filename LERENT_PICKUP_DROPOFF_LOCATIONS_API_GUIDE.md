# LeRent Pickup & Dropoff Locations API Guide

## Overview

This guide explains how to fetch pickup and dropoff locations for the LeRent car rental website. These locations are configured in the admin panel and stored in tenant-specific settings.

---

## API Endpoint

### Get Pickup/Dropoff Locations

**Endpoint:** `GET /api/public/users/:email/pickup-locations`

**Purpose:** Fetch all active pickup and dropoff locations for a specific tenant

**URL:**
```
GET https://carflow-reservation-system.onrender.com/api/public/users/lerent@lerent.sk/pickup-locations
```

**Authentication:** None required (public endpoint)

**Response:**
```json
{
  "success": true,
  "data": {
    "pickupLocations": [
      {
        "id": "64abc123...",
        "name": "Bratislava - Hlavná stanica",
        "address": "Predstaničné námestie 1, 811 01 Bratislava",
        "openingHours": "Po-Pia 08:00-18:00, So 09:00-14:00",
        "isDefault": true,
        "coordinates": {
          "lat": 48.1581,
          "lng": 17.1057
        },
        "notes": "Parkovisko za hlavnou stanicou, volajte 15 minút vopred"
      },
      {
        "id": "64def456...",
        "name": "Bratislava - Letisko M. R. Štefánika",
        "address": "Letisko M. R. Štefánika, 823 05 Bratislava",
        "openingHours": "Non-stop",
        "isDefault": false,
        "coordinates": {
          "lat": 48.1702,
          "lng": 17.2127
        },
        "notes": "Stretnutie pri Arrival hall, Terminal 1"
      },
      {
        "id": "64ghi789...",
        "name": "Košice - Centrum",
        "address": "Hlavná 1, 040 01 Košice",
        "openingHours": "Po-Pia 09:00-17:00",
        "isDefault": false,
        "coordinates": {
          "lat": 48.7164,
          "lng": 21.2611
        },
        "notes": null
      }
    ],
    "defaultLocation": "Bratislava - Hlavná stanica"
  }
}
```

---

## Location Object Structure

Each location contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique location ID (MongoDB ObjectId) |
| `name` | String | Location name (e.g., "Bratislava - Letisko") |
| `address` | String | Full street address |
| `openingHours` | String | Opening hours text (e.g., "Po-Pia 08:00-18:00") |
| `isDefault` | Boolean | Whether this is the default location |
| `coordinates` | Object | GPS coordinates (optional) |
| `coordinates.lat` | Number | Latitude |
| `coordinates.lng` | Number | Longitude |
| `notes` | String | Additional notes/instructions (optional) |

---

## Frontend Implementation

### Example 1: Fetch Locations with Vanilla JavaScript

```javascript
// config.js
const config = {
  API_BASE_URL: 'https://carflow-reservation-system.onrender.com/api',
  ADMIN_EMAIL: 'lerent@lerent.sk'
};

// locationService.js
class LocationService {
  async getPickupLocations() {
    try {
      const response = await fetch(
        `${config.API_BASE_URL}/public/users/${config.ADMIN_EMAIL}/pickup-locations`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch pickup locations');
      }

      const result = await response.json();

      if (result.success) {
        return {
          locations: result.data.pickupLocations,
          defaultLocation: result.data.defaultLocation
        };
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error fetching pickup locations:', error);
      throw error;
    }
  }

  getDefaultLocation(locations) {
    return locations.find(loc => loc.isDefault) || locations[0];
  }

  findLocationById(locations, locationId) {
    return locations.find(loc => loc.id === locationId);
  }

  findLocationByName(locations, locationName) {
    return locations.find(loc => loc.name === locationName);
  }
}

export default new LocationService();
```

---

### Example 2: React Component - Location Selector

```javascript
// src/components/LocationSelector.jsx
import React, { useEffect, useState } from 'react';
import locationService from '../services/locationService';

function LocationSelector({
  label = "Miesto vyzdvihnutia",
  onLocationChange,
  selectedLocationId = null
}) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (locations.length > 0 && !selectedLocationId) {
      // Auto-select default location
      const defaultLoc = locationService.getDefaultLocation(locations);
      if (defaultLoc) {
        setSelectedLocation(defaultLoc.id);
        onLocationChange(defaultLoc);
      }
    }
  }, [locations, selectedLocationId, onLocationChange]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const { locations: locs } = await locationService.getPickupLocations();
      setLocations(locs);
      setError(null);
    } catch (err) {
      setError('Nepodarilo sa načítať lokality');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (e) => {
    const locationId = e.target.value;
    setSelectedLocation(locationId);

    const location = locationService.findLocationById(locations, locationId);
    if (location && onLocationChange) {
      onLocationChange(location);
    }
  };

  if (loading) {
    return <div className="location-selector loading">Načítavam lokality...</div>;
  }

  if (error) {
    return (
      <div className="location-selector error">
        <p>{error}</p>
        <button onClick={fetchLocations}>Skúsiť znova</button>
      </div>
    );
  }

  return (
    <div className="location-selector">
      <label htmlFor="location-select">{label}</label>
      <select
        id="location-select"
        value={selectedLocation || ''}
        onChange={handleLocationChange}
        className="location-select"
      >
        <option value="" disabled>Vyberte lokalitu...</option>
        {locations.map(location => (
          <option key={location.id} value={location.id}>
            {location.name}
            {location.isDefault && ' (predvolené)'}
          </option>
        ))}
      </select>

      {/* Show selected location details */}
      {selectedLocation && (
        <LocationDetails
          location={locationService.findLocationById(locations, selectedLocation)}
        />
      )}
    </div>
  );
}

// Location Details Component
function LocationDetails({ location }) {
  if (!location) return null;

  return (
    <div className="location-details">
      <div className="location-info">
        <strong>Adresa:</strong>
        <p>{location.address}</p>
      </div>

      {location.openingHours && (
        <div className="location-info">
          <strong>Otváracie hodiny:</strong>
          <p>{location.openingHours}</p>
        </div>
      )}

      {location.notes && (
        <div className="location-info">
          <strong>Poznámky:</strong>
          <p>{location.notes}</p>
        </div>
      )}

      {location.coordinates && (
        <div className="location-map">
          <a
            href={`https://www.google.com/maps?q=${location.coordinates.lat},${location.coordinates.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="map-link"
          >
            📍 Zobraziť na mape
          </a>
        </div>
      )}
    </div>
  );
}

export default LocationSelector;
```

---

### Example 3: Complete Booking Form with Pickup & Dropoff

```javascript
// src/pages/BookingPage.jsx
import React, { useState } from 'react';
import LocationSelector from '../components/LocationSelector';

function BookingPage() {
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [sameAsPickup, setSameAsPickup] = useState(true);

  const handlePickupChange = (location) => {
    setPickupLocation(location);

    // If "same as pickup" is checked, also set dropoff
    if (sameAsPickup) {
      setDropoffLocation(location);
    }
  };

  const handleDropoffChange = (location) => {
    setDropoffLocation(location);
  };

  const handleSameAsPickupToggle = (e) => {
    const checked = e.target.checked;
    setSameAsPickup(checked);

    if (checked && pickupLocation) {
      setDropoffLocation(pickupLocation);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const bookingData = {
      pickupLocation: {
        id: pickupLocation.id,
        name: pickupLocation.name,
        address: pickupLocation.address
      },
      dropoffLocation: {
        id: dropoffLocation.id,
        name: dropoffLocation.name,
        address: dropoffLocation.address
      },
      // ... other booking data
    };

    console.log('Booking data:', bookingData);
    // Submit to API
  };

  return (
    <div className="booking-page">
      <h1>Rezervácia vozidla</h1>

      <form onSubmit={handleSubmit}>
        {/* Pickup Location */}
        <div className="form-section">
          <LocationSelector
            label="Miesto vyzdvihnutia"
            onLocationChange={handlePickupChange}
          />
        </div>

        {/* Same as Pickup Checkbox */}
        <div className="form-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={sameAsPickup}
              onChange={handleSameAsPickupToggle}
            />
            Rovnaké miesto vrátenia
          </label>
        </div>

        {/* Dropoff Location (only if different) */}
        {!sameAsPickup && (
          <div className="form-section">
            <LocationSelector
              label="Miesto vrátenia"
              onLocationChange={handleDropoffChange}
            />
          </div>
        )}

        {/* Other booking fields */}
        <div className="form-section">
          {/* Date pickers, car selection, etc. */}
        </div>

        <button type="submit" className="submit-btn">
          Pokračovať na platbu
        </button>
      </form>

      {/* Summary */}
      {pickupLocation && dropoffLocation && (
        <div className="booking-summary">
          <h3>Súhrn rezervácie</h3>
          <div className="summary-item">
            <strong>Vyzdvihnutie:</strong>
            <p>{pickupLocation.name}</p>
            <p className="text-muted">{pickupLocation.address}</p>
          </div>
          <div className="summary-item">
            <strong>Vrátenie:</strong>
            <p>{dropoffLocation.name}</p>
            <p className="text-muted">{dropoffLocation.address}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingPage;
```

---

### Example 4: Google Maps Integration

```javascript
// src/components/LocationMap.jsx
import React, { useEffect, useRef } from 'react';

function LocationMap({ location, zoom = 15 }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!location?.coordinates || !window.google) {
      return;
    }

    const { lat, lng } = location.coordinates;

    // Initialize map
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });

    // Add marker
    markerRef.current = new window.google.maps.Marker({
      position: { lat, lng },
      map: map,
      title: location.name,
      animation: window.google.maps.Animation.DROP
    });

    // Add info window
    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="padding: 8px;">
          <h4 style="margin: 0 0 8px 0;">${location.name}</h4>
          <p style="margin: 0; color: #666;">${location.address}</p>
          ${location.openingHours ? `<p style="margin: 4px 0 0 0; font-size: 0.9em;"><strong>Otváracia doba:</strong> ${location.openingHours}</p>` : ''}
        </div>
      `
    });

    markerRef.current.addListener('click', () => {
      infoWindow.open(map, markerRef.current);
    });

    // Auto-open info window
    infoWindow.open(map, markerRef.current);

  }, [location, zoom]);

  if (!location?.coordinates) {
    return (
      <div className="location-map-placeholder">
        Táto lokalita nemá nastavené GPS súradnice
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="location-map"
      style={{ width: '100%', height: '400px', borderRadius: '8px' }}
    />
  );
}

export default LocationMap;
```

**Note:** To use Google Maps, add this to your HTML:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY"></script>
```

---

## Usage in Reservation Creation

When creating a reservation, include the pickup and dropoff location information:

```javascript
// Example reservation payload
const reservationData = {
  // Customer info
  customer: {
    firstName: "Ján",
    lastName: "Novák",
    email: "jan.novak@example.com",
    phone: "+421901234567"
  },

  // Car and dates
  carId: "64abc123...",
  startDate: "2025-11-10T10:00:00.000Z",
  endDate: "2025-11-15T10:00:00.000Z",

  // Pickup & Dropoff Locations
  pickupLocation: {
    id: "64def456...",
    name: "Bratislava - Letisko M. R. Štefánika",
    address: "Letisko M. R. Štefánika, 823 05 Bratislava"
  },
  dropoffLocation: {
    id: "64def456...",
    name: "Bratislava - Letisko M. R. Štefánika",
    address: "Letisko M. R. Štefánika, 823 05 Bratislava"
  },

  // Additional info
  selectedServices: [],
  notes: "Prosím volajte 30 minút pred príchodom"
};

// POST to reservation endpoint
const response = await fetch(
  `${API_BASE_URL}/public/users/${ADMIN_EMAIL}/reservations`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(reservationData)
  }
);
```

---

## Styling Example (CSS)

```css
/* LocationSelector.css */
.location-selector {
  margin-bottom: 24px;
}

.location-selector label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.location-select {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background-color: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.location-select:hover {
  border-color: #2196f3;
}

.location-select:focus {
  outline: none;
  border-color: #2196f3;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}

.location-details {
  margin-top: 16px;
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 8px;
  border-left: 4px solid #2196f3;
}

.location-info {
  margin-bottom: 12px;
}

.location-info:last-child {
  margin-bottom: 0;
}

.location-info strong {
  display: block;
  margin-bottom: 4px;
  color: #555;
  font-size: 0.9em;
}

.location-info p {
  margin: 0;
  color: #333;
}

.map-link {
  display: inline-block;
  margin-top: 8px;
  padding: 8px 16px;
  background-color: #4caf50;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-size: 0.9em;
  transition: background-color 0.2s;
}

.map-link:hover {
  background-color: #45a049;
}

.location-selector.loading,
.location-selector.error {
  padding: 16px;
  text-align: center;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.location-selector.error p {
  color: #f44336;
  margin-bottom: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
```

---

## Important Notes

### 1. **Tenant Isolation**
The endpoint uses `lerent@lerent.sk` to ensure only LeRent's pickup locations are returned. Each tenant has their own configured locations.

### 2. **Default Location**
- The API returns `defaultLocation` which is the name of the default pickup location
- You can auto-select this location in your dropdown
- Use `isDefault: true` to identify the default location in the locations array

### 3. **Same Location for Pickup & Dropoff**
Most car rentals return the car to the same location. Consider:
- Adding a checkbox "Rovnaké miesto vrátenia" (Same return location)
- Auto-filling dropoff location when checked
- Showing dropoff selector only when unchecked

### 4. **Coordinates**
- Not all locations have GPS coordinates configured
- Always check if `coordinates` exists before using it
- Use coordinates for Google Maps integration

### 5. **Opening Hours**
- Opening hours are stored as free-text strings
- Display them as-is to the customer
- Consider showing a warning if booking outside opening hours

### 6. **Location Notes**
- Some locations have special instructions (e.g., "Call 15 minutes before arrival")
- Display notes prominently to avoid customer confusion

---

## Error Handling

```javascript
// Handle errors gracefully
async function fetchLocations() {
  try {
    const { locations } = await locationService.getPickupLocations();

    if (!locations || locations.length === 0) {
      throw new Error('No pickup locations available');
    }

    return locations;
  } catch (error) {
    if (error.message.includes('404')) {
      // Tenant not found
      console.error('Invalid tenant email');
      showError('Služba momentálne nie je dostupná');
    } else if (error.message.includes('500')) {
      // Server error
      console.error('Server error');
      showError('Nepodarilo sa načítať lokality. Skúste neskôr.');
    } else {
      // Network error
      console.error('Network error:', error);
      showError('Skontrolujte internetové pripojenie');
    }

    return [];
  }
}
```

---

## Testing

### Test the API endpoint directly:
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/lerent@lerent.sk/pickup-locations"
```

### Expected response:
```json
{
  "success": true,
  "data": {
    "pickupLocations": [...],
    "defaultLocation": "Location Name"
  }
}
```

---

## Summary

**For LeRent frontend developers:**

1. **Fetch locations:** `GET /api/public/users/lerent@lerent.sk/pickup-locations`
2. **Use the data:**
   - Display in dropdown/select elements
   - Show location details (address, hours, notes)
   - Integrate with Google Maps (if coordinates available)
3. **Submit with reservation:**
   - Include `pickupLocation` and `dropoffLocation` objects
   - Include at minimum: `id`, `name`, `address`

**Key Features:**
- Tenant-specific locations
- Default location support
- GPS coordinates for maps
- Opening hours and special notes
- No authentication required (public endpoint)
