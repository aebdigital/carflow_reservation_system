# CarFlow Public API Documentation

## Overview
The CarFlow Public API provides public access to car rental data and reservation functionality without requiring authentication. This API is designed for public-facing websites, mobile apps, and integration with third-party services.

**Base URL**: `https://carflow-reservation-system.onrender.com/api/public`

## Authentication
No authentication required for public endpoints.

## Response Format
All responses follow this standard format:
```json
{
  "success": true|false,
  "data": {}, // Response data
  "count": 0, // For list endpoints
  "pagination": {}, // For paginated endpoints
  "message": "Success/Error message"
}
```

## Public Car Endpoints

### 1. Get All Cars (Public)
**GET** `/cars`

Returns all publicly available cars without sensitive information.

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 25, max: 100)
- `category` (string): Filter by car category
- `fuelType` (string): Filter by fuel type
- `transmission` (string): Filter by transmission type
- `seats` (integer): Filter by number of seats
- `sort` (string): Sort by field (e.g., 'dailyRate', '-year')

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/cars?category=economy&limit=10"
```

**Example Response:**
```json
{
  "success": true,
  "count": 5,
  "pagination": {
    "next": {
      "page": 2,
      "limit": 10
    }
  },
  "data": [
    {
      "_id": "car_id",
      "brand": "Toyota",
      "model": "Corolla",
      "year": 2023,
      "color": "White",
      "category": "economy",
      "fuelType": "gasoline",
      "transmission": "automatic",
      "seats": 5,
      "doors": 4,
      "description": "Economical and reliable city car...",
      "pricing": {
        "dailyRate": 25,
        "deposit": 300,
        "rates": {
          "1day": 25,
          "2-3days": 23,
          "4-10days": 21
        }
      },
      "mileage": {
        "current": 15000,
        "lastUpdated": "2025-01-01T12:00:00.000Z"
      },
      "location": {
        "name": "Main Office",
        "address": {
          "street": "123 Main St",
          "city": "Bratislava",
          "country": "Slovakia"
        }
      },
      "features": ["air-conditioning", "gps", "bluetooth"],
      "equipment": [
        {
          "name": "Klimatizácia",
          "icon": "❄️",
          "category": "comfort"
        }
      ],
      "images": [
        {
          "url": "https://storage.googleapis.com/car_rental_carflow/image.jpg",
          "isPrimary": true
        }
      ],
      "badges": [
        {
          "text": "NOVINKA",
          "style": {
            "backgroundColor": "#4caf50",
            "textColor": "#ffffff"
          }
        }
      ]
    }
  ]
}
```

### 2. Get Single Car (Public)
**GET** `/cars/:id`

Returns detailed information about a specific car.

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/cars/car_id_here"
```

## Tenant-Specific Endpoints

For multi-tenant setups, use these endpoints to get data for a specific rental company:

### 3. Get Cars by User/Tenant
**GET** `/users/:email/cars`

Returns cars for a specific rental company identified by user email.

**Parameters:**
- `email` (string): Email of a user from the target tenant

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/admin@company.com/cars"
```

### 4. Get Single Car by User/Tenant
**GET** `/users/:email/cars/:carId`

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/admin@company.com/cars/car_id"
```

### 5. Check Car Availability
**GET** `/users/:email/cars/:carId/availability`

Check if a car is available for specific dates.

**Query Parameters:**
- `startDate` (ISO date): Check availability from this date
- `endDate` (ISO date): Check availability until this date

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/admin@company.com/cars/car_id/availability?startDate=2025-07-01&endDate=2025-07-05"
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

### 6. Get Cars by Category
**GET** `/users/:email/cars/category/:category`

**Available Categories:**
- economy, compact, midsize, fullsize, luxury
- suv, minivan, utility, caravan, motorcycle
- sports, electric

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/admin@company.com/cars/category/economy"
```

### 7. Get Available Features
**GET** `/users/:email/features`

Returns all unique features available across cars for a tenant.

## Reservation Endpoints

### 8. Create Public Reservation
**POST** `/reservations`

Create a reservation and automatically create customer account if needed.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "customer@example.com",
  "phone": "+421901234567",
  "dateOfBirth": "1990-01-01",
  "address": {
    "street": "123 Customer St",
    "city": "Bratislava",
    "zipCode": "12345",
    "country": "Slovakia"
  },
  "licenseNumber": "SK123456789",
  "licenseExpiry": "2030-01-01",
  "carId": "car_id_here",
  "startDate": "2025-07-01T10:00:00.000Z",
  "endDate": "2025-07-05T10:00:00.000Z",
  "pickupLocation": {
    "name": "Main Office",
    "address": {
      "street": "123 Main St",
      "city": "Bratislava"
    }
  },
  "additionalDrivers": [],
  "specialRequests": "Baby seat needed"
}
```

### 9. Create Tenant-Specific Reservation
**POST** `/users/:email/reservations`

Same as above but for a specific tenant. Supports discount codes.

**Additional Fields:**
- `discountCode` (string): Optional discount code

## Website Settings Endpoints

### 10. Get Website Settings
**GET** `/users/:email/website-settings`

Returns public website settings for a tenant.

### 11. Get Info Bar
**GET** `/users/:email/info-bar`

Returns active info bar configuration.

**Query Parameters:**
- `page` (string): Current page (homepage, pricing, all-pages)

### 12. Get Modal/Popup
**GET** `/users/:email/modal`

Returns active modal/popup configuration.

**Query Parameters:**
- `page` (string): Current page context

### 13. Newsletter Subscription
**POST** `/users/:email/newsletter`

Subscribe to newsletter.

**Request Body:**
```json
{
  "subscriberEmail": "subscriber@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

## Car Categories

| Category | Description |
|----------|-------------|
| `economy` | Economical city cars for daily use |
| `compact` | Comfortable vehicles with sufficient space |
| `midsize` | Mid-range vehicles for family trips |
| `fullsize` | Larger vehicles with premium features |
| `luxury` | High-end vehicles with luxury amenities |
| `suv` | Sport utility vehicles |
| `minivan` | Multi-seat vehicles for groups |
| `utility` | Commercial vehicles for cargo |
| `caravan` | Fully equipped recreational vehicles |
| `motorcycle` | Motorcycles for adventure riding |
| `sports` | Sports cars for performance driving |
| `electric` | Electric vehicles for eco-friendly transport |

## Fuel Types

- `gasoline` - Gasoline/Petrol
- `diesel` - Diesel
- `hybrid` - Hybrid (gas + electric)
- `electric` - Fully electric
- `lpg` - LPG (Liquefied Petroleum Gas)

## Transmission Types

- `manual` - Manual transmission
- `automatic` - Automatic transmission
- `cvt` - CVT (Continuously Variable Transmission)

## Error Handling

The API returns standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "statusCode": 400
  },
  "message": "User-friendly error message"
}
```

## Rate Limiting

No rate limiting currently implemented for public endpoints.

## Data Security

- Sensitive fields (VIN, owner, tenant info) are automatically excluded from public responses
- Customer data is only accessible to authenticated users within the same tenant
- All API responses are filtered to show only appropriate public information

## Example Integration

### JavaScript/Frontend Integration
```javascript
// Get all cars
const response = await fetch('https://carflow-reservation-system.onrender.com/api/public/cars');
const data = await response.json();

if (data.success) {
  const cars = data.data;
  // Display cars in your UI
}

// Create reservation
const reservationData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+421901234567',
  carId: 'car_id_here',
  startDate: '2025-07-01T10:00:00.000Z',
  endDate: '2025-07-05T10:00:00.000Z',
  licenseNumber: 'SK123456789'
};

const reservation = await fetch('https://carflow-reservation-system.onrender.com/api/public/reservations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(reservationData)
});
```

### cURL Examples
```bash
# Get cars with filtering
curl "https://carflow-reservation-system.onrender.com/api/public/cars?category=economy&transmission=automatic&limit=5"

# Check availability
curl "https://carflow-reservation-system.onrender.com/api/public/users/admin@company.com/cars/car_id/availability?startDate=2025-07-01&endDate=2025-07-05"

# Create reservation
curl -X POST "https://carflow-reservation-system.onrender.com/api/public/reservations" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+421901234567",
    "carId": "car_id_here",
    "startDate": "2025-07-01T10:00:00.000Z",
    "endDate": "2025-07-05T10:00:00.000Z",
    "licenseNumber": "SK123456789"
  }'
```

## Support

For API support and integration questions, contact the development team.

---

**Last Updated**: July 2025
**API Version**: v1 