# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Starting the Application
```bash
npm run dev          # Start both server and client in development mode
npm run server       # Start server only (runs on port 3001)
npm run client       # Start client only (runs on port 5173)
```

### Server Commands (from /server directory)
```bash
npm run dev          # Start with nodemon for auto-restart
npm start           # Start production server
```

### Client Commands (from /client directory)
```bash
npm run dev         # Start Vite dev server
npm run build       # Build for production
npm run preview     # Preview production build
```

### Installation
```bash
npm run install-all  # Install all dependencies (root, server, client)
```

### Testing and Demo Data
```bash
# From server directory
node setup-demo-data.js        # Create demo data for testing
node setup-tenant-separation.js # Setup tenant separation
```

## Architecture Overview

### Multi-Tenant Car Rental System
This is a comprehensive car rental management system with tenant separation, featuring:

- **Backend**: Node.js/Express API with MongoDB (via Mongoose)
- **Frontend**: React 18 with Vite, Material-UI, and Redux Toolkit
- **Authentication**: JWT-based with refresh tokens
- **File Storage**: Google Cloud Storage for car images and documents
- **Payment Processing**: Stripe-like payment simulation
- **PDF Generation**: Invoice and contract generation using pdf-lib and pdfkit

### Key Technologies
- **Server**: Express.js, MongoDB, JWT, Google Cloud Storage, Nodemailer
- **Client**: React, Material-UI, Redux Toolkit Query (RTK Query), React Router
- **Development**: Vite, Nodemon, Concurrently

### Project Structure
```
/server/             # Backend API
├── controllers/     # Route handlers
├── models/         # MongoDB models (Mongoose)
├── routes/         # API route definitions
├── middleware/     # Authentication, validation, file upload
├── services/       # Business logic (email, cloud storage, PDF)
├── config/         # Configuration files
└── server.js       # Entry point

/client/            # Frontend React app
├── src/
│   ├── components/ # Reusable UI components
│   ├── pages/      # Page components
│   ├── store/      # Redux store and RTK Query API
│   └── App.jsx     # Main app component
└── vite.config.js  # Vite configuration
```

## Core Business Models

### Primary Entities
- **User**: Admin/customer accounts with role-based access
- **Car**: Vehicle inventory with images and specifications
- **Reservation**: Booking management with status tracking
- **Payment**: Payment processing and invoice generation
- **Contract**: PDF contract generation and management
- **WebsiteSettings**: Configurable website content and modals
- **Banner**: Website banner management with image support
- **Blog**: Content management system
- **AdditionalService**: Extra services and equipment
- **DiscountCode**: Coupon/discount code management

### Tenant Separation
The system implements tenant separation where each admin user has their own isolated data. Users are associated with a tenant (typically the admin's email) and can only access data within their tenant scope.

## API Architecture

### Authentication Flow
1. Login via `/api/auth/login` returns JWT access token and refresh token
2. Protected routes require `Bearer {token}` in Authorization header
3. RTK Query automatically handles token attachment and cache invalidation

### State Management
- **Redux Toolkit** with **RTK Query** for API state management
- Optimistic updates and automatic cache invalidation
- Tenant-aware data fetching with proper isolation

### File Upload Strategy
- Car images and documents uploaded to Google Cloud Storage
- Multer middleware handles multipart/form-data
- Sharp library for image optimization
- Automatic cleanup of old images when updated

## Key Features

### Admin Panel Features
- Dashboard with real-time statistics
- Car inventory management with image uploads
- Reservation booking and management
- Customer management with blacklisting
- Payment processing and invoice generation
- Calendar view for reservations
- Contract generation (Slovak rental agreements)
- Website content management (banners, modals, blog)
- Discount code management

### Technical Features
- Multi-tenant architecture with data isolation
- Role-based access control (admin/customer)
- Real-time data updates via RTK Query
- Responsive Material-UI interface
- PDF generation for invoices and contracts
- Email notifications via Nodemailer
- File upload with Google Cloud Storage
- Rate limiting and security middleware

## Environment Setup

### Required Environment Variables (server/.env)
```
MONGODB_URI=mongodb://localhost:27017/car-rental-admin
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key
GCS_PROJECT_ID=your-google-cloud-project-id
GCS_BUCKET_NAME=your-storage-bucket-name
```

### Google Cloud Storage Setup
1. Create GCS bucket and service account
2. Download service account key as `server/google-cloud-key.json`
3. Set bucket permissions for public read access to images

## Development Workflow

### Adding New Features
1. Create Mongoose model in `/server/models/`
2. Add controller in `/server/controllers/`
3. Define routes in `/server/routes/`
4. Add RTK Query endpoints in `/client/src/store/store.js`
5. Create React components in `/client/src/components/` or `/client/src/pages/`
6. Update navigation in `/client/src/components/Layout.jsx`

### Database Operations
- Use Mongoose models with proper tenant filtering
- All queries should include tenant scope where applicable
- Use MongoDB ObjectId for references between collections

### File Upload Implementation
- Use FormData for file uploads in React
- Server handles multipart/form-data with Multer
- Images automatically uploaded to Google Cloud Storage
- Return public URLs for frontend consumption

## Common Patterns

### RTK Query Pattern
```javascript
// Define endpoint
getItems: builder.query({
  query: (params) => ({ url: 'items', params }),
  providesTags: ['Item'],
}),

// Use in component
const { data: items, isLoading } = useGetItemsQuery(params)
```

### Tenant-Aware Queries
```javascript
// Server-side controller
const items = await Item.find({ 
  tenantId: req.user.tenantId 
});

// Client-side - tenant context handled automatically via auth
```

### Error Handling
- Server uses centralized error handling middleware
- Client uses RTK Query error handling with user-friendly messages
- Validation errors returned with structured format

## Security Considerations

### Authentication
- JWT tokens with short expiration times
- Refresh token rotation
- Secure HTTP-only cookies for refresh tokens (when implemented)

### Data Protection
- Tenant isolation prevents cross-tenant data access
- Role-based access control
- Input validation and sanitization
- Rate limiting on API endpoints

### File Security
- Secure file upload handling
- Image optimization and validation
- Proper file type checking
- Cleanup of temporary files

## Deployment Notes

### Production Environment
- Set `NODE_ENV=production`
- Use proper MongoDB connection string
- Configure secure JWT secrets
- Set up Google Cloud Storage with production bucket
- Configure CORS for production domains

### Build Process
```bash
cd client && npm run build  # Build React app
cd server && npm start      # Start production server
```

The system is designed to be deployed on platforms like Render, Heroku, or similar PaaS providers with proper environment variable configuration.