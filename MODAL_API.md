# Modal Management API Documentation

This documentation covers the Modal Management system for CarFlow, allowing you to create, manage, and display multiple modals (popups) on your website.

## Base URL
```
https://carflow-reservation-system.onrender.com/api
```

## Authentication
Most modal management endpoints require authentication. Include the Bearer token in the Authorization header:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

## Modal Model Structure

```typescript
interface Modal {
  _id: string;
  name: string;                    // Internal identifier (max 50 chars)
  title: string;                   // Display title (max 100 chars)
  content: string;                 // Modal content (max 1000 chars)
  type: 'newsletter' | 'info' | 'discount' | 'announcement' | 'promotion';
  displayLocation: 'all-pages' | 'homepage' | 'pricing' | 'contact' | 'about' | 'cars';
  targetPages?: string[];          // Specific pages to target
  triggerRule: {
    type: 'time' | 'scroll' | 'exit' | 'page-load' | 'manual';
    value: number;                 // seconds for time, percentage for scroll
  };
  frequency: 'every-visit' | 'once-per-session' | 'once-per-day' | 'once-per-week' | 'once-ever';
  priority: number;                // 1-10 (10 = highest priority)
  isActive: boolean;
  isScheduled: boolean;
  startDate?: Date;
  endDate?: Date;
  
  // Type-specific fields
  emailPlaceholder?: string;       // For newsletter type
  buttonText?: string;
  secondaryButtonText?: string;
  discountCode?: string;           // For discount type
  discountPercentage?: number;
  discountType?: 'percentage' | 'fixed-amount';
  discountValue?: number;
  
  // Styling
  styling: {
    backgroundColor: string;
    textColor: string;
    buttonColor: string;
    buttonTextColor: string;
    borderColor: string;
    borderRadius: number;
    fontSize: string;
    width: string;
    position: 'center' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  };
  
  // Settings
  settings: {
    showCloseButton: boolean;
    closeable: boolean;
    overlay: boolean;
    overlayOpacity: number;
    animation: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'zoom';
    exitIntent: boolean;
    mobileResponsive: boolean;
  };
  
  // Analytics
  analytics: {
    impressions: number;
    clicks: number;
    conversions: number;
    dismissals: number;
    lastShown?: Date;
  };
  
  // Virtual fields
  conversionRate: string;          // Calculated percentage
  clickThroughRate: string;        // Calculated percentage
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastUpdatedBy: string;
}
```

## Admin Endpoints (Authentication Required)

### 1. Get All Modals
```http
GET /website/modals
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "modal_id",
      "name": "Summer Sale",
      "title": "Get 20% Off!",
      "content": "Don't miss our amazing summer sale. Book now and save!",
      "type": "discount",
      "isActive": true,
      "analytics": {
        "impressions": 1523,
        "clicks": 89,
        "conversions": 12
      },
      "conversionRate": "0.79",
      "clickThroughRate": "5.85"
    }
  ]
}
```

### 2. Create Modal
```http
POST /website/modals
```

**Request Body:**
```json
{
  "name": "Newsletter Signup",
  "title": "Stay Updated!",
  "content": "Subscribe to our newsletter for the latest deals and updates.",
  "type": "newsletter",
  "displayLocation": "all-pages",
  "triggerRule": {
    "type": "time",
    "value": 5
  },
  "frequency": "once-per-week",
  "priority": 7,
  "isActive": true,
  "emailPlaceholder": "Enter your email",
  "buttonText": "Subscribe Now",
  "secondaryButtonText": "Maybe Later",
  "styling": {
    "backgroundColor": "#ffffff",
    "textColor": "#333333",
    "buttonColor": "#1976d2",
    "buttonTextColor": "#ffffff",
    "borderRadius": 12,
    "position": "center"
  },
  "settings": {
    "showCloseButton": true,
    "overlay": true,
    "animation": "fade",
    "mobileResponsive": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "new_modal_id",
    "name": "Newsletter Signup",
    "title": "Stay Updated!",
    // ... full modal object
  },
  "message": "Modal created successfully"
}
```

### 3. Update Modal
```http
PUT /website/modals/:id
```

**Request Body:** Same as create, with any fields you want to update.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "modal_id",
    // ... updated modal object
  },
  "message": "Modal updated successfully"
}
```

### 4. Delete Modal
```http
DELETE /website/modals/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "deleted_modal_id",
    "name": "Deleted Modal"
  },
  "message": "Modal deleted successfully"
}
```

### 5. Toggle Modal Status
```http
PATCH /website/modals/:id/toggle
```

**Request Body:**
```json
{
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "modal_id",
    "isActive": true,
    "name": "Modal Name"
  },
  "message": "Modal activated successfully"
}
```

## Public Endpoints (No Authentication Required)

### 6. Get Active Modals for Page
```http
GET /website/modals/active/:page?tenantId=TENANT_ID
```

**Parameters:**
- `page` (path): Optional page name (default: 'homepage')
  - Valid values: 'homepage', 'pricing', 'contact', 'about', 'cars', 'reservation'
- `tenantId` (query): Required tenant ID

**Example:**
```javascript
// Get active modals for homepage
fetch('https://carflow-reservation-system.onrender.com/api/website/modals/active/homepage?tenantId=admin@example.com')

// Get active modals for all pages
fetch('https://carflow-reservation-system.onrender.com/api/website/modals/active?tenantId=admin@example.com')
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "modal_id",
      "title": "Special Offer!",
      "content": "Get 15% off your first rental!",
      "type": "discount",
      "triggerRule": {
        "type": "time",
        "value": 3
      },
      "styling": {
        "backgroundColor": "#ffffff",
        "textColor": "#333333",
        "buttonColor": "#1976d2",
        "position": "center"
      },
      "settings": {
        "overlay": true,
        "animation": "fade"
      }
    }
  ]
}
```

### 7. Record Modal Analytics
```http
POST /website/modals/:id/analytics
```

**Request Body:**
```json
{
  "action": "impression",
  "tenantId": "admin@example.com"
}
```

**Valid actions:**
- `impression`: Modal was shown to user
- `click`: User clicked on modal button
- `conversion`: User completed desired action (e.g., signed up)
- `dismissal`: User closed/dismissed modal

**Response:**
```json
{
  "success": true,
  "message": "impression recorded successfully"
}
```

## JavaScript Integration Examples

### Basic Modal Display
```javascript
class ModalManager {
  constructor(tenantId) {
    this.tenantId = tenantId;
    this.baseURL = 'https://carflow-reservation-system.onrender.com/api';
    this.displayedModals = new Set();
  }

  async getActiveModals(page = 'homepage') {
    try {
      const response = await fetch(`${this.baseURL}/website/modals/active/${page}?tenantId=${this.tenantId}`);
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching modals:', error);
      return [];
    }
  }

  async recordAnalytics(modalId, action) {
    try {
      await fetch(`${this.baseURL}/website/modals/${modalId}/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          tenantId: this.tenantId
        })
      });
    } catch (error) {
      console.error('Error recording analytics:', error);
    }
  }

  shouldShowModal(modal) {
    const modalKey = `modal_${modal._id}`;
    
    // Check frequency restrictions
    switch (modal.frequency) {
      case 'once-ever':
        if (localStorage.getItem(`${modalKey}_shown`)) return false;
        break;
      case 'once-per-day':
        const lastShown = localStorage.getItem(`${modalKey}_last_shown`);
        if (lastShown && Date.now() - parseInt(lastShown) < 24 * 60 * 60 * 1000) return false;
        break;
      case 'once-per-session':
        if (sessionStorage.getItem(`${modalKey}_shown`)) return false;
        break;
    }

    return true;
  }

  createModalElement(modal) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, ${modal.settings.overlayOpacity || 0.5});
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create modal container
    const modalEl = document.createElement('div');
    modalEl.className = 'modal-container';
    modalEl.style.cssText = `
      background-color: ${modal.styling.backgroundColor};
      color: ${modal.styling.textColor};
      padding: 30px;
      border-radius: ${modal.styling.borderRadius}px;
      width: ${modal.styling.width};
      max-width: 90vw;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      position: relative;
      animation: ${modal.settings.animation === 'fade' ? 'fadeIn' : 'slideIn'} 0.3s ease-out;
    `;

    // Add CSS animations
    if (!document.getElementById('modal-animations')) {
      const style = document.createElement('style');
      style.id = 'modal-animations';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-50px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    // Modal content
    modalEl.innerHTML = `
      ${modal.settings.showCloseButton ? '<button class="modal-close" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">&times;</button>' : ''}
      <h3 style="margin: 0 0 15px 0; color: ${modal.styling.textColor};">${modal.title}</h3>
      <p style="margin: 0 0 20px 0; line-height: 1.5;">${modal.content}</p>
      ${modal.type === 'newsletter' ? `
        <input type="email" class="modal-email" placeholder="${modal.emailPlaceholder}" style="width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px;">
      ` : ''}
      ${modal.type === 'discount' && modal.discountCode ? `
        <div style="background: #f5f5f5; padding: 15px; margin-bottom: 15px; border-radius: 4px; text-align: center;">
          <strong>Discount Code: ${modal.discountCode}</strong><br>
          <small>Save ${modal.discountType === 'percentage' ? modal.discountPercentage + '%' : '€' + modal.discountValue}</small>
        </div>
      ` : ''}
      <div class="modal-buttons" style="display: flex; gap: 10px; justify-content: center;">
        <button class="modal-primary-btn" style="background: ${modal.styling.buttonColor}; color: ${modal.styling.buttonTextColor}; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: 500;">
          ${modal.buttonText}
        </button>
        ${modal.secondaryButtonText ? `
          <button class="modal-secondary-btn" style="background: transparent; color: ${modal.styling.textColor}; border: 1px solid #ddd; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 16px;">
            ${modal.secondaryButtonText}
          </button>
        ` : ''}
      </div>
    `;

    // Add event listeners
    const closeBtn = modalEl.querySelector('.modal-close');
    const primaryBtn = modalEl.querySelector('.modal-primary-btn');
    const secondaryBtn = modalEl.querySelector('.modal-secondary-btn');

    const closeModal = () => {
      overlay.remove();
      this.recordAnalytics(modal._id, 'dismissal');
      this.markModalAsShown(modal);
    };

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    if (modal.settings.closeable) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
    }

    primaryBtn.addEventListener('click', () => {
      this.recordAnalytics(modal._id, 'click');
      
      if (modal.type === 'newsletter') {
        const emailInput = modalEl.querySelector('.modal-email');
        const email = emailInput.value.trim();
        if (email && this.isValidEmail(email)) {
          this.recordAnalytics(modal._id, 'conversion');
          // Handle newsletter subscription
          this.handleNewsletterSignup(email);
        } else {
          alert('Please enter a valid email address');
          return;
        }
      } else {
        this.recordAnalytics(modal._id, 'conversion');
      }
      
      closeModal();
    });

    if (secondaryBtn) {
      secondaryBtn.addEventListener('click', closeModal);
    }

    overlay.appendChild(modalEl);
    return overlay;
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  markModalAsShown(modal) {
    const modalKey = `modal_${modal._id}`;
    
    switch (modal.frequency) {
      case 'once-ever':
        localStorage.setItem(`${modalKey}_shown`, 'true');
        break;
      case 'once-per-day':
        localStorage.setItem(`${modalKey}_last_shown`, Date.now().toString());
        break;
      case 'once-per-session':
        sessionStorage.setItem(`${modalKey}_shown`, 'true');
        break;
    }
  }

  async handleNewsletterSignup(email) {
    // Implement newsletter subscription logic
    console.log('Newsletter signup:', email);
  }

  setupTrigger(modal) {
    switch (modal.triggerRule.type) {
      case 'time':
        setTimeout(() => this.showModal(modal), modal.triggerRule.value * 1000);
        break;
      
      case 'scroll':
        const scrollHandler = () => {
          const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
          if (scrollPercent >= modal.triggerRule.value) {
            this.showModal(modal);
            window.removeEventListener('scroll', scrollHandler);
          }
        };
        window.addEventListener('scroll', scrollHandler);
        break;
      
      case 'exit':
        document.addEventListener('mouseleave', () => this.showModal(modal), { once: true });
        break;
      
      case 'page-load':
        this.showModal(modal);
        break;
    }
  }

  showModal(modal) {
    if (!this.shouldShowModal(modal) || this.displayedModals.has(modal._id)) {
      return;
    }

    this.displayedModals.add(modal._id);
    const modalElement = this.createModalElement(modal);
    document.body.appendChild(modalElement);
    
    this.recordAnalytics(modal._id, 'impression');
  }

  async initializeModals(page = 'homepage') {
    const modals = await this.getActiveModals(page);
    
    // Sort by priority and show highest priority modals first
    modals.sort((a, b) => b.priority - a.priority);
    
    modals.forEach(modal => {
      this.setupTrigger(modal);
    });
  }
}

// Initialize modal manager
const modalManager = new ModalManager('admin@example.com');
modalManager.initializeModals(window.location.pathname.split('/')[1] || 'homepage');
```

### React Integration
```javascript
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, Button, TextField, Box } from '@mui/material';

const ModalDisplay = ({ tenantId, currentPage = 'homepage' }) => {
  const [modals, setModals] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    fetchActiveModals();
  }, [currentPage]);

  const fetchActiveModals = async () => {
    try {
      const response = await fetch(
        `https://carflow-reservation-system.onrender.com/api/website/modals/active/${currentPage}?tenantId=${tenantId}`
      );
      const data = await response.json();
      if (data.success) {
        setModals(data.data);
        setupModalTriggers(data.data);
      }
    } catch (error) {
      console.error('Error fetching modals:', error);
    }
  };

  const recordAnalytics = async (modalId, action) => {
    try {
      await fetch(`https://carflow-reservation-system.onrender.com/api/website/modals/${modalId}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, tenantId })
      });
    } catch (error) {
      console.error('Error recording analytics:', error);
    }
  };

  const setupModalTriggers = (modalList) => {
    modalList.forEach(modal => {
      if (modal.triggerRule.type === 'time') {
        setTimeout(() => showModal(modal), modal.triggerRule.value * 1000);
      }
      // Add other trigger types as needed
    });
  };

  const showModal = (modal) => {
    setActiveModal(modal);
    recordAnalytics(modal._id, 'impression');
  };

  const closeModal = () => {
    if (activeModal) {
      recordAnalytics(activeModal._id, 'dismissal');
    }
    setActiveModal(null);
    setEmail('');
  };

  const handlePrimaryAction = () => {
    if (activeModal) {
      recordAnalytics(activeModal._id, 'click');
      
      if (activeModal.type === 'newsletter' && email) {
        recordAnalytics(activeModal._id, 'conversion');
        // Handle newsletter signup
        console.log('Newsletter signup:', email);
      } else {
        recordAnalytics(activeModal._id, 'conversion');
      }
    }
    closeModal();
  };

  if (!activeModal) return null;

  return (
    <Dialog
      open={!!activeModal}
      onClose={closeModal}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        style: {
          backgroundColor: activeModal.styling.backgroundColor,
          color: activeModal.styling.textColor,
          borderRadius: activeModal.styling.borderRadius,
        }
      }}
    >
      <DialogTitle style={{ color: activeModal.styling.textColor }}>
        {activeModal.title}
      </DialogTitle>
      <DialogContent>
        <p>{activeModal.content}</p>
        
        {activeModal.type === 'newsletter' && (
          <TextField
            fullWidth
            type="email"
            placeholder={activeModal.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
          />
        )}
        
        {activeModal.type === 'discount' && activeModal.discountCode && (
          <Box sx={{ 
            bgcolor: 'rgba(0,0,0,0.1)', 
            p: 2, 
            borderRadius: 1, 
            textAlign: 'center',
            my: 2 
          }}>
            <strong>Code: {activeModal.discountCode}</strong><br />
            <small>
              Save {activeModal.discountType === 'percentage' 
                ? `${activeModal.discountPercentage}%` 
                : `€${activeModal.discountValue}`}
            </small>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
          <Button
            variant="contained"
            onClick={handlePrimaryAction}
            style={{
              backgroundColor: activeModal.styling.buttonColor,
              color: activeModal.styling.buttonTextColor,
            }}
          >
            {activeModal.buttonText}
          </Button>
          
          {activeModal.secondaryButtonText && (
            <Button
              variant="outlined"
              onClick={closeModal}
              style={{ color: activeModal.styling.textColor }}
            >
              {activeModal.secondaryButtonText}
            </Button>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ModalDisplay;
```

## Modal Types and Use Cases

### 1. Newsletter Modal
- **Purpose**: Collect email subscriptions
- **Fields**: `emailPlaceholder`, `buttonText`, `secondaryButtonText`
- **Example**: Welcome popup asking users to subscribe for updates

### 2. Info Modal
- **Purpose**: Display important information
- **Fields**: Basic modal fields only
- **Example**: Service updates, announcements

### 3. Discount Modal
- **Purpose**: Promote special offers
- **Fields**: `discountCode`, `discountPercentage`, `discountType`, `discountValue`
- **Example**: "Get 20% off your first booking with code WELCOME20"

### 4. Announcement Modal
- **Purpose**: Important company announcements
- **Fields**: Basic modal fields
- **Example**: New location opening, policy changes

### 5. Promotion Modal
- **Purpose**: Marketing campaigns
- **Fields**: Basic modal fields + styling options
- **Example**: Seasonal campaigns, limited-time offers

## Best Practices

### 1. Modal Frequency
- Use `once-per-session` for promotional modals
- Use `once-per-day` for newsletter signups
- Use `once-ever` for one-time announcements

### 2. Trigger Timing
- **Time-based**: 3-5 seconds for engagement, 10+ seconds for exit intent
- **Scroll-based**: 25-50% for engagement content, 75%+ for offers
- **Exit intent**: Use sparingly, good for retention offers

### 3. Priority Management
- Critical announcements: Priority 9-10
- Promotional offers: Priority 5-7
- Newsletter signups: Priority 3-5
- General info: Priority 1-3

### 4. Mobile Optimization
- Always enable `mobileResponsive: true`
- Use shorter content on mobile
- Consider smaller modal widths for mobile

### 5. Analytics Tracking
- Always record impressions when modals are shown
- Track clicks on primary actions
- Record conversions for successful actions
- Monitor dismissal rates to optimize timing

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

Common error codes:
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `404`: Not Found (modal doesn't exist)
- `500`: Internal Server Error

## Rate Limiting

- Analytics endpoints: 100 requests per minute per IP
- Modal fetch endpoints: 60 requests per minute per IP
- Admin endpoints: 30 requests per minute per user

For higher limits, contact support or consider caching modal data on your frontend. 