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

# CarFlow Public API Documentation

This document describes the public API endpoints that can be used by external websites to integrate with the CarFlow car rental system. These endpoints do not require authentication and are designed for public-facing integrations.

## Base URL

```
Production: https://carflow-reservation-system.onrender.com/api/public
Development: http://localhost:3001/api/public
```

## Authentication

These public endpoints do not require authentication. However, they use tenant isolation through user email addresses to ensure data separation between different rental companies.

## Tenant-Specific Endpoints

All endpoints are tenant-aware through the user email parameter. This ensures that each rental company only sees their own data.

### URL Pattern
```
/api/public/users/{tenant-email}/{endpoint}
```

Where `{tenant-email}` is the email address of a user belonging to the specific tenant/rental company.

---

## 🚗 Car Endpoints

### Get Cars for Tenant

Get all available cars for a specific tenant.

**Endpoint:** `GET /api/public/users/{email}/cars`

**Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `category` (optional): Filter by car category
- `minPrice` (optional): Minimum daily rate
- `maxPrice` (optional): Maximum daily rate
- `available` (optional): Only show available cars (true/false)

**Example Request:**
```javascript
fetch('https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/cars?page=1&limit=10&available=true')
  .then(response => response.json())
  .then(data => console.log(data));
```

**Example Response:**
```json
{
  "success": true,
  "count": 10,
  "pagination": {
    "next": {
      "page": 2,
      "limit": 10
    }
  },
  "data": [
    {
      "_id": "car123",
      "brand": "Toyota",
      "model": "Camry",
      "year": 2023,
      "category": "midsize",
      "dailyRate": 45,
      "weeklyRate": 270,
      "monthlyRate": 1080,
      "fuelType": "gasoline",
      "transmission": "automatic",
      "seats": 5,
      "status": "available",
      "images": ["image1.jpg", "image2.jpg"],
      "features": ["GPS", "Bluetooth", "Air Conditioning"],
      "description": "Comfortable midsize sedan perfect for business trips"
    }
  ]
}
```

### Get Single Car

Get details of a specific car.

**Endpoint:** `GET /api/public/users/{email}/cars/{carId}`

**Example Request:**
```javascript
fetch('https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/cars/car123')
  .then(response => response.json())
  .then(data => console.log(data));
```

### Check Car Availability

Check if a car is available for specific dates.

**Endpoint:** `GET /api/public/users/{email}/cars/{carId}/availability`

**Parameters:**
- `startDate`: Start date (ISO format)
- `endDate`: End date (ISO format)

**Example Request:**
```javascript
fetch('https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/cars/car123/availability?startDate=2024-01-15&endDate=2024-01-20')
  .then(response => response.json())
  .then(data => console.log(data));
```

### Get Cars by Category

Get all cars in a specific category for a tenant.

**Endpoint:** `GET /api/public/users/{email}/cars/category/{category}`

**Available Categories:**
- `economy`
- `compact`
- `midsize`
- `fullsize`
- `luxury`
- `suv`
- `minivan`
- `convertible`
- `sports`

**Example Request:**
```javascript
fetch('https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/cars/category/suv')
  .then(response => response.json())
  .then(data => console.log(data));
```

### Get Available Features

Get all available car features for a tenant.

**Endpoint:** `GET /api/public/users/{email}/features`

**Example Response:**
```json
{
  "success": true,
  "data": [
    "GPS Navigation",
    "Bluetooth",
    "Air Conditioning",
    "Heated Seats",
    "Backup Camera",
    "Sunroof",
    "Leather Seats"
  ]
}
```

---

## 📅 Reservation Endpoints

### Create Reservation

Create a new reservation for a tenant. This endpoint automatically creates a customer account if one doesn't exist.

**Endpoint:** `POST /api/public/users/{email}/reservations`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "customerEmail": "john.doe@example.com",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "licenseNumber": "D123456789",
  "licenseExpiry": "2025-12-31",
  "carId": "car123",
  "startDate": "2024-01-15T10:00:00.000Z",
  "endDate": "2024-01-20T10:00:00.000Z",
  "pickupLocation": {
    "name": "Main Office",
    "address": {
      "street": "456 Business Ave",
      "city": "New York",
      "state": "NY",
      "zipCode": "10002",
      "country": "USA"
    }
  },
  "dropoffLocation": {
    "name": "Airport Branch",
    "address": {
      "street": "Airport Terminal 1",
      "city": "New York",
      "state": "NY",
      "zipCode": "10003",
      "country": "USA"
    }
  },
  "additionalDrivers": [
    {
      "firstName": "Jane",
      "lastName": "Smith",
      "licenseNumber": "D987654321",
      "licenseExpiry": "2026-06-30",
      "relationship": "spouse"
    }
  ],
  "specialRequests": "Please ensure the car is clean and fueled",
  "discountCode": "SUMMER20"
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Reservation request submitted successfully! You will receive a confirmation email shortly.",
  "data": {
    "reservation": {
      "_id": "res123",
      "reservationNumber": "EXAM-000001",
      "customer": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "phone": "+1234567890"
      },
      "car": {
        "brand": "Toyota",
        "model": "Camry",
        "year": 2023,
        "dailyRate": 45,
        "images": ["image1.jpg"]
      },
      "startDate": "2024-01-15T10:00:00.000Z",
      "endDate": "2024-01-20T10:00:00.000Z",
      "status": "pending",
      "pricing": {
        "dailyRate": 45,
        "totalDays": 5,
        "subtotal": 225,
        "taxes": 22.50,
        "discounts": [
          {
            "name": "Discount Code: SUMMER20",
            "amount": 45,
            "description": "20% summer discount",
            "code": "SUMMER20"
          }
        ],
        "totalAmount": 202.50
      },
      "appliedDiscountCodes": [
        {
          "code": "SUMMER20",
          "discountAmount": 45
        }
      ]
    },
    "customer": {
      "id": "cust123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "isNewCustomer": true
    },
    "loginInfo": {
      "email": "john.doe@example.com",
      "defaultPassword": "customer123",
      "message": "You can log in to track your reservation status"
    },
    "discount": {
      "applied": true,
      "codes": [
        {
          "code": "SUMMER20",
          "discountAmount": 45
        }
      ],
      "totalSaved": 45
    }
  }
}
```

---

## 🌐 Website Settings Endpoints

### Get Website Settings

Get website configuration including info bars, modals, and general settings for a tenant.

**Endpoint:** `GET /api/public/users/{email}/website-settings`

**Example Request:**
```javascript
fetch('https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/website-settings')
  .then(response => response.json())
  .then(data => console.log(data));
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "infoBar": {
      "text": "Summer Sale - 20% off all SUVs until June 30th!",
      "color": "red",
      "backgroundColor": "#d32f2f",
      "textColor": "#ffffff",
      "displayLocation": "all-pages",
      "isActive": true,
      "startDate": "2024-06-01T00:00:00.000Z",
      "endDate": "2024-06-30T23:59:59.000Z"
    },
    "modal": {
      "title": "Get 10% Off Your First Rental!",
      "content": "Sign up with your email and get an exclusive 10% discount on your first car rental.",
      "type": "newsletter",
      "displayLocation": "homepage",
      "triggerRule": {
        "type": "time",
        "value": 5
      },
      "isActive": true,
      "emailPlaceholder": "Enter your email address",
      "buttonText": "Get Discount",
      "backgroundColor": "#ffffff",
      "textColor": "#333333",
      "buttonColor": "#1976d2"
    },
    "siteName": "CarFlow Rental",
    "siteDescription": "Professional car rental service",
    "contactEmail": "info@carflow.com",
    "contactPhone": "+1-800-CAR-FLOW",
    "socialLinks": {
      "facebook": "https://facebook.com/carflow",
      "instagram": "https://instagram.com/carflow"
    },
    "metaTitle": "CarFlow - Premium Car Rental Service",
    "metaDescription": "Rent premium cars with CarFlow. Best rates, excellent service, wide selection of vehicles."
  }
}
```

### Get Info Bar

Get active info bar configuration for a specific page.

**Endpoint:** `GET /api/public/users/{email}/info-bar`

**Parameters:**
- `page` (optional): Current page (`homepage`, `pricing`, `all-pages`)

**Example Request:**
```javascript
fetch('https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/info-bar?page=homepage')
  .then(response => response.json())
  .then(data => {
    if (data.success && data.data) {
      // Display info bar
      const infoBar = document.createElement('div');
      infoBar.style.backgroundColor = data.data.backgroundColor;
      infoBar.style.color = data.data.textColor;
      infoBar.style.padding = '10px';
      infoBar.style.textAlign = 'center';
      infoBar.innerText = data.data.text;
      document.body.prepend(infoBar);
    }
  });
```

### Get Modal

Get active modal configuration for a specific page.

**Endpoint:** `GET /api/public/users/{email}/modal`

**Parameters:**
- `page` (optional): Current page (`homepage`, `pricing`, `all-pages`)

**Example Request:**
```javascript
fetch('https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/modal?page=homepage')
  .then(response => response.json())
  .then(data => {
    if (data.success && data.data) {
      const modal = data.data;
      
      // Set up trigger based on modal configuration
      if (modal.triggerRule.type === 'time') {
        setTimeout(() => {
          showModal(modal);
        }, modal.triggerRule.value * 1000);
      } else if (modal.triggerRule.type === 'scroll') {
        window.addEventListener('scroll', () => {
          const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
          if (scrollPercent >= modal.triggerRule.value) {
            showModal(modal);
          }
        });
      } else if (modal.triggerRule.type === 'exit') {
        document.addEventListener('mouseleave', () => {
          showModal(modal);
        });
      }
    }
  });

function showModal(modalData) {
  // Create and display modal based on modalData
  const modalElement = document.createElement('div');
  modalElement.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;">
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: ${modalData.backgroundColor}; color: ${modalData.textColor}; 
                  padding: 20px; border-radius: 8px; max-width: 400px; width: 90%;">
        <h3>${modalData.title}</h3>
        <p>${modalData.content}</p>
        ${modalData.type === 'newsletter' ? `
          <input type="email" placeholder="${modalData.emailPlaceholder}" 
                 style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px;">
        ` : ''}
        <button style="background: ${modalData.buttonColor}; color: white; padding: 10px 20px; 
                       border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
          ${modalData.buttonText}
        </button>
        <button onclick="this.closest('div').parentElement.remove()" 
                style="background: #ccc; color: black; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">
          Close
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modalElement);
}
```

### Newsletter Subscription

Subscribe an email address to the newsletter for a tenant.

**Endpoint:** `POST /api/public/users/{email}/newsletter`

**Request Body:**
```json
{
  "subscriberEmail": "subscriber@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Example Request:**
```javascript
fetch('https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/newsletter', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    subscriberEmail: 'subscriber@example.com',
    firstName: 'John',
    lastName: 'Doe'
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

---

## 💰 Discount Code Validation

### Validate Discount Code

Validate a discount code for a specific reservation before applying it.

**Endpoint:** `POST /api/discount-codes/validate`

**Request Body:**
```json
{
  "code": "SUMMER20",
  "reservationAmount": 225.00,
  "reservationDays": 5,
  "carCategory": "midsize",
  "customerId": "customer123",
  "carId": "car123"
}
```

**Example Request:**
```javascript
fetch('https://carflow-reservation-system.onrender.com/api/discount-codes/validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    code: 'SUMMER20',
    reservationAmount: 225.00,
    reservationDays: 5,
    carCategory: 'midsize',
    customerId: 'customer123',
    carId: 'car123'
  })
})
.then(response => response.json())
.then(data => {
  if (data.valid) {
    console.log(`Discount applied: €${data.data.discountAmount}`);
    console.log(`Final amount: €${data.data.finalAmount}`);
  } else {
    console.log(`Invalid code: ${data.reason}`);
  }
});
```

**Success Response:**
```json
{
  "success": true,
  "valid": true,
  "data": {
    "code": "SUMMER20",
    "description": "Summer promotion - 20% off all rentals",
    "discountType": "percentage",
    "discountValue": 20,
    "discountAmount": 45.00,
    "finalAmount": 180.00
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "valid": false,
  "reason": "Discount code has expired"
}
```

---

## 🔧 Complete Integration Example

Here's a complete example of how to integrate the CarFlow API into your website:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Car Rental Integration</title>
    <style>
        .car-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .car-card { border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
        .info-bar { padding: 10px; text-align: center; font-weight: bold; }
        .reservation-form { max-width: 500px; margin: 20px auto; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; }
        .form-group input, .form-group select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    </style>
</head>
<body>
    <div id="info-bar"></div>
    
    <h1>Available Cars</h1>
    <div id="cars-container" class="car-grid"></div>
    
    <h2>Make a Reservation</h2>
    <form id="reservation-form" class="reservation-form">
        <div class="form-group">
            <label for="firstName">First Name:</label>
            <input type="text" id="firstName" name="firstName" required>
        </div>
        <div class="form-group">
            <label for="lastName">Last Name:</label>
            <input type="text" id="lastName" name="lastName" required>
        </div>
        <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" required>
        </div>
        <div class="form-group">
            <label for="phone">Phone:</label>
            <input type="tel" id="phone" name="phone" required>
        </div>
        <div class="form-group">
            <label for="licenseNumber">License Number:</label>
            <input type="text" id="licenseNumber" name="licenseNumber" required>
        </div>
        <div class="form-group">
            <label for="carSelect">Select Car:</label>
            <select id="carSelect" name="carId" required>
                <option value="">Choose a car...</option>
            </select>
        </div>
        <div class="form-group">
            <label for="startDate">Start Date:</label>
            <input type="datetime-local" id="startDate" name="startDate" required>
        </div>
        <div class="form-group">
            <label for="endDate">End Date:</label>
            <input type="datetime-local" id="endDate" name="endDate" required>
        </div>
        <div class="form-group">
            <label for="discountCode">Discount Code (optional):</label>
            <input type="text" id="discountCode" name="discountCode">
            <button type="button" onclick="validateDiscountCode()">Validate Code</button>
        </div>
        <div id="discount-info"></div>
        <button type="submit">Book Now</button>
    </form>

    <script>
        const API_BASE = 'https://carflow-reservation-system.onrender.com/api/public';
        const TENANT_EMAIL = 'admin@example.com'; // Replace with your tenant email
        
        let availableCars = [];
        let selectedDiscountCode = null;

        // Load website settings and info bar
        async function loadWebsiteSettings() {
            try {
                // Load info bar
                const infoBarResponse = await fetch(`${API_BASE}/users/${TENANT_EMAIL}/info-bar?page=homepage`);
                const infoBarData = await infoBarResponse.json();
                
                if (infoBarData.success && infoBarData.data) {
                    const infoBar = document.getElementById('info-bar');
                    infoBar.style.backgroundColor = infoBarData.data.backgroundColor;
                    infoBar.style.color = infoBarData.data.textColor;
                    infoBar.className = 'info-bar';
                    infoBar.textContent = infoBarData.data.text;
                }

                // Load modal
                const modalResponse = await fetch(`${API_BASE}/users/${TENANT_EMAIL}/modal?page=homepage`);
                const modalData = await modalResponse.json();
                
                if (modalData.success && modalData.data) {
                    setupModal(modalData.data);
                }
            } catch (error) {
                console.error('Error loading website settings:', error);
            }
        }

        // Load available cars
        async function loadCars() {
            try {
                const response = await fetch(`${API_BASE}/users/${TENANT_EMAIL}/cars?available=true`);
                const data = await response.json();
                
                if (data.success) {
                    availableCars = data.data;
                    displayCars(data.data);
                    populateCarSelect(data.data);
                }
            } catch (error) {
                console.error('Error loading cars:', error);
            }
        }

        // Display cars in grid
        function displayCars(cars) {
            const container = document.getElementById('cars-container');
            container.innerHTML = '';
            
            cars.forEach(car => {
                const carCard = document.createElement('div');
                carCard.className = 'car-card';
                carCard.innerHTML = `
                    <h3>${car.brand} ${car.model} (${car.year})</h3>
                    <p>Category: ${car.category}</p>
                    <p>Daily Rate: €${car.dailyRate}</p>
                    <p>Fuel: ${car.fuelType} | Transmission: ${car.transmission}</p>
                    <p>Seats: ${car.seats}</p>
                    <p>Features: ${car.features.join(', ')}</p>
                    <button onclick="selectCar('${car._id}')">Select This Car</button>
                `;
                container.appendChild(carCard);
            });
        }

        // Populate car select dropdown
        function populateCarSelect(cars) {
            const select = document.getElementById('carSelect');
            cars.forEach(car => {
                const option = document.createElement('option');
                option.value = car._id;
                option.textContent = `${car.brand} ${car.model} - €${car.dailyRate}/day`;
                select.appendChild(option);
            });
        }

        // Select a car
        function selectCar(carId) {
            document.getElementById('carSelect').value = carId;
        }

        // Validate discount code
        async function validateDiscountCode() {
            const code = document.getElementById('discountCode').value;
            const carId = document.getElementById('carSelect').value;
            
            if (!code || !carId) {
                alert('Please enter a discount code and select a car first.');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/../discount-codes/validate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        code: code,
                        reservationAmount: 225, // This should be calculated based on selected dates
                        reservationDays: 5, // This should be calculated based on selected dates
                        carCategory: 'midsize', // Get from selected car
                        customerId: 'temp123', // Temporary ID
                        carId: carId
                    })
                });

                const data = await response.json();
                const discountInfo = document.getElementById('discount-info');
                
                if (data.valid) {
                    selectedDiscountCode = data.data;
                    discountInfo.innerHTML = `
                        <div style="color: green;">
                            ✓ Valid discount code! Save €${data.data.discountAmount}
                        </div>
                    `;
                } else {
                    selectedDiscountCode = null;
                    discountInfo.innerHTML = `
                        <div style="color: red;">
                            ✗ ${data.reason}
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Error validating discount code:', error);
            }
        }

        // Setup modal
        function setupModal(modalData) {
            if (modalData.triggerRule.type === 'time') {
                setTimeout(() => {
                    showModal(modalData);
                }, modalData.triggerRule.value * 1000);
            }
            // Add other trigger types as needed
        }

        // Show modal
        function showModal(modalData) {
            const modal = document.createElement('div');
            modal.innerHTML = `
                <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;">
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                                background: ${modalData.backgroundColor}; color: ${modalData.textColor}; 
                                padding: 20px; border-radius: 8px; max-width: 400px; width: 90%;">
                        <h3>${modalData.title}</h3>
                        <p>${modalData.content}</p>
                        ${modalData.type === 'newsletter' ? `
                            <input type="email" id="newsletter-email" placeholder="${modalData.emailPlaceholder}" 
                                   style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px;">
                        ` : ''}
                        <button onclick="handleModalAction('${modalData.type}')" 
                                style="background: ${modalData.buttonColor}; color: white; padding: 10px 20px; 
                                       border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                            ${modalData.buttonText}
                        </button>
                        <button onclick="this.closest('div').parentElement.remove()" 
                                style="background: #ccc; color: black; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">
                            Close
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Handle modal action
        async function handleModalAction(type) {
            if (type === 'newsletter') {
                const email = document.getElementById('newsletter-email').value;
                if (email) {
                    try {
                        const response = await fetch(`${API_BASE}/users/${TENANT_EMAIL}/newsletter`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                subscriberEmail: email,
                                firstName: 'Newsletter',
                                lastName: 'Subscriber'
                            })
                        });
                        
                        if (response.ok) {
                            alert('Successfully subscribed to newsletter!');
                        }
                    } catch (error) {
                        console.error('Error subscribing to newsletter:', error);
                    }
                }
            }
            
            // Close modal
            document.querySelector('[style*="position: fixed"]').parentElement.remove();
        }

        // Handle reservation form submission
        document.getElementById('reservation-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const reservationData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                customerEmail: formData.get('email'),
                phone: formData.get('phone'),
                licenseNumber: formData.get('licenseNumber'),
                carId: formData.get('carId'),
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate'),
                discountCode: formData.get('discountCode') || undefined
            };

            try {
                const response = await fetch(`${API_BASE}/users/${TENANT_EMAIL}/reservations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(reservationData)
                });

                const data = await response.json();
                
                if (data.success) {
                    alert(`Reservation created successfully! Reservation number: ${data.data.reservation.reservationNumber}`);
                    
                    if (data.data.discount.applied) {
                        alert(`Discount applied! You saved €${data.data.discount.totalSaved}`);
                    }
                } else {
                    alert('Error creating reservation: ' + data.message);
                }
            } catch (error) {
                console.error('Error creating reservation:', error);
                alert('Error creating reservation. Please try again.');
            }
        });

        // Initialize the page
        document.addEventListener('DOMContentLoaded', () => {
            loadWebsiteSettings();
            loadCars();
        });
    </script>
</body>
</html>
```

---

## 📝 Error Handling

All endpoints return a consistent error format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information (in development mode)"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (tenant or resource not found)
- `500` - Internal Server Error

---

## 🚀 Getting Started

1. **Choose a tenant email**: Use an email address from an existing user in the system (e.g., `admin@example.com`)

2. **Test the API**: Start with the cars endpoint to ensure connectivity:
   ```bash
   curl https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/cars
   ```

3. **Load website settings**: Fetch info bars and modals for your website styling

4. **Implement car listing**: Display available cars with filtering options

5. **Add reservation form**: Create a booking form that submits to the reservations endpoint

6. **Integrate discount codes**: Add discount code validation before reservation submission

---

## 🔒 Security & Rate Limiting

- All endpoints are rate-limited to prevent abuse
- Input validation is performed on all parameters
- Tenant isolation ensures data security
- No sensitive information is exposed in public endpoints

---

## 📱 CORS Support

The API supports CORS for the following domains:
- `localhost` (all ports)
- `carflowdemowebsite.netlify.app`
- `*.carflow.sk`

If you need additional domains whitelisted, please contact support.

---

## 🆘 Support

For technical support or questions about the API:
- Email: support@carflow.sk
- Documentation: Available in the admin panel
- Status Page: Check API availability and performance

---

## 📊 API Limits

- Rate Limit: 500 requests per 15 minutes per IP
- Max reservation requests: 10 per minute per IP
- File uploads: Not available in public API
- Response size: Max 10MB per request

---

This documentation covers all public API endpoints available for external integration. For administrative functions, please refer to the API_INTEGRATION_GUIDE.md document. 