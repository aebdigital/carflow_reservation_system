# 📱 BySquare QR Payment Integration Guide

This guide explains how to use the integrated bySquare QR payment system for generating Slovak and Czech payment QR codes for car rental reservations.

## 🚀 **Overview**

The bySquare integration automatically generates QR payment codes for every reservation, allowing customers to pay quickly using their mobile banking apps by scanning the QR code.

**Supported Formats:**
- **PayBySquare** (Slovak format)
- **QR Platba CZ** (Czech format)

## ⚙️ **Configuration**

### **Environment Variables**

Add these environment variables to your `.env` file:

```bash
# BySquare API Credentials
BYSQUARE_USERNAME=your_username
BYSQUARE_PASSWORD=your_password

# Optional: Third-party service credentials
BYSQUARE_SERVICE_ID=your_service_id
BYSQUARE_SERVICE_USER_ID=your_service_user_id
```

### **Getting BySquare Credentials**

1. **Register at bySquare**: Visit [app.bysquare.com](https://app.bysquare.com)
2. **Create Account**: Sign up for a business account
3. **Get API Access**: Request API credentials from bySquare support
4. **Configure Bank Details**: Set up your bank account details in the service

## 🔧 **How It Works**

### **Automatic QR Generation**

QR codes are automatically generated for every new reservation:

1. **Reservation Created** → QR codes generated
2. **QR Codes Stored** → Saved in reservation document
3. **QR Codes Available** → Accessible via public API

### **QR Code Storage**

Each reservation stores QR data in the `qrCodes` field:

```javascript
{
  qrCodes: {
    payBySquare: "string",        // Slovak QR code
    qrPlatbaCz: "string",         // Czech QR code  
    invoiceBySquare: "string",    // Invoice QR code
    generatedAt: "2024-07-15T10:30:00Z",
    lastUpdated: "2024-07-15T10:30:00Z",
    isActive: true,
    bankAccount: "SK1234567890123456789012",
    variableSymbol: "1234567890",
    constantSymbol: "0308",
    amount: 100.00,
    beneficiaryName: "CarFlow Rental",
    paymentNote: "Car rental: BMW X5 (2024-07-20 - 2024-07-25)"
  }
}
```

## 🌐 **Public API Endpoints**

### **1. Get QR Codes by Reservation ID**

```
GET /api/public/reservations/:id/qr
```

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/reservations/669abc123def456/qr"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "hasQRCodes": true,
    "reservation": {
      "id": "669abc123def456",
      "reservationNumber": "RES-ABC123",
      "status": "confirmed",
      "customer": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "car": {
        "brand": "BMW",
        "model": "X5",
        "year": 2023
      },
      "startDate": "2024-07-20T10:00:00Z",
      "endDate": "2024-07-25T10:00:00Z",
      "amount": 250.00
    },
    "qrCodes": {
      "payBySquare": {
        "code": "0002K...long_qr_string...",
        "imageUrl": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=...",
        "format": "Slovak PayBySquare"
      },
      "qrPlatbaCz": {
        "code": "SPD*1.0*ACC:SK...long_qr_string...",
        "imageUrl": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=...",
        "format": "Czech QR Platba"
      }
    },
    "paymentDetails": {
      "amount": 250.00,
      "bankAccount": "SK1234567890123456789012",
      "variableSymbol": "1234567890",
      "constantSymbol": "0308",
      "beneficiaryName": "CarFlow Rental",
      "paymentNote": "Car rental: BMW X5 (2024-07-20 - 2024-07-25)"
    },
    "metadata": {
      "generatedAt": "2024-07-15T10:30:00Z",
      "lastUpdated": "2024-07-15T10:30:00Z",
      "isActive": true
    }
  }
}
```

### **2. Get QR Codes by User Email and Reservation ID**

```
GET /api/public/users/:email/reservations/:id/qr
```

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/reservations/669abc123def456/qr"
```

## 💻 **Frontend Integration**

### **React Component Example**

```jsx
import React, { useState, useEffect } from 'react';

const PaymentQRCode = ({ reservationId, userEmail }) => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQRCode = async () => {
      try {
        const endpoint = userEmail 
          ? `/api/public/users/${userEmail}/reservations/${reservationId}/qr`
          : `/api/public/reservations/${reservationId}/qr`;
          
        const response = await fetch(endpoint);
        const result = await response.json();
        
        if (result.success) {
          setQrData(result.data);
        } else {
          setError('QR codes not available');
        }
      } catch (err) {
        setError('Failed to load QR codes');
      } finally {
        setLoading(false);
      }
    };

    fetchQRCode();
  }, [reservationId, userEmail]);

  if (loading) return <div>Loading payment options...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!qrData?.hasQRCodes) return <div>Payment QR codes not available</div>;

  return (
    <div className="payment-qr-container">
      <h3>💳 Pay by QR Code</h3>
      
      <div className="reservation-info">
        <h4>Reservation Details</h4>
        <p><strong>Number:</strong> {qrData.reservation.reservationNumber}</p>
        <p><strong>Car:</strong> {qrData.reservation.car.brand} {qrData.reservation.car.model}</p>
        <p><strong>Amount:</strong> €{qrData.reservation.amount.toFixed(2)}</p>
      </div>

      <div className="qr-codes">
        {qrData.qrCodes.payBySquare && (
          <div className="qr-code-section">
            <h4>🇸🇰 Slovak PayBySquare</h4>
            <img 
              src={qrData.qrCodes.payBySquare.imageUrl} 
              alt="PayBySquare QR Code"
              className="qr-image"
            />
            <p>Scan with your Slovak banking app</p>
          </div>
        )}

        {qrData.qrCodes.qrPlatbaCz && (
          <div className="qr-code-section">
            <h4>🇨🇿 Czech QR Platba</h4>
            <img 
              src={qrData.qrCodes.qrPlatbaCz.imageUrl} 
              alt="QR Platba CZ QR Code"
              className="qr-image"
            />
            <p>Scan with your Czech banking app</p>
          </div>
        )}
      </div>

      <div className="payment-details">
        <h4>💰 Payment Details</h4>
        <p><strong>Account:</strong> {qrData.paymentDetails.bankAccount}</p>
        <p><strong>Variable Symbol:</strong> {qrData.paymentDetails.variableSymbol}</p>
        <p><strong>Beneficiary:</strong> {qrData.paymentDetails.beneficiaryName}</p>
        <p><strong>Note:</strong> {qrData.paymentDetails.paymentNote}</p>
      </div>
    </div>
  );
};

export default PaymentQRCode;
```

### **HTML + JavaScript Example**

```html
<div id="qr-payment-section"></div>

<script>
async function loadPaymentQR(reservationId, userEmail = null) {
  const endpoint = userEmail 
    ? `/api/public/users/${userEmail}/reservations/${reservationId}/qr`
    : `/api/public/reservations/${reservationId}/qr`;
    
  try {
    const response = await fetch(endpoint);
    const result = await response.json();
    
    if (result.success && result.data.hasQRCodes) {
      displayQRCodes(result.data);
    } else {
      document.getElementById('qr-payment-section').innerHTML = 
        '<p>Payment QR codes not available for this reservation.</p>';
    }
  } catch (error) {
    console.error('Error loading QR codes:', error);
  }
}

function displayQRCodes(qrData) {
  const container = document.getElementById('qr-payment-section');
  
  let html = `
    <h3>💳 Pay by QR Code</h3>
    <div class="reservation-info">
      <p><strong>Reservation:</strong> ${qrData.reservation.reservationNumber}</p>
      <p><strong>Amount:</strong> €${qrData.reservation.amount.toFixed(2)}</p>
    </div>
  `;
  
  if (qrData.qrCodes.payBySquare) {
    html += `
      <div class="qr-section">
        <h4>🇸🇰 Slovak PayBySquare</h4>
        <img src="${qrData.qrCodes.payBySquare.imageUrl}" alt="PayBySquare QR" style="width: 200px; height: 200px;">
        <p>Scan with your Slovak banking app</p>
      </div>
    `;
  }
  
  if (qrData.qrCodes.qrPlatbaCz) {
    html += `
      <div class="qr-section">
        <h4>🇨🇿 Czech QR Platba</h4>
        <img src="${qrData.qrCodes.qrPlatbaCz.imageUrl}" alt="QR Platba CZ" style="width: 200px; height: 200px;">
        <p>Scan with your Czech banking app</p>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

// Usage
loadPaymentQR('669abc123def456', 'admin@example.com');
</script>
```

## 🔍 **Testing**

### **Test QR Generation**

```bash
# Test QR codes for a specific reservation
curl "https://carflow-reservation-system.onrender.com/api/public/reservations/RESERVATION_ID/qr"

# Test QR codes for tenant-specific reservation
curl "https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/reservations/RESERVATION_ID/qr"
```

### **Manual QR Code Generation**

If QR codes are missing for existing reservations, they can be generated on-demand when accessing the QR endpoint.

## 🛠️ **Configuration Options**

### **Bank Account Settings**

Update the bank account details in `server/services/bySquareService.js`:

```javascript
// Payment details for QR
bankAccount: 'SK1234567890123456789012', // Your bank account
variableSymbol: invoiceNumber.replace(/[^0-9]/g, '').slice(-10),
constantSymbol: '0308', // Car rental services code
beneficiaryName: 'Your Company Name',
```

### **Company Information**

Update supplier details in `prepareInvoiceData()`:

```javascript
supplier: {
  partyName: 'Your Company Name',
  companyTaxID: '12345678',
  companyVATID: 'SK12345678',
  address: {
    streetName: 'Your Street',
    buildingNumber: '123',
    cityName: 'Your City',
    postalZone: '12345',
    country: 'SVK'
  },
  contact: {
    name: 'Support Team',
    email: 'support@yourcompany.com'
  }
}
```

## 📱 **Customer Experience**

1. **Customer makes reservation** → QR codes generated automatically
2. **Customer receives confirmation** → QR codes included in email/website
3. **Customer scans QR code** → Banking app opens with pre-filled payment
4. **Customer confirms payment** → Payment processed instantly
5. **Payment confirmed** → Reservation status updated

## 🔧 **Troubleshooting**

### **Common Issues**

1. **QR codes not generating:**
   - Check bySquare credentials in environment variables
   - Verify API connectivity
   - Check server logs for error messages

2. **Invalid QR format:**
   - Ensure bank account number is valid IBAN
   - Check variable symbol generation
   - Verify XML format compliance

3. **QR codes not displaying:**
   - Check if reservation exists
   - Verify QR endpoint accessibility
   - Test QR image URL generation

### **Debug Mode**

Enable detailed logging by checking server console for bySquare operations:
- `🔄 [QR]` - Generation in progress
- `✅ [QR]` - Success messages
- `❌ [QR]` - Error messages
- `⚠️ [QR]` - Warning messages

---

## 🎉 **You're Ready!**

Your bySquare QR payment integration is now complete! Customers can pay for car rentals by simply scanning QR codes with their mobile banking apps, making payments faster and more convenient than ever. 