# LeRent Additional Services API Guide

## Overview

This guide explains how to fetch additional services (extras) with pricing information for the LeRent car rental website, such as child seats, GPS, insurance, etc.

---

## API Endpoints for Additional Services

### 1. Get All Additional Services (Recommended)

**Best for:** Showing all available extras on the booking page

**Endpoint:** `GET /api/public/users/lerent@lerent.sk/services`

**Purpose:** Get all active, public additional services for LeRent

**Request:**
```
GET https://carflow-reservation-system.onrender.com/api/public/users/lerent@lerent.sk/services
```

**Response:**
```javascript
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "64abc123...",
      "name": "Child Seat",
      "nameSk": "Detská sedačka",
      "description": "Safety child seat for children 0-4 years",
      "descriptionSk": "Bezpečnostná detská sedačka pre deti 0-4 roky",
      "category": "safety",
      "pricing": {
        "type": "per_day",
        "amount": 5.00,
        "currency": "EUR"
      },
      "image": {
        "url": "https://storage.googleapis.com/.../child-seat.jpg",
        "filename": "child-seat.jpg"
      },
      "icon": "child_care",
      "color": "#4caf50",
      "isActive": true,
      "isPublic": true,
      "availability": {
        "isGlobal": true,
        "vehicleCategories": []
      },
      "rules": {
        "requiresApproval": false,
        "maxQuantity": 2
      }
    },
    {
      "_id": "64def456...",
      "name": "GPS Navigation",
      "nameSk": "GPS navigácia",
      "description": "TomTom GPS navigation system",
      "descriptionSk": "TomTom GPS navigačný systém",
      "category": "electronics",
      "pricing": {
        "type": "fixed",
        "amount": 15.00,
        "currency": "EUR"
      },
      "image": {
        "url": "https://storage.googleapis.com/.../gps.jpg",
        "filename": "gps.jpg"
      },
      "icon": "navigation",
      "color": "#2196f3",
      "isActive": true,
      "isPublic": true,
      "availability": {
        "isGlobal": true
      },
      "rules": {
        "requiresApproval": false,
        "maxQuantity": 1
      }
    },
    {
      "_id": "64ghi789...",
      "name": "Additional Driver",
      "nameSk": "Dodatočný vodič",
      "description": "Add another authorized driver to your rental",
      "descriptionSk": "Pridajte ďalšieho autorizovaného vodiča k vášmu prenájmu",
      "category": "insurance",
      "pricing": {
        "type": "per_day",
        "amount": 8.00,
        "currency": "EUR"
      },
      "icon": "person_add",
      "color": "#ff9800",
      "isActive": true,
      "isPublic": true,
      "dynamicPricing": {
        "isEnabled": false
      },
      "rules": {
        "requiresApproval": true,
        "maxQuantity": 2
      }
    },
    {
      "_id": "64jkl012...",
      "name": "Airport Delivery",
      "nameSk": "Dodanie na letisko",
      "description": "We deliver the car to the airport",
      "descriptionSk": "Doručíme auto na letisko",
      "category": "delivery",
      "pricing": {
        "type": "fixed",
        "amount": 25.00,
        "currency": "EUR"
      },
      "icon": "local_airport",
      "color": "#9c27b0",
      "isActive": true,
      "isPublic": true,
      "dynamicPricing": {
        "isEnabled": true,
        "basePrice": 10.00,
        "pricePerKm": 0.50,
        "minimumPrice": 25.00,
        "maximumPrice": 100.00
      },
      "rules": {
        "requiresApproval": true,
        "maxQuantity": 1
      }
    }
  ]
}
```

---

### 2. Get Services for Specific Vehicle

**Best for:** Showing only services available for a specific car

**Endpoint:** `GET /api/public/users/lerent@lerent.sk/services/vehicle/:vehicleId`

**Purpose:** Get services that are available for a specific vehicle/car

**Request:**
```
GET https://carflow-reservation-system.onrender.com/api/public/users/lerent@lerent.sk/services/vehicle/64abc123...
```

**Response:**
```javascript
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "64abc123...",
      "name": "Child Seat",
      "pricing": {
        "type": "per_day",
        "amount": 5.00,
        "currency": "EUR"
      },
      // ... other fields
    }
  ]
}
```

---

### 3. Calculate Service Price

**Best for:** Calculating the exact price based on rental duration and quantity

**Endpoint:** `POST /api/public/users/lerent@lerent.sk/services/calculate-price`

**Purpose:** Calculate the total price for a service based on parameters

**Request:**
```javascript
POST https://carflow-reservation-system.onrender.com/api/public/users/lerent@lerent.sk/services/calculate-price

Headers:
{
  "Content-Type": "application/json"
}

Body:
{
  "serviceId": "64abc123...",
  "quantity": 2,
  "days": 5,
  "distance": 0,
  "basePrice": 250.00
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "serviceId": "64abc123...",
    "serviceName": "Child Seat",
    "parameters": {
      "quantity": 2,
      "days": 5,
      "distance": 0,
      "basePrice": 250.00
    },
    "calculatedPrice": 50.00,  // 2 × 5€/day × 5 days
    "currency": "EUR"
  }
}
```

---

## Pricing Types Explained

### 1. **Fixed Price** (`pricing.type: "fixed"`)

Price doesn't change based on rental duration.

**Example:** GPS Navigation - €15 (one-time fee)

**Formula:** `price = amount × quantity`

```javascript
// GPS: €15 fixed
// Quantity: 1
// Total: €15 (regardless of rental days)
```

### 2. **Per Day** (`pricing.type: "per_day"`)

Price multiplied by number of rental days.

**Example:** Child Seat - €5/day

**Formula:** `price = amount × quantity × days`

```javascript
// Child Seat: €5/day
// Quantity: 2
// Days: 5
// Total: €50 (2 × €5 × 5 days)
```

### 3. **Per Kilometer** (`pricing.type: "per_km"`)

Price based on distance driven.

**Example:** Extra km - €0.20/km

**Formula:** `price = amount × quantity × distance`

```javascript
// Extra km: €0.20/km
// Distance: 100 km over limit
// Total: €20 (€0.20 × 100 km)
```

### 4. **Percentage** (`pricing.type: "percentage"`)

Price calculated as percentage of base rental price.

**Example:** Premium Insurance - 15% of rental

**Formula:** `price = (basePrice × amount / 100) × quantity`

```javascript
// Premium Insurance: 15%
// Base rental price: €250
// Total: €37.50 (€250 × 15%)
```

### 5. **Dynamic Pricing** (`dynamicPricing.isEnabled: true`)

Price based on complex rules (e.g., airport delivery based on distance).

**Formula:**
```javascript
price = basePrice + (distance × pricePerKm)
// Then apply min/max limits
if (price < minimumPrice) price = minimumPrice
if (price > maximumPrice) price = maximumPrice
price = price × quantity
```

**Example:** Airport Delivery
```javascript
// Base: €10
// Distance: 30 km
// Rate: €0.50/km
// Calculated: €10 + (30 × €0.50) = €25
// Min: €25 (applied)
// Max: €100
// Total: €25
```

---

## Frontend Implementation Examples

### Example 1: Display Services List

```javascript
// src/components/AdditionalServices.jsx
import React, { useEffect, useState } from 'react';

function AdditionalServices({ onSelectServices, rentalDays }) {
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch(
        'https://carflow-reservation-system.onrender.com/api/public/users/lerent@lerent.sk/services'
      );

      const result = await response.json();

      if (result.success) {
        setServices(result.data);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateServicePrice = (service, quantity = 1) => {
    switch (service.pricing.type) {
      case 'fixed':
        return service.pricing.amount * quantity;
      case 'per_day':
        return service.pricing.amount * quantity * rentalDays;
      case 'per_km':
        // Handle separately with user input
        return service.pricing.amount * quantity;
      case 'percentage':
        // Would need base rental price
        return 0;
      default:
        return service.pricing.amount * quantity;
    }
  };

  const formatPrice = (service, quantity = 1) => {
    const price = calculateServicePrice(service, quantity);

    switch (service.pricing.type) {
      case 'fixed':
        return `€${price.toFixed(2)}`;
      case 'per_day':
        return `€${service.pricing.amount.toFixed(2)}/day (€${price.toFixed(2)} total)`;
      case 'per_km':
        return `€${service.pricing.amount.toFixed(2)}/km`;
      case 'percentage':
        return `${service.pricing.amount}% of rental`;
      default:
        return `€${price.toFixed(2)}`;
    }
  };

  const handleToggleService = (service) => {
    const exists = selectedServices.find(s => s._id === service._id);

    let updated;
    if (exists) {
      updated = selectedServices.filter(s => s._id !== service._id);
    } else {
      updated = [...selectedServices, { ...service, quantity: 1 }];
    }

    setSelectedServices(updated);
    onSelectServices(updated);
  };

  const handleQuantityChange = (serviceId, quantity) => {
    const updated = selectedServices.map(s =>
      s._id === serviceId ? { ...s, quantity: parseInt(quantity) } : s
    );

    setSelectedServices(updated);
    onSelectServices(updated);
  };

  if (loading) {
    return <div>Loading additional services...</div>;
  }

  return (
    <div className="additional-services">
      <h3>Additional Services & Extras</h3>

      <div className="services-grid">
        {services.map(service => {
          const isSelected = selectedServices.some(s => s._id === service._id);
          const selectedService = selectedServices.find(s => s._id === service._id);

          return (
            <div
              key={service._id}
              className={`service-card ${isSelected ? 'selected' : ''}`}
              style={{ borderColor: service.color }}
            >
              {service.image?.url && (
                <img
                  src={service.image.url}
                  alt={service.nameSk || service.name}
                  className="service-image"
                />
              )}

              <div className="service-icon" style={{ color: service.color }}>
                {service.icon}
              </div>

              <h4>{service.nameSk || service.name}</h4>
              <p className="service-description">
                {service.descriptionSk || service.description}
              </p>

              <div className="service-price">
                {formatPrice(service, selectedService?.quantity || 1)}
              </div>

              <div className="service-actions">
                <label>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleService(service)}
                  />
                  Add to booking
                </label>

                {isSelected && service.rules.maxQuantity > 1 && (
                  <div className="quantity-selector">
                    <label>Quantity:</label>
                    <select
                      value={selectedService?.quantity || 1}
                      onChange={(e) => handleQuantityChange(service._id, e.target.value)}
                    >
                      {[...Array(service.rules.maxQuantity)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {service.rules.requiresApproval && (
                <span className="approval-badge">Requires approval</span>
              )}
            </div>
          );
        })}
      </div>

      {selectedServices.length > 0 && (
        <div className="services-summary">
          <h4>Selected Services:</h4>
          <ul>
            {selectedServices.map(service => (
              <li key={service._id}>
                {service.quantity}x {service.nameSk || service.name}:
                <strong> €{calculateServicePrice(service, service.quantity).toFixed(2)}</strong>
              </li>
            ))}
          </ul>
          <div className="services-total">
            <strong>Total Extras:</strong>
            <strong>
              €{selectedServices.reduce(
                (sum, s) => sum + calculateServicePrice(s, s.quantity),
                0
              ).toFixed(2)}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdditionalServices;
```

---

### Example 2: Service Price Calculator

```javascript
// src/services/servicePriceService.js

class ServicePriceService {
  async calculatePrice(serviceId, params) {
    try {
      const response = await fetch(
        'https://carflow-reservation-system.onrender.com/api/public/users/lerent@lerent.sk/services/calculate-price',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            serviceId,
            quantity: params.quantity || 1,
            days: params.days || 1,
            distance: params.distance || 0,
            basePrice: params.basePrice || 0
          })
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error('Failed to calculate price');
      }

      return result.data;
    } catch (error) {
      console.error('Error calculating service price:', error);
      throw error;
    }
  }

  async fetchServices() {
    try {
      const response = await fetch(
        'https://carflow-reservation-system.onrender.com/api/public/users/lerent@lerent.sk/services'
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error('Failed to fetch services');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching services:', error);
      throw error;
    }
  }

  async fetchServicesForVehicle(vehicleId) {
    try {
      const response = await fetch(
        `https://carflow-reservation-system.onrender.com/api/public/users/lerent@lerent.sk/services/vehicle/${vehicleId}`
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error('Failed to fetch services for vehicle');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching services for vehicle:', error);
      throw error;
    }
  }
}

export default new ServicePriceService();
```

---

### Example 3: Complete Booking with Services

```javascript
// src/pages/BookingPage.jsx
import React, { useState, useEffect } from 'react';
import AdditionalServices from '../components/AdditionalServices';
import servicePriceService from '../services/servicePriceService';

function BookingPage({ car, startDate, endDate }) {
  const [selectedServices, setSelectedServices] = useState([]);
  const [servicesTotal, setServicesTotal] = useState(0);

  const rentalDays = Math.ceil(
    (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
  );

  useEffect(() => {
    calculateServicesTotal();
  }, [selectedServices]);

  const calculateServicesTotal = async () => {
    if (selectedServices.length === 0) {
      setServicesTotal(0);
      return;
    }

    let total = 0;

    for (const service of selectedServices) {
      try {
        const priceData = await servicePriceService.calculatePrice(
          service._id,
          {
            quantity: service.quantity,
            days: rentalDays,
            distance: 0,
            basePrice: car.dailyRate * rentalDays
          }
        );

        total += priceData.calculatedPrice;
      } catch (error) {
        console.error('Error calculating price for service:', service.name, error);
      }
    }

    setServicesTotal(total);
  };

  const handleProceedToPayment = () => {
    const bookingData = {
      carId: car._id,
      startDate,
      endDate,
      selectedServices: selectedServices.map(s => ({
        _id: s._id,
        name: s.name,
        quantity: s.quantity,
        price: s.pricing.amount,
        totalPrice: 0 // Will be calculated by backend
      })),
      // ... other booking data
    };

    // Proceed with reservation creation
    console.log('Booking data:', bookingData);
  };

  return (
    <div className="booking-page">
      <h1>Complete Your Booking</h1>

      <div className="booking-summary">
        <h3>Booking Summary</h3>
        <p>Car: {car.brand} {car.model}</p>
        <p>Duration: {rentalDays} days</p>
        <p>Base Price: €{(car.dailyRate * rentalDays).toFixed(2)}</p>
      </div>

      <AdditionalServices
        onSelectServices={setSelectedServices}
        rentalDays={rentalDays}
      />

      <div className="booking-total">
        <div className="total-row">
          <span>Car Rental:</span>
          <span>€{(car.dailyRate * rentalDays).toFixed(2)}</span>
        </div>
        <div className="total-row">
          <span>Additional Services:</span>
          <span>€{servicesTotal.toFixed(2)}</span>
        </div>
        <div className="total-row grand-total">
          <strong>Grand Total:</strong>
          <strong>€{((car.dailyRate * rentalDays) + servicesTotal).toFixed(2)}</strong>
        </div>
      </div>

      <button onClick={handleProceedToPayment}>
        Proceed to Payment
      </button>
    </div>
  );
}

export default BookingPage;
```

---

## Service Data Structure

### Complete Service Object

```javascript
{
  "_id": "64abc123...",
  "name": "Service Name (English)",
  "nameSk": "Názov služby (Slovak)",
  "description": "Description in English",
  "descriptionSk": "Popis v slovenčine",
  "category": "safety|electronics|insurance|delivery|comfort",

  // Pricing
  "pricing": {
    "type": "fixed|per_day|per_km|percentage",
    "amount": 5.00,
    "currency": "EUR"
  },

  // Dynamic pricing (for complex calculations)
  "dynamicPricing": {
    "isEnabled": false,
    "basePrice": 10.00,
    "pricePerKm": 0.50,
    "minimumPrice": 25.00,
    "maximumPrice": 100.00
  },

  // Visual
  "image": {
    "url": "https://storage.googleapis.com/.../image.jpg",
    "filename": "image.jpg"
  },
  "icon": "child_care",  // Material UI icon name
  "color": "#4caf50",    // Hex color for branding

  // Availability
  "availability": {
    "isGlobal": true,  // Available for all vehicles
    "vehicleCategories": ["sedan", "suv"],  // Or specific categories
    "seasonalStart": 11,  // Month (1-12)
    "seasonalEnd": 3
  },

  // Rules
  "rules": {
    "requiresApproval": false,  // Admin approval needed?
    "maxQuantity": 2,           // Max items per reservation
    "dependsOn": []             // IDs of required services
  },

  // Status
  "isActive": true,
  "isPublic": true  // Show on public website?
}
```

---

## Important Notes

### 1. **Tenant Isolation**

All endpoints use `lerent@lerent.sk` to ensure:
- ✅ Only LeRent services are returned
- ✅ Complete data isolation from other tenants

### 2. **Price Calculation**

Always use the backend `/calculate-price` endpoint for accurate pricing, especially for:
- Dynamic pricing services
- Percentage-based pricing
- Services with complex rules

### 3. **Service Categories**

Services are grouped into categories:
- `safety`: Child seats, emergency kits
- `electronics`: GPS, dashcam, WiFi
- `insurance`: Additional driver, premium insurance
- `delivery`: Airport delivery, hotel delivery
- `comfort`: Extra luggage, ski rack

### 4. **Quantity Limits**

Respect `rules.maxQuantity` to prevent booking errors:
```javascript
if (service.rules.maxQuantity === 1) {
  // Show checkbox only
} else {
  // Show quantity selector (1 to maxQuantity)
}
```

### 5. **Approval Requirements**

Services with `rules.requiresApproval: true` need admin confirmation:
- Show "Requires approval" badge
- Customer can select, but admin must approve before confirmed

---

## Complete Example: Services in Reservation

When creating a reservation, include services in this format:

```javascript
POST /api/public/users/lerent@lerent.sk/reservations

{
  // ... customer and car details ...

  "selectedServices": [
    {
      "_id": "64abc123...",
      "name": "Child Seat",
      "quantity": 2,
      "price": 5.00,
      "totalPrice": 50.00  // Will be recalculated by backend
    },
    {
      "_id": "64def456...",
      "name": "GPS Navigation",
      "quantity": 1,
      "price": 15.00,
      "totalPrice": 15.00
    }
  ],
  "servicesTotal": 65.00
}
```

Backend will:
1. Validate services exist
2. Recalculate prices based on rental duration
3. Apply any special rules or limits
4. Return final pricing in response

---

## Summary

**For LeRent frontend developers:**

1. **Fetch services:** `GET /api/public/users/lerent@lerent.sk/services`
2. **Calculate prices:** `POST /api/public/users/lerent@lerent.sk/services/calculate-price`
3. **Include in booking:** Add `selectedServices` array to reservation request

**Key Points:**
- All prices in EUR
- Pricing types: fixed, per_day, per_km, percentage
- Respect quantity limits and approval requirements
- Use backend for accurate price calculations
