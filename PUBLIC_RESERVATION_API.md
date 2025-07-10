# 🚗 CarFlow Public Reservation API Documentation

## Overview
This documentation provides complete integration guidance for the CarFlow public reservation API endpoints. It covers the issues discovered during frontend integration and provides solutions.

**Base URL**: `https://carflow-reservation-system.onrender.com/api/public`

## 🔧 Recent Fixes
- **✅ Fixed**: Missing `/api/public/reservations` endpoint added to routes
- **✅ Fixed**: Auth middleware import issue in email subscriptions routes
- **⚠️ Issue**: User `rival@test.sk` not found in database (causing 400 errors)

## 🛠️ Current Status
- **Frontend errors**: 
  - `POST /api/public/users/rival@test.sk/reservations` → 400 (Bad Request)
  - `POST /api/public/reservations` → 404 (Not Found) → **FIXED**

## 📋 API Endpoints

### 1. Create General Public Reservation
**POST** `/api/public/reservations`

✅ **Status**: Fixed and available

**Required Fields:**
```json
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "customer@example.com",
  "phone": "+421901234567",
  "licenseNumber": "SK123456789",
  "carId": "car_object_id",
  "startDate": "2024-07-15T10:00:00Z",
  "endDate": "2024-07-20T10:00:00Z"
}
```

**Optional Fields:**
```json
{
  "dateOfBirth": "1990-01-01",
  "address": {
    "street": "123 Main St",
    "city": "Bratislava",
    "zipCode": "12345",
    "country": "Slovakia"
  },
  "licenseExpiry": "2030-01-01",
  "pickupLocation": {
    "name": "Main Office",
    "address": {...}
  },
  "dropoffLocation": {
    "name": "Airport",
    "address": {...}
  },
  "additionalDrivers": [],
  "specialRequests": "Baby seat needed",
  "notes": "Additional notes"
}
```

**Example Request:**
```javascript
const reservationData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'customer@example.com',
  phone: '+421901234567',
  licenseNumber: 'SK123456789',
  carId: 'car_object_id_here',
  startDate: '2024-07-15T10:00:00Z',
  endDate: '2024-07-20T10:00:00Z'
};

const response = await fetch('/api/public/reservations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(reservationData)
});
```

### 2. Create Tenant-Specific Reservation
**POST** `/api/public/users/:email/reservations`

⚠️ **Status**: Working but requires valid tenant user

**Parameters:**
- `email` (required): Email of a user who owns the car rental business

**Additional Features:**
- Supports discount codes
- Automatic customer creation
- Tenant-specific pricing

**Required Fields:** Same as general endpoint

**Additional Fields:**
```json
{
  "discountCode": "SUMMER2024",
  "customerEmail": "different@email.com"
}
```

**Example Request:**
```javascript
const reservationData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'customer@example.com', // or use customerEmail field
  phone: '+421901234567',
  licenseNumber: 'SK123456789',
  carId: 'car_object_id_here',
  startDate: '2024-07-15T10:00:00Z',
  endDate: '2024-07-20T10:00:00Z',
  discountCode: 'SUMMER2024'
};

const response = await fetch('/api/public/users/valid@user.com/reservations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(reservationData)
});
```

## 🐛 Common Issues & Solutions

### Issue 1: 400 Bad Request on User-Specific Endpoint
**Error**: `User not found with email: rival@test.sk`

**Root Cause**: The user `rival@test.sk` doesn't exist in the database.

**Solutions:**
1. **Use a valid user email** that exists in the database
2. **Create the user** in the admin panel first
3. **Use the general endpoint** `/api/public/reservations` instead

**How to check valid users:**
```javascript
// Get cars first to see available tenants
const response = await fetch('/api/public/cars');
const cars = await response.json();

// Check which user emails have cars
const validUserEmails = [...new Set(cars.data.map(car => car.ownerEmail))];
```

### Issue 2: Missing Required Fields
**Error**: `Missing required fields: firstName, lastName, email, phone, licenseNumber, carId, startDate, endDate`

**Solution**: Ensure all required fields are provided:
```javascript
const validateReservationData = (data) => {
  const required = ['firstName', 'lastName', 'email', 'phone', 'licenseNumber', 'carId', 'startDate', 'endDate'];
  const missing = required.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
};
```

### Issue 3: Invalid Car ID
**Error**: `Car not found`

**Solution**: Use valid MongoDB ObjectId for carId:
```javascript
// Get cars first
const carsResponse = await fetch('/api/public/cars');
const cars = await carsResponse.json();
const validCarId = cars.data[0]._id; // Use actual car ID
```

### Issue 4: Date Validation Errors
**Error**: `Start date cannot be in the past` or `End date must be after start date`

**Solution**: Validate dates on frontend:
```javascript
const validateDates = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  
  if (start < now) {
    throw new Error('Start date cannot be in the past');
  }
  
  if (end <= start) {
    throw new Error('End date must be after start date');
  }
};
```

## 📝 Complete Frontend Integration

### React Example with Error Handling
```jsx
import React, { useState } from 'react';

const ReservationForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    carId: '',
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      const required = ['firstName', 'lastName', 'email', 'phone', 'licenseNumber', 'carId', 'startDate', 'endDate'];
      const missing = required.filter(field => !formData[field]);
      
      if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
      }

      // Validate dates
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const now = new Date();
      
      if (start < now) {
        throw new Error('Start date cannot be in the past');
      }
      
      if (end <= start) {
        throw new Error('End date must be after start date');
      }

      // Try multiple endpoints in order of preference
      const endpoints = [
        '/api/public/users/valid@user.com/reservations', // Use valid user
        '/api/public/reservations'
      ];

      let response;
      let lastError;

      for (const endpoint of endpoints) {
        try {
          response = await fetch(`https://carflow-reservation-system.onrender.com${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
          });

          if (response.ok) {
            break; // Success, exit loop
          } else {
            const errorData = await response.json();
            lastError = errorData.message || `HTTP ${response.status}`;
          }
        } catch (fetchError) {
          lastError = fetchError.message;
        }
      }

      if (!response || !response.ok) {
        throw new Error(lastError || 'All reservation endpoints failed');
      }

      const result = await response.json();
      
      if (result.success) {
        alert('Reservation created successfully!');
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          licenseNumber: '',
          carId: '',
          startDate: '',
          endDate: ''
        });
      } else {
        throw new Error(result.message || 'Reservation failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      
      <input
        type="text"
        placeholder="First Name"
        value={formData.firstName}
        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
        required
      />
      
      <input
        type="text"
        placeholder="Last Name"
        value={formData.lastName}
        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
        required
      />
      
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        required
      />
      
      <input
        type="tel"
        placeholder="Phone"
        value={formData.phone}
        onChange={(e) => setFormData({...formData, phone: e.target.value})}
        required
      />
      
      <input
        type="text"
        placeholder="License Number"
        value={formData.licenseNumber}
        onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
        required
      />
      
      <input
        type="text"
        placeholder="Car ID"
        value={formData.carId}
        onChange={(e) => setFormData({...formData, carId: e.target.value})}
        required
      />
      
      <input
        type="datetime-local"
        placeholder="Start Date"
        value={formData.startDate}
        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
        required
      />
      
      <input
        type="datetime-local"
        placeholder="End Date"
        value={formData.endDate}
        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
        required
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Creating Reservation...' : 'Create Reservation'}
      </button>
    </form>
  );
};

export default ReservationForm;
```

### Vanilla JavaScript Example
```javascript
const createReservation = async (formData) => {
  const API_BASE = 'https://carflow-reservation-system.onrender.com/api/public';
  
  // Validate required fields
  const required = ['firstName', 'lastName', 'email', 'phone', 'licenseNumber', 'carId', 'startDate', 'endDate'];
  const missing = required.filter(field => !formData[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  // Try multiple endpoints
  const endpoints = [
    `${API_BASE}/users/valid@user.com/reservations`,
    `${API_BASE}/reservations`
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error(`Failed to reach ${endpoint}:`, error);
    }
  }

  throw new Error('All reservation endpoints failed: Route not found');
};

// Usage
const reservationData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'customer@example.com',
  phone: '+421901234567',
  licenseNumber: 'SK123456789',
  carId: 'valid_car_id_here',
  startDate: '2024-07-15T10:00:00Z',
  endDate: '2024-07-20T10:00:00Z'
};

createReservation(reservationData)
  .then(result => console.log('Reservation created:', result))
  .catch(error => console.error('Reservation failed:', error));
```

## 🛡️ Error Handling

### HTTP Status Codes
- **200**: Success
- **400**: Bad Request (missing fields, invalid data)
- **404**: Not Found (invalid car ID, user not found)
- **500**: Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"]
}
```

### Common Error Messages
- `"Missing required fields: firstName, lastName, email, phone, licenseNumber, carId, startDate, endDate"`
- `"User not found with email: rival@test.sk"`
- `"Car not found"`
- `"Car is not available for booking"`
- `"Start date cannot be in the past"`
- `"End date must be after start date"`
- `"Car is not available for the selected dates"`

## 🔧 Troubleshooting Steps

1. **Check if user exists:**
   ```javascript
   const response = await fetch('/api/public/users/rival@test.sk/cars');
   if (response.status === 404) {
     console.log('User not found - use general endpoint');
   }
   ```

2. **Validate car ID:**
   ```javascript
   const carsResponse = await fetch('/api/public/cars');
   const cars = await carsResponse.json();
   console.log('Available cars:', cars.data.map(car => car._id));
   ```

3. **Check date format:**
   ```javascript
   const date = new Date('2024-07-15T10:00:00Z');
   console.log('Valid date:', !isNaN(date.getTime()));
   ```

4. **Test with curl:**
   ```bash
   curl -X POST https://carflow-reservation-system.onrender.com/api/public/reservations \
     -H "Content-Type: application/json" \
     -d '{
       "firstName": "John",
       "lastName": "Doe",
       "email": "test@example.com",
       "phone": "+421901234567",
       "licenseNumber": "SK123456789",
       "carId": "valid_car_id",
       "startDate": "2024-07-15T10:00:00Z",
       "endDate": "2024-07-20T10:00:00Z"
     }'
   ```

## 📞 Support

For integration issues:
1. Check this documentation first
2. Verify all required fields are provided
3. Use the general endpoint if tenant-specific fails
4. Contact support with specific error messages

---

**Last Updated**: December 2024  
**API Version**: v1  
**Status**: ✅ General endpoint working, ⚠️ Tenant-specific needs valid user 