# 🌍 English Translations System - Complete Guide

## Table of Contents
1. [Backend API](#backend-api)
2. [JWT Authentication](#jwt-authentication)
3. [Frontend Integration](#frontend-integration)
4. [React Components](#react-components)
5. [RTK Query Setup](#rtk-query-setup)
6. [Usage Examples](#usage-examples)

---

## 🔌 Backend API

### Available English Translation Endpoints

All endpoints require **JWT authentication** and **admin/staff role**.

#### 1. **Cars**
```http
PUT /api/cars/:id/english
Content-Type: application/json
Authorization: Bearer {token}

{
  "descriptionEn": "Spacious family SUV with modern safety features and excellent fuel economy"
}
```

#### 2. **Additional Services**
```http
PUT /api/additional-services/:id/english
Content-Type: application/json
Authorization: Bearer {token}

{
  "nameEn": "GPS Navigation System",
  "descriptionEn": "Premium GPS with lifetime European maps"
}
```

#### 3. **Blog Posts**
```http
PUT /api/blogs/:id/english
Content-Type: application/json
Authorization: Bearer {token}

{
  "titleEn": "Top 10 Winter Driving Tips",
  "slugEn": "top-10-winter-driving-tips",
  "excerptEn": "Stay safe on icy roads...",
  "contentEn": "<full English content>"
}
```

#### 4. **Website Settings - Info Bar**
```http
PUT /api/website/settings/info-bar/english
Content-Type: application/json
Authorization: Bearer {token}

{
  "textEn": "Welcome! Get 20% off your first rental"
}
```

#### 5. **Website Settings - Modals**
```http
PUT /api/website/modals/:modalId/english
Content-Type: application/json
Authorization: Bearer {token}

{
  "titleEn": "Special Offer",
  "contentEn": "Subscribe for exclusive discounts",
  "emailPlaceholderEn": "Enter your email",
  "buttonTextEn": "Subscribe Now",
  "secondaryButtonTextEn": "No Thanks"
}
```

#### 6. **Banners**
```http
PUT /api/banners/:bannerId/images/:imageId/english
Content-Type: application/json
Authorization: Bearer {token}

{
  "titleEn": "Premium Car Rental",
  "descriptionEn": "Explore Slovakia with modern fleet",
  "altEn": "Modern car in front of mountains"
}
```

---

## 🔐 JWT Authentication

### How JWT Works in Your System

#### 1. **Login Flow**
```javascript
// User logs in
POST /api/auth/login
{
  "email": "nitra-car@nitra-car.sk",
  "password": "your-password"
}

// Response includes JWT token
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "123",
    "email": "nitra-car@nitra-car.sk",
    "role": "admin",
    "tenantId": "tenant123"
  }
}
```

#### 2. **Token Structure**
Your JWT tokens contain:
- **User ID** - for identifying the user
- **Tenant ID** - for multi-tenant data isolation
- **Role** - for authorization (admin, staff, customer)
- **Expiration** - tokens expire after a set time

#### 3. **Token Usage**
All protected API requests must include:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 4. **Token Verification Process**
```
1. Client sends request with token
2. Server extracts token from Authorization header
3. Server verifies token using JWT_SECRET
4. Server decodes token to get user ID
5. Server fetches user from database
6. Server checks user is active and belongs to tenant
7. Request proceeds with req.user populated
```

#### 5. **Token Storage (Frontend)**
```javascript
// Store token after login
localStorage.setItem('token', response.token);
localStorage.setItem('user', JSON.stringify(response.user));

// Retrieve token for requests
const token = localStorage.getItem('token');

// Clear token on logout
localStorage.removeItem('token');
localStorage.removeItem('user');
```

#### 6. **Automatic Token Attachment**
Your RTK Query setup automatically attaches tokens:
```javascript
// In client/src/store/store.js
const baseQuery = fetchBaseQuery({
  baseUrl: 'http://localhost:3001/api',
  prepareHeaders: (headers, { getState }) => {
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});
```

---

## 🎨 Frontend Integration

### Step 1: Update RTK Query API

Add English translation mutations to `client/src/store/store.js`:

```javascript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: 'http://localhost:3001/api',
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const api = createApi({
  baseQuery,
  tagTypes: ['Cars', 'Services', 'Blogs', 'Banners', 'WebsiteSettings'],
  endpoints: (builder) => ({

    // ===== CARS =====
    getCars: builder.query({
      query: (params) => ({ url: 'cars', params }),
      providesTags: ['Cars'],
    }),

    updateCarEnglish: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `cars/${id}/english`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Cars'],
    }),

    // ===== ADDITIONAL SERVICES =====
    getAdditionalServices: builder.query({
      query: (params) => ({ url: 'additional-services', params }),
      providesTags: ['Services'],
    }),

    updateServiceEnglish: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `additional-services/${id}/english`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Services'],
    }),

    // ===== BLOGS =====
    getBlogs: builder.query({
      query: (params) => ({ url: 'blogs', params }),
      providesTags: ['Blogs'],
    }),

    updateBlogEnglish: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `blogs/${id}/english`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Blogs'],
    }),

    // ===== WEBSITE SETTINGS =====
    getWebsiteSettings: builder.query({
      query: () => 'website/settings',
      providesTags: ['WebsiteSettings'],
    }),

    updateInfoBarEnglish: builder.mutation({
      query: (body) => ({
        url: 'website/settings/info-bar/english',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['WebsiteSettings'],
    }),

    updateModalEnglish: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `website/modals/${id}/english`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['WebsiteSettings'],
    }),

    // ===== BANNERS =====
    getBanners: builder.query({
      query: (params) => ({ url: 'banners', params }),
      providesTags: ['Banners'],
    }),

    updateBannerImageEnglish: builder.mutation({
      query: ({ bannerId, imageId, ...body }) => ({
        url: `banners/${bannerId}/images/${imageId}/english`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Banners'],
    }),
  }),
});

export const {
  useGetCarsQuery,
  useUpdateCarEnglishMutation,
  useGetAdditionalServicesQuery,
  useUpdateServiceEnglishMutation,
  useGetBlogsQuery,
  useUpdateBlogEnglishMutation,
  useGetWebsiteSettingsQuery,
  useUpdateInfoBarEnglishMutation,
  useUpdateModalEnglishMutation,
  useGetBannersQuery,
  useUpdateBannerImageEnglishMutation,
} = api;
```

---

## 📦 React Components

### 1. **Car English Translation Component**

Create `client/src/components/admin/CarEnglishTranslation.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Divider,
} from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';
import { useUpdateCarEnglishMutation } from '../../store/store';

const CarEnglishTranslation = ({ car, open, onClose }) => {
  const [descriptionEn, setDescriptionEn] = useState('');
  const [updateCarEnglish, { isLoading, isSuccess, isError, error }] =
    useUpdateCarEnglishMutation();

  useEffect(() => {
    if (car) {
      setDescriptionEn(car.descriptionEn || '');
    }
  }, [car]);

  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  }, [isSuccess, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!car) return;

    try {
      await updateCarEnglish({
        id: car._id,
        descriptionEn,
      }).unwrap();
    } catch (err) {
      console.error('Failed to update translation:', err);
    }
  };

  if (!car) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <LanguageIcon color="primary" />
          <Typography variant="h6">
            English Translation - {car.brand} {car.model}
          </Typography>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {isSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              English translation updated successfully!
            </Alert>
          )}

          {isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error?.data?.message || 'Failed to update translation'}
            </Alert>
          )}

          {/* Show Slovak version for reference */}
          <Box mb={3}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Slovak Description (Original)
            </Typography>
            <Box
              p={2}
              bgcolor="grey.100"
              borderRadius={1}
              maxHeight={150}
              overflow="auto"
            >
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {car.description || 'No description available'}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* English translation field */}
          <TextField
            fullWidth
            multiline
            rows={6}
            label="English Description"
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            placeholder="Enter English translation..."
            helperText={`${descriptionEn.length}/1000 characters`}
            inputProps={{ maxLength: 1000 }}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading && <CircularProgress size={20} />}
          >
            {isLoading ? 'Saving...' : 'Save Translation'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CarEnglishTranslation;
```

### 2. **Additional Service English Translation Component**

Create `client/src/components/admin/ServiceEnglishTranslation.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Divider,
  Grid,
} from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';
import { useUpdateServiceEnglishMutation } from '../../store/store';

const ServiceEnglishTranslation = ({ service, open, onClose }) => {
  const [nameEn, setNameEn] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [updateServiceEnglish, { isLoading, isSuccess, isError, error }] =
    useUpdateServiceEnglishMutation();

  useEffect(() => {
    if (service) {
      setNameEn(service.nameEn || '');
      setDescriptionEn(service.descriptionEn || '');
    }
  }, [service]);

  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  }, [isSuccess, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!service) return;

    try {
      await updateServiceEnglish({
        id: service._id,
        nameEn,
        descriptionEn,
      }).unwrap();
    } catch (err) {
      console.error('Failed to update translation:', err);
    }
  };

  if (!service) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <LanguageIcon color="primary" />
          <Typography variant="h6">
            English Translation - {service.name}
          </Typography>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {isSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              English translation updated successfully!
            </Alert>
          )}

          {isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error?.data?.message || 'Failed to update translation'}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Slovak version for reference */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Slovak Version (Original)
              </Typography>
              <Box p={2} bgcolor="grey.100" borderRadius={1}>
                <Typography variant="body2" fontWeight="bold">
                  {service.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  {service.description}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* English translations */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="English Name"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Enter English name..."
                helperText={`${nameEn.length}/100 characters`}
                inputProps={{ maxLength: 100 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="English Description"
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                placeholder="Enter English description..."
                helperText={`${descriptionEn.length}/500 characters`}
                inputProps={{ maxLength: 500 }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading && <CircularProgress size={20} />}
          >
            {isLoading ? 'Saving...' : 'Save Translation'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ServiceEnglishTranslation;
```

### 3. **Blog English Translation Component**

Create `client/src/components/admin/BlogEnglishTranslation.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Divider,
  Grid,
  Tabs,
  Tab,
} from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';
import { useUpdateBlogEnglishMutation } from '../../store/store';

const BlogEnglishTranslation = ({ blog, open, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [titleEn, setTitleEn] = useState('');
  const [slugEn, setSlugEn] = useState('');
  const [excerptEn, setExcerptEn] = useState('');
  const [contentEn, setContentEn] = useState('');

  const [updateBlogEnglish, { isLoading, isSuccess, isError, error }] =
    useUpdateBlogEnglishMutation();

  useEffect(() => {
    if (blog) {
      setTitleEn(blog.titleEn || '');
      setSlugEn(blog.slugEn || '');
      setExcerptEn(blog.excerptEn || '');
      setContentEn(blog.contentEn || '');
    }
  }, [blog]);

  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  }, [isSuccess, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!blog) return;

    try {
      await updateBlogEnglish({
        id: blog._id,
        titleEn,
        slugEn,
        excerptEn,
        contentEn,
      }).unwrap();
    } catch (err) {
      console.error('Failed to update translation:', err);
    }
  };

  if (!blog) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <LanguageIcon color="primary" />
          <Typography variant="h6">
            English Translation - {blog.title}
          </Typography>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {isSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              English translation updated successfully!
            </Alert>
          )}

          {isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error?.data?.message || 'Failed to update translation'}
            </Alert>
          )}

          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
            <Tab label="Basic Info" />
            <Tab label="Content" />
          </Tabs>

          {activeTab === 0 && (
            <Grid container spacing={3}>
              {/* Slovak version */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Slovak Version (Original)
                </Typography>
                <Box p={2} bgcolor="grey.100" borderRadius={1}>
                  <Typography variant="h6">{blog.title}</Typography>
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    Slug: {blog.slug}
                  </Typography>
                  <Typography variant="body2" mt={1}>
                    {blog.excerpt}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* English fields */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="English Title"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder="Enter English title..."
                  helperText={`${titleEn.length}/200 characters`}
                  inputProps={{ maxLength: 200 }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="English Slug (URL)"
                  value={slugEn}
                  onChange={(e) => setSlugEn(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="english-url-slug"
                  helperText="Lowercase letters, numbers, and hyphens only"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="English Excerpt"
                  value={excerptEn}
                  onChange={(e) => setExcerptEn(e.target.value)}
                  placeholder="Enter English excerpt..."
                  helperText={`${excerptEn.length}/500 characters`}
                  inputProps={{ maxLength: 500 }}
                />
              </Grid>
            </Grid>
          )}

          {activeTab === 1 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                English Content
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={15}
                value={contentEn}
                onChange={(e) => setContentEn(e.target.value)}
                placeholder="Enter full English blog content..."
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading && <CircularProgress size={20} />}
          >
            {isLoading ? 'Saving...' : 'Save Translation'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default BlogEnglishTranslation;
```

### 4. **Adding Translation Buttons to Existing Admin Pages**

#### Example: Cars List Page

```jsx
import React, { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';
import CarEnglishTranslation from './CarEnglishTranslation';
import { useGetCarsQuery } from '../../store/store';

const CarsPage = () => {
  const { data: cars } = useGetCarsQuery();
  const [translationDialog, setTranslationDialog] = useState({ open: false, car: null });

  return (
    <div>
      <h1>Cars Management</h1>

      {/* Cars table */}
      <table>
        <thead>
          <tr>
            <th>Brand</th>
            <th>Model</th>
            <th>Category</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {cars?.data?.map((car) => (
            <tr key={car._id}>
              <td>{car.brand}</td>
              <td>{car.model}</td>
              <td>{car.category}</td>
              <td>
                {/* Translation button */}
                <Tooltip title="English Translation">
                  <IconButton
                    color="primary"
                    onClick={() => setTranslationDialog({ open: true, car })}
                  >
                    <LanguageIcon />
                  </IconButton>
                </Tooltip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Translation dialog */}
      <CarEnglishTranslation
        car={translationDialog.car}
        open={translationDialog.open}
        onClose={() => setTranslationDialog({ open: false, car: null })}
      />
    </div>
  );
};

export default CarsPage;
```

---

## 🎯 Usage Examples

### Example 1: Update Car Description Translation

```javascript
import { useUpdateCarEnglishMutation } from './store/store';

function MyComponent() {
  const [updateCarEnglish] = useUpdateCarEnglishMutation();

  const handleUpdate = async (carId) => {
    try {
      const result = await updateCarEnglish({
        id: carId,
        descriptionEn: 'Spacious family SUV with modern features'
      }).unwrap();

      console.log('Success:', result);
    } catch (error) {
      console.error('Error:', error);
    }
  };
}
```

### Example 2: Display Translated Content Based on Language

```javascript
import { useLanguage } from '../contexts/LanguageContext';

function CarCard({ car }) {
  const { language } = useLanguage(); // 'SK' or 'EN'

  const getDescription = () => {
    if (language === 'EN' && car.descriptionEn) {
      return car.descriptionEn;
    }
    return car.description;
  };

  return (
    <div>
      <h3>{car.brand} {car.model}</h3>
      <p>{getDescription()}</p>
    </div>
  );
}
```

### Example 3: Batch Update Multiple Services

```javascript
import { useUpdateServiceEnglishMutation } from './store/store';

function BulkTranslate() {
  const [updateServiceEnglish] = useUpdateServiceEnglishMutation();

  const translations = [
    { id: '123', nameEn: 'GPS Navigation', descriptionEn: 'Premium GPS...' },
    { id: '456', nameEn: 'Child Seat', descriptionEn: 'Safety-tested...' },
  ];

  const handleBulkUpdate = async () => {
    for (const item of translations) {
      await updateServiceEnglish(item).unwrap();
    }
    console.log('All translations updated!');
  };
}
```

---

## 🔑 Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    1. User Login                            │
│  POST /api/auth/login                                       │
│  { email, password }                                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                2. Server Validates                          │
│  - Checks credentials                                       │
│  - Generates JWT token                                      │
│  - Signs with JWT_SECRET                                    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│         3. Client Receives Token                            │
│  localStorage.setItem('token', token)                       │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│      4. Subsequent Requests Include Token                   │
│  Authorization: Bearer {token}                              │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│           5. Server Validates Token                         │
│  - Verifies signature                                       │
│  - Checks expiration                                        │
│  - Loads user from database                                 │
│  - Validates tenant access                                  │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│              6. Request Processed                           │
│  req.user = { id, email, role, tenantId }                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Quick Start Checklist

### Backend (Already Done ✅)
- [x] Added English fields to models
- [x] Created translation endpoints
- [x] Added routes
- [x] JWT authentication configured

### Frontend (To Do)
- [ ] Update RTK Query with translation mutations
- [ ] Create translation components
- [ ] Add translation buttons to admin pages
- [ ] Test with nitra-car@nitra-car.sk user

---

## 🚀 Deployment Notes

1. **Environment Variables**
   - Ensure `JWT_SECRET` is set in production
   - Use strong, random secret (min 32 characters)

2. **CORS Configuration**
   - Allow your frontend domain
   - Include `Authorization` header in allowed headers

3. **Token Expiration**
   - Consider implementing refresh tokens for better security
   - Current tokens don't expire by default (add expiration in production)

---

## 📞 Support

For questions about this system:
- **Backend**: Check `server/controllers/*Controller.js` files
- **Routes**: Check `server/routes/*.js` files
- **Models**: Check `server/models/*.js` files
- **Auth**: Check `server/middleware/authMiddleware.js`

---

**Built with ❤️ for NitraCar Multi-language Support**
