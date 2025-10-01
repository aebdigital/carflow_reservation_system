# Multi-Tenant Stripe Integration Guide

## ⚠️ Important: Each Tenant Needs Their Own Stripe Account

This system supports **multi-tenant Stripe configuration**, meaning each car rental company (tenant) must have their own Stripe account and keys configured in the admin panel.

## NO Global Environment Variables Needed

❌ **Don't add these to .env** (old single-tenant approach):
```env
# DON'T USE THESE - They won't work in multi-tenant setup
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## ✅ Tenant-Specific Configuration

Each car rental company admin configures their own Stripe keys in the admin panel under **Settings**.

### For Each Tenant (Car Rental Company):

1. **Create Individual Stripe Account**: Each car rental company needs their own Stripe account at https://stripe.com
2. **Configure in Admin Panel**: Each admin logs into their admin panel and goes to Settings → Payment Configuration
3. **Enter Their Keys**:
   - Stripe Secret Key: `sk_test_...` (for their account)
   - Stripe Publishable Key: `pk_test_...` (for their account)
   - Stripe Webhook Secret: `whsec_...` (for their webhook endpoint)
   - Test Mode: `true` (for development)

### Setting Up Webhooks (Per Tenant)

Each tenant needs to create their own webhook endpoint:

1. **Log into their Stripe Dashboard**
2. **Go to Developers → Webhooks**
3. **Add endpoint URL**: `https://yourdomain.com/api/payments/stripe-webhook`
4. **Select events**: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`
5. **Copy webhook secret**: This goes in their admin panel settings
6. **Important**: The webhook URL is the same for all tenants, but each has their own secret

## API Endpoints

### 1. Create Checkout Session
**POST** `/api/payments/create-checkout-session`

Creates a Stripe checkout session and redirects customer to Stripe's hosted checkout page.

**Request Body:**
```json
{
  "email": "admin@example.com",           // Admin email to identify tenant
  "amount": 150.00,                       // Payment amount in EUR
  "currency": "EUR",                      // Currency (optional, defaults to EUR)
  "description": "Car rental payment",     // Payment description (optional)
  "reservationId": "64abc123...",         // Optional reservation ID
  "successUrl": "https://yoursite.com/success", // Success redirect URL
  "cancelUrl": "https://yoursite.com/cancel"    // Cancel redirect URL
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_...",
    "session_id": "cs_test_...",
    "payment_id": "64abc123..."
  }
}
```

### 2. Verify Payment Status
**GET** `/api/payments/verify/:paymentId?session_id=cs_test_...`

Verifies payment status and updates records if needed.

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": { /* payment object */ },
    "status": "succeeded",
    "is_paid": true
  }
}
```

### 3. Stripe Webhook (Internal)
**POST** `/api/payments/stripe-webhook`

Handles Stripe webhook events automatically. No manual calls needed.

## Frontend Integration Guide

### For your Frontend Car Rental Website Developer

Here's how to integrate the multi-tenant Stripe checkout functionality:

#### 1. Create Payment Function

```javascript
// Payment service function
async function createStripeCheckout(paymentData) {
  const response = await fetch('https://your-backend-domain.com/api/payments/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@carrentalcompany.com', // The specific car rental company's admin email
      amount: paymentData.amount,
      currency: paymentData.currency || 'EUR', // Currency from tenant settings
      description: `Car rental: ${paymentData.carName} - ${paymentData.dates}`,
      reservationId: paymentData.reservationId, // If you have one
      successUrl: `${window.location.origin}/payment-success`,
      cancelUrl: `${window.location.origin}/payment-cancelled`
    })
  });

  const result = await response.json();

  if (result.success) {
    // Check if it's test mode (shown in response)
    if (result.data.test_mode) {
      console.log('⚠️ Test mode payment - use test card 4242 4242 4242 4242');
    }
    // Redirect to Stripe checkout
    window.location.href = result.data.checkout_url;
  } else {
    if (result.message?.includes('not configured')) {
      throw new Error('Payment system not set up for this rental company. Please contact them directly.');
    }
    throw new Error('Failed to create checkout session');
  }
}
```

#### 2. Handle User Click

```javascript
// Example usage in a component
function handlePayNowClick() {
  const paymentData = {
    amount: 150.00, // Price in EUR
    carName: 'BMW 3 Series',
    dates: '2024-01-15 to 2024-01-20',
    reservationId: 'optional-reservation-id'
  };

  createStripeCheckout(paymentData)
    .catch(error => {
      console.error('Payment error:', error);
      alert('Failed to initiate payment. Please try again.');
    });
}
```

#### 3. Create Success/Cancel Pages

**Success Page** (`/payment-success`):
```javascript
// payment-success.js
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState('verifying');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const paymentId = searchParams.get('payment_id');

    if (sessionId && paymentId) {
      // Verify payment with backend
      fetch(`https://your-backend-domain.com/api/payments/verify/${paymentId}?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data.is_paid) {
            setPaymentStatus('success');
            // You can also trigger confirmation emails here
          } else {
            setPaymentStatus('failed');
          }
        })
        .catch(() => setPaymentStatus('error'));
    }
  }, [searchParams]);

  if (paymentStatus === 'verifying') {
    return <div>Verifying payment...</div>;
  }

  if (paymentStatus === 'success') {
    return (
      <div>
        <h1>Payment Successful! 🎉</h1>
        <p>Your car rental booking has been confirmed.</p>
        <p>You will receive a confirmation email shortly.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Payment Verification Failed</h1>
      <p>Please contact support if you were charged.</p>
    </div>
  );
}
```

**Cancel Page** (`/payment-cancelled`):
```javascript
// payment-cancelled.js
function PaymentCancelled() {
  return (
    <div>
      <h1>Payment Cancelled</h1>
      <p>Your payment was cancelled. No charges were made.</p>
      <button onClick={() => window.history.back()}>
        Go Back
      </button>
    </div>
  );
}
```

#### 4. Environment Configuration

Your frontend developer should configure these URLs:

```javascript
// config.js
const config = {
  API_BASE_URL: process.env.REACT_APP_API_URL || 'https://your-backend-domain.com',
  // ⚠️ IMPORTANT: Each car rental company website needs their own admin email
  ADMIN_EMAIL: process.env.REACT_APP_ADMIN_EMAIL || 'admin@carrentalcompany.com',
  SITE_URL: process.env.REACT_APP_SITE_URL || 'https://your-frontend-domain.com'
};
```

**Multi-tenant Setup Notes:**
- Each car rental company's website should have their own `REACT_APP_ADMIN_EMAIL`
- Example: Company A uses `admin@companya.com`, Company B uses `admin@companyb.com`
- The backend automatically routes to the correct Stripe account based on this email

#### 5. Complete Integration Example

```javascript
// CarBookingComponent.js
import React, { useState } from 'react';

function CarBookingComponent({ car, bookingDetails }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBookAndPay = async () => {
    setIsProcessing(true);

    try {
      // 1. Create the booking/reservation first (optional)
      const bookingResponse = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingDetails)
      });

      const booking = await bookingResponse.json();

      // 2. Initiate Stripe payment
      const paymentResponse = await fetch('https://your-backend-domain.com/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@carrentalcompany.com',
          amount: bookingDetails.totalPrice,
          currency: 'EUR',
          description: `Car rental: ${car.brand} ${car.model}`,
          reservationId: booking.data?._id,
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: `${window.location.origin}/payment-cancelled`
        })
      });

      const paymentResult = await paymentResponse.json();

      if (paymentResult.success) {
        // Redirect to Stripe
        window.location.href = paymentResult.data.checkout_url;
      } else {
        throw new Error('Failed to create payment session');
      }

    } catch (error) {
      console.error('Booking/Payment error:', error);
      alert('Failed to process booking. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <h3>Book {car.brand} {car.model}</h3>
      <p>Total: €{bookingDetails.totalPrice}</p>

      <button
        onClick={handleBookAndPay}
        disabled={isProcessing}
        className="pay-button"
      >
        {isProcessing ? 'Processing...' : 'Book & Pay Now'}
      </button>
    </div>
  );
}
```

## Testing

Use Stripe's test card numbers:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Use any future expiry date and any 3-digit CVC

## Security Notes

1. Never expose your Stripe secret key in frontend code
2. Always validate payments on your backend using webhooks
3. Use HTTPS in production
4. Validate all input parameters before creating checkout sessions
5. Implement proper error handling and user feedback

## Setup Summary

### For Each Car Rental Company:

1. **Stripe Account**: Create individual Stripe account
2. **Admin Panel**: Configure Stripe keys in Settings → Payment
3. **Frontend Website**: Set correct admin email in environment variables
4. **Webhook**: Create webhook endpoint in their Stripe dashboard
5. **Testing**: Use test mode and test cards initially

### Backend URL for Frontend Developer:

Your frontend developer needs to make API calls to:
```
https://your-backend-domain.com/api/payments/create-checkout-session
```

### Multi-Tenant Benefits:

✅ Each company gets their own Stripe payments
✅ Separate financial accounts
✅ Independent webhook handling
✅ Company-specific currencies and settings
✅ Isolated test and live modes

Make sure this domain is added to your CORS configuration in the backend.