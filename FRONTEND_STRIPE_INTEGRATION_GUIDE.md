# Frontend Stripe Integration Guide for Car Rental Website

## Overview

This guide explains how to integrate Stripe payments into your car rental website frontend (e.g., https://lerent.carflow.sk or https://nitracar.carflow.sk).

**IMPORTANT:** This is for the customer-facing rental website, NOT the admin panel.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Configuration](#configuration)
3. [Complete Integration Flow](#complete-integration-flow)
4. [API Endpoints](#api-endpoints)
5. [Code Examples](#code-examples)
6. [Testing](#testing)
7. [Error Handling](#error-handling)
8. [Going Live](#going-live)

---

## Prerequisites

### Backend Setup (Already Done)
✅ Backend API running at: `https://carflow-reservation-system.onrender.com`
✅ Stripe webhook configured (see STRIPE_WEBHOOK_SETUP_GUIDE.md)
✅ Admin has configured Stripe keys in admin panel

### Frontend Requirements
- React, Vue, or vanilla JavaScript
- Ability to make HTTP fetch requests
- Customer-facing car rental website

---

## Configuration

### Environment Variables

Create a `.env` file in your frontend project:

```env
# Backend API URL
REACT_APP_API_URL=https://carflow-reservation-system.onrender.com

# Your tenant admin email (IMPORTANT!)
REACT_APP_ADMIN_EMAIL=lerent@lerent.sk

# Your website URL
REACT_APP_SITE_URL=https://lerent.carflow.sk
```

**Important:** Each tenant must use their own admin email:
- LeRent: `lerent@lerent.sk`
- Nitra-Car: `nitra-car@nitra-car.sk`
- Rival: `rival@test.sk`

### Create Configuration File

```javascript
// src/config/config.js
const config = {
  API_BASE_URL: process.env.REACT_APP_API_URL || 'https://carflow-reservation-system.onrender.com',
  ADMIN_EMAIL: process.env.REACT_APP_ADMIN_EMAIL || 'lerent@lerent.sk',
  SITE_URL: process.env.REACT_APP_SITE_URL || 'https://lerent.carflow.sk'
};

export default config;
```

---

## Complete Integration Flow

### Step-by-Step Process

```
1. Customer browses cars
         ↓
2. Customer selects car and fills booking form
         ↓
3. Frontend creates reservation (status: "pending")
         ↓
4. Frontend initiates Stripe checkout
         ↓
5. Customer redirected to Stripe payment page
         ↓
6. Customer completes payment
         ↓
7. Stripe webhook confirms payment (automatic)
         ↓
8. Backend updates reservation (status: "confirmed")
         ↓
9. Customer redirected back to success page
         ↓
10. Frontend verifies payment and shows confirmation
         ↓
11. Customer receives email confirmation (automatic)
```

---

## API Endpoints

### 1. Create Reservation

**Endpoint:** `POST /api/public/users/{adminEmail}/reservations`

**Purpose:** Create a new reservation with pending status

**Request:**
```javascript
POST https://carflow-reservation-system.onrender.com/api/public/users/lerent@lerent.sk/reservations

Headers:
{
  "Content-Type": "application/json"
}

Body:
{
  // Customer details
  "firstName": "Ján",
  "lastName": "Novák",
  "customerEmail": "jan.novak@example.com",
  "phone": "+421900123456",
  "dateOfBirth": "1990-01-15",
  "address": "Bratislavská 123, 949 01 Nitra",
  "licenseNumber": "SK123456",
  "licenseExpiry": "2030-12-31",

  // Company details (optional)
  "isCompany": false,
  "companyName": null,
  "ico": null,
  "dic": null,
  "icDph": null,

  // Reservation details
  "carId": "64abc123...",
  "startDate": "2025-11-01T10:00:00Z",
  "endDate": "2025-11-05T10:00:00Z",
  "pickupLocation": "Nitra - Office",
  "dropoffLocation": "Nitra - Office",

  // Additional services (optional)
  "selectedServices": [
    {
      "_id": "service123",
      "name": "Child seat",
      "price": 5,
      "quantity": 1,
      "totalPrice": 20
    }
  ],
  "servicesTotal": 20,

  // Insurance (optional)
  "selectedAdditionalInsurance": [],
  "selectedExtendedInsurance": [],

  // Discount code (optional)
  "discountCode": "SUMMER2024",

  // Notes
  "specialRequests": "Late pickup at 20:00",
  "notes": ""
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "_id": "68fe0e44420d738439750911",
    "reservationNumber": "RES-1234-1730123456",
    "status": "pending",
    "customer": { /* customer object */ },
    "car": { /* car object */ },
    "pricing": {
      "totalAmount": 250.00,
      "subtotal": 230.00,
      "servicesTotal": 20.00,
      "dailyRate": 50.00,
      "totalDays": 4
    },
    "startDate": "2025-11-01T10:00:00Z",
    "endDate": "2025-11-05T10:00:00Z",
    // ... other fields
  }
}
```

### 2. Create Stripe Checkout Session

**Endpoint:** `POST /api/payments/create-checkout-session`

**Purpose:** Create Stripe checkout and get payment URL

**Request:**
```javascript
POST https://carflow-reservation-system.onrender.com/api/payments/create-checkout-session

Headers:
{
  "Content-Type": "application/json"
}

Body:
{
  "email": "lerent@lerent.sk",  // Your admin email
  "amount": 250.00,
  "currency": "EUR",
  "description": "Car rental: BMW 3 Series (Nov 1-5, 2025)",
  "reservationId": "68fe0e44420d738439750911",
  "successUrl": "https://lerent.carflow.sk/payment-success",
  "cancelUrl": "https://lerent.carflow.sk/payment-cancelled",
  "customerInfo": {
    "email": "jan.novak@example.com"
  }
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_...",
    "session_id": "cs_test_a1b2c3...",
    "payment_id": "68fe123...",
    "test_mode": true
  }
}
```

### 3. Verify Payment

**Endpoint:** `GET /api/payments/verify/{paymentId}?session_id={sessionId}`

**Purpose:** Verify payment status after redirect

**Request:**
```javascript
GET https://carflow-reservation-system.onrender.com/api/payments/verify/68fe123?session_id=cs_test_a1b2c3
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "payment": {
      "_id": "68fe123",
      "status": "succeeded",
      "amount": 250.00,
      // ... other payment details
    },
    "status": "succeeded",
    "is_paid": true
  }
}
```

---

## Code Examples

### Complete React Implementation

#### 1. Create Payment Service

```javascript
// src/services/paymentService.js
import config from '../config/config';

class PaymentService {
  /**
   * Create a reservation
   */
  async createReservation(reservationData) {
    const response = await fetch(
      `${config.API_BASE_URL}/api/public/users/${config.ADMIN_EMAIL}/reservations`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reservationData)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create reservation');
    }

    return response.json();
  }

  /**
   * Create Stripe checkout session
   */
  async createCheckoutSession(paymentData) {
    const response = await fetch(
      `${config.API_BASE_URL}/api/payments/create-checkout-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: config.ADMIN_EMAIL,
          amount: paymentData.amount,
          currency: paymentData.currency || 'EUR',
          description: paymentData.description,
          reservationId: paymentData.reservationId,
          successUrl: `${config.SITE_URL}/payment-success`,
          cancelUrl: `${config.SITE_URL}/payment-cancelled`,
          customerInfo: {
            email: paymentData.customerEmail
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout session');
    }

    return response.json();
  }

  /**
   * Verify payment status
   */
  async verifyPayment(paymentId, sessionId) {
    const response = await fetch(
      `${config.API_BASE_URL}/api/payments/verify/${paymentId}?session_id=${sessionId}`
    );

    if (!response.ok) {
      throw new Error('Failed to verify payment');
    }

    return response.json();
  }
}

export default new PaymentService();
```

#### 2. Booking Page Component

```javascript
// src/pages/BookingPage.jsx
import React, { useState } from 'react';
import paymentService from '../services/paymentService';

function BookingPage({ car }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    // Customer details
    firstName: '',
    lastName: '',
    customerEmail: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    licenseNumber: '',
    licenseExpiry: '',

    // Reservation details
    startDate: '',
    endDate: '',
    pickupLocation: '',
    dropoffLocation: '',

    // Additional
    specialRequests: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Step 1: Create reservation
      console.log('Creating reservation...');
      const reservationResponse = await paymentService.createReservation({
        ...formData,
        carId: car._id,
        isCompany: false
      });

      const reservation = reservationResponse.data;
      console.log('Reservation created:', reservation.reservationNumber);

      // Step 2: Create Stripe checkout session
      console.log('Creating Stripe checkout...');
      const checkoutResponse = await paymentService.createCheckoutSession({
        amount: reservation.pricing.totalAmount,
        currency: 'EUR',
        description: `Car rental: ${car.brand} ${car.model}`,
        reservationId: reservation._id,
        customerEmail: formData.customerEmail
      });

      // Step 3: Redirect to Stripe
      if (checkoutResponse.success) {
        console.log('Redirecting to Stripe checkout...');

        // Show test mode warning if applicable
        if (checkoutResponse.data.test_mode) {
          console.warn('⚠️ Test mode - use card 4242 4242 4242 4242');
        }

        // Redirect to Stripe checkout page
        window.location.href = checkoutResponse.data.checkout_url;
      } else {
        throw new Error('Failed to create checkout session');
      }

    } catch (err) {
      console.error('Booking error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="booking-page">
      <h1>Book {car.brand} {car.model}</h1>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Customer Details */}
        <section>
          <h2>Customer Details</h2>

          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            value={formData.firstName}
            onChange={handleInputChange}
            required
          />

          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={handleInputChange}
            required
          />

          <input
            type="email"
            name="customerEmail"
            placeholder="Email"
            value={formData.customerEmail}
            onChange={handleInputChange}
            required
          />

          <input
            type="tel"
            name="phone"
            placeholder="Phone (+421...)"
            value={formData.phone}
            onChange={handleInputChange}
            required
          />

          <input
            type="date"
            name="dateOfBirth"
            placeholder="Date of Birth"
            value={formData.dateOfBirth}
            onChange={handleInputChange}
            required
          />

          <input
            type="text"
            name="address"
            placeholder="Address"
            value={formData.address}
            onChange={handleInputChange}
            required
          />

          <input
            type="text"
            name="licenseNumber"
            placeholder="License Number"
            value={formData.licenseNumber}
            onChange={handleInputChange}
            required
          />

          <input
            type="date"
            name="licenseExpiry"
            placeholder="License Expiry"
            value={formData.licenseExpiry}
            onChange={handleInputChange}
            required
          />
        </section>

        {/* Rental Details */}
        <section>
          <h2>Rental Details</h2>

          <input
            type="datetime-local"
            name="startDate"
            placeholder="Pickup Date"
            value={formData.startDate}
            onChange={handleInputChange}
            required
          />

          <input
            type="datetime-local"
            name="endDate"
            placeholder="Return Date"
            value={formData.endDate}
            onChange={handleInputChange}
            required
          />

          <input
            type="text"
            name="pickupLocation"
            placeholder="Pickup Location"
            value={formData.pickupLocation}
            onChange={handleInputChange}
            required
          />

          <input
            type="text"
            name="dropoffLocation"
            placeholder="Dropoff Location"
            value={formData.dropoffLocation}
            onChange={handleInputChange}
            required
          />

          <textarea
            name="specialRequests"
            placeholder="Special Requests (optional)"
            value={formData.specialRequests}
            onChange={handleInputChange}
          />
        </section>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="submit-button"
        >
          {loading ? 'Processing...' : 'Proceed to Payment'}
        </button>
      </form>
    </div>
  );
}

export default BookingPage;
```

#### 3. Payment Success Page

```javascript
// src/pages/PaymentSuccess.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import paymentService from '../services/paymentService';

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, failed
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      const paymentId = searchParams.get('payment_id');

      if (!sessionId || !paymentId) {
        setStatus('failed');
        return;
      }

      try {
        console.log('Verifying payment...');
        const response = await paymentService.verifyPayment(paymentId, sessionId);

        if (response.success && response.data.is_paid) {
          setStatus('success');
          setPaymentData(response.data.payment);
        } else {
          setStatus('failed');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('failed');
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (status === 'verifying') {
    return (
      <div className="payment-status">
        <div className="spinner"></div>
        <h2>Verifying your payment...</h2>
        <p>Please wait while we confirm your payment.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="payment-status success">
        <div className="success-icon">✓</div>
        <h1>Payment Successful!</h1>
        <p>Your car rental booking has been confirmed.</p>

        {paymentData && (
          <div className="payment-details">
            <h3>Booking Details</h3>
            <p><strong>Amount Paid:</strong> €{paymentData.amount.toFixed(2)}</p>
            <p><strong>Payment ID:</strong> {paymentData._id}</p>
            <p><strong>Status:</strong> Confirmed</p>
          </div>
        )}

        <p className="confirmation-message">
          You will receive a confirmation email shortly with all the details.
        </p>

        <button onClick={() => window.location.href = '/'}>
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="payment-status failed">
      <div className="error-icon">✗</div>
      <h1>Payment Verification Failed</h1>
      <p>We couldn't verify your payment. Please contact support if you were charged.</p>

      <button onClick={() => window.location.href = '/'}>
        Return to Home
      </button>
    </div>
  );
}

export default PaymentSuccess;
```

#### 4. Payment Cancelled Page

```javascript
// src/pages/PaymentCancelled.jsx
import React from 'react';

function PaymentCancelled() {
  return (
    <div className="payment-status cancelled">
      <div className="warning-icon">⚠</div>
      <h1>Payment Cancelled</h1>
      <p>Your payment was cancelled. No charges were made to your account.</p>
      <p>You can try booking again or contact us if you need assistance.</p>

      <div className="actions">
        <button onClick={() => window.history.back()}>
          Try Again
        </button>
        <button onClick={() => window.location.href = '/'}>
          Return to Home
        </button>
      </div>
    </div>
  );
}

export default PaymentCancelled;
```

#### 5. Router Setup

```javascript
// src/App.js
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BookingPage from './pages/BookingPage';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancelled from './pages/PaymentCancelled';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/booking/:carId" element={<BookingPage />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-cancelled" element={<PaymentCancelled />} />
        {/* ... other routes */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## Testing

### Test Mode

When testing, use Stripe test cards:

**Success:**
```
Card Number: 4242 4242 4242 4242
Expiry: 12/25 (any future date)
CVC: 123 (any 3 digits)
ZIP: 12345 (any 5 digits)
```

**Decline:**
```
Card Number: 4000 0000 0000 0002
```

**3D Secure (requires authentication):**
```
Card Number: 4000 0027 6000 3184
```

### Testing Checklist

- [ ] Create reservation successfully
- [ ] Redirect to Stripe checkout
- [ ] Complete payment with test card
- [ ] Redirect back to success page
- [ ] Payment verification works
- [ ] Reservation status changes to "confirmed"
- [ ] Customer receives confirmation email
- [ ] Test cancellation flow
- [ ] Test payment failure scenario

---

## Error Handling

### Common Errors and Solutions

**Error: "No admin found with this email"**
- Check `REACT_APP_ADMIN_EMAIL` matches admin email exactly
- Ensure admin user exists in database

**Error: "Stripe not configured for this tenant"**
- Admin needs to configure Stripe keys in admin panel
- See STRIPE_WEBHOOK_SETUP_GUIDE.md

**Error: "Failed to create checkout session"**
- Check backend logs for details
- Verify Stripe keys are correct
- Ensure amount is valid (> 0)

**Error: CORS issues**
- Ensure your frontend domain is added to CORS in backend
- Check `server/server.js` allowedOrigins array

### Error Handling in Code

```javascript
try {
  // Payment logic
} catch (error) {
  if (error.message.includes('not configured')) {
    alert('Payment system not available. Please contact us directly.');
  } else if (error.message.includes('CORS')) {
    alert('Connection error. Please try again.');
  } else {
    alert('An error occurred. Please try again or contact support.');
  }
}
```

---

## Going Live

### Checklist

1. **Backend:**
   - [ ] Admin configured live Stripe keys (not test keys)
   - [ ] Webhook configured in Stripe live mode
   - [ ] Test Mode toggled OFF in admin panel

2. **Frontend:**
   - [ ] Production URLs in `.env`
   - [ ] Error tracking enabled (Sentry, etc.)
   - [ ] Analytics configured
   - [ ] SSL certificate active (HTTPS)

3. **Testing:**
   - [ ] Test with real card (small amount)
   - [ ] Verify full flow works
   - [ ] Check email confirmations
   - [ ] Test refund process

---

## Support

### Debugging

1. **Check Browser Console:**
   - Look for API request errors
   - Check response status codes

2. **Check Network Tab:**
   - Verify API endpoints are correct
   - Check request/response data

3. **Check Backend Logs:**
   - Render dashboard for server logs
   - Look for Stripe errors

4. **Check Stripe Dashboard:**
   - View payment attempts
   - Check webhook event logs

### Contact

For implementation help:
- Check documentation files in repository
- Review code examples above
- Test with Stripe test cards first

---

## Quick Reference

### URLs

**Backend API:**
```
https://carflow-reservation-system.onrender.com
```

**Admin Panel:**
```
https://admindemo.carflow.sk
```

### Admin Emails by Tenant

- **LeRent:** `lerent@lerent.sk`
- **Nitra-Car:** `nitra-car@nitra-car.sk`
- **Rival:** `rival@test.sk`

### Test Card

```
4242 4242 4242 4242 | 12/25 | 123
```

### Key Endpoints

```
POST /api/public/users/{email}/reservations
POST /api/payments/create-checkout-session
GET  /api/payments/verify/{paymentId}?session_id={sessionId}
```
