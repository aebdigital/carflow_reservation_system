# 🚗 CarFlow Public API Endpoints - admin@example.com

## 📋 Overview

This document contains all public API endpoints available for the **admin@example.com** tenant. These endpoints don't require authentication and can be used for frontend integration, mobile apps, or third-party services.

**Base URL**: `https://carflow-reservation-system.onrender.com/api/public`

**Tenant Email**: `admin@example.com`

---

## 🚙 Car Management Endpoints

### 1. Get All Cars for Tenant

**Endpoint**: `GET /api/public/users/admin@example.com/cars`

**Description**: Retrieve all available cars for the admin@example.com tenant with advanced filtering options.

**Query Parameters**:
- `category` - Car category (economy, compact, midsize, fullsize, luxury, suv, etc.)
- `fuelType` - Fuel type (gasoline, diesel, hybrid, electric, lpg)
- `transmission` - Transmission type (manual, automatic, cvt)
- `seats` - Number of seats
- `startDate` - Check availability from date (YYYY-MM-DD)
- `endDate` - Check availability until date (YYYY-MM-DD)
- `carClass` - Car class (ekonomicka, stredna, vyssia, viacmiestne, etc.)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 25)
- `sort` - Sort field (price, brand, model, year)

**Example Request**:
```bash
GET /api/public/users/admin@example.com/cars?category=economy&fuelType=gasoline&startDate=2025-01-15&endDate=2025-01-20&limit=10
```

**Example Response**:
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
  "filters": {
    "category": "economy",
    "fuelType": "gasoline",
    "startDate": "2025-01-15",
    "endDate": "2025-01-20"
  },
  "data": [
    {
      "_id": "car_id_123",
      "brand": "Skoda",
      "model": "Octavia",
      "year": 2023,
      "category": "economy",
      "fuelType": "gasoline",
      "transmission": "manual",
      "seats": 5,
      "pricing": {
        "dailyRate": 45.00
      },
      "images": ["url1", "url2"],
      "features": ["air-conditioning", "gps"]
    }
  ]
}
```

### 2. Get Single Car Details

**Endpoint**: `GET /api/public/users/admin@example.com/cars/:carId`

**Description**: Get detailed information about a specific car.

**Example Request**:
```bash
GET /api/public/users/admin@example.com/cars/car_id_123
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "_id": "car_id_123",
    "brand": "Skoda",
    "model": "Octavia",
    "year": 2023,
    "color": "White",
    "category": "economy",
    "fuelType": "gasoline",
    "transmission": "manual",
    "seats": 5,
    "doors": 4,
    "description": "Comfortable and fuel-efficient vehicle",
    "pricing": {
      "dailyRate": 45.00,
      "weeklyRate": 280.00,
      "monthlyRate": 1000.00
    },
    "location": {
      "name": "Main Office",
      "address": {
        "street": "Main St 123",
        "city": "Bratislava"
      }
    },
    "features": ["air-conditioning", "gps", "bluetooth"],
    "images": ["url1", "url2", "url3"]
  }
}
```

### 3. Check Car Availability

**Endpoint**: `GET /api/public/users/admin@example.com/cars/:carId/availability`

**Description**: Check if a specific car is available for given dates.

**Query Parameters**:
- `startDate` - Start date (YYYY-MM-DD)
- `endDate` - End date (YYYY-MM-DD)

**Example Request**:
```bash
GET /api/public/users/admin@example.com/cars/car_id_123/availability?startDate=2025-01-15&endDate=2025-01-20
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "isAvailable": true,
    "status": "active",
    "isAvailableForDates": true,
    "conflictingReservations": 0
  }
}
```

### 4. Get Cars by Category

**Endpoint**: `GET /api/public/users/admin@example.com/cars/category/:category`

**Description**: Get all cars in a specific category.

**Example Request**:
```bash
GET /api/public/users/admin@example.com/cars/category/economy
```

### 5. Get Available Features

**Endpoint**: `GET /api/public/users/admin@example.com/features`

**Description**: Get list of all available car features for this tenant.

**Example Response**:
```json
{
  "success": true,
  "data": [
    "air-conditioning",
    "gps",
    "bluetooth",
    "heated-seats",
    "backup-camera"
  ]
}
```

---

## 📅 Car Calendar & Availability Endpoints

### 6. Get Car Booking Calendar

**Endpoint**: `GET /api/public/users/admin@example.com/cars/:carId/calendar`

**Description**: Get booking calendar showing reserved dates for a specific car.

**Query Parameters**:
- `startDate` - Calendar start date (default: today)
- `endDate` - Calendar end date (default: 6 months from now)
- `includePending` - Include pending reservations (true/false)

**Example Request**:
```bash
GET /api/public/users/admin@example.com/cars/car_id_123/calendar?startDate=2025-01-01&endDate=2025-03-31&includePending=true
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "carId": "car_id_123",
    "car": {
      "brand": "Skoda",
      "model": "Octavia",
      "year": 2023,
      "status": "active"
    },
    "isOperational": true,
    "calendar": {
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-03-31T00:00:00.000Z",
      "bookedDates": [
        {
          "date": "2025-01-15",
          "reservationNumber": "RES-123",
          "status": "confirmed",
          "isStartDate": true,
          "isEndDate": false
        }
      ],
      "totalBookedDays": 5,
      "uniqueReservations": 2
    },
    "reservations": [
      {
        "reservationNumber": "RES-123",
        "startDate": "2025-01-15T00:00:00.000Z",
        "endDate": "2025-01-20T00:00:00.000Z",
        "status": "confirmed",
        "customerName": "John Doe"
      }
    ]
  }
}
```

### 7. Get Reserved Dates for Multiple Cars

**Endpoint**: `GET /api/public/users/admin@example.com/cars/reserved-dates`

**Description**: Get reserved dates overview for multiple cars.

**Query Parameters**:
- `carIds` - Comma-separated car IDs (optional, all cars if not provided)
- `startDate` - Start date
- `endDate` - End date
- `includePending` - Include pending reservations

**Example Request**:
```bash
GET /api/public/users/admin@example.com/cars/reserved-dates?carIds=car1,car2&startDate=2025-01-01&endDate=2025-03-31
```

---

## 🎫 Reservation Endpoints

### 8. Create Reservation for Tenant

**Endpoint**: `POST /api/public/users/admin@example.com/reservations`

**Description**: Create a new reservation for the admin@example.com tenant.

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "customerEmail": "customer@example.com",
  "phone": "+421123456789",
  "licenseNumber": "AB123456",
  "carId": "car_id_123",
  "startDate": "2025-01-15",
  "endDate": "2025-01-20",
  "pickupLocation": {
    "name": "Main Office",
    "address": {
      "street": "Main St 123",
      "city": "Bratislava"
    }
  },
  "dropoffLocation": {
    "name": "Main Office"
  },
  "specialRequests": "Need child seat",
  "discountCode": "SAVE10",
  "pricing": {
    "dailyRate": 50.00,
    "totalAmount": 250.00,
    "rentalCost": 250.00,
    "taxes": 0.00,
    "deposit": 400.00
  }
}
```

**Example Response**:
```json
{
  "success": true,
  "message": "Reservation confirmed successfully! You will receive a confirmation email shortly.",
  "data": {
    "reservation": {
      "_id": "reservation_id_123",
      "reservationNumber": "RES-ABCD-1234567890",
      "status": "confirmed",
      "startDate": "2025-01-15T00:00:00.000Z",
      "endDate": "2025-01-20T00:00:00.000Z",
      "pricing": {
        "dailyRate": 50.00,
        "totalDays": 5,
        "subtotal": 250.00,
        "taxes": 0.00,
        "totalAmount": 250.00
      }
    },
    "customer": {
      "id": "customer_id_123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "customer@example.com",
      "isNewCustomer": true
    },
    "loginInfo": {
      "email": "customer@example.com",
      "defaultPassword": "customer123",
      "message": "You can log in to track your reservation status"
    },
    "debug": {
      "pricingSource": "frontend",
      "frontendPricingProvided": true,
      "calculatedPricing": {
        "totalAmount": 250.00,
        "source": "frontend"
      }
    }
  }
}
```

---

## 🌐 Website Settings Endpoints

### 9. Get Website Settings

**Endpoint**: `GET /api/public/users/admin@example.com/website-settings`

**Description**: Get public website settings for the tenant.

**Example Response**:
```json
{
  "success": true,
  "data": {
    "infoBar": {
      "isActive": true,
      "text": "Special offer: 20% off this weekend!",
      "backgroundColor": "#ff4444",
      "textColor": "#ffffff"
    },
    "modal": {
      "isActive": true,
      "title": "Welcome!",
      "content": "Get 10% off your first rental"
    },
    "siteName": "CarFlow Rental",
    "contactEmail": "info@example.com",
    "contactPhone": "+421123456789"
  }
}
```

### 10. Get Active Info Bar

**Endpoint**: `GET /api/public/users/admin@example.com/info-bar`

**Description**: Get currently active info bar for display on website.

**Query Parameters**:
- `page` - Current page (homepage, pricing, all-pages)

**Example Request**:
```bash
GET /api/public/users/admin@example.com/info-bar?page=homepage
```

### 11. Get Active Modal

**Endpoint**: `GET /api/public/users/admin@example.com/modal`

**Description**: Get currently active modal popup for the website.

**Query Parameters**:
- `page` - Current page (homepage, pricing, all-pages)

**Example Request**:
```bash
GET /api/public/users/admin@example.com/modal?page=homepage
```

---

## 📧 Newsletter & Marketing Endpoints

### 12. Subscribe to Newsletter

**Endpoint**: `POST /api/public/users/admin@example.com/newsletter`

**Description**: Subscribe an email to the tenant's newsletter.

**Request Body**:
```json
{
  "subscriberEmail": "subscriber@example.com",
  "firstName": "Jane",
  "lastName": "Smith"
}
```

**Example Response**:
```json
{
  "success": true,
  "message": "Successfully subscribed to newsletter"
}
```

### 13. Verify Discount Code

**Endpoint**: `POST /api/public/users/admin@example.com/verify-discount`

**Description**: Verify and calculate discount for a discount code.

**Request Body**:
```json
{
  "code": "SAVE10",
  "reservationAmount": 250.00,
  "reservationDays": 5,
  "carCategory": "economy"
}
```

**Example Response**:
```json
{
  "success": true,
  "valid": true,
  "data": {
    "code": "SAVE10",
    "description": "10% off all rentals",
    "discountType": "percentage",
    "discountValue": 10,
    "discountAmount": 25.00,
    "originalAmount": 250.00,
    "finalAmount": 225.00,
    "savings": 25.00
  },
  "message": "Zľava 25.00€ bola úspešne aplikovaná!"
}
```

---

## 🌍 General Public Endpoints (Non-Tenant Specific)

### 14. Get All Public Cars

**Endpoint**: `GET /api/public/cars`

**Description**: Get all available cars across all tenants (with optional tenant filtering).

**Query Parameters**:
- `tenantId` - Filter by specific tenant (optional)
- Other parameters same as tenant-specific endpoint

### 15. Get Single Public Car

**Endpoint**: `GET /api/public/cars/:id`

**Description**: Get details of any public car.

### 16. Create General Public Reservation

**Endpoint**: `POST /api/public/reservations`

**Description**: Create reservation without specifying tenant (tenant determined by car).

### 17. Get Public Car Calendar

**Endpoint**: `GET /api/public/cars/:id/calendar`

**Description**: Get calendar for any public car.

---

## 🔧 Integration Examples

### JavaScript/Fetch Example

```javascript
// Get cars for admin@example.com tenant
const getCars = async () => {
  try {
    const response = await fetch('/api/public/users/admin@example.com/cars?category=economy&limit=10');
    const data = await response.json();
    
    if (data.success) {
      console.log('Cars:', data.data);
      return data.data;
    }
  } catch (error) {
    console.error('Error fetching cars:', error);
  }
};

// Create reservation with pricing override
const createReservation = async (reservationData) => {
  try {
    const response = await fetch('/api/public/users/admin@example.com/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...reservationData,
        pricing: {
          dailyRate: 50.00,
          totalAmount: 250.00,
          rentalCost: 250.00,
          taxes: 0.00
        }
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Reservation created:', data.data);
      return data.data;
    }
  } catch (error) {
    console.error('Error creating reservation:', error);
  }
};

// Check car availability
const checkAvailability = async (carId, startDate, endDate) => {
  try {
    const response = await fetch(
      `/api/public/users/admin@example.com/cars/${carId}/availability?startDate=${startDate}&endDate=${endDate}`
    );
    const data = await response.json();
    
    return data.data.isAvailableForDates;
  } catch (error) {
    console.error('Error checking availability:', error);
    return false;
  }
};
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';

const useCarFlow = () => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const fetchCars = async (filters = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/public/users/admin@example.com/cars?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setCars(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };
  
  const createReservation = async (reservationData) => {
    try {
      const response = await fetch('/api/public/users/admin@example.com/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reservationData)
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  };
  
  return { cars, loading, fetchCars, createReservation };
};
```

---

## 📋 Error Handling

### Common Error Responses

```json
{
  "success": false,
  "error": "Car not found",
  "message": "Car not found with id: invalid_id",
  "statusCode": 404
}
```

### Error Status Codes

- `400` - Bad Request (missing required fields, invalid data)
- `404` - Not Found (car, reservation, or user not found)
- `500` - Internal Server Error

### Best Practices

1. **Always check the `success` field** in responses
2. **Handle network errors** with try-catch blocks
3. **Validate data** before sending requests
4. **Use frontend pricing override** for consistent pricing
5. **Check debug information** in responses for troubleshooting

---

## 🎯 Key Features

### ✅ Auto-Confirmed Reservations
- All new reservations are automatically set to "confirmed" status
- No manual approval required

### ✅ Frontend Pricing Override
- Send `pricing` object in reservation requests for accurate pricing
- Backend fallback available but frontend pricing recommended

### ✅ No Tax Calculations
- All pricing excludes taxes (taxes = 0)
- Clean pricing without automatic tax additions

### ✅ Tenant Isolation
- All data is properly isolated by tenant
- Secure multi-tenant architecture

### ✅ Comprehensive Filtering
- Advanced car filtering by category, dates, features
- Fallback options when no results found

---

**📞 Support**: For technical support or questions about these APIs, contact the CarFlow team.

**🔄 Updates**: This documentation is updated regularly. Check the latest version for new endpoints and features. 