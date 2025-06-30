# Car Rental System - Public API Documentation

This document describes the public API endpoints for the Car Rental System that enable websites to view car listings and create reservations.

## Base URL

Production: `https://carflow-reservation-system.onrender.com/api/public`


## Authentication

These are public endpoints that **do not require authentication**. However, tenant-specific endpoints require a valid user email to filter results by tenant.

---

## 📚 API Endpoints Overview

### General Public Endpoints (All Tenants)
- `GET /cars` - Get all cars from all tenants
- `GET /cars/:id` - Get specific car details
- `GET /cars/:id/availability` - Check car availability
- `GET /cars/:id/calendar` - Get car booking calendar
- `GET /cars/location/:locationName` - Get cars by location
- `POST /reservations` - Create reservation (any tenant)

### Tenant-Specific Endpoints (Filtered by User)
- `GET /users/:email/cars` - Get cars for specific user/tenant
- `GET /users/:email/cars/:carId` - Get car details for specific user/tenant
- `GET /users/:email/cars/:carId/availability` - Check availability for specific user/tenant
- `GET /users/:email/cars/category/:category` - Get cars by category for specific user/tenant
- `GET /users/:email/features` - Get available features for specific user/tenant
- `POST /users/:email/reservations` - Create reservation for specific user/tenant

---

## 🚗 Car Listing Endpoints

### Get Cars for Specific User/Tenant

**Use this endpoint to show only cars belonging to a specific user (e.g., rival@test.sk)**

```http
GET /users/{email}/cars
```

**Parameters:**
- `email` (string, required): User email to filter by tenant (e.g., "rival@test.sk")

**Query Parameters:**
- `page` (number, optional): Page number for pagination (default: 1)
- `limit` (number, optional): Number of cars per page (default: 25)
- `category` (string, optional): Filter by car category (economy, compact, midsize, fullsize, luxury, suv, minivan, convertible, sports)
- `fuelType` (string, optional): Filter by fuel type (gasoline, diesel, hybrid, electric)
- `transmission` (string, optional): Filter by transmission (manual, automatic, cvt)
- `sort` (string, optional): Sort field (e.g., "dailyRate", "-createdAt")

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars?category=luxury&limit=10"
```

**Example Response:**
```json
{
  "success": true,
  "count": 5,
  "total": 15,
  "pagination": {
    "next": {
      "page": 2,
      "limit": 10
    }
  },
  "data": [
    {
      "_id": "60d5ec49e8b4f5d2c8e1b2a3",
      "brand": "BMW",
      "model": "X5",
      "year": 2023,
      "color": "Black",
      "category": "luxury",
      "fuelType": "gasoline",
      "transmission": "automatic",
      "seats": 5,
      "doors": 4,
      "description": "Luxury SUV with premium features",
      "dailyRate": 120,
      "weeklyRate": 800,
      "monthlyRate": 3200,
      "location": {
        "name": "Downtown Office",
        "address": {
          "street": "123 Main St",
          "city": "City",
          "state": "State",
          "zipCode": "12345",
          "country": "Country"
        }
      },
      "features": ["air-conditioning", "gps", "bluetooth", "heated-seats", "sunroof"],
      "images": [
        {
          "url": "https://example.com/car1.jpg",
          "description": "Front view",
          "isPrimary": true
        }
      ]
    }
  ]
}
```

### Get Single Car Details

```http
GET /users/{email}/cars/{carId}
```

**Parameters:**
- `email` (string, required): User email to filter by tenant
- `carId` (string, required): Car ID

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars/60d5ec49e8b4f5d2c8e1b2a3"
```

### Check Car Availability

```http
GET /users/{email}/cars/{carId}/availability?startDate={date}&endDate={date}
```

**Parameters:**
- `email` (string, required): User email to filter by tenant
- `carId` (string, required): Car ID

**Query Parameters:**
- `startDate` (string, optional): Start date in ISO format (YYYY-MM-DD)
- `endDate` (string, optional): End date in ISO format (YYYY-MM-DD)

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars/60d5ec49e8b4f5d2c8e1b2a3/availability?startDate=2024-01-15&endDate=2024-01-20"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "isAvailable": true,
    "status": "available",
    "isAvailableForDates": true,
    "conflictingReservations": 0
  }
}
```

### Get Cars by Category

```http
GET /users/{email}/cars/category/{category}
```

**Parameters:**
- `email` (string, required): User email to filter by tenant
- `category` (string, required): Car category (economy, compact, midsize, fullsize, luxury, suv, minivan, convertible, sports)

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars/category/luxury"
```

### Get Available Features

```http
GET /users/{email}/features
```

**Parameters:**
- `email` (string, required): User email to filter by tenant

**Example Response:**
```json
{
  "success": true,
  "data": [
    "air-conditioning",
    "gps",
    "bluetooth",
    "heated-seats",
    "sunroof",
    "leather-seats",
    "backup-camera",
    "cruise-control",
    "usb-ports",
    "wifi"
  ]
}
```

---

## 📋 Reservation Endpoints

### Create Reservation for Specific User/Tenant

**Use this endpoint to create reservations that belong to a specific tenant**

```http
POST /users/{email}/reservations
```

**Parameters:**
- `email` (string, required): User email to determine tenant (e.g., "rival@test.sk")

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "customerEmail": "customer@example.com", // Optional, will use URL email if not provided
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01",
  "address": {
    "street": "123 Customer St",
    "city": "Customer City",
    "state": "CS",
    "zipCode": "12345",
    "country": "Country"
  },
  "licenseNumber": "D123456789",
  "licenseExpiry": "2025-12-31",
  "carId": "60d5ec49e8b4f5d2c8e1b2a3",
  "startDate": "2024-01-15T10:00:00Z",
  "endDate": "2024-01-20T10:00:00Z",
  "pickupLocation": {
    "name": "Downtown Office",
    "address": {
      "street": "123 Main St",
      "city": "City",
      "state": "State",
      "zipCode": "12345",
      "country": "Country"
    }
  },
  "dropoffLocation": {
    "name": "Airport",
    "address": {
      "street": "456 Airport Rd",
      "city": "City",
      "state": "State",
      "zipCode": "12346",
      "country": "Country"
    }
  },
  "additionalDrivers": [
    {
      "firstName": "Jane",
      "lastName": "Doe",
      "licenseNumber": "D987654321",
      "licenseExpiry": "2025-12-31",
      "relationship": "spouse"
    }
  ],
  "specialRequests": "Need GPS device",
  "notes": "Business trip"
}
```

**Required Fields:**
- `firstName`, `lastName`, `phone`, `licenseNumber`, `carId`, `startDate`, `endDate`

**Example Request:**
```bash
curl -X POST "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/reservations" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "licenseNumber": "D123456789",
    "carId": "60d5ec49e8b4f5d2c8e1b2a3",
    "startDate": "2024-01-15T10:00:00Z",
    "endDate": "2024-01-20T10:00:00Z"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Reservation request submitted successfully! You will receive a confirmation email shortly.",
  "data": {
    "reservation": {
      "_id": "60d5ec49e8b4f5d2c8e1b2a4",
      "reservationNumber": "RES-A3B2-1640995200000",
      "customer": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "customer@example.com",
        "phone": "+1234567890"
      },
      "car": {
        "brand": "BMW",
        "model": "X5",
        "year": 2023,
        "dailyRate": 120
      },
      "startDate": "2024-01-15T10:00:00Z",
      "endDate": "2024-01-20T10:00:00Z",
      "status": "pending",
      "pricing": {
        "dailyRate": 120,
        "totalDays": 5,
        "subtotal": 600,
        "taxes": 60,
        "totalAmount": 660
      }
    },
    "customer": {
      "id": "60d5ec49e8b4f5d2c8e1b2a5",
      "firstName": "John",
      "lastName": "Doe",
      "email": "customer@example.com",
      "phone": "+1234567890",
      "isNewCustomer": true
    },
    "loginInfo": {
      "email": "customer@example.com",
      "defaultPassword": "customer123",
      "message": "You can log in to track your reservation status"
    }
  }
}
```

---

## 🔧 Integration Examples

### JavaScript/Fetch Example

```javascript
// Get cars for rival@test.sk
async function getRivalCars() {
  try {
    const response = await fetch('https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars?category=luxury');
    const data = await response.json();
    
    if (data.success) {
      console.log('Cars:', data.data);
      return data.data;
    }
  } catch (error) {
    console.error('Error fetching cars:', error);
  }
}

// Create reservation for rival@test.sk tenant
async function createReservation(reservationData) {
  try {
    const response = await fetch('https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reservationData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Reservation created:', data.data);
      return data.data;
    } else {
      console.error('Error:', data.message);
    }
  } catch (error) {
    console.error('Error creating reservation:', error);
  }
}
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';

function useRivalCars() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCars() {
      try {
        const response = await fetch('https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars');
        const data = await response.json();
        
        if (data.success) {
          setCars(data.data);
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError('Failed to fetch cars');
      } finally {
        setLoading(false);
      }
    }

    fetchCars();
  }, []);

  return { cars, loading, error };
}

// Usage in component
function CarsList() {
  const { cars, loading, error } = useRivalCars();

  if (loading) return <div>Loading cars...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {cars.map(car => (
        <div key={car._id}>
          <h3>{car.brand} {car.model} ({car.year})</h3>
          <p>Daily Rate: ${car.dailyRate}</p>
          <p>Category: {car.category}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 🛠️ Setup Instructions for Development

### 1. Environment Variables

Create a `.env` file in the server directory:

```env
MONGODB_URI=mongodb://localhost:27017/car-rental
PORT=3001
NODE_ENV=development
JWT_SECRET=your-jwt-secret-key
```

### 2. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies (if using the admin frontend)
cd ../client
npm install
```

### 3. Start the Server

```bash
cd server
npm start
```

The API will be available at `http://localhost:3001/api/public`

### 4. Test the Endpoints

```bash
# Test getting cars for a specific user
curl "http://localhost:3001/api/public/users/rival@test.sk/cars"

# Test health check
curl "http://localhost:3001/api/health"
```

---

## 🚨 Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information (in development mode)"
}
```

### Common Error Codes

- `400` - Bad Request (missing required fields, invalid dates)
- `404` - Not Found (user email not found, car not found)
- `409` - Conflict (car not available for selected dates)
- `500` - Internal Server Error

---

## 📝 Notes

### Tenant Isolation
- Each user email corresponds to a specific tenant
- Cars and reservations are isolated by tenant
- A user "rival@test.sk" will only see cars belonging to their tenant

### Customer Creation
- New customers are automatically created when making reservations
- Default password is "customer123" for new customers
- Customers are scoped to their specific tenant

### Car Status
- Only cars with `status: 'available'` and `isActive: true` are shown in public endpoints
- Cars in maintenance or out-of-service are hidden

### Rate Limiting
- Public endpoints have higher rate limits (500 requests per 15 minutes)
- General API endpoints have standard limits (200 requests per 15 minutes)

---

## 🤝 Support

For questions about integration or issues with the API, please contact the development team or check the main project documentation.

## 🔗 Related Documentation

- [Admin API Documentation](./API_INTEGRATION_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT_QUICK_START.md)
- [Environment Setup](./ENVIRONMENT_SETUP.md) 