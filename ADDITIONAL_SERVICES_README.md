# Additional Services Feature - CarFlow

## Overview

The Additional Services feature allows administrators to manage and offer supplementary services to customers during the car rental process. Services are displayed in the "Naše služby" (Our Services) section of the website and can be selected during reservations as "doplnkové služby" (additional services).

## Features

### 🏗️ Service Management
- **Complete CRUD operations** for service management
- **Drag-and-drop sorting** for service ordering
- **Image upload** with 1:1 aspect ratio support
- **Color coding** for visual categorization
- **Category-based organization** with predefined service types

### 💰 Flexible Pricing
- **Multiple pricing types**: Fixed price, per day, per km, percentage
- **Dynamic pricing** with Google Maps API integration for distance-based services
- **Automatic price calculation** during reservation process
- **Currency support** (default: EUR)

### 🎯 Smart Availability
- **Global or category-specific** service availability
- **Vehicle category filtering** (economy, luxury, SUV, etc.)
- **Seasonal availability** (e.g., snow chains only in winter)
- **Individual vehicle exclusions** when needed

### ⚙️ Advanced Behavior
- **Auto-selection** for mandatory services
- **Required services** that cannot be deselected
- **Approval workflows** for special services
- **Quantity limits** per reservation
- **Service dependencies** between related services

### 🌍 Multi-tenant Support
- **Tenant isolation** for multi-company deployments
- **Role-based access control** (admin/staff permissions)
- **Audit logging** for all service operations

## Service Categories

### 🚗 Jazda a komfort (Driving & Comfort)
- Bez obmedzenia kilometrov (Unlimited kilometers)
- Druhý/ďalší vodič (Additional driver)
- Aktualizované mapy/navigácia (Updated maps/navigation)
- Domáce zvieratá povolené (Pets allowed)

### 🛡️ Poistenie a asistencia (Insurance & Assistance)
- Poistenie v cene (Insurance included - auto-selected)
- Náhradné vozidlo pri poruche (Replacement vehicle)
- Poistenie bez spoluúčasti (Zero deductible insurance)
- Cestovanie do zahraničia (International travel)

### ⏰ Časové služby (Time Services)
- Vyzdvihnutie mimo otváracích hodín (After-hours pickup)
- Odovzdanie mimo otváracích hodín (After-hours return)

### 🚚 Pristavenie/Vyzdvihnutie (Delivery/Pickup)
- Pristavenie vozidla mimo strediska (Vehicle delivery)
- Vyzdvihnutie vozidla mimo strediska (Vehicle pickup)
- **Dynamic pricing** based on distance using Google Maps API

### 👨‍👩‍👧‍👦 Rodina a doplnky (Family & Accessories)
- Detské sedačky (Child seats) - category-specific
- Strešné boxy (Roof boxes)
- Snehové reťaze (Snow chains) - seasonal availability

### 🔧 Špecializované (Specialized)
- Nájazdová rampa (Loading ramp) - utility vehicles only
- Rýchlonabíjanie (Fast charging) - electric vehicles only

## Installation & Setup

### 1. Dependencies Installation

#### Frontend Dependencies
```bash
cd client
npm install react-beautiful-dnd react-colorful
```

#### Backend Dependencies
```bash
cd server
npm install express-validator
```

### 2. Database Setup

Run the seed script to populate the database with default services:

```bash
cd server
node scripts/seedAdditionalServices.js
```

This will create all predefined services with proper categorization and pricing.

### 3. API Routes

The system automatically registers these routes:
- **Admin Routes**: `/api/additional-services/*` (authentication required)
- **Public Routes**: `/api/public/services/*` (no authentication)

### 4. Frontend Navigation

The "Doplnkové služby" menu item is automatically added to the left navigation panel.

## Usage

### 🔧 Administrator Usage

1. **Access the Admin Panel**
   - Navigate to "Doplnkové služby" in the left menu
   - View all services organized by category

2. **Create New Service**
   - Click "Pridať službu" (Add Service)
   - Fill in basic information (name, description, category)
   - Set pricing type and amount
   - Configure availability (global or category-specific)
   - Set behavior options (auto-select, required, approval needed)
   - Enable dynamic pricing if needed
   - Upload service image (optional)
   - Save the service

3. **Manage Existing Services**
   - Edit services by clicking the edit icon
   - Delete services with the delete icon
   - View service details with the view icon
   - Drag and drop to reorder services

4. **Category Management**
   - Filter services by category using the tabs
   - Services are color-coded by category
   - Each category has specific icons and colors

### 🌐 Public Website Integration

Services are automatically displayed in:

1. **"Naše služby" Section**
   - Only services marked as `isPublic: true` are shown
   - Services are grouped by category
   - Images and descriptions are displayed

2. **Reservation Process**
   - Services appear as "doplnkové služby" during booking
   - Price calculation is automatic
   - Vehicle compatibility is checked
   - Seasonal availability is enforced

### 📊 API Usage Examples

#### Get Public Services
```javascript
fetch('/api/public/services')
  .then(response => response.json())
  .then(data => console.log(data));
```

#### Get Services for Specific Vehicle
```javascript
fetch('/api/public/services/vehicle/VEHICLE_ID')
  .then(response => response.json())
  .then(data => console.log(data));
```

#### Calculate Service Prices
```javascript
fetch('/api/public/services/calculate-price', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    services: [{ serviceId: 'SERVICE_ID', quantity: 1 }],
    reservationDetails: {
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      vehicleId: 'VEHICLE_ID'
    }
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

## Technical Architecture

### 🗄️ Database Schema

```javascript
// AdditionalService Schema
{
  tenantId: ObjectId,          // Multi-tenant support
  name: String,                // Service name
  description: String,         // Service description
  category: String,            // Service category
  pricing: {                   // Pricing configuration
    type: String,              // fixed, per_day, per_km, percentage
    amount: Number,            // Base price
    currency: String           // Currency code
  },
  availability: {              // Availability rules
    isGlobal: Boolean,         // Available for all vehicles
    vehicleCategories: [String], // Specific categories only
    excludedVehicles: [ObjectId], // Vehicle exceptions
    seasonal: {                // Seasonal availability
      isActive: Boolean,
      startMonth: Number,
      endMonth: Number
    }
  },
  behavior: {                  // Service behavior
    isAutoSelected: Boolean,   // Auto-select on reservation
    isRequired: Boolean,       // Cannot be deselected
    requiresApproval: Boolean, // Needs admin approval
    maxQuantity: Number,       // Maximum quantity per reservation
    dependsOn: [ObjectId]      // Service dependencies
  },
  dynamicPricing: {            // Dynamic pricing for distance-based services
    isEnabled: Boolean,
    basePrice: Number,
    pricePerKm: Number,
    minimumPrice: Number,
    maximumPrice: Number,
    useGoogleMapsAPI: Boolean
  },
  image: {                     // Service image
    url: String,
    publicId: String,
    altText: String
  },
  color: String,               // Visual color coding
  icon: String,                // Material icon name
  isActive: Boolean,           // Service status
  isPublic: Boolean,           // Show in public sections
  sortOrder: Number,           // Display order
  createdBy: ObjectId,         // Creator user ID
  createdAt: Date,
  updatedAt: Date
}
```

### 🔄 API Endpoints

#### Admin Endpoints (Authentication Required)
- `GET /api/additional-services` - List all services
- `POST /api/additional-services` - Create new service
- `PUT /api/additional-services/:id` - Update service
- `DELETE /api/additional-services/:id` - Delete service
- `GET /api/additional-services/:id` - Get single service
- `GET /api/additional-services/category/:category` - Get services by category
- `PUT /api/additional-services/sort-order` - Update sort order

#### Public Endpoints (No Authentication)
- `GET /api/public/services` - Get public services
- `GET /api/public/services/vehicle/:vehicleId` - Get services for vehicle
- `POST /api/public/services/calculate-price` - Calculate service prices

### 🎨 Frontend Components

#### Main Components
- `AdditionalServices.jsx` - Main admin page
- `AdditionalServiceForm.jsx` - Service creation/editing form

#### Component Features
- **Drag & Drop**: Service reordering with react-beautiful-dnd
- **Color Picker**: Custom color selection with react-colorful
- **Image Upload**: Service image management
- **Tabbed Interface**: Multi-step form with validation
- **Real-time Validation**: Form validation with error messages

## Configuration

### Environment Variables

```bash
# Google Maps API (for dynamic pricing)
GOOGLE_MAPS_API_KEY=your_api_key_here

# Image Upload
MAX_IMAGE_SIZE=5242880  # 5MB
ALLOWED_IMAGE_TYPES=jpg,jpeg,png,webp

# Database
MONGODB_URI=mongodb://localhost:27017/rezervacny
```

### Default Service Categories

The system comes with predefined categories that match Slovak car rental industry standards:

1. **driving_comfort** - Jazda a komfort
2. **insurance_assistance** - Poistenie a asistencia
3. **time_services** - Časové služby
4. **delivery_pickup** - Pristavenie/Vyzdvihnutie
5. **family_accessories** - Rodina a doplnky
6. **specialized** - Špecializované

## Troubleshooting

### Common Issues

1. **Services not appearing in public API**
   - Check `isActive: true` and `isPublic: true`
   - Verify tenant ID matches

2. **Dynamic pricing not working**
   - Ensure Google Maps API key is configured
   - Check `dynamicPricing.isEnabled: true`

3. **Image upload failing**
   - Verify file size under 5MB
   - Check allowed file types
   - Ensure proper multipart/form-data headers

4. **Service not available for vehicle**
   - Check vehicle category matches service availability
   - Verify seasonal availability if applicable
   - Check excluded vehicles list

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=additional-services:*
```

## Future Enhancements

### Planned Features
- **Service Bundles**: Package multiple services together
- **Quantity Discounts**: Bulk pricing for multiple units
- **Time-based Pricing**: Different rates for different time periods
- **Geographic Restrictions**: Location-based service availability
- **Service Reviews**: Customer feedback system
- **Analytics Dashboard**: Service usage statistics

### API Improvements
- **GraphQL Support**: More flexible data querying
- **Webhook Integration**: Real-time service updates
- **Caching Layer**: Improved performance for public endpoints
- **Rate Limiting**: API usage protection

## Support

For technical support or feature requests:
1. Check the API documentation in `API_DOCUMENTATION.md`
2. Review the database schema and relationships
3. Test endpoints using the provided examples
4. Check server logs for detailed error messages

## License

This feature is part of the CarFlow car rental management system.

---

**Created by**: CarFlow Development Team  
**Last Updated**: 2024-01-01  
**Version**: 1.0.0 