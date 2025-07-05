# API Documentation

## Additional Services API

### Authentication Required Endpoints

#### Get All Additional Services
- **URL:** `/api/additional-services`
- **Method:** GET
- **Auth Required:** Yes
- **Description:** Get all additional services for the authenticated tenant
- **Query Parameters:**
  - `category` (optional): Filter by category (driving_comfort, insurance_assistance, time_services, delivery_pickup, family_accessories, specialized)
  - `isActive` (optional): Filter by active status (true/false)
  - `vehicleCategory` (optional): Filter by vehicle category compatibility
  - `page` (optional): Page number for pagination
  - `limit` (optional): Number of items per page
  - `sort` (optional): Sort field and direction (e.g., "name", "-sortOrder")

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "service_id",
      "name": "Bez obmedzenia kilometrov",
      "description": "Možnosť jazdiť bez obmedzenia počtu najazdených kilometrov",
      "category": "driving_comfort",
      "pricing": {
        "type": "per_day",
        "amount": 15.00,
        "currency": "EUR"
      },
      "availability": {
        "isGlobal": true,
        "vehicleCategories": [],
        "excludedVehicles": [],
        "seasonal": {
          "isActive": false,
          "startMonth": 1,
          "endMonth": 12
        }
      },
      "behavior": {
        "isAutoSelected": false,
        "isRequired": false,
        "requiresApproval": false,
        "maxQuantity": 1,
        "dependsOn": []
      },
      "dynamicPricing": {
        "isEnabled": false,
        "basePrice": 0,
        "pricePerKm": 0,
        "minimumPrice": 0,
        "maximumPrice": 0,
        "useGoogleMapsAPI": false
      },
      "color": "#4caf50",
      "icon": "directions_car",
      "image": {
        "url": "https://example.com/image.jpg",
        "publicId": "services/image_id"
      },
      "isActive": true,
      "isPublic": true,
      "sortOrder": 1,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "pages": 2
  }
}
```

#### Get Single Additional Service
- **URL:** `/api/additional-services/:id`
- **Method:** GET
- **Auth Required:** Yes
- **Description:** Get a specific additional service by ID

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "service_id",
    "name": "Bez obmedzenia kilometrov",
    // ... full service object
  }
}
```

#### Create Additional Service
- **URL:** `/api/additional-services`
- **Method:** POST
- **Auth Required:** Yes (Admin)
- **Content-Type:** multipart/form-data
- **Description:** Create a new additional service

**Request Body:**
```json
{
  "name": "Bez obmedzenia kilometrov",
  "description": "Možnosť jazdiť bez obmedzenia počtu najazdených kilometrov",
  "category": "driving_comfort",
  "pricing": {
    "type": "per_day",
    "amount": 15.00,
    "currency": "EUR"
  },
  "availability": {
    "isGlobal": true,
    "vehicleCategories": [],
    "excludedVehicles": [],
    "seasonal": {
      "isActive": false,
      "startMonth": 1,
      "endMonth": 12
    }
  },
  "behavior": {
    "isAutoSelected": false,
    "isRequired": false,
    "requiresApproval": false,
    "maxQuantity": 1,
    "dependsOn": []
  },
  "dynamicPricing": {
    "isEnabled": false,
    "basePrice": 0,
    "pricePerKm": 0,
    "minimumPrice": 0,
    "maximumPrice": 0,
    "useGoogleMapsAPI": false
  },
  "color": "#4caf50",
  "icon": "directions_car",
  "isActive": true,
  "isPublic": true,
  "sortOrder": 1,
  "image": "file_upload" // Optional image file
}
```

#### Update Additional Service
- **URL:** `/api/additional-services/:id`
- **Method:** PUT
- **Auth Required:** Yes (Admin)
- **Content-Type:** multipart/form-data
- **Description:** Update an existing additional service

#### Delete Additional Service
- **URL:** `/api/additional-services/:id`
- **Method:** DELETE
- **Auth Required:** Yes (Admin)
- **Description:** Delete an additional service

#### Get Services by Category
- **URL:** `/api/additional-services/category/:category`
- **Method:** GET
- **Auth Required:** Yes
- **Description:** Get services filtered by category

#### Update Sort Order
- **URL:** `/api/additional-services/sort-order`
- **Method:** PUT
- **Auth Required:** Yes (Admin)
- **Description:** Update the sort order of services

**Request Body:**
```json
{
  "services": [
    {
      "id": "service_id_1",
      "sortOrder": 1
    },
    {
      "id": "service_id_2",
      "sortOrder": 2
    }
  ]
}
```

### Public Endpoints (No Authentication Required)

#### Get Public Services
- **URL:** `/api/public/services`
- **Method:** GET
- **Auth Required:** No
- **Description:** Get all public additional services for display on website

**Query Parameters:**
- `category` (optional): Filter by category
- `vehicleCategory` (optional): Filter by vehicle category compatibility

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "service_id",
      "name": "Bez obmedzenia kilometrov",
      "description": "Možnosť jazdiť bez obmedzenia počtu najazdených kilometrov",
      "category": "driving_comfort",
      "pricing": {
        "type": "per_day",
        "amount": 15.00,
        "currency": "EUR"
      },
      "color": "#4caf50",
      "icon": "directions_car",
      "image": {
        "url": "https://example.com/image.jpg"
      },
      "sortOrder": 1
    }
  ]
}
```

#### Get Services for Vehicle
- **URL:** `/api/public/services/vehicle/:vehicleId`
- **Method:** GET
- **Auth Required:** No
- **Description:** Get services available for a specific vehicle

**Response:**
```json
{
  "success": true,
  "data": {
    "vehicle": {
      "_id": "vehicle_id",
      "brand": "BMW",
      "model": "X5",
      "category": "luxury"
    },
    "services": [
      {
        "_id": "service_id",
        "name": "Bez obmedzenia kilometrov",
        "description": "Možnosť jazdiť bez obmedzenia počtu najazdených kilometrov",
        "category": "driving_comfort",
        "pricing": {
          "type": "per_day",
          "amount": 15.00,
          "currency": "EUR"
        },
        "behavior": {
          "isAutoSelected": false,
          "isRequired": false,
          "maxQuantity": 1
        },
        "dynamicPricing": {
          "isEnabled": false
        },
        "color": "#4caf50",
        "icon": "directions_car",
        "image": {
          "url": "https://example.com/image.jpg"
        }
      }
    ]
  }
}
```

#### Calculate Service Price
- **URL:** `/api/public/services/calculate-price`
- **Method:** POST
- **Auth Required:** No
- **Description:** Calculate the price for services based on reservation details

**Request Body:**
```json
{
  "services": [
    {
      "serviceId": "service_id",
      "quantity": 1
    }
  ],
  "reservationDetails": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-07",
    "vehicleId": "vehicle_id",
    "pickupLocation": "Bratislava",
    "dropoffLocation": "Košice"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "serviceId": "service_id",
        "name": "Bez obmedzenia kilometrov",
        "quantity": 1,
        "unitPrice": 15.00,
        "totalPrice": 105.00,
        "calculation": {
          "type": "per_day",
          "days": 7,
          "basePrice": 15.00,
          "dynamicPrice": null
        }
      }
    ],
    "totalPrice": 105.00,
    "currency": "EUR"
  }
}
```

### Service Categories

- **driving_comfort**: Jazda a komfort
- **insurance_assistance**: Poistenie a asistencia
- **time_services**: Časové služby a prevzatie
- **delivery_pickup**: Pristavenie/vyzdvihnutie mimo strediska
- **family_accessories**: Rodina a doplnky
- **specialized**: Špecializované doplnky

### Pricing Types

- **fixed**: Pevná cena (jednorazový poplatok)
- **per_day**: Cena za deň
- **per_km**: Cena za kilometer
- **percentage**: Percentuálny poplatok zo základnej ceny

### Vehicle Categories

- **economy**: Ekonomická
- **compact**: Kompaktná
- **midsize**: Stredná
- **fullsize**: Veľká
- **luxury**: Luxusná
- **suv**: SUV
- **minivan**: Minivan
- **convertible**: Kabriolet
- **sports**: Športové
- **utility**: Úžitkové
- **caravan**: Obytné
- **motorcycle**: Motorka
- **electric**: Elektrické

### Error Responses

All endpoints can return the following error responses:

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Service name is required"
    }
  ]
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Insufficient permissions."
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Service not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

### Usage Examples

#### Frontend Integration - Display Services in "Naše služby" Section

```javascript
// Get all public services
const fetchPublicServices = async () => {
  const response = await fetch('/api/public/services');
  const data = await response.json();
  
  if (data.success) {
    return data.data;
  }
  throw new Error(data.message);
};

// Group services by category
const groupServicesByCategory = (services) => {
  return services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {});
};
```

#### Frontend Integration - Reservation Process

```javascript
// Get services for specific vehicle
const fetchServicesForVehicle = async (vehicleId) => {
  const response = await fetch(`/api/public/services/vehicle/${vehicleId}`);
  const data = await response.json();
  
  if (data.success) {
    return data.data.services;
  }
  throw new Error(data.message);
};

// Calculate service prices
const calculateServicePrices = async (services, reservationDetails) => {
  const response = await fetch('/api/public/services/calculate-price', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      services,
      reservationDetails
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    return data.data;
  }
  throw new Error(data.message);
};
```

#### Admin Integration - Service Management

```javascript
// Create new service
const createService = async (serviceData) => {
  const formData = new FormData();
  
  // Append all service fields
  Object.keys(serviceData).forEach(key => {
    if (key === 'image') {
      formData.append('image', serviceData[key]);
    } else if (typeof serviceData[key] === 'object') {
      formData.append(key, JSON.stringify(serviceData[key]));
    } else {
      formData.append(key, serviceData[key]);
    }
  });
  
  const response = await fetch('/api/additional-services', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: formData
  });
  
  const data = await response.json();
  
  if (data.success) {
    return data.data;
  }
  throw new Error(data.message);
};
```

This API provides comprehensive functionality for managing additional services in the CarFlow system, including:

1. **Admin Management**: Full CRUD operations for service management
2. **Public Access**: Services display for website visitors
3. **Reservation Integration**: Dynamic service selection and pricing
4. **Dynamic Pricing**: Google Maps API integration for distance-based pricing
5. **Vehicle Compatibility**: Category-based service filtering
6. **Seasonal Services**: Time-based service availability
7. **Image Management**: Service image upload and storage
8. **Tenant Separation**: Multi-tenant support with proper data isolation 