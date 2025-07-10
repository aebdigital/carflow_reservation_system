# 📧 Email Database Integration Guide

This guide explains how to integrate email subscription forms on your public frontend with the backend email database system.

## 🗂️ Overview

The email database system allows you to:
- Collect email subscriptions from your website visitors
- Manage email lists for marketing campaigns
- Track subscription sources and user preferences
- Export subscriber data for external email marketing tools
- Handle unsubscribe requests and GDPR compliance

## 🏗️ Architecture

### Backend Components
- **Model**: `EmailSubscription` - Stores all email subscription data
- **Controller**: `emailSubscriptionController` - Handles all email operations
- **Routes**: `emailSubscriptions` - API endpoints for admin and public access
- **Database**: MongoDB with proper indexing and tenant isolation

### Frontend Components
- **Admin Interface**: Campaign management with email database tab
- **Public API**: Endpoints for website integration

## 🔧 API Endpoints

### Admin Endpoints (Authentication Required)
```javascript
// Get all email subscriptions
GET /api/email-subscriptions

// Get subscription statistics
GET /api/email-subscriptions/stats

// Create new subscription
POST /api/email-subscriptions

// Update subscription
PUT /api/email-subscriptions/:id

// Delete subscription
DELETE /api/email-subscriptions/:id

// Toggle active/inactive
POST /api/email-subscriptions/:id/toggle

// Export to CSV
GET /api/email-subscriptions/export

// Bulk import
POST /api/email-subscriptions/bulk-import
```

### Public Endpoints (No Authentication)
```javascript
// Subscribe to newsletter
POST /api/email-subscriptions/public/subscribe

// Unsubscribe from newsletter
GET /api/email-subscriptions/public/unsubscribe/:token
POST /api/email-subscriptions/public/unsubscribe/:token

// Update preferences
POST /api/email-subscriptions/public/preferences/:token
```

## 💻 Frontend Integration

### 1. Basic Newsletter Form

```html
<!-- HTML Form -->
<form id="newsletter-form" class="newsletter-form">
  <div class="form-group">
    <input 
      type="email" 
      id="email" 
      name="email" 
      placeholder="Vaša email adresa"
      required
    >
  </div>
  
  <div class="form-group">
    <input 
      type="text" 
      id="firstName" 
      name="firstName" 
      placeholder="Meno (voliteľné)"
    >
  </div>
  
  <div class="form-group">
    <input 
      type="text" 
      id="lastName" 
      name="lastName" 
      placeholder="Priezvisko (voliteľné)"
    >
  </div>
  
  <div class="form-group">
    <input 
      type="tel" 
      id="phone" 
      name="phone" 
      placeholder="Telefón (voliteľné)"
    >
  </div>
  
  <div class="form-group">
    <label>
      <input type="checkbox" id="consent" name="consent" required>
      Súhlasím so spracovaním osobných údajov pre marketingové účely
    </label>
  </div>
  
  <button type="submit" class="subscribe-btn">
    Prihlásiť sa k odberu
  </button>
</form>
```

### 2. JavaScript Integration

```javascript
// Basic subscription function
async function subscribeToNewsletter(formData) {
  const API_BASE_URL = 'https://your-api-domain.com/api/email-subscriptions';
  const TENANT_ID = 'your-tenant-id'; // Get this from your admin settings
  
  try {
    const response = await fetch(`${API_BASE_URL}/public/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': TENANT_ID
      },
      body: JSON.stringify({
        email: formData.email,
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        phone: formData.phone || '',
        source: 'website', // or 'newsletter', 'popup', 'footer'
        consent: formData.consent
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      // Success
      showMessage('Úspešne ste sa prihlásili k odberu!', 'success');
      document.getElementById('newsletter-form').reset();
    } else {
      // Error
      showMessage(result.error || 'Nastala chyba pri prihlásení.', 'error');
    }
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    showMessage('Nastala chyba pri prihlásení.', 'error');
  }
}

// Form submission handler
document.getElementById('newsletter-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = {
    email: document.getElementById('email').value,
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    phone: document.getElementById('phone').value,
    consent: document.getElementById('consent').checked
  };
  
  await subscribeToNewsletter(formData);
});

// Message display function
function showMessage(message, type) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = message;
  
  const form = document.getElementById('newsletter-form');
  form.parentNode.insertBefore(messageDiv, form);
  
  setTimeout(() => {
    messageDiv.remove();
  }, 5000);
}
```

### 3. Advanced Integration with React

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
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await fetch('/api/email-subscriptions/public/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': process.env.REACT_APP_TENANT_ID
        },
        body: JSON.stringify({
          ...formData,
          source: 'website'
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ text: 'Úspešne ste sa prihlásili k odberu!', type: 'success' });
        setFormData({
          email: '',
          firstName: '',
          lastName: '',
          phone: '',
          consent: false
        });
      } else {
        setMessage({ text: result.error || 'Nastala chyba pri prihlásení.', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Nastala chyba pri prihlásení.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="newsletter-form">
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <div className="form-group">
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Vaša email adresa"
          required
        />
      </div>
      
      <div className="form-group">
        <input
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          placeholder="Meno (voliteľné)"
        />
      </div>
      
      <div className="form-group">
        <input
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          placeholder="Priezvisko (voliteľné)"
        />
      </div>
      
      <div className="form-group">
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Telefón (voliteľné)"
        />
      </div>
      
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            name="consent"
            checked={formData.consent}
            onChange={handleChange}
            required
          />
          Súhlasím so spracovaním osobných údajov pre marketingové účely
        </label>
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Prihlasuje sa...' : 'Prihlásiť sa k odberu'}
      </button>
    </form>
  );
};

export default NewsletterForm;
```

## 🔐 Tenant Resolution

### Method 1: Header-based (Recommended)
```javascript
// Set tenant ID in request headers
headers: {
  'X-Tenant-ID': 'your-tenant-id-here'
}
```

### Method 2: Subdomain-based
```javascript
// The system automatically resolves tenant from subdomain
// Example: carflow.yourdomain.com -> resolves to carflow tenant
```

### Method 3: Domain-based
```javascript
// The system can resolve tenant from custom domain
// Example: yourcompany.com -> resolves to yourcompany tenant
```

## 📊 Admin Interface Usage

### Accessing Email Database
1. Navigate to **Kampane** (Campaigns) page
2. Click on **Databáza emailov** tab
3. View statistics and manage subscribers

### Managing Subscriptions
- **Add manually**: Click "Pridať email" button
- **Import CSV**: Use "Importovať CSV" button
- **Export data**: Use "Exportovať" button
- **Edit/Delete**: Use action buttons in table

### Viewing Statistics
- **Total emails**: All subscriptions in database
- **Active subscribers**: Currently subscribed users
- **Source breakdown**: Where subscriptions came from
- **Recent activity**: Latest subscription activity

## 🔄 Unsubscribe Process

### Automatic Unsubscribe Links
Each subscription automatically gets an unsubscribe token. Include this in your emails:

```html
<!-- Email template unsubscribe link -->
<a href="https://your-domain.com/api/email-subscriptions/public/unsubscribe/{{unsubscribeToken}}">
  Odhlásiť sa z odberu
</a>
```

### Custom Unsubscribe Page
```javascript
// Get token from URL parameter
const token = new URLSearchParams(window.location.search).get('token');

// Unsubscribe user
fetch(`/api/email-subscriptions/public/unsubscribe/${token}`, {
  method: 'POST'
})
.then(response => response.json())
.then(data => {
  if (data.message) {
    showMessage('Úspešne ste sa odhlásili z odberu.');
  }
});
```

## 🏷️ Tagging System

### Automatic Tags
- `newsletter` - Newsletter subscriptions
- `popup` - Popup form subscriptions
- `footer` - Footer form subscriptions
- `website` - General website subscriptions

### Custom Tags
```javascript
// Add custom tags during subscription
{
  email: 'user@example.com',
  tags: ['premium', 'vip-customer', 'promo-interested']
}
```

## 📝 GDPR Compliance

### Required Fields
- **consent**: Must be true for subscription
- **consentDate**: Automatically set
- **unsubscribeToken**: Automatically generated

### Data Processing
- All personal data is encrypted at rest
- Consent is tracked and timestamped
- Unsubscribe requests are processed immediately
- Data retention policies can be configured

## 🔍 Error Handling

### Common Errors
```javascript
// Email already exists
{
  error: 'Email already subscribed',
  status: 400
}

// Invalid email format
{
  error: 'Please enter a valid email address',
  status: 400
}

// Consent not given
{
  error: 'Consent is required',
  status: 400
}

// Tenant not found
{
  error: 'Tenant not specified',
  status: 400
}
```

### Error Handling Example
```javascript
try {
  const response = await fetch('/api/email-subscriptions/public/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId
    },
    body: JSON.stringify(formData)
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    switch (response.status) {
      case 400:
        if (result.error === 'Email already subscribed') {
          showMessage('Tento email je už prihlásený k odberu.', 'info');
        } else {
          showMessage(result.error, 'error');
        }
        break;
      case 500:
        showMessage('Nastala chyba servera. Skúste to neskôr.', 'error');
        break;
      default:
        showMessage('Nastala neočakávaná chyba.', 'error');
    }
  }
} catch (error) {
  showMessage('Problém s pripojením k serveru.', 'error');
}
```

## 🎨 CSS Styling

### Basic Styles
```css
.newsletter-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 15px;
}

.newsletter-form input[type="email"],
.newsletter-form input[type="text"],
.newsletter-form input[type="tel"] {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.newsletter-form input[type="checkbox"] {
  margin-right: 8px;
}

.subscribe-btn {
  width: 100%;
  padding: 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.3s;
}

.subscribe-btn:hover {
  background: #0056b3;
}

.subscribe-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.message {
  padding: 10px;
  margin-bottom: 15px;
  border-radius: 4px;
  font-weight: bold;
}

.message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.message.info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}
```

## 🚀 Deployment Considerations

### Environment Variables
```bash
# Backend
MONGODB_URI=mongodb://localhost:27017/car-rental
JWT_SECRET=your-jwt-secret
NODE_ENV=production

# Frontend
REACT_APP_API_URL=https://your-api-domain.com
REACT_APP_TENANT_ID=your-tenant-id
```

### CORS Configuration
Make sure your domain is added to the allowed origins in `server.js`:

```javascript
const allowedOrigins = [
  'https://your-website.com',
  'https://www.your-website.com',
  // ... other domains
];
```

## 📈 Analytics Integration

### Google Analytics Events
```javascript
// Track successful subscriptions
gtag('event', 'newsletter_signup', {
  event_category: 'engagement',
  event_label: 'newsletter',
  value: 1
});

// Track failed subscriptions
gtag('event', 'newsletter_error', {
  event_category: 'error',
  event_label: error.message,
  value: 0
});
```

### Facebook Pixel Events
```javascript
// Track newsletter signups
fbq('track', 'Subscribe', {
  value: 1,
  currency: 'EUR',
  content_name: 'newsletter'
});
```

## 🔧 Testing

### Manual Testing
1. Fill out the form with valid data
2. Check admin panel for new subscription
3. Test unsubscribe functionality
4. Verify error handling for invalid data

### Automated Testing
```javascript
// Jest test example
describe('Newsletter Subscription', () => {
  test('should subscribe valid email', async () => {
    const response = await fetch('/api/email-subscriptions/public/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': 'test-tenant'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        consent: true
      })
    });
    
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.message).toContain('Successfully subscribed');
  });
});
```

## 📚 Additional Resources

### API Documentation
- Full API reference available at `/api/docs` (if Swagger is implemented)
- Postman collection available in `/docs/postman`

### Support
- Technical issues: Create GitHub issue
- Integration questions: Contact support team
- Feature requests: Submit via admin panel

---

## 🔗 Quick Start Checklist

- [ ] Import EmailSubscription model to your database
- [ ] Add email subscription routes to server
- [ ] Configure CORS for your domain
- [ ] Set up tenant identification
- [ ] Create newsletter form on your website
- [ ] Implement JavaScript subscription logic
- [ ] Test subscription flow
- [ ] Set up unsubscribe links in emails
- [ ] Configure GDPR compliance
- [ ] Test admin panel functionality

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Compatibility**: Node.js 16+, MongoDB 4.4+ 