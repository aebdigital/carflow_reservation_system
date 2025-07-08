# CarFlow Car Listings & Pricing API Documentation

## Overview
This documentation provides a complete guide for fetching car inventory, pricing data, and vehicle specifications through the CarFlow public API. All examples use `rival@test.sk` as the reference tenant for car rental data.

**Base URL**: `https://carflow-reservation-system.onrender.com/api/public`

## Authentication
Public endpoints require no authentication but use tenant identification through the user email in the URL path.

## Standard Response Format
```json
{
  "success": true|false,
  "data": [], // Response data
  "count": 0, // Number of items (for lists)
  "pagination": {}, // Pagination info (when applicable)
  "message": "Success/Error message"
}
```

## Car Listings & Inventory APIs

### 1. Get All Available Cars
**GET** `/users/:email/cars`

Retrieve complete car inventory with pricing and availability information.

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 10, max: 50)
- `category` (optional): Filter by car category
- `available` (optional): Filter by availability (true/false)
- `priceMin` (optional): Minimum price filter
- `priceMax` (optional): Maximum price filter
- `transmission` (optional): Filter by transmission type (automatic/manual)
- `fuel` (optional): Filter by fuel type
- `seats` (optional): Filter by number of seats

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars?page=1&limit=10&available=true"
```

**Example Response:**
```json
{
  "success": true,
  "count": 8,
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3,
    "next": 2
  },
  "data": [
    {
      "_id": "64f5b8c2e1234567890abcde",
      "make": "BMW",
      "model": "320d",
      "year": 2022,
      "category": "luxury",
      "licensePlate": "BA-123-AB",
      "vin": "WBAVA31070NK12345",
      "color": "Čierna",
      "transmission": "automatic",
      "fuelType": "diesel",
      "engineSize": "2.0L",
      "seats": 5,
      "doors": 4,
      "features": [
        "GPS Navigation",
        "Air Conditioning",
        "Bluetooth",
        "Leather Seats",
        "Parking Sensors"
      ],
      "images": [
        {
          "url": "https://storage.googleapis.com/carflow-images/cars/bmw-320d-1.jpg",
          "alt": "BMW 320d - Front view",
          "isPrimary": true
        },
        {
          "url": "https://storage.googleapis.com/carflow-images/cars/bmw-320d-2.jpg",
          "alt": "BMW 320d - Interior",
          "isPrimary": false
        }
      ],
      "pricing": {
        "dailyRate": 89.00,
        "weeklyRate": 540.00,
        "monthlyRate": 2100.00,
        "currency": "EUR",
        "deposit": 500.00,
        "kmIncluded": 200,
        "extraKmRate": 0.25
      },
      "specifications": {
        "power": "190 HP",
        "acceleration": "7.1s",
        "topSpeed": "225 km/h",
        "fuelConsumption": "4.8L/100km",
        "bootCapacity": "480L"
      },
      "availability": {
        "isAvailable": true,
        "location": "Bratislava - Hlavná pobočka",
        "nextAvailableDate": "2024-01-20",
        "maintenanceScheduled": false
      },
      "insurance": {
        "included": true,
        "type": "comprehensive",
        "excess": 800.00
      },
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    },
    {
      "_id": "64f5b8c2e1234567890abce1",
      "make": "Volkswagen",
      "model": "Golf",
      "year": 2023,
      "category": "compact",
      "licensePlate": "BA-456-CD",
      "color": "Biela",
      "transmission": "manual",
      "fuelType": "petrol",
      "engineSize": "1.5L",
      "seats": 5,
      "doors": 5,
      "features": [
        "Air Conditioning",
        "Bluetooth",
        "USB Ports",
        "Electric Windows"
      ],
      "images": [
        {
          "url": "https://storage.googleapis.com/carflow-images/cars/vw-golf-1.jpg",
          "alt": "Volkswagen Golf - Front view",
          "isPrimary": true
        }
      ],
      "pricing": {
        "dailyRate": 45.00,
        "weeklyRate": 280.00,
        "monthlyRate": 1100.00,
        "currency": "EUR",
        "deposit": 300.00,
        "kmIncluded": 150,
        "extraKmRate": 0.20
      },
      "specifications": {
        "power": "150 HP",
        "acceleration": "8.5s",
        "topSpeed": "200 km/h",
        "fuelConsumption": "5.2L/100km",
        "bootCapacity": "380L"
      },
      "availability": {
        "isAvailable": true,
        "location": "Bratislava - Hlavná pobočka",
        "nextAvailableDate": "2024-01-18",
        "maintenanceScheduled": false
      },
      "insurance": {
        "included": true,
        "type": "standard",
        "excess": 600.00
      },
      "createdAt": "2024-01-10T14:30:00.000Z",
      "updatedAt": "2024-01-15T09:15:00.000Z"
    }
  ]
}
```

### 2. Get Car by ID
**GET** `/users/:email/cars/:carId`

Retrieve detailed information about a specific car.

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars/64f5b8c2e1234567890abcde"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "_id": "64f5b8c2e1234567890abcde",
    "make": "BMW",
    "model": "320d",
    "year": 2022,
    "category": "luxury",
    "description": "Luxusný sedan BMW 320d s automatickou prevodovkou a plnou výbavou. Ideálny pre obchodné cesty a komfortné cestovanie.",
    "licensePlate": "BA-123-AB",
    "vin": "WBAVA31070NK12345",
    "color": "Čierna",
    "transmission": "automatic",
    "fuelType": "diesel",
    "engineSize": "2.0L",
    "seats": 5,
    "doors": 4,
    "features": [
      "GPS Navigation",
      "Air Conditioning",
      "Bluetooth",
      "Leather Seats",
      "Parking Sensors",
      "Cruise Control",
      "Automatic Lights",
      "Rain Sensors"
    ],
    "images": [
      {
        "url": "https://storage.googleapis.com/carflow-images/cars/bmw-320d-1.jpg",
        "alt": "BMW 320d - Front view",
        "isPrimary": true
      },
      {
        "url": "https://storage.googleapis.com/carflow-images/cars/bmw-320d-2.jpg",
        "alt": "BMW 320d - Interior",
        "isPrimary": false
      },
      {
        "url": "https://storage.googleapis.com/carflow-images/cars/bmw-320d-3.jpg",
        "alt": "BMW 320d - Side view",
        "isPrimary": false
      }
    ],
    "pricing": {
      "dailyRate": 89.00,
      "weeklyRate": 540.00,
      "monthlyRate": 2100.00,
      "currency": "EUR",
      "deposit": 500.00,
      "kmIncluded": 200,
      "extraKmRate": 0.25,
      "seasonalRates": {
        "summer": {
          "dailyRate": 99.00,
          "period": "June - August"
        },
        "winter": {
          "dailyRate": 79.00,
          "period": "December - February"
        }
      }
    },
    "specifications": {
      "power": "190 HP",
      "acceleration": "7.1s",
      "topSpeed": "225 km/h",
      "fuelConsumption": "4.8L/100km",
      "bootCapacity": "480L",
      "weight": "1545kg",
      "dimensions": {
        "length": "4633mm",
        "width": "1811mm",
        "height": "1429mm"
      }
    },
    "availability": {
      "isAvailable": true,
      "location": "Bratislava - Hlavná pobočka",
      "address": "Hlavná 123, 811 01 Bratislava",
      "nextAvailableDate": "2024-01-20",
      "maintenanceScheduled": false,
      "reservedDates": [
        {
          "startDate": "2024-01-25",
          "endDate": "2024-01-28",
          "type": "reservation"
        }
      ]
    },
    "insurance": {
      "included": true,
      "type": "comprehensive",
      "excess": 800.00,
      "coverage": [
        "Collision Damage",
        "Theft Protection",
        "Third Party Liability",
        "Personal Accident"
      ]
    },
    "additionalServices": [
      {
        "name": "GPS Navigation",
        "price": 5.00,
        "unit": "per day"
      },
      {
        "name": "Child Seat",
        "price": 8.00,
        "unit": "per day"
      },
      {
        "name": "Additional Driver",
        "price": 12.00,
        "unit": "per rental"
      }
    ],
    "reviews": {
      "averageRating": 4.8,
      "totalReviews": 24,
      "ratings": {
        "comfort": 4.9,
        "performance": 4.7,
        "features": 4.8,
        "value": 4.6
      }
    },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### 3. Get Cars by Category
**GET** `/users/:email/cars/category/:category`

Retrieve cars filtered by specific category.

**Available Categories:**
- `economy` - Ekonomické vozidlá
- `compact` - Kompaktné vozidlá
- `intermediate` - Stredná trieda
- `standard` - Štandardné vozidlá
- `luxury` - Luxusné vozidlá
- `suv` - SUV vozidlá
- `van` - Dodávky a minibusy

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars/category/luxury?limit=5"
```

### 4. Search Cars
**GET** `/users/:email/cars/search?q=:query`

Search cars by make, model, or features.

**Query Parameters:**
- `q` (required): Search query
- `page` (optional): Page number
- `limit` (optional): Items per page

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars/search?q=BMW&limit=10"
```

## Pricing & Availability APIs

### 5. Check Car Availability
**GET** `/users/:email/cars/:carId/availability?startDate=:start&endDate=:end`

Check if a specific car is available for given dates.

**Query Parameters:**
- `startDate` (required): Start date (YYYY-MM-DD format)
- `endDate` (required): End date (YYYY-MM-DD format)

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars/64f5b8c2e1234567890abcde/availability?startDate=2024-02-01&endDate=2024-02-05"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "carId": "64f5b8c2e1234567890abcde",
    "requestedPeriod": {
      "startDate": "2024-02-01",
      "endDate": "2024-02-05",
      "duration": 4
    },
    "availability": {
      "isAvailable": true,
      "conflictingReservations": [],
      "maintenanceConflicts": [],
      "nextAvailableDate": "2024-02-01"
    },
    "pricing": {
      "dailyRate": 89.00,
      "totalDays": 4,
      "basePrice": 356.00,
      "discounts": [
        {
          "type": "weekly_discount",
          "description": "4+ days discount",
          "amount": -17.80,
          "percentage": 5
        }
      ],
      "totalPrice": 338.20,
      "deposit": 500.00,
      "currency": "EUR"
    },
    "location": {
      "pickupLocation": "Bratislava - Hlavná pobočka",
      "address": "Hlavná 123, 811 01 Bratislava",
      "workingHours": "Mo-Fr: 8:00-18:00, Sa: 9:00-15:00"
    }
  }
}
```

### 6. Calculate Rental Price
**GET** `/users/:email/cars/:carId/price?startDate=:start&endDate=:end&extras=:extras`

Calculate detailed pricing for a car rental including extras and discounts.

**Query Parameters:**
- `startDate` (required): Start date (YYYY-MM-DD format)
- `endDate` (required): End date (YYYY-MM-DD format)
- `extras` (optional): Comma-separated list of extra service IDs
- `kmLimit` (optional): Custom kilometer limit
- `discountCode` (optional): Discount code to apply

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars/64f5b8c2e1234567890abcde/price?startDate=2024-02-01&endDate=2024-02-05&extras=gps,child-seat&discountCode=LETO10"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "carId": "64f5b8c2e1234567890abcde",
    "carDetails": {
      "make": "BMW",
      "model": "320d",
      "category": "luxury"
    },
    "rentalPeriod": {
      "startDate": "2024-02-01",
      "endDate": "2024-02-05",
      "totalDays": 4,
      "duration": "4 days"
    },
    "basePricing": {
      "dailyRate": 89.00,
      "totalDays": 4,
      "subtotal": 356.00
    },
    "extras": [
      {
        "id": "gps",
        "name": "GPS Navigation",
        "pricePerDay": 5.00,
        "totalDays": 4,
        "subtotal": 20.00
      },
      {
        "id": "child-seat",
        "name": "Child Seat",
        "pricePerDay": 8.00,
        "totalDays": 4,
        "subtotal": 32.00
      }
    ],
    "extrasTotal": 52.00,
    "discounts": [
      {
        "type": "duration_discount",
        "description": "4+ days discount (5%)",
        "amount": -17.80,
        "appliedTo": "base_price"
      },
      {
        "type": "discount_code",
        "code": "LETO10",
        "description": "Summer discount (10%)",
        "amount": -35.60,
        "appliedTo": "base_price"
      }
    ],
    "totalDiscounts": -53.40,
    "pricing": {
      "basePrice": 356.00,
      "extrasPrice": 52.00,
      "discountsApplied": -53.40,
      "subtotal": 354.60,
      "tax": {
        "rate": 20,
        "amount": 70.92
      },
      "totalPrice": 425.52,
      "deposit": 500.00,
      "currency": "EUR"
    },
    "included": {
      "kmLimit": 200,
      "insurance": "Comprehensive",
      "roadAssistance": true,
      "cleaning": true
    },
    "paymentTerms": {
      "depositRequired": 500.00,
      "balanceDue": 425.52,
      "totalAmount": 925.52,
      "currency": "EUR"
    }
  }
}
```

### 7. Get Featured Cars
**GET** `/users/:email/cars/featured`

Get a list of featured/popular cars.

**Query Parameters:**
- `limit` (optional): Number of cars to return (default: 6)

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars/featured?limit=6"
```

**Example Response:**
```json
{
  "success": true,
  "count": 6,
  "data": [
    {
      "_id": "64f5b8c2e1234567890abcde",
      "make": "BMW",
      "model": "320d",
      "year": 2022,
      "category": "luxury",
      "featured": true,
      "popularityScore": 95,
      "images": [
        {
          "url": "https://storage.googleapis.com/carflow-images/cars/bmw-320d-1.jpg",
          "alt": "BMW 320d",
          "isPrimary": true
        }
      ],
      "pricing": {
        "dailyRate": 89.00,
        "currency": "EUR"
      },
      "specifications": {
        "transmission": "automatic",
        "fuelType": "diesel",
        "seats": 5
      },
      "availability": {
        "isAvailable": true,
        "location": "Bratislava - Hlavná pobočka"
      },
      "reviews": {
        "averageRating": 4.8,
        "totalReviews": 24
      }
    }
  ]
}
```

## Additional Data APIs

### 8. Get Car Categories
**GET** `/users/:email/cars/categories`

Get all available car categories with counts.

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars/categories"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "category": "economy",
      "label": "Ekonomické",
      "count": 5,
      "priceRange": {
        "min": 25.00,
        "max": 35.00
      },
      "description": "Úsporné vozidlá pre mestskú jazdu"
    },
    {
      "category": "compact",
      "label": "Kompaktné",
      "count": 8,
      "priceRange": {
        "min": 35.00,
        "max": 55.00
      },
      "description": "Všestranné vozidlá pre každodenné použitie"
    },
    {
      "category": "luxury",
      "label": "Luxusné",
      "count": 4,
      "priceRange": {
        "min": 80.00,
        "max": 150.00
      },
      "description": "Prémiové vozidlá s najvyššou výbavou"
    }
  ]
}
```

### 9. Get Available Locations
**GET** `/users/:email/locations`

Get all pickup/dropoff locations.

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/locations"
```

**Example Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "64f5b8c2e1234567890loc01",
      "name": "Bratislava - Hlavná pobočka",
      "address": "Hlavná 123, 811 01 Bratislava",
      "coordinates": {
        "latitude": 48.1486,
        "longitude": 17.1077
      },
      "workingHours": {
        "monday": "08:00-18:00",
        "tuesday": "08:00-18:00",
        "wednesday": "08:00-18:00",
        "thursday": "08:00-18:00",
        "friday": "08:00-18:00",
        "saturday": "09:00-15:00",
        "sunday": "closed"
      },
      "services": [
        "car_pickup",
        "car_dropoff",
        "maintenance",
        "cleaning"
      ],
      "contact": {
        "phone": "+421 2 1234 5678",
        "email": "bratislava@rival.sk"
      },
      "availableCars": 12,
      "isActive": true
    }
  ]
}
```

## Frontend Integration Examples

### JavaScript Implementation

```javascript
// CarFlow Car Listings API Client
class CarListingsAPI {
  constructor(userEmail) {
    this.userEmail = userEmail;
    this.baseURL = 'https://carflow-reservation-system.onrender.com/api/public';
  }

  async apiCall(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'API call failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Car Listings
  async getCars(filters = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined) {
        params.append(key, filters[key]);
      }
    });
    
    const queryString = params.toString();
    const endpoint = `/users/${this.userEmail}/cars${queryString ? '?' + queryString : ''}`;
    return this.apiCall(endpoint);
  }

  async getCar(carId) {
    return this.apiCall(`/users/${this.userEmail}/cars/${carId}`);
  }

  async getCarsByCategory(category, limit = 10) {
    return this.apiCall(`/users/${this.userEmail}/cars/category/${category}?limit=${limit}`);
  }

  async searchCars(query, filters = {}) {
    const params = new URLSearchParams({ q: query, ...filters });
    return this.apiCall(`/users/${this.userEmail}/cars/search?${params.toString()}`);
  }

  async getFeaturedCars(limit = 6) {
    return this.apiCall(`/users/${this.userEmail}/cars/featured?limit=${limit}`);
  }

  // Availability & Pricing
  async checkAvailability(carId, startDate, endDate) {
    return this.apiCall(`/users/${this.userEmail}/cars/${carId}/availability?startDate=${startDate}&endDate=${endDate}`);
  }

  async calculatePrice(carId, startDate, endDate, options = {}) {
    const params = new URLSearchParams({
      startDate,
      endDate,
      ...options
    });
    return this.apiCall(`/users/${this.userEmail}/cars/${carId}/price?${params.toString()}`);
  }

  // Additional Data
  async getCategories() {
    return this.apiCall(`/users/${this.userEmail}/cars/categories`);
  }

  async getLocations() {
    return this.apiCall(`/users/${this.userEmail}/locations`);
  }
}

// Usage Examples
const carAPI = new CarListingsAPI('rival@test.sk');

// Load all cars with filters
async function loadCars() {
  try {
    const result = await carAPI.getCars({
      page: 1,
      limit: 12,
      available: true,
      category: 'luxury'
    });
    
    displayCars(result.data);
    setupPagination(result.pagination);
  } catch (error) {
    console.error('Failed to load cars:', error);
  }
}

// Display car listings
function displayCars(cars) {
  const container = document.getElementById('cars-grid');
  container.innerHTML = '';

  cars.forEach(car => {
    const carCard = createCarCard(car);
    container.appendChild(carCard);
  });
}

// Create car card element
function createCarCard(car) {
  const card = document.createElement('div');
  card.className = 'car-card';
  
  const primaryImage = car.images.find(img => img.isPrimary) || car.images[0];
  
  card.innerHTML = `
    <div class="car-image">
      <img src="${primaryImage.url}" alt="${primaryImage.alt}" loading="lazy" />
      ${car.availability.isAvailable ? 
        '<span class="availability-badge available">Available</span>' : 
        '<span class="availability-badge unavailable">Unavailable</span>'
      }
    </div>
    <div class="car-details">
      <h3 class="car-title">${car.make} ${car.model}</h3>
      <p class="car-year">${car.year}</p>
      <div class="car-specs">
        <span class="spec">
          <i class="icon-transmission"></i>
          ${car.transmission === 'automatic' ? 'Automatic' : 'Manual'}
        </span>
        <span class="spec">
          <i class="icon-fuel"></i>
          ${car.fuelType}
        </span>
        <span class="spec">
          <i class="icon-seats"></i>
          ${car.seats} seats
        </span>
      </div>
      <div class="car-pricing">
        <span class="price-from">From</span>
        <span class="price-amount">${car.pricing.dailyRate}€</span>
        <span class="price-period">per day</span>
      </div>
      <div class="car-features">
        ${car.features.slice(0, 3).map(feature => 
          `<span class="feature-tag">${feature}</span>`
        ).join('')}
      </div>
      <button class="btn-view-details" onclick="viewCarDetails('${car._id}')">
        View Details
      </button>
    </div>
  `;
  
  return card;
}

// Load car details
async function viewCarDetails(carId) {
  try {
    const result = await carAPI.getCar(carId);
    showCarModal(result.data);
  } catch (error) {
    console.error('Failed to load car details:', error);
  }
}

// Check availability and pricing
async function checkCarAvailability(carId, startDate, endDate) {
  try {
    const availability = await carAPI.checkAvailability(carId, startDate, endDate);
    const pricing = await carAPI.calculatePrice(carId, startDate, endDate);
    
    displayAvailabilityResults(availability.data, pricing.data);
  } catch (error) {
    console.error('Failed to check availability:', error);
  }
}

// Search functionality
async function searchCars(query) {
  try {
    const result = await carAPI.searchCars(query, {
      page: 1,
      limit: 20
    });
    
    displaySearchResults(result.data);
  } catch (error) {
    console.error('Search failed:', error);
  }
}

// Load featured cars for homepage
async function loadFeaturedCars() {
  try {
    const result = await carAPI.getFeaturedCars(6);
    displayFeaturedCars(result.data);
  } catch (error) {
    console.error('Failed to load featured cars:', error);
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
  loadCars();
  loadFeaturedCars();
  setupSearchForm();
});
```

### React Implementation

```jsx
import React, { useState, useEffect, createContext, useContext } from 'react';

// Car API Context
const CarAPIContext = createContext();

export const CarAPIProvider = ({ userEmail, children }) => {
  const [api] = useState(() => new CarListingsAPI(userEmail));
  
  return (
    <CarAPIContext.Provider value={api}>
      {children}
    </CarAPIContext.Provider>
  );
};

export const useCarAPI = () => {
  const context = useContext(CarAPIContext);
  if (!context) {
    throw new Error('useCarAPI must be used within CarAPIProvider');
  }
  return context;
};

// Custom Hooks
export const useCars = (filters = {}) => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const api = useCarAPI();

  useEffect(() => {
    const loadCars = async () => {
      try {
        setLoading(true);
        const result = await api.getCars(filters);
        setCars(result.data);
        setPagination(result.pagination);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCars();
  }, [api, JSON.stringify(filters)]);

  return { cars, loading, error, pagination };
};

export const useCar = (carId) => {
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const api = useCarAPI();

  useEffect(() => {
    if (!carId) return;

    const loadCar = async () => {
      try {
        setLoading(true);
        const result = await api.getCar(carId);
        setCar(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCar();
  }, [api, carId]);

  return { car, loading, error };
};

// Car Listing Component
export const CarListing = ({ filters = {} }) => {
  const { cars, loading, error, pagination } = useCars(filters);

  if (loading) {
    return <div className="loading">Loading cars...</div>;
  }

  if (error) {
    return <div className="error">Error loading cars: {error}</div>;
  }

  return (
    <div className="car-listing">
      <div className="cars-grid">
        {cars.map(car => (
          <CarCard key={car._id} car={car} />
        ))}
      </div>
      
      {pagination && (
        <Pagination 
          current={pagination.page}
          total={pagination.pages}
          onChange={(page) => {/* handle page change */}}
        />
      )}
    </div>
  );
};

// Car Card Component
export const CarCard = ({ car }) => {
  const primaryImage = car.images?.find(img => img.isPrimary) || car.images?.[0];

  return (
    <div className="car-card">
      <div className="car-image">
        {primaryImage && (
          <img 
            src={primaryImage.url} 
            alt={primaryImage.alt} 
            loading="lazy" 
          />
        )}
        <span className={`availability-badge ${car.availability.isAvailable ? 'available' : 'unavailable'}`}>
          {car.availability.isAvailable ? 'Available' : 'Unavailable'}
        </span>
      </div>
      
      <div className="car-details">
        <h3 className="car-title">{car.make} {car.model}</h3>
        <p className="car-year">{car.year}</p>
        
        <div className="car-specs">
          <span className="spec">
            {car.transmission === 'automatic' ? 'Automatic' : 'Manual'}
          </span>
          <span className="spec">{car.fuelType}</span>
          <span className="spec">{car.seats} seats</span>
        </div>
        
        <div className="car-pricing">
          <span className="price-from">From</span>
          <span className="price-amount">{car.pricing.dailyRate}€</span>
          <span className="price-period">per day</span>
        </div>
        
        <div className="car-features">
          {car.features?.slice(0, 3).map((feature, index) => (
            <span key={index} className="feature-tag">{feature}</span>
          ))}
        </div>
        
        <button 
          className="btn-view-details"
          onClick={() => {/* navigate to car details */}}
        >
          View Details
        </button>
      </div>
    </div>
  );
};

// Car Details Component
export const CarDetails = ({ carId }) => {
  const { car, loading, error } = useCar(carId);

  if (loading) return <div className="loading">Loading car details...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!car) return <div className="error">Car not found</div>;

  return (
    <div className="car-details-page">
      <div className="car-gallery">
        {car.images?.map((image, index) => (
          <img 
            key={index}
            src={image.url} 
            alt={image.alt}
            className={image.isPrimary ? 'primary' : ''}
          />
        ))}
      </div>
      
      <div className="car-info">
        <h1>{car.make} {car.model} ({car.year})</h1>
        <p className="car-description">{car.description}</p>
        
        <div className="pricing-section">
          <h3>Pricing</h3>
          <div className="pricing-grid">
            <div className="price-item">
              <span className="label">Daily Rate:</span>
              <span className="value">{car.pricing.dailyRate}€</span>
            </div>
            <div className="price-item">
              <span className="label">Weekly Rate:</span>
              <span className="value">{car.pricing.weeklyRate}€</span>
            </div>
            <div className="price-item">
              <span className="label">Monthly Rate:</span>
              <span className="value">{car.pricing.monthlyRate}€</span>
            </div>
          </div>
        </div>
        
        <div className="specifications">
          <h3>Specifications</h3>
          <div className="specs-grid">
            <div className="spec-item">
              <span className="label">Engine:</span>
              <span className="value">{car.engineSize}</span>
            </div>
            <div className="spec-item">
              <span className="label">Power:</span>
              <span className="value">{car.specifications.power}</span>
            </div>
            <div className="spec-item">
              <span className="label">Fuel Consumption:</span>
              <span className="value">{car.specifications.fuelConsumption}</span>
            </div>
          </div>
        </div>
        
        <div className="features">
          <h3>Features</h3>
          <div className="features-list">
            {car.features?.map((feature, index) => (
              <span key={index} className="feature">{feature}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
export const CarRentalApp = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 12,
    available: true
  });

  return (
    <CarAPIProvider userEmail="rival@test.sk">
      <div className="car-rental-app">
        <header>
          <h1>Car Rental - Rival</h1>
        </header>
        
        <main>
          <CarFilters 
            filters={filters}
            onChange={setFilters}
          />
          
          <CarListing filters={filters} />
        </main>
      </div>
    </CarAPIProvider>
  );
};
```

## Error Handling

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Car/Resource not found
- `422` - Validation error
- `429` - Rate limit exceeded
- `500` - Internal server error

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error details"
  }
}
```

## Best Practices

### Performance
1. **Pagination**: Always use pagination for large car lists
2. **Image Optimization**: Use lazy loading for car images
3. **Caching**: Cache frequently accessed data (categories, locations)
4. **Filtering**: Apply filters server-side for better performance

### User Experience
1. **Loading States**: Show loading indicators during API calls
2. **Error Handling**: Provide meaningful error messages
3. **Responsive Images**: Use appropriate image sizes for different devices
4. **Search**: Implement debounced search for better UX

### Integration Tips
1. **Date Formats**: Always use YYYY-MM-DD format for dates
2. **Price Display**: Format prices consistently with currency symbols
3. **Availability**: Check availability before showing booking options
4. **Validation**: Validate user inputs before API calls

---

*This API guide provides complete access to car inventory, pricing, and availability data for the Rival car rental service. All endpoints are optimized for frontend integration and provide comprehensive vehicle information for building car rental applications.* 