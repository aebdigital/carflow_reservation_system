# Nitra-Car Payment & Order Submission Guide

## 🎯 Overview

This guide explains how the payment and order submission system works for **nitra-car@nitra-car.sk** and what changes (if any) are needed on the frontend.

---

## ✅ Current Status: ALREADY WORKING!

**Good news:** The order submission system is already fully implemented and working. When a customer completes payment, the order is automatically submitted to the backend.

### How It Works Now:

```
Customer fills form → Submits reservation → Payment page → Payment confirmed → Order saved in database
```

---

## 🔄 Complete Order Flow

### Step 1: Customer Creates Reservation (Frontend → Backend)

**Frontend makes POST request to:**
```
POST /api/public/users/nitra-car@nitra-car.sk/reservations
```

**Request body includes:**
```javascript
{
  // Customer details
  firstName: "Ján",
  lastName: "Novák",
  customerEmail: "jan.novak@example.com",
  phone: "+421900123456",
  dateOfBirth: "1990-01-15",
  address: "Bratislava, Slovakia",
  licenseNumber: "SK123456",
  licenseExpiry: "2030-12-31",

  // Company details (optional)
  isCompany: false,
  companyName: null,
  ico: null,
  dic: null,
  icDph: null,

  // Reservation details
  carId: "65f1234567890abcdef12345",
  startDate: "2025-11-01",
  endDate: "2025-11-05",
  pickupLocation: "Nitra - Office",
  dropoffLocation: "Nitra - Office",

  // Additional services (from your system)
  selectedServices: [
    {
      _id: "service123",
      name: "Detské sedadlo",
      price: 5,
      quantity: 1,
      totalPrice: 20  // 5€/day × 4 days
    }
  ],
  servicesTotal: 20,

  // Insurance options
  selectedAdditionalInsurance: [],
  selectedExtendedInsurance: [],

  // Discount code (optional)
  discountCode: "SUMMER2024",

  // Notes
  specialRequests: "Late pickup at 20:00",
  notes: "First time customer"
}
```

**Backend response:**
```javascript
{
  success: true,
  data: {
    _id: "reservation-id-here",
    reservationNumber: "RES-CAR1-1730123456789",
    status: "pending",  // ← Initially "pending"
    customer: { ... },
    car: { ... },
    pricing: {
      totalAmount: 250,
      subtotal: 200,
      servicesTotal: 20,
      // ... other pricing details
    }
  }
}
```

---

### Step 2: Payment Process

After reservation is created with `status: "pending"`, there are **two payment methods**:

#### Option A: Stripe Payment (Automatic Confirmation)

**Frontend redirects to Stripe checkout:**
```javascript
// 1. Create payment intent
POST /api/payments/create-payment-intent
{
  reservationId: "reservation-id-here",
  amount: 250
}

// 2. Customer pays via Stripe
// 3. Stripe webhook automatically updates reservation:
//    status: "pending" → "confirmed"
```

**What happens automatically:**
1. Customer completes Stripe payment
2. Stripe sends webhook to: `POST /api/payments/stripe-webhook`
3. Backend automatically:
   - Updates payment status to `"succeeded"`
   - Updates reservation status from `"pending"` to `"confirmed"` ✅
   - Sends confirmation email to customer
   - Order is now in the system!

#### Option B: Bank Transfer / QR Payment (Manual Confirmation)

**Frontend gets QR code:**
```javascript
GET /api/public/users/nitra-car@nitra-car.sk/reservations/{reservationId}/qr

Response:
{
  success: true,
  data: {
    qrCodes: {
      payBySquare: "base64-qr-code-image",
      payBySquareData: "payment-string-for-slovak-banks"
    },
    bankDetails: {
      iban: "SK...",
      amount: 250,
      variableSymbol: "RES-CAR1-1730123456789",
      message: "Reservation RES-CAR1-1730123456789"
    }
  }
}
```

**What happens:**
1. Customer sees QR code or bank details
2. Customer pays manually via bank transfer
3. **Admin manually confirms payment** in admin panel
4. Admin changes status: `"pending"` → `"zaplatene"` (paid) or `"confirmed"`
5. Order is now confirmed in the system! ✅

---

## 🗄️ Order Storage in Database

All orders are stored in the `reservations` collection:

```javascript
{
  _id: ObjectId("..."),
  reservationNumber: "RES-CAR1-1730123456789",
  tenantId: "nitra-car-tenant-id",  // Isolated to nitra-car only

  // Customer info
  customer: ObjectId("customer-id"),

  // Reservation details
  car: ObjectId("car-id"),
  startDate: ISODate("2025-11-01T08:00:00Z"),
  endDate: ISODate("2025-11-05T18:00:00Z"),
  pickupLocation: { name: "Nitra - Office", address: "..." },
  dropoffLocation: { name: "Nitra - Office", address: "..." },

  // Status tracking
  status: "confirmed",  // pending → confirmed → ongoing → completed

  // Pricing breakdown
  pricing: {
    dailyRate: 50,
    totalDays: 4,
    subtotal: 200,
    servicesTotal: 20,
    totalAmount: 250,
    discounts: [
      {
        name: "Discount Code: SUMMER2024",
        amount: 30
      }
    ]
  },

  // Additional services
  selectedServices: [
    {
      _id: "service123",
      name: "Detské sedadlo",
      nameEn: "Child seat",
      price: 5,
      quantity: 1,
      totalPrice: 20
    }
  ],

  // Company info (if isCompany: true)
  firma: {
    isCompany: false,
    companyName: null,
    ico: null,
    dic: null,
    icDph: null
  },

  // Applied discount codes
  appliedDiscountCodes: [
    {
      code: "SUMMER2024",
      discountAmount: 30,
      discountPercentage: 15
    }
  ],

  // Timestamps
  createdAt: ISODate("2025-10-15T12:00:00Z"),
  updatedAt: ISODate("2025-10-15T12:05:00Z")
}
```

---

## 🎨 Frontend Changes Needed

### ⚠️ IMPORTANT: Check These Points

1. **Is the frontend calling the correct endpoint?**

   ✅ **Correct endpoint:**
   ```
   POST /api/public/users/nitra-car@nitra-car.sk/reservations
   ```

   ❌ **Wrong endpoint (don't use):**
   ```
   POST /api/public/reservations  (this is for general public, not tenant-specific)
   ```

2. **Is the frontend sending `customerEmail` in the request body?**

   ✅ **Correct:**
   ```javascript
   {
     customerEmail: "jan.novak@example.com",  // Customer's email
     firstName: "Ján",
     // ... other fields
   }
   ```

   ❌ **Wrong (will cause error):**
   ```javascript
   {
     email: "nitra-car@nitra-car.sk",  // This is admin email, NOT customer email!
     // Missing customerEmail field
   }
   ```

3. **Is the frontend including additional services correctly?**

   ✅ **Correct format:**
   ```javascript
   {
     selectedServices: [
       {
         _id: "service-id",
         name: "Detské sedadlo",
         price: 5,
         quantity: 1,
         totalPrice: 20  // price × quantity × days
       }
     ],
     servicesTotal: 20  // Sum of all service totalPrice
   }
   ```

4. **After payment, is status being checked?**

   The reservation status flow:
   ```
   "pending" → (payment confirmed) → "confirmed" → (car picked up) → "ongoing" → (car returned) → "completed"
   ```

---

## 📋 Frontend Checklist

### Before Customer Submits Form:

- [ ] Customer fills all required fields:
  - [ ] First name, last name
  - [ ] Email address (customer's email, NOT nitra-car@nitra-car.sk)
  - [ ] Phone number
  - [ ] Date of birth
  - [ ] Address
  - [ ] License number and expiry
  - [ ] Car selection
  - [ ] Start date and end date
  - [ ] Pickup/dropoff locations

- [ ] Additional services are properly formatted:
  - [ ] Each service has `_id`, `name`, `price`, `quantity`, `totalPrice`
  - [ ] `servicesTotal` is calculated correctly

- [ ] Company fields (if applicable):
  - [ ] `isCompany: true/false`
  - [ ] If true: `companyName`, `ico`, `dic`, `icDph`

### During Form Submission:

- [ ] Make POST request to:
  ```
  POST https://carflow-reservation-system.onrender.com/api/public/users/nitra-car@nitra-car.sk/reservations
  ```

- [ ] Request body includes ALL fields mentioned above

- [ ] Handle response:
  ```javascript
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reservationData)
  });

  const result = await response.json();

  if (result.success) {
    const reservationId = result.data._id;
    const reservationNumber = result.data.reservationNumber;

    // Redirect to payment page with reservationId
    window.location.href = `/payment/${reservationId}`;
  }
  ```

### On Payment Page:

#### For Stripe Payment:

- [ ] Create payment intent:
  ```javascript
  POST /api/payments/create-payment-intent
  {
    reservationId: "reservation-id-here",
    amount: 250
  }
  ```

- [ ] Redirect to Stripe checkout or use Stripe Elements

- [ ] After successful payment:
  - Reservation status is automatically changed to `"confirmed"` by webhook
  - Show success message to customer
  - Send confirmation email (handled by backend)

#### For QR/Bank Transfer Payment:

- [ ] Fetch QR code:
  ```javascript
  GET /api/public/users/nitra-car@nitra-car.sk/reservations/{reservationId}/qr
  ```

- [ ] Display QR code and bank details to customer

- [ ] Show message:
  ```
  "Platbu prosím prevediť na tento účet. Po potvrdení platby
  administrátorom dostanete potvrdzovací email."
  ```

- [ ] Reservation stays in `"pending"` status until admin confirms

---

## 🔍 How to Verify Orders are Being Submitted

### 1. Check Admin Panel

Log in to admin panel as **nitra-car@nitra-car.sk**:
```
https://your-admin-url.com/login
```

Navigate to **Reservations** page:
- You should see all reservations submitted by customers
- Status will show: `pending`, `confirmed`, `zaplatene`, `ongoing`, `completed`

### 2. Check Database Directly

Connect to MongoDB and query:
```javascript
db.reservations.find({
  tenantId: "nitra-car-tenant-id"
}).sort({ createdAt: -1 })
```

This shows all reservations for nitra-car, newest first.

### 3. Check Backend Logs

When a reservation is created, you'll see console logs:
```
🔍 [PUBLIC API createReservationByUser] Incoming services and insurance data:
📦 selectedServices: [...]
📧 [CUSTOMER EMAIL DEBUG] Final customer email: jan.novak@example.com
💰 [PUBLIC API createReservationByUser] Services & Insurance calculation: {...}
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "customerEmail is required" Error

**Problem:** Frontend is not sending `customerEmail` in request body

**Solution:**
```javascript
// ❌ Wrong
const data = {
  email: formData.email,  // Don't use "email"
  firstName: formData.firstName,
  // ...
}

// ✅ Correct
const data = {
  customerEmail: formData.email,  // Use "customerEmail"
  firstName: formData.firstName,
  // ...
}
```

### Issue 2: Orders Not Appearing in Admin Panel

**Causes:**
1. Wrong endpoint being used (using `/api/public/reservations` instead of `/api/public/users/nitra-car@nitra-car.sk/reservations`)
2. TenantId mismatch
3. Admin logged in with wrong account

**Solution:**
- Verify endpoint URL
- Check backend logs for errors
- Ensure admin is logged in as `nitra-car@nitra-car.sk`

### Issue 3: Payment Confirmed but Reservation Still "Pending"

**Causes:**
1. Stripe webhook not configured
2. Using test mode Stripe keys in production
3. Demo payment not calling confirm endpoint

**Solution:**
- For Stripe: Configure webhook URL in Stripe dashboard
- For demo/testing: Call the confirm endpoint manually:
  ```javascript
  POST /api/payments/confirm
  {
    paymentIntentId: "pi_xxx"
  }
  ```

### Issue 4: Additional Services Total is Wrong

**Problem:** `servicesTotal` doesn't match sum of service prices

**Solution:**
```javascript
// Calculate servicesTotal correctly
const selectedServices = [
  { name: "GPS", price: 5, quantity: 1, totalPrice: 20 },  // 5€ × 4 days
  { name: "Child Seat", price: 3, quantity: 1, totalPrice: 12 }  // 3€ × 4 days
];

const servicesTotal = selectedServices.reduce((sum, service) => {
  return sum + service.totalPrice;
}, 0);
// servicesTotal = 32
```

---

## 📊 Order Status Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    ORDER STATUS FLOW                         │
└─────────────────────────────────────────────────────────────┘

1. PENDING
   ↓
   Customer submits reservation form
   Order created in database with status "pending"

2. CONFIRMED (after payment)
   ↓
   • Stripe payment webhook updates status to "confirmed"
   • OR admin manually confirms bank transfer payment
   • Confirmation email sent to customer

3. ONGOING (car picked up)
   ↓
   Admin marks reservation as "ongoing" when customer picks up car

4. COMPLETED (car returned)
   ↓
   Admin marks as "completed" after car is returned and inspected

Alternative paths:
- CANCELLED (customer or admin cancels)
- NO-SHOW (customer doesn't show up)
```

---

## 🔐 Security & Data Isolation

**Tenant Isolation:**
- All reservations are isolated by `tenantId`
- Nitra-car can only see their own reservations
- Other tenants cannot access nitra-car's data

**Customer Data:**
- Customer information is stored securely
- Passwords are hashed (bcrypt)
- PII (personally identifiable information) is protected

**Payment Security:**
- Stripe handles all card data (PCI compliant)
- No card numbers stored in database
- Only payment intent IDs and last 4 digits stored

---

## 📞 API Endpoints Reference

### Create Reservation (Public)
```
POST /api/public/users/nitra-car@nitra-car.sk/reservations
```

### Get QR Code (Public)
```
GET /api/public/users/nitra-car@nitra-car.sk/reservations/{id}/qr
```

### Get Slovak Rental Agreement PDF (Public)
```
GET /api/public/users/nitra-car@nitra-car.sk/reservations/{id}/slovak-agreement
```

### Create Payment Intent (Protected)
```
POST /api/payments/create-payment-intent
```

### Confirm Payment (Protected)
```
POST /api/payments/confirm
```

### Stripe Webhook (Public - Stripe only)
```
POST /api/payments/stripe-webhook
```

---

## ✅ Summary

### What You Have:
- ✅ Backend endpoints for creating reservations
- ✅ Payment processing (Stripe + QR/Bank transfer)
- ✅ Automatic order confirmation via webhooks
- ✅ Database storage with tenant isolation
- ✅ Admin panel for managing orders
- ✅ Email notifications
- ✅ PDF generation for agreements

### What Frontend Should Do:
1. ✅ Call the correct endpoint: `/api/public/users/nitra-car@nitra-car.sk/reservations`
2. ✅ Send `customerEmail` (customer's email, not admin email)
3. ✅ Include all required customer fields
4. ✅ Format additional services correctly
5. ✅ Handle payment flow (Stripe or QR code)
6. ✅ Show confirmation to customer after successful reservation

### No Changes Needed If:
- Frontend is already calling the correct endpoint
- `customerEmail` is being sent in request body
- Additional services are formatted correctly
- Payment flow redirects to Stripe or shows QR code

---

## 🎓 Testing the Flow

### Test with Stripe (Demo Mode):

1. Create reservation with test data
2. Use Stripe test card: `4242 4242 4242 4242`
3. Any future expiry date, any CVC
4. Payment should succeed
5. Check admin panel - reservation status should be `"confirmed"`

### Test with QR Code:

1. Create reservation
2. Get QR code from endpoint
3. Admin manually confirms payment in admin panel
4. Status changes to `"confirmed"` or `"zaplatene"`

---

## 📧 Need Help?

If orders are not appearing in the backend:
1. Check browser console for frontend errors
2. Check backend logs for API errors
3. Verify endpoint URL is correct
4. Verify `customerEmail` is in request body
5. Check MongoDB directly to see if reservation was created

**The system is fully functional - if orders aren't appearing, it's likely a frontend integration issue with the endpoint URL or request body format.**
