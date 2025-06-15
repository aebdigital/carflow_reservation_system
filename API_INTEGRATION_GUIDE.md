# Car Rental API Integration Guide

This guide shows how to connect your customer-facing car rental website to this admin backend system.

## 🌐 Base URL
```
Backend API: http://localhost:3001/api
```

## 🔐 Authentication

### 1. Customer Registration
**POST** `/api/auth/register`

```javascript
const registerCustomer = async (customerData) => {
  const response = await fetch('http://localhost:3001/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      email: customerData.email,
      password: customerData.password,
      phone: customerData.phone,
      role: 'customer', // Important: Always set to 'customer'
      licenseNumber: customerData.licenseNumber,
      licenseExpiry: customerData.licenseExpiry, // ISO date string
      dateOfBirth: customerData.dateOfBirth, // ISO date string
      address: {
        street: customerData.address.street,
        city: customerData.address.city,
        state: customerData.address.state,
        postalCode: customerData.address.postalCode,
        country: customerData.address.country
      }
    })
  });

  const result = await response.json();
  
  if (result.success) {
    // Store the token for authenticated requests
    localStorage.setItem('authToken', result.token);
    return result.user;
  } else {
    throw new Error(result.message);
  }
};
```

### 2. Customer Login
**POST** `/api/auth/login`

```javascript
const loginCustomer = async (email, password) => {
  const response = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password })
  });

  const result = await response.json();
  
  if (result.success) {
    localStorage.setItem('authToken', result.token);
    return result.user;
  } else {
    throw new Error(result.message);
  }
};
```

## 🚗 Available Cars

### Get Available Cars
**GET** `/api/cars`

```javascript
const getAvailableCars = async (filters = {}) => {
  const token = localStorage.getItem('authToken');
  
  const queryParams = new URLSearchParams({
    status: 'available', // Only get available cars
    ...filters // category, location, etc.
  });

  const response = await fetch(`http://localhost:3001/api/cars?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });

  const result = await response.json();
  return result.data; // Array of cars
};

// Example usage:
const cars = await getAvailableCars({
  category: 'SUV',
  location: 'New York'
});
```

### Get Single Car Details
**GET** `/api/cars/:id`

```javascript
const getCarDetails = async (carId) => {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(`http://localhost:3001/api/cars/${carId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    }
  });

  const result = await response.json();
  return result.data;
};
```

### 🖼️ Car Images

Cars now include comprehensive image data with multiple sizes:

```javascript
// Example car object with images
{
  "_id": "car123",
  "brand": "Toyota",
  "model": "Camry",
  "year": 2023,
  "description": "Comfortable mid-size sedan perfect for city driving",
  "deposit": 200,
  "dailyRate": 65,
  "images": [
    {
      "url": "https://storage.googleapis.com/bucket/cars/car123/image1_medium.jpg",
      "description": "Exterior front view",
      "isPrimary": true,
      "filename": "uuid123.jpg",
      "uploadDate": "2024-01-15T10:30:00Z",
      "urls": {
        "thumbnail": "https://storage.googleapis.com/bucket/cars/car123/image1_thumbnail.jpg",
        "medium": "https://storage.googleapis.com/bucket/cars/car123/image1_medium.jpg",
        "large": "https://storage.googleapis.com/bucket/cars/car123/image1_large.jpg",
        "original": "https://storage.googleapis.com/bucket/cars/car123/image1.jpg"
      }
    }
  ]
}
```

### Display Car Images in Your Frontend

```javascript
const CarDisplay = ({ car }) => {
  // Get primary image or first image
  const primaryImage = car.images?.find(img => img.isPrimary) || car.images?.[0];
  
  return (
    <div className="car-card">
      {primaryImage && (
        <img 
          src={primaryImage.urls.medium} // Use medium size for main display
          alt={primaryImage.description}
          loading="lazy"
        />
      )}
      
      <div className="car-details">
        <h3>{car.brand} {car.model} ({car.year})</h3>
        <p>{car.description}</p>
        <div className="pricing">
          <span className="daily-rate">${car.dailyRate}/day</span>
          <span className="deposit">Deposit: ${car.deposit}</span>
        </div>
      </div>
      
      {/* Image gallery */}
      <div className="image-gallery">
        {car.images?.map((image, index) => (
          <img 
            key={index}
            src={image.urls.thumbnail} // Use thumbnails for gallery
            alt={image.description}
            onClick={() => showLargeImage(image.urls.large)}
          />
        ))}
      </div>
    </div>
  );
};
```

## 📅 Creating Reservations

### Create a New Reservation
**POST** `/api/reservations`

```javascript
const createReservation = async (reservationData) => {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch('http://localhost:3001/api/reservations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer: reservationData.customerId, // MongoDB ObjectId
      car: reservationData.carId, // MongoDB ObjectId
      startDate: reservationData.startDate, // ISO date string
      endDate: reservationData.endDate, // ISO date string
      pickupLocation: {
        name: reservationData.pickupLocation.name,
        address: reservationData.pickupLocation.address,
        city: reservationData.pickupLocation.city,
        state: reservationData.pickupLocation.state,
        postalCode: reservationData.pickupLocation.postalCode,
        country: reservationData.pickupLocation.country
      },
      dropoffLocation: {
        name: reservationData.dropoffLocation.name,
        address: reservationData.dropoffLocation.address,
        city: reservationData.dropoffLocation.city,
        state: reservationData.dropoffLocation.state,
        postalCode: reservationData.dropoffLocation.postalCode,
        country: reservationData.dropoffLocation.country
      },
      additionalDrivers: reservationData.additionalDrivers || [],
      specialRequests: reservationData.specialRequests || ''
    })
  });

  const result = await response.json();
  
  if (result.success) {
    return result.data; // Returns reservation with auto-generated reservation number
  } else {
    throw new Error(result.message);
  }
};
```

### Example: Complete Booking Flow with Image Display

```javascript
// Complete booking example with images
const completeBooking = async (bookingData) => {
  try {
    // 1. Get current user info
    const token = localStorage.getItem('authToken');
    const userResponse = await fetch('http://localhost:3001/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const user = await userResponse.json();

    // 2. Get selected car details (including images)
    const carResponse = await fetch(`http://localhost:3001/api/cars/${bookingData.selectedCarId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const car = await carResponse.json();

    // 3. Calculate total cost including deposit
    const days = Math.ceil((bookingData.endDate - bookingData.startDate) / (1000 * 60 * 60 * 24));
    const rentalCost = car.data.dailyRate * days;
    const totalCost = rentalCost + car.data.deposit;

    // 4. Create reservation
    const reservation = await createReservation({
      customerId: user.data._id,
      carId: bookingData.selectedCarId,
      startDate: bookingData.startDate.toISOString(),
      endDate: bookingData.endDate.toISOString(),
      pickupLocation: bookingData.pickupLocation,
      dropoffLocation: bookingData.dropoffLocation,
      additionalDrivers: bookingData.additionalDrivers,
      specialRequests: bookingData.specialRequests
    });

    console.log('Reservation created:', reservation);
    console.log('Reservation Number:', reservation.reservationNumber);
    console.log('Total Cost (including deposit):', totalCost);
    
    return {
      reservation,
      car: car.data,
      costs: {
        rentalCost,
        deposit: car.data.deposit,
        totalCost
      }
    };

  } catch (error) {
    console.error('Booking failed:', error.message);
    throw error;
  }
};
```

## 📋 Customer Reservations

### Get Customer's Reservations
**GET** `/api/reservations`

```javascript
const getMyReservations = async () => {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch('http://localhost:3001/api/reservations?populate=car', {
    headers: {
      'Authorization': `Bearer ${token}`,
    }
  });

  const result = await response.json();
  return result.data.filter(reservation => 
    reservation.customer._id === getCurrentUserId()
  );
};
```

### Cancel Reservation
**PUT** `/api/reservations/:id/cancel`

```javascript
const cancelReservation = async (reservationId, reason) => {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(`http://localhost:3001/api/reservations/${reservationId}/cancel`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason })
  });

  const result = await response.json();
  return result.data;
};
```

## 💳 Payments (If Integrated)

### Create Payment Intent
**POST** `/api/payments/create-payment-intent`

```javascript
const createPaymentIntent = async (reservationId) => {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch('http://localhost:3001/api/payments/create-payment-intent', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reservationId })
  });

  const result = await response.json();
  return result.clientSecret; // Use with Stripe.js
};
```

## 🛠 Complete React Integration Example

```jsx
import React, { useState, useEffect } from 'react';

const CarRentalBooking = () => {
  const [cars, setCars] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_BASE = 'http://localhost:3001/api';

  // Get auth token
  const getToken = () => localStorage.getItem('authToken');

  // Login function
  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();
      if (result.success) {
        localStorage.setItem('authToken', result.token);
        setUser(result.user);
        return result.user;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  // Load available cars
  const loadCars = async () => {
    try {
      const response = await fetch(`${API_BASE}/cars?status=available`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const result = await response.json();
      setCars(result.data || []);
    } catch (error) {
      console.error('Failed to load cars:', error);
    }
  };

  // Create reservation
  const bookCar = async (carId, startDate, endDate, pickupLocation, dropoffLocation) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/reservations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer: user.id,
          car: carId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          pickupLocation,
          dropoffLocation,
          specialRequests: ''
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`Booking successful! Reservation #${result.data.reservationNumber}`);
        return result.data;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Booking failed:', error);
      alert('Booking failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCars();
    }
  }, [user]);

  const CarCard = ({ car }) => {
    const primaryImage = car.images?.find(img => img.isPrimary) || car.images?.[0];
    
    return (
      <div className="car-card">
        {primaryImage && (
          <img 
            src={primaryImage.urls.medium} 
            alt={primaryImage.description}
            style={{ width: '100%', height: '200px', objectFit: 'cover' }}
          />
        )}
        <div className="car-details">
          <h3>{car.brand} {car.model} ({car.year})</h3>
          {car.description && <p>{car.description}</p>}
          <div className="pricing">
            <strong>Daily Rate: ${car.dailyRate}</strong>
            <br />
            <span>Deposit: ${car.deposit}</span>
          </div>
          <button 
            onClick={() => setSelectedCar(car)}
            disabled={loading}
          >
            Book This Car
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      {!user ? (
        <LoginForm onLogin={login} />
      ) : (
        <div>
          <h2>Available Cars</h2>
          <div className="cars-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {cars.map(car => (
              <CarCard key={car._id} car={car} />
            ))}
          </div>
          
          {selectedCar && (
            <BookingForm 
              car={selectedCar} 
              onBook={bookCar}
              loading={loading}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default CarRentalBooking;
```

## 🔑 Important Notes

1. **Authentication Required**: Most endpoints require a valid JWT token
2. **CORS**: The backend is configured to accept requests from `localhost:5173` - update this in production
3. **Rate Limiting**: 100 requests per 15 minutes per IP
4. **Data Validation**: The backend validates all required fields
5. **Auto-generated Fields**: Reservation numbers are auto-generated
6. **Real-time Updates**: All reservations appear immediately in the admin panel
7. **Image Sizes**: Cars include multiple image sizes (thumbnail, medium, large, original)
8. **Deposit**: All cars now have a deposit field for security deposits

## 📸 Image Handling Best Practices

1. **Use appropriate image sizes**:
   - `thumbnail` (300x200): For car listings/grids
   - `medium` (800x600): For main car display
   - `large` (1200x900): For detailed view/lightbox
   - `original`: For downloads (admin only)

2. **Lazy loading**: Use `loading="lazy"` attribute for better performance

3. **Alt text**: Always use meaningful alt text from image descriptions

4. **Fallback**: Handle missing images gracefully

```javascript
const CarImage = ({ image, size = 'medium', alt, ...props }) => {
  const [error, setError] = useState(false);
  
  const src = image?.urls?.[size] || image?.url;
  
  if (!src || error) {
    return <div className="no-image">No Image Available</div>;
  }
  
  return (
    <img 
      src={src}
      alt={alt || image?.description || 'Car image'}
      onError={() => setError(true)}
      loading="lazy"
      {...props}
    />
  );
};
```

## 🚀 Production Deployment

When deploying to production:

1. **Update CORS Origin**:
   ```javascript
   // In server/server.js
   origin: process.env.CLIENT_URL || 'https://yourdomain.com'
   ```

2. **Environment Variables**:
   ```env
   MONGODB_URI=your_production_mongodb_url
   JWT_SECRET=your_production_jwt_secret
   CLIENT_URL=https://yourdomain.com
   GCS_PROJECT_ID=your-gcs-project
   GCS_BUCKET_NAME=your-production-bucket
   GCS_CREDENTIALS=base64-encoded-service-account
   ```

3. **HTTPS**: Use HTTPS in production for security
4. **CDN**: Consider using a CDN for image delivery
5. **Image Optimization**: Images are automatically optimized and compressed

## 📞 Support

If you need help integrating, check the admin panel at `http://localhost:5173` to see how the frontend communicates with the backend using Redux Toolkit Query. 