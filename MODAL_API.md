# Modal Management API Documentation

This documentation covers the Modal Management system for CarFlow, allowing you to create, manage, and display multiple modals (popups) on your website.

## Base URL
```
https://carflow-reservation-system.onrender.com/api
```

**Important**: The base URL should NOT have a trailing slash. Our system automatically normalizes URLs to prevent double-slash issues that can cause 404 errors.

## Recent Updates & Fixes

### ✅ Public Modal System Fix (July 2025)
- **Fixed**: Critical system mismatch between admin (multi-modal) and public (single modal) endpoints
- **Resolved**: Public endpoint now properly accesses the new modals array instead of legacy modal field
- **Result**: Public modal access is now fully functional

### ✅ URL Normalization (July 2025)
- **Fixed**: Double slash URL issues (`/api//modals`) that caused 404 errors
- **Improved**: Automatic URL normalization in frontend and Redux store
- **Added**: Comprehensive debugging tools for troubleshooting

### ✅ CORS Configuration (July 2025)
- **Fixed**: Added `PATCH` method to allowed CORS methods
- **Resolved**: Cross-origin request issues for modal toggle functionality
- **Enhanced**: Better error handling and debugging information

### ✅ Enhanced Debugging Tools (July 2025)
- **Added**: "Test API" button for basic connectivity testing
- **Added**: "Complete Debug" button for comprehensive system analysis
- **Added**: Detailed modal configuration analysis to identify issues
- **Enhanced**: User ID/Tenant ID extraction for public endpoint configuration

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

### 6. Get Active Modal by Email (Recommended)
```http
GET /public/users/:email/modal?page=PAGENAME
```

**✅ FIXED & WORKING**: This endpoint now properly accesses the new multi-modal system.

**Parameters:**
- `email` (path): User email to identify tenant (e.g., `rival@test.sk`)
- `page` (query): Optional page name (default: 'homepage')
  - Valid values: 'homepage', 'pricing', 'contact', 'about', 'cars', 'reservation'

**Example:**
```javascript
// Get active modal for homepage
fetch('https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/modal?page=homepage')

// Get active modal for pricing page  
fetch('https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/modal?page=pricing')
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Special Offer!",
    "content": "Get 15% off your first rental!",
    "type": "discount",
    "displayLocation": "all-pages",
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
    },
    "buttonText": "Get Discount",
    "secondaryButtonText": "Maybe Later",
    "discountCode": "WELCOME15",
    "discountPercentage": 15,
    "priority": 7,
    "frequency": "once-per-day"
  }
}
```

### 7. Get Active Modals by Tenant ID
```http
GET /website/modals/active/:page?tenantId=TENANT_ID
```

**Note**: This endpoint requires authentication for security. Use the email-based endpoint above for public access.

### 8. Record Modal Analytics
```http
POST /website/modals/:id/analytics
```

**Request Body:**
```json
{
  "action": "impression",
  "tenantId": "TENANT_ID"
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

### 9. Health Check
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

### 10. CORS Test
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

### Basic Modal Display with URL Normalization (Updated)
```javascript
class ModalManager {
  constructor(userEmail) {
    this.userEmail = userEmail; // e.g., 'rival@test.sk'
    // URL normalization to prevent double slashes
    this.baseURL = (import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api').replace(/\/$/, '');
    this.displayedModals = new Set();
  }

  async getActiveModal(page = 'homepage') {
    try {
      // ✅ WORKING: Use email-based public endpoint
      const response = await fetch(`${this.baseURL}/public/users/${this.userEmail}/modal?page=${page}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        console.log('✅ Modal loaded:', data.data.title);
        return data.data;
      } else {
        console.log('ℹ️ No active modal found for', page);
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching modal:', error);
      return null;
    }
  }

  async recordAnalytics(modalId, action) {
    try {
      // Note: Analytics require tenant ID - you'll need to get this from your admin
      await fetch(`${this.baseURL}/website/modals/${modalId}/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          tenantId: 'YOUR_TENANT_ID' // Get from admin panel or debug tools
        })
      });
    } catch (error) {
      console.error('Error recording analytics:', error);
    }
  }

  shouldShowModal(modal) {
    const modalKey = `modal_${modal._id || 'default'}`;
    
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
      background-color: rgba(0, 0, 0, ${modal.settings?.overlayOpacity || 0.5});
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create modal container
    const modalEl = document.createElement('div');
    modalEl.className = 'modal-container';
    modalEl.style.cssText = `
      background-color: ${modal.styling?.backgroundColor || '#ffffff'};
      color: ${modal.styling?.textColor || '#333333'};
      padding: 30px;
      border-radius: ${modal.styling?.borderRadius || 8}px;
      max-width: ${modal.styling?.width || '400px'};
      width: 90%;
      position: relative;
      animation: modalFadeIn 0.3s ease-out;
    `;

    // Add modal content
    modalEl.innerHTML = `
      <h2>${modal.title}</h2>
      <p>${modal.content}</p>
      ${modal.type === 'newsletter' ? `
        <input type="email" placeholder="${modal.emailPlaceholder || 'Enter your email'}" 
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
          background-color: ${modal.styling?.buttonColor || '#1976d2'};
          color: ${modal.styling?.buttonTextColor || '#ffffff'};
          border: none;
          padding: 12px 24px;
          border-radius: 5px;
          cursor: pointer;
        ">${modal.buttonText || 'OK'}</button>
        ${modal.secondaryButtonText ? `
          <button class="modal-secondary-btn" style="
            background: transparent;
            color: ${modal.styling?.textColor || '#333333'};
            border: 1px solid ${modal.styling?.textColor || '#333333'};
            padding: 12px 24px;
            border-radius: 5px;
            cursor: pointer;
          ">${modal.secondaryButtonText}</button>
        ` : ''}
      </div>
      ${modal.settings?.showCloseButton ? `
        <button class="modal-close" style="
          position: absolute;
          top: 10px;
          right: 15px;
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: ${modal.styling?.textColor || '#333333'};
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

    // Record impression (if you have the modal ID and tenant ID)
    // await this.recordAnalytics(modal._id, 'impression');

    // Mark as shown
    const modalKey = `modal_${modal._id || 'default'}`;
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
      // await this.recordAnalytics(modal._id, 'dismissal');
      modalElement.remove();
    };

    const handlePrimaryAction = async () => {
      // await this.recordAnalytics(modal._id, 'click');
      
      if (modal.type === 'newsletter') {
        const emailInput = modalElement.querySelector('input[type="email"]');
        if (emailInput && emailInput.value) {
          // await this.recordAnalytics(modal._id, 'conversion');
          // Handle newsletter signup here
          console.log('Newsletter signup:', emailInput.value);
        }
      } else {
        // await this.recordAnalytics(modal._id, 'conversion');
      }
      
      modalElement.remove();
    };

    primaryBtn?.addEventListener('click', handlePrimaryAction);
    secondaryBtn?.addEventListener('click', closeModal);
    closeBtn?.addEventListener('click', closeModal);

    // Close on overlay click (if closeable)
    if (modal.settings?.closeable !== false) {
      modalElement.addEventListener('click', (e) => {
        if (e.target === modalElement) closeModal();
      });
    }
  }

  async initializeModals(currentPage = 'homepage') {
    try {
      const modal = await this.getActiveModal(currentPage);
      
      if (modal) {
        this.setupTrigger(modal);
      }

    } catch (error) {
      console.error('Error initializing modals:', error);
    }
  }

  setupTrigger(modal) {
    switch (modal.triggerRule?.type) {
      case 'time':
        setTimeout(() => this.displayModal(modal), (modal.triggerRule.value || 5) * 1000);
        break;
      
      case 'scroll':
        const scrollHandler = () => {
          const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
          if (scrollPercent >= (modal.triggerRule.value || 50)) {
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
const modalManager = new ModalManager('rival@test.sk'); // Replace with your email
modalManager.initializeModals(window.location.pathname.includes('pricing') ? 'pricing' : 'homepage');
```

### React Component Example with Enhanced Error Handling
```javascript
import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Button, TextField, Box } from '@mui/material';

const ModalDisplay = ({ userEmail, currentPage = 'homepage' }) => {
  const [activeModal, setActiveModal] = useState(null);
  const [email, setEmail] = useState('');
  
  // URL normalization to prevent double slashes
  const baseURL = (import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api').replace(/\/$/, '');

  const fetchModal = async () => {
    try {
      console.log(`Fetching modal from: ${baseURL}/public/users/${userEmail}/modal?page=${currentPage}`);
      
      const response = await fetch(`${baseURL}/public/users/${userEmail}/modal?page=${currentPage}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching modal:', error);
      return null;
    }
  };

  useEffect(() => {
    const initializeModal = async () => {
      const modal = await fetchModal();
      
      if (modal) {
        // Check if should show based on frequency
        const modalKey = `modal_${modal._id || 'default'}`;
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

    initializeModal();
  }, [userEmail, currentPage]);

  const setupModalTrigger = (modal) => {
    switch (modal.triggerRule?.type) {
      case 'time':
        setTimeout(() => showModal(modal), (modal.triggerRule.value || 5) * 1000);
        break;
      case 'page-load':
        showModal(modal);
        break;
      // Add other trigger types as needed
    }
  };

  const showModal = (modal) => {
    setActiveModal(modal);
    
    // Mark as shown
    const modalKey = `modal_${modal._id || 'default'}`;
    if (modal.frequency === 'once-ever') {
      localStorage.setItem(`${modalKey}_shown`, 'true');
    } else if (modal.frequency === 'once-per-day') {
      localStorage.setItem(`${modalKey}_last_shown`, Date.now().toString());
    } else if (modal.frequency === 'once-per-session') {
      sessionStorage.setItem(`${modalKey}_shown`, 'true');
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setEmail('');
  };

  const handlePrimaryAction = () => {
    if (activeModal) {
      if (activeModal.type === 'newsletter' && email) {
        // Handle newsletter signup
        console.log('Newsletter signup:', email);
      } else {
        // Handle other modal actions
        console.log('Modal action:', activeModal.type);
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
          backgroundColor: activeModal.styling?.backgroundColor || '#ffffff',
          color: activeModal.styling?.textColor || '#333333',
          borderRadius: activeModal.styling?.borderRadius || 8,
        }
      }}
    >
      <DialogTitle style={{ color: activeModal.styling?.textColor || '#333333' }}>
        {activeModal.title}
      </DialogTitle>
      <DialogContent>
        <p>{activeModal.content}</p>
        
        {activeModal.type === 'newsletter' && (
          <TextField
            fullWidth
            type="email"
            placeholder={activeModal.emailPlaceholder || 'Enter your email'}
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
              backgroundColor: activeModal.styling?.buttonColor || '#1976d2',
              color: activeModal.styling?.buttonTextColor || '#ffffff',
            }}
          >
            {activeModal.buttonText || 'OK'}
          </Button>
          
          {activeModal.secondaryButtonText && (
            <Button
              variant="outlined"
              onClick={closeModal}
              style={{ color: activeModal.styling?.textColor || '#333333' }}
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

#### 1. "No active modal found" Error ✅ FIXED
**Symptoms:**
- Public endpoint returns `"No active modal found"`
- Modal exists in admin but doesn't show on website

**✅ Solution Applied:**
- Fixed system mismatch between admin (modals array) and public (modal object) endpoints
- Public endpoint now properly accesses the new multi-modal system

**Verification:**
```javascript
// Test the fixed endpoint
fetch('https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/modal?page=homepage')
  .then(r => r.json())
  .then(data => console.log('Modal data:', data.data))
```

#### 2. 404 "Route not found" Errors ✅ FIXED
**Symptoms:**
- API calls failing with 404 status
- URLs showing double slashes (e.g., `/api//modals`)

**✅ Solutions Applied:**
- URL normalization in frontend and Redux store
- Enhanced debugging tools to identify URL issues

**Best Practices:**
```javascript
// ✅ Correct - normalize URL
const baseURL = (import.meta.env.VITE_API_URL || 'https://carflow-reservation-system.onrender.com/api').replace(/\/$/, '')
```

#### 3. CORS Errors ✅ FIXED
**Symptoms:**
- "CORS policy" errors in browser console
- "Method not allowed" errors for PATCH requests

**✅ Solutions Applied:**
- Added PATCH method to allowed CORS methods
- Enhanced CORS configuration for all required methods

#### 4. Modal Configuration Issues
**Symptoms:**
- Modal exists but isn't active
- Wrong page settings
- Date/scheduling conflicts

**Solutions:**
- **Status**: Ensure modal `isActive: true`
- **Page Settings**: Use "all-pages" or specific page names
- **Scheduling**: Disable scheduling or verify dates
- **Priority**: Higher numbers = higher priority

### Enhanced Debugging Tools

#### Admin Panel Debugging ✅ AVAILABLE
1. **Go to**: Modal Settings page in admin panel
2. **Click "Test API"**: Basic connectivity check
3. **Click "Complete Debug"**: Comprehensive 6-step analysis including:
   - User ID/Tenant ID extraction
   - Both public endpoints testing
   - Detailed modal configuration analysis
   - Health and CORS verification

**Enhanced Debug Output:**
```
🔧 === COMPREHENSIVE MODAL DEBUG SESSION ===
👤 USER INFO:
- User ID (Your Tenant ID): 685ddbc2979b5b9b6c4b8264
- User Email: rival@test.sk

🔍 DETAILED MODAL ANALYSIS:
--- Modal 1: test modal ---
- Is Active: ✅ true
- Display Location: ✅ all-pages  
- Public Access Check: ✅ All conditions met

📋 Test: Get Modals with Old Endpoint (email)
✅ Working: Returns modal data
```

#### Browser Console Debugging
```javascript
// Test public endpoint directly
fetch('https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/modal?page=homepage')
  .then(r => r.json())
  .then(console.log)

// Test health endpoint
fetch('https://carflow-reservation-system.onrender.com/api/health')
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

### 6. URL Best Practices ✅ IMPLEMENTED
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
- Always include `userEmail` in public requests
- Validate tenant permissions on server side
- Use scoped analytics to prevent data leakage

---

## Support and Updates

- **Last Updated**: July 2025
- **Version**: 1.2.0
- **Status**: ✅ All systems operational

### Recent System Status
- ✅ **Public Modal System**: Fully functional
- ✅ **Admin Modal Management**: Fully functional  
- ✅ **URL Normalization**: Implemented
- ✅ **CORS Configuration**: Fixed
- ✅ **Enhanced Debugging**: Available

For technical support or feature requests, contact the development team or check the project repository for updates. 