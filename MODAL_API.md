# Modal Management API Documentation

This documentation covers the Modal Management system for CarFlow, allowing you to create, manage, and display multiple modals (popups) on your website.

## Base URL
```
https://carflow-reservation-system.onrender.com/api
```

**Important**: The base URL should NOT have a trailing slash. Our system automatically normalizes URLs to prevent double-slash issues that can cause 404 errors.

## Recent Updates & Fixes

### ✅ URL Normalization (July 2025)
- **Fixed**: Double slash URL issues (`/api//modals`) that caused 404 errors
- **Improved**: Automatic URL normalization in frontend and Redux store
- **Added**: Comprehensive debugging tools for troubleshooting

### ✅ CORS Configuration (July 2025)
- **Fixed**: Added `PATCH` method to allowed CORS methods
- **Resolved**: Cross-origin request issues for modal toggle functionality
- **Enhanced**: Better error handling and debugging information

### ✅ Debugging Tools (July 2025)
- **Added**: "Test API" button for basic connectivity testing
- **Added**: "Complete Debug" button for comprehensive system analysis
- **Enhanced**: Detailed console logging for all API operations

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

## Debugging and Testing Endpoints

### 8. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "message": "Car Rental Admin API is running",
  "timestamp": "2025-07-09T00:00:00.000Z",
  "corsFixed": true,
  "version": "1.1.0"
}
```

### 9. CORS Test
```http
GET /cors-test
```

**Response:**
```json
{
  "message": "CORS test endpoint",
  "origin": "https://admindemo.carflow.sk",
  "allowedOrigins": [
    "https://carflow-reservation-admin.netlify.app",
    "https://carflowdemowebsite.netlify.app",
    "https://admindemo.carflow.sk",
    "https://rentaldemo.carflow.sk",
    "https://rival.carflow.sk",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3005",
    "http://localhost:8080"
  ],
  "timestamp": "2025-07-09T00:00:00.000Z"
}
```

## JavaScript Integration Examples

### Basic Modal Display with URL Normalization
```javascript
class ModalManager {
  constructor(tenantId) {
    this.tenantId = tenantId;
    // URL normalization to prevent double slashes
    this.baseURL = (import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api').replace(/\/$/, '');
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
      max-width: ${modal.styling.width || '400px'};
      width: 90%;
      position: relative;
      animation: modalFadeIn 0.3s ease-out;
    `;

    // Add modal content
    modalEl.innerHTML = `
      <h2>${modal.title}</h2>
      <p>${modal.content}</p>
      ${modal.type === 'newsletter' ? `
        <input type="email" placeholder="${modal.emailPlaceholder}" 
               style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px;">
      ` : ''}
      ${modal.type === 'discount' && modal.discountCode ? `
        <div style="background: rgba(0,0,0,0.1); padding: 15px; margin: 15px 0; text-align: center; border-radius: 5px;">
          <strong>Code: ${modal.discountCode}</strong><br>
          <small>Save ${modal.discountType === 'percentage' ? modal.discountPercentage + '%' : '€' + modal.discountValue}</small>
        </div>
      ` : ''}
      <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
        <button class="modal-primary-btn" style="
          background-color: ${modal.styling.buttonColor};
          color: ${modal.styling.buttonTextColor};
          border: none;
          padding: 12px 24px;
          border-radius: 5px;
          cursor: pointer;
        ">${modal.buttonText || 'OK'}</button>
        ${modal.secondaryButtonText ? `
          <button class="modal-secondary-btn" style="
            background: transparent;
            color: ${modal.styling.textColor};
            border: 1px solid ${modal.styling.textColor};
            padding: 12px 24px;
            border-radius: 5px;
            cursor: pointer;
          ">${modal.secondaryButtonText}</button>
        ` : ''}
      </div>
      ${modal.settings.showCloseButton ? `
        <button class="modal-close" style="
          position: absolute;
          top: 10px;
          right: 15px;
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: ${modal.styling.textColor};
        ">&times;</button>
      ` : ''}
    `;

    overlay.appendChild(modalEl);
    return overlay;
  }

  async displayModal(modal) {
    if (!this.shouldShowModal(modal)) return;

    const modalElement = this.createModalElement(modal);
    document.body.appendChild(modalElement);

    // Record impression
    await this.recordAnalytics(modal._id, 'impression');

    // Mark as shown
    const modalKey = `modal_${modal._id}`;
    if (modal.frequency === 'once-ever') {
      localStorage.setItem(`${modalKey}_shown`, 'true');
    } else if (modal.frequency === 'once-per-day') {
      localStorage.setItem(`${modalKey}_last_shown`, Date.now().toString());
    } else if (modal.frequency === 'once-per-session') {
      sessionStorage.setItem(`${modalKey}_shown`, 'true');
    }

    // Event handlers
    const primaryBtn = modalElement.querySelector('.modal-primary-btn');
    const secondaryBtn = modalElement.querySelector('.modal-secondary-btn');
    const closeBtn = modalElement.querySelector('.modal-close');

    const closeModal = async () => {
      await this.recordAnalytics(modal._id, 'dismissal');
      modalElement.remove();
    };

    const handlePrimaryAction = async () => {
      await this.recordAnalytics(modal._id, 'click');
      
      if (modal.type === 'newsletter') {
        const emailInput = modalElement.querySelector('input[type="email"]');
        if (emailInput && emailInput.value) {
          await this.recordAnalytics(modal._id, 'conversion');
          // Handle newsletter signup here
          console.log('Newsletter signup:', emailInput.value);
        }
      } else {
        await this.recordAnalytics(modal._id, 'conversion');
      }
      
      modalElement.remove();
    };

    primaryBtn?.addEventListener('click', handlePrimaryAction);
    secondaryBtn?.addEventListener('click', closeModal);
    closeBtn?.addEventListener('click', closeModal);

    // Close on overlay click (if closeable)
    if (modal.settings.closeable) {
      modalElement.addEventListener('click', (e) => {
        if (e.target === modalElement) closeModal();
      });
    }
  }

  async initializeModals(currentPage = 'homepage') {
    try {
      const modals = await this.getActiveModals(currentPage);
      
      // Sort by priority (highest first)
      modals.sort((a, b) => (b.priority || 5) - (a.priority || 5));

      // Set up triggers for each modal
      modals.forEach(modal => {
        this.setupTrigger(modal);
      });

    } catch (error) {
      console.error('Error initializing modals:', error);
    }
  }

  setupTrigger(modal) {
    switch (modal.triggerRule.type) {
      case 'time':
        setTimeout(() => this.displayModal(modal), modal.triggerRule.value * 1000);
        break;
      
      case 'scroll':
        const scrollHandler = () => {
          const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
          if (scrollPercent >= modal.triggerRule.value) {
            this.displayModal(modal);
            window.removeEventListener('scroll', scrollHandler);
          }
        };
        window.addEventListener('scroll', scrollHandler);
        break;
      
      case 'page-load':
        this.displayModal(modal);
        break;
      
      case 'exit':
        let isExiting = false;
        const exitHandler = (e) => {
          if (e.clientY <= 0 && !isExiting) {
            isExiting = true;
            this.displayModal(modal);
            document.removeEventListener('mouseleave', exitHandler);
          }
        };
        document.addEventListener('mouseleave', exitHandler);
        break;
    }
  }
}

// Usage
const modalManager = new ModalManager('your-tenant-id');
modalManager.initializeModals(window.location.pathname);
```

### React Component Example with Enhanced Error Handling
```javascript
import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Button, TextField, Box } from '@mui/material';

const ModalDisplay = ({ tenantId, currentPage = 'homepage' }) => {
  const [activeModal, setActiveModal] = useState(null);
  const [email, setEmail] = useState('');
  
  // URL normalization to prevent double slashes
  const baseURL = (import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api').replace(/\/$/, '');

  const fetchModals = async () => {
    try {
      console.log(`Fetching modals from: ${baseURL}/website/modals/active/${currentPage}`);
      
      const response = await fetch(`${baseURL}/website/modals/active/${currentPage}?tenantId=${tenantId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        // Sort by priority and show highest priority modal
        const sortedModals = data.data.sort((a, b) => (b.priority || 5) - (a.priority || 5));
        return sortedModals;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching modals:', error);
      return [];
    }
  };

  const recordAnalytics = async (modalId, action) => {
    try {
      const response = await fetch(`${baseURL}/website/modals/${modalId}/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          tenantId
        })
      });
      
      if (!response.ok) {
        console.warn(`Failed to record ${action} for modal ${modalId}`);
      }
    } catch (error) {
      console.error('Error recording analytics:', error);
    }
  };

  useEffect(() => {
    const initializeModals = async () => {
      const modals = await fetchModals();
      
      if (modals.length > 0) {
        const modal = modals[0]; // Show highest priority modal
        
        // Check if should show based on frequency
        const modalKey = `modal_${modal._id}`;
        let shouldShow = true;
        
        switch (modal.frequency) {
          case 'once-ever':
            if (localStorage.getItem(`${modalKey}_shown`)) shouldShow = false;
            break;
          case 'once-per-day':
            const lastShown = localStorage.getItem(`${modalKey}_last_shown`);
            if (lastShown && Date.now() - parseInt(lastShown) < 24 * 60 * 60 * 1000) shouldShow = false;
            break;
          case 'once-per-session':
            if (sessionStorage.getItem(`${modalKey}_shown`)) shouldShow = false;
            break;
        }
        
        if (shouldShow) {
          setupModalTrigger(modal);
        }
      }
    };

    initializeModals();
  }, [tenantId, currentPage]);

  const setupModalTrigger = (modal) => {
    switch (modal.triggerRule.type) {
      case 'time':
        setTimeout(() => showModal(modal), modal.triggerRule.value * 1000);
        break;
      case 'page-load':
        showModal(modal);
        break;
      // Add other trigger types as needed
    }
  };

  const showModal = (modal) => {
    setActiveModal(modal);
    recordAnalytics(modal._id, 'impression');
    
    // Mark as shown
    const modalKey = `modal_${modal._id}`;
    if (modal.frequency === 'once-ever') {
      localStorage.setItem(`${modalKey}_shown`, 'true');
    } else if (modal.frequency === 'once-per-day') {
      localStorage.setItem(`${modalKey}_last_shown`, Date.now().toString());
    } else if (modal.frequency === 'once-per-session') {
      sessionStorage.setItem(`${modalKey}_shown`, 'true');
    }
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

## Troubleshooting

### Common Issues and Solutions

#### 1. 404 "Route not found" Errors
**Symptoms:**
- API calls failing with 404 status
- URLs showing double slashes (e.g., `/api//modals`)

**Solutions:**
- ✅ **Check URL normalization**: Ensure your base URL doesn't have trailing slashes
- ✅ **Update frontend**: Make sure you're using the latest version with URL fixes
- ✅ **Use debugging tools**: Click "Complete Debug" in admin panel to test

```javascript
// ❌ Wrong - can cause double slashes
const baseURL = 'https://carflow-reservation-system.onrender.com/api/'

// ✅ Correct - normalize URL
const baseURL = (import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api').replace(/\/$/, '')
```

#### 2. CORS Errors
**Symptoms:**
- "CORS policy" errors in browser console
- "Method not allowed" errors for PATCH requests

**Solutions:**
- ✅ **Check allowed origins**: Your domain should be in the allowed list
- ✅ **Verify PATCH method**: Should be included in allowed methods
- ✅ **Test CORS**: Use `/cors-test` endpoint to verify configuration

#### 3. Modal Toggle Issues
**Symptoms:**
- Modals not activating/deactivating
- "FETCH_ERROR" messages

**Solutions:**
- ✅ **Check authentication**: Ensure valid JWT token
- ✅ **Verify URL structure**: No double slashes in request URL
- ✅ **Use debugging tools**: Check console for detailed error info

#### 4. Modals Not Displaying
**Symptoms:**
- Modals exist in admin but don't show on website
- No errors in console

**Solutions:**
- ✅ **Check modal status**: Ensure `isActive: true`
- ✅ **Verify page matching**: Check `displayLocation` settings
- ✅ **Review frequency rules**: Check if modal was already shown
- ✅ **Inspect trigger rules**: Verify timing/scroll thresholds

### Debugging Tools

#### Admin Panel Debugging
1. **Go to**: Modal Settings page in admin panel
2. **Click "Test API"**: Basic connectivity check
3. **Click "Complete Debug"**: Comprehensive 6-step analysis

**Debug Output Example:**
```
🔧 === COMPREHENSIVE MODAL DEBUG SESSION ===
🔍 System Info:
- Raw Base URL: https://carflow-reservation-system.onrender.com/api/
- Normalized Base URL: https://carflow-reservation-system.onrender.com/api
🏥 Test 1: Health Check ✅
🌐 Test 2: CORS Test ✅
📋 Test 3: Get Current Modals ✅
🔀 Test 4: Toggle First Modal ✅
➕ Test 5: Test Modal Creation ✅
🗑️ Test 6: Clean up test modal ✅
```

#### Browser Console Debugging
```javascript
// Test API connectivity manually
fetch('https://carflow-reservation-system.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log)

// Test modal retrieval
fetch('https://carflow-reservation-system.onrender.com/api/website/modals/active/homepage?tenantId=YOUR_TENANT_ID')
  .then(r => r.json())
  .then(console.log)
```

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

### 6. URL Best Practices
- ✅ **Always normalize URLs**: Remove trailing slashes
- ✅ **Use environment variables**: `VITE_API_URL` for base URL
- ✅ **Check for double slashes**: Monitor network requests
- ✅ **Test thoroughly**: Use debugging tools before deployment

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
- `404`: Not Found (modal doesn't exist or URL issue)
- `500`: Internal Server Error

**Enhanced Error Handling:**
```javascript
const handleApiError = (error) => {
  console.error('Modal API Error:', error);
  
  if (error.status === 404) {
    console.warn('Check URL for double slashes or incorrect endpoint');
  } else if (error.status === 401) {
    console.warn('Authentication required - check JWT token');
  } else if (error.name === 'FetchError') {
    console.warn('Network error - check connectivity and CORS');
  }
  
  return {
    success: false,
    message: error.message || 'Unknown error occurred'
  };
};
```

## Rate Limiting

- Analytics endpoints: 100 requests per minute per IP
- Modal fetch endpoints: 60 requests per minute per IP
- Admin endpoints: 30 requests per minute per user

For higher limits, contact support or consider caching modal data on your frontend.

## Performance Optimization

### 1. Caching Strategies
```javascript
class ModalCache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
}

const modalCache = new ModalCache();
```

### 2. Lazy Loading
```javascript
// Load modals only when needed
const loadModalsWhenVisible = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        modalManager.initializeModals();
        observer.disconnect();
      }
    });
  });
  
  observer.observe(document.body);
};
```

### 3. Bundle Size Optimization
- Import only required modal types
- Use dynamic imports for modal components
- Compress modal assets and images
- Minimize CSS for modal styling

## Security Considerations

### 1. Content Security Policy (CSP)
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               connect-src 'self' https://carflow-reservation-system.onrender.com;
               style-src 'self' 'unsafe-inline';">
```

### 2. Input Validation
```javascript
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const sanitizeInput = (input) => {
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};
```

### 3. Tenant Isolation
- Always include `tenantId` in public requests
- Validate tenant permissions on server side
- Use scoped analytics to prevent data leakage

---

## Support and Updates

- **Last Updated**: July 2025
- **Version**: 1.1.0
- **Status**: ✅ All systems operational

For technical support or feature requests, contact the development team or check the project repository for updates. 