# 📧 Public Email Subscription Integration Guide

This guide explains how to add email subscription forms to your website that automatically save to the admin **kampane** (campaigns) section.

## 🚀 **Available Endpoints**

### 1. **Simple Newsletter Subscription** (Recommended)
```
POST /api/public/newsletter/subscribe
```

**Benefits:**
- ✅ Easiest to implement
- ✅ Automatic tenant detection
- ✅ No need to know tenant email

**Request Body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+421900123456",
  "consent": true,
  "tenantId": "optional-tenant-id"
}
```

### 2. **Tenant-Specific Newsletter Subscription**
```
POST /api/public/users/:email/newsletter
```

**Request Body:**
```json
{
  "subscriberEmail": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+421900123456",
  "consent": true
}
```

## 💻 **Frontend Integration Examples**

### **Basic HTML Form**
```html
<form id="newsletter-form">
  <input type="email" name="email" placeholder="Your email" required>
  <input type="text" name="firstName" placeholder="First name">
  <input type="text" name="lastName" placeholder="Last name">
  <input type="tel" name="phone" placeholder="Phone">
  <label>
    <input type="checkbox" name="consent" required>
    I agree to receive newsletters
  </label>
  <button type="submit">Subscribe</button>
</form>

<script>
document.getElementById('newsletter-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    email: formData.get('email'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    phone: formData.get('phone'),
    consent: formData.get('consent') === 'on'
  };
  
  try {
    const response = await fetch('/api/public/newsletter/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': 'your-tenant-id' // Optional, can be auto-detected
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('Successfully subscribed to newsletter!');
      e.target.reset();
    } else {
      alert('Error: ' + result.message);
    }
  } catch (error) {
    alert('Network error. Please try again.');
  }
});
</script>
```

### **React Component**
```jsx
import React, { useState } from 'react';

const NewsletterForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    consent: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/public/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': process.env.REACT_APP_TENANT_ID // Optional
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        setMessage('Successfully subscribed to newsletter!');
        setFormData({ email: '', firstName: '', lastName: '', phone: '', consent: false });
      } else {
        setMessage('Error: ' + result.message);
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        name="email"
        placeholder="Your email"
        value={formData.email}
        onChange={handleChange}
        required
      />
      <input
        type="text"
        name="firstName"
        placeholder="First name"
        value={formData.firstName}
        onChange={handleChange}
      />
      <input
        type="text"
        name="lastName"
        placeholder="Last name"
        value={formData.lastName}
        onChange={handleChange}
      />
      <input
        type="tel"
        name="phone"
        placeholder="Phone"
        value={formData.phone}
        onChange={handleChange}
      />
      <label>
        <input
          type="checkbox"
          name="consent"
          checked={formData.consent}
          onChange={handleChange}
          required
        />
        I agree to receive newsletters
      </label>
      <button type="submit" disabled={loading}>
        {loading ? 'Subscribing...' : 'Subscribe'}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
};

export default NewsletterForm;
```

## 🔧 **Tenant Detection Methods**

The system automatically detects which tenant (business) the subscription belongs to:

### 1. **Header Method** (Most Reliable)
```javascript
fetch('/api/public/newsletter/subscribe', {
  headers: {
    'X-Tenant-ID': 'your-tenant-id'
  }
})
```

### 2. **Subdomain Detection** (Automatic)
- `admindemo.carflow.sk` → finds admin with subdomain "admindemo"
- `rival.carflow.sk` → finds admin with subdomain "rival"

### 3. **Body Parameter**
```javascript
{
  "email": "user@example.com",
  "tenantId": "your-tenant-id"
}
```

### 4. **URL Parameter Method**
```javascript
fetch('/api/public/users/admin@example.com/newsletter', {
  body: JSON.stringify({
    subscriberEmail: "user@example.com"
  })
})
```

## 📊 **Response Examples**

### **Success Response**
```json
{
  "success": true,
  "message": "Successfully subscribed to newsletter",
  "data": {
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "subscribedAt": "2024-07-15T10:30:00Z"
  }
}
```

### **Already Subscribed**
```json
{
  "success": true,
  "message": "Email already subscribed to newsletter",
  "data": {
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "subscribedAt": "2024-07-10T09:15:00Z"
  }
}
```

### **Error Response**
```json
{
  "success": false,
  "message": "Please enter a valid email address"
}
```

## 🎯 **Features**

### ✅ **Automatic Handling**
- **Duplicate Detection**: Won't create duplicate subscriptions
- **Reactivation**: Reactivates inactive subscribers
- **Validation**: Email format validation
- **Consent Tracking**: GDPR compliance
- **Source Tracking**: Tracks subscription source as "website"

### ✅ **Admin Panel Integration**
- All subscriptions appear in **Admin → Kampane → Email Database**
- Export to CSV functionality
- Segmentation by tags, source, date
- Subscription management and analytics

### ✅ **Multi-Tenant Support**
- Supports multiple businesses/tenants
- Tenant isolation (subscribers only see their own data)
- Automatic tenant detection

## 🛠️ **Advanced Configuration**

### **Custom Tags**
```javascript
// Add custom tags for segmentation
{
  "email": "user@example.com",
  "tags": ["newsletter", "promotion", "vip"]
}
```

### **Custom Source**
```javascript
// Track subscription source
{
  "email": "user@example.com",
  "source": "footer", // or "popup", "sidebar", etc.
}
```

### **API Base URL**
```javascript
// For external websites
const API_BASE_URL = 'https://carflow-reservation-system.onrender.com';
```

## 🔍 **Testing**

### **Test Subscription**
```bash
curl -X POST "https://carflow-reservation-system.onrender.com/api/public/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: your-tenant-id" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "consent": true
  }'
```

### **Test with Tenant Email**
```bash
curl -X POST "https://carflow-reservation-system.onrender.com/api/public/users/admin@example.com/newsletter" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriberEmail": "test@example.com",
    "firstName": "Test",
    "lastName": "User"
  }'
```

## 📈 **Viewing Subscriptions**

All email subscriptions will appear in:
**Admin Panel → Kampane → Email Database**

From there you can:
- View all subscribers
- Export to CSV
- Manage subscriptions
- Send campaigns
- View analytics

---

## 🎉 **You're Ready!**

Your email subscription forms are now connected to the admin kampane section. Users can subscribe directly from your website, and all data will be automatically organized in your admin panel for marketing campaigns. 