# CarFlow Public API Documentation

## Overview
The CarFlow Public API provides public access to car rental data, banner content, and reservation functionality without requiring authentication. This API is designed for public-facing websites, mobile apps, and integration with third-party services.

**Base URL**: `https://carflow-reservation-system.onrender.com/api/public`

## 🚀 Recent Updates (July 2025)

✅ **All endpoints fully operational**
- Fixed legacy data migration issues that were causing 500 errors
- Resolved admin panel car loading problems
- Enhanced car form with improved user experience
- Added comprehensive equipment and badge system
- Improved mileage tracking and document validity features
- **NEW**: Added banner management system with position-based display

## Authentication
No authentication required for public endpoints.

## Response Format
All responses follow this standard format:
```json
{
  "success": true|false,
  "data": {}, // Response data
  "count": 0, // For list endpoints
  "pagination": {}, // For paginated endpoints
  "message": "Success/Error message"
}
```

## Public Car Endpoints

### 1. Get All Cars (Public)
**GET** `/cars`

Returns all publicly available cars without sensitive information.

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 25, max: 100)
- `category` (string): Filter by car category
- `fuelType` (string): Filter by fuel type
- `transmission` (string): Filter by transmission type
- `seats` (integer): Filter by number of seats
- `sort` (string): Sort by field (e.g., 'dailyRate', '-year')

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/cars?category=economy&limit=10"
```

**Enhanced Response Example:**
```json
{
  "success": true,
  "count": 5,
  "pagination": {
    "next": {
      "page": 2,
      "limit": 10
    }
  },
  "data": [
    {
      "_id": "car_id",
      "internalId": "AUTO_001",
      "brand": "Toyota",
      "model": "Corolla",
      "year": 2023,
      "color": "White",
      "category": "economy",
      "fuelType": "gasoline",
      "transmission": "automatic",
      "drivetrain": "front",
      "seats": 5,
      "doors": 4,
      "description": "Economical and reliable city car perfect for daily commutes and city driving...",
      "pricing": {
        "dailyRate": 25,
        "deposit": 300,
        "rates": {
          "1day": 25,
          "2-3days": 23,
          "4-10days": 21,
          "11-17days": 19,
          "18-24days": 17
        }
      },
      "engine": {
        "displacement": 1800,
        "power": 100,
        "torque": 170,
        "cylinders": 4
      },
      "fuelConsumption": {
        "city": 8.5,
        "highway": 6.2,
        "combined": 7.1,
        "co2Emissions": 145
      },
      "location": {
        "name": "Main Office",
        "address": {
          "street": "123 Main St",
          "city": "Bratislava",
          "zipCode": "12345",
          "country": "Slovakia"
        }
      },
      "features": ["air-conditioning", "gps", "bluetooth"],
      "equipment": [
        {
          "name": "Klimatizácia",
          "icon": "❄️",
          "category": "comfort",
          "description": "Automatic air conditioning system"
        },
        {
          "name": "GPS navigácia",
          "icon": "🗺️",
          "category": "navigation",
          "description": "Built-in GPS navigation system"
        },
        {
          "name": "Bluetooth",
          "icon": "📱",
          "category": "connectivity",
          "description": "Hands-free calling and audio streaming"
        }
      ],
      "images": [
        {
          "url": "https://storage.googleapis.com/car_rental_carflow/image_medium.jpg",
          "description": "Front view",
          "isPrimary": true,
          "urls": {
            "thumbnail": "https://storage.googleapis.com/car_rental_carflow/image_thumb.jpg",
            "medium": "https://storage.googleapis.com/car_rental_carflow/image_medium.jpg",
            "large": "https://storage.googleapis.com/car_rental_carflow/image_large.jpg"
          }
        }
      ],
      "badges": [
        {
          "text": "NOVINKA",
          "type": "corner",
          "style": {
            "backgroundColor": "#4caf50",
            "textColor": "#ffffff",
            "position": "top-right"
          },
          "isActive": true
        },
        {
          "text": "ECO",
          "type": "pill",
          "style": {
            "backgroundColor": "#8bc34a",
            "textColor": "#ffffff"
          },
          "isActive": true
        }
      ],
      "status": "active",
      "isActive": true
    }
  ]
}
```

### 2. Get Single Car (Public)
**GET** `/cars/:id`

Returns detailed information about a specific car.

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/cars/car_id_here"
```

## Public Banner Endpoints

### 3. Get Banners by Position
**GET** `/banners/position/:position`

Returns all active banners for a specific website position.

**Headers:**
- `x-tenant-id` (string, required): Tenant ID to filter banners

**Position Options:**
- `homepage-hero` - Main banner on homepage
- `homepage-section` - Section banner on homepage
- `cars-hero` - Main banner on cars page
- `cars-section` - Section banner on cars page
- `contact-hero` - Main banner on contact page
- `contact-section` - Section banner on contact page
- `about-hero` - Main banner on about page
- `about-section` - Section banner on about page
- `header` - Header banner
- `footer` - Footer banner

**Example Request:**
```bash
curl -H "x-tenant-id: tenant_id_here" \
     "https://carflow-reservation-system.onrender.com/api/banners/position/homepage-hero"
```

**Example Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "banner_id_1",
      "image": {
        "url": "https://storage.googleapis.com/car_rental_carflow/banner_medium.jpg",
        "filename": "banner_filename.jpg",
        "alt": "Banner image for homepage-hero",
        "uploadDate": "2024-01-15T10:30:00.000Z"
      },
      "position": "homepage-hero",
      "isActive": true,
      "sortOrder": 0,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "banner_id_2",
      "image": {
        "url": "https://storage.googleapis.com/car_rental_carflow/banner2_medium.jpg",
        "filename": "banner2_filename.jpg",
        "alt": "Banner image for homepage-hero",
        "uploadDate": "2024-01-16T14:20:00.000Z"
      },
      "position": "homepage-hero",
      "isActive": true,
      "sortOrder": 1,
      "createdAt": "2024-01-16T14:20:00.000Z"
    }
  ]
}
```

### 4. Get All Active Banners
**GET** `/banners/active`

Returns all active banners for a tenant, grouped by position.

**Headers:**
- `x-tenant-id` (string, required): Tenant ID to filter banners

**Example Request:**
```bash
curl -H "x-tenant-id: tenant_id_here" \
     "https://carflow-reservation-system.onrender.com/api/banners/active"
```

**Example Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "banner_id_1",
      "image": {
        "url": "https://storage.googleapis.com/car_rental_carflow/banner_medium.jpg",
        "filename": "banner_filename.jpg",
        "alt": "Banner image for homepage-hero",
        "uploadDate": "2024-01-15T10:30:00.000Z"
      },
      "position": "homepage-hero",
      "isActive": true,
      "sortOrder": 0,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "banner_id_2",
      "image": {
        "url": "https://storage.googleapis.com/car_rental_carflow/banner2_medium.jpg",
        "filename": "banner2_filename.jpg",
        "alt": "Banner image for cars-hero",
        "uploadDate": "2024-01-16T14:20:00.000Z"
      },
      "position": "cars-hero",
      "isActive": true,
      "sortOrder": 0,
      "createdAt": "2024-01-16T14:20:00.000Z"
    }
  ]
}
```

### Banner Implementation Example

**Frontend Integration:**
```javascript
// Fetch banners for homepage hero section
const fetchHomepageBanners = async () => {
  try {
    const response = await fetch('/api/banners/position/homepage-hero', {
      headers: {
        'x-tenant-id': 'your-tenant-id'
      }
    });
    const data = await response.json();
    
    if (data.success) {
      return data.data; // Array of banner objects
    }
  } catch (error) {
    console.error('Failed to fetch banners:', error);
  }
};

// React component example
const HeroBanner = () => {
  const [banners, setBanners] = useState([]);
  
  useEffect(() => {
    fetchHomepageBanners().then(setBanners);
  }, []);
  
  return (
    <div className="hero-section">
      {banners.map((banner) => (
        <img 
          key={banner._id}
          src={banner.image.url}
          alt={banner.image.alt}
          className="hero-banner"
        />
      ))}
    </div>
  );
};
```

## Public Additional Services Endpoints

### 5. Get Public Additional Services
**GET** `/services`

Returns all public additional services for the "Naše služby" (Our Services) section.

**Query Parameters:**
- `tenantId` (string, required): Tenant ID to filter services

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/services?tenantId=tenant_id_here"
```

**Example Response:**
```json
{
  "success": true,
  "count": 17,
  "data": [
    {
      "_id": "service_id",
      "name": "Neobmedzené kilometre",
      "description": "Jazdite bez obmedzení počtu kilometrov",
      "category": "JAZDA A KOMFORT",
      "color": "#4CAF50",
      "image": {
        "url": "https://storage.googleapis.com/car_rental_carflow/service_image.jpg",
        "filename": "service_image.jpg"
      },
      "pricing": {
        "type": "fixed",
        "amount": 15,
        "currency": "EUR",
        "unit": "per_day"
      },
      "availability": {
        "isGlobal": true,
        "vehicleCategories": ["economy", "compact", "midsize"],
        "excludeVehicles": []
      },
      "behavior": {
        "isAutoSelected": false,
        "isRequired": false,
        "requiresQuantity": false,
        "maxQuantity": 1
      },
      "isActive": true,
      "isPublic": true,
      "sortOrder": 1
    }
  ]
}
```

### 15. Get Services for Vehicle
**GET** `/services/vehicle/:vehicleId`

Returns additional services available for a specific vehicle.

**Parameters:**
- `vehicleId` (string): ID of the vehicle

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/services/vehicle/vehicle_id_here"
```

**Example Response:**
```json
{
  "success": true,
  "count": 12,
  "vehicle": {
    "id": "vehicle_id",
    "brand": "Toyota",
    "model": "Corolla",
    "category": "economy"
  },
  "data": [
    {
      "_id": "service_id",
      "name": "Detské sedačky",
      "description": "Bezpečné detské sedačky pre rôzne vekové kategórie",
      "category": "RODINA A DOPLNKY",
      "pricing": {
        "type": "fixed",
        "amount": 8,
        "currency": "EUR",
        "unit": "per_day"
      },
      "behavior": {
        "requiresQuantity": true,
        "maxQuantity": 3
      },
      "isAvailableForVehicle": true
    }
  ]
}
```

### 16. Calculate Service Price
**POST** `/services/calculate-price`

Calculate the price for a specific additional service based on parameters.

**Request Body:**
```json
{
  "serviceId": "service_id_here",
  "quantity": 2,
  "days": 5,
  "distance": 150,
  "basePrice": 125
}
```

**Example Request:**
```bash
curl -X POST "https://carflow-reservation-system.onrender.com/api/public/services/calculate-price" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "service_id_here",
    "quantity": 2,
    "days": 5,
    "distance": 150,
    "basePrice": 125
  }'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "serviceId": "service_id",
    "serviceName": "Pristavenie/Vyzdvihnutie vozidla",
    "parameters": {
      "quantity": 1,
      "days": 5,
      "distance": 150,
      "basePrice": 125
    },
    "calculatedPrice": 75.00,
    "currency": "EUR"
  }
}
```

### 17. Get Services by User/Tenant
**GET** `/users/:email/services`

Returns additional services for a specific rental company identified by user email.

**Parameters:**
- `email` (string): Email of a user from the target tenant

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/services"
```

### 18. Get Services for Vehicle by User/Tenant
**GET** `/users/:email/services/vehicle/:vehicleId`

Returns additional services available for a specific vehicle within a tenant.

**Parameters:**
- `email` (string): Email of a user from the target tenant
- `vehicleId` (string): ID of the vehicle

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/services/vehicle/vehicle_id_here"
```

### 19. Calculate Service Price by User/Tenant
**POST** `/users/:email/services/calculate-price`

Calculate the price for a specific additional service based on parameters for a specific tenant.

**Parameters:**
- `email` (string): Email of a user from the target tenant

**Request Body:**
```json
{
  "serviceId": "service_id_here",
  "quantity": 2,
  "days": 5,
  "distance": 150,
  "basePrice": 125
}
```

**Example Request:**
```bash
curl -X POST "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/services/calculate-price" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "service_id_here",
    "quantity": 2,
    "days": 5,
    "distance": 150,
    "basePrice": 125
  }'
```

## Additional Services Categories

| Category | Description |
|----------|-------------|
| `JAZDA A KOMFORT` | Driving comfort services (unlimited km, additional drivers, etc.) |
| `POISTENIE A ASISTENCIA` | Insurance and assistance services |
| `ČASOVÉ SLUŽBY` | Time-based services (after-hours pickup/return) |
| `PRISTAVENIE/VYZDVIHNUTIE` | Vehicle delivery and pickup services |
| `RODINA A DOPLNKY` | Family and accessory services (child seats, etc.) |
| `ŠPECIALIZOVANÉ` | Specialized services (loading ramps, fast charging) |

## Service Pricing Types

| Type | Description |
|------|-------------|
| `fixed` | Fixed price per service |
| `per_day` | Price multiplied by rental days |
| `per_km` | Price multiplied by distance |
| `percentage` | Percentage of base rental price |

## Tenant-Specific Endpoints

For multi-tenant setups, use these endpoints to get data for a specific rental company:

### 3. Get Cars by User/Tenant
**GET** `/users/:email/cars`

Returns cars for a specific rental company identified by user email.

**Parameters:**
- `email` (string): Email of a user from the target tenant

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars"
```

### 4. Get Single Car by User/Tenant
**GET** `/users/:email/cars/:carId`

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars/car_id"
```

### 5. Check Car Availability
**GET** `/users/:email/cars/:carId/availability`

Check if a car is available for specific dates.

**Query Parameters:**
- `startDate` (ISO date): Check availability from this date
- `endDate` (ISO date): Check availability until this date

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars/car_id/availability?startDate=2025-07-01&endDate=2025-07-05"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "isAvailable": true,
    "status": "available",
    "isAvailableForDates": true,
    "conflictingReservations": 0
  }
}
```

### 6. Get Cars by Category
**GET** `/users/:email/cars/category/:category`

**Available Categories:**
- economy, compact, midsize, fullsize, luxury
- suv, minivan, utility, caravan, motorcycle
- sports, electric

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars/category/economy"
```

### 7. Get Available Features
**GET** `/users/:email/features`

Returns all unique features available across cars for a tenant.

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/features"
```

**Example Response:**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "name": "air-conditioning",
      "displayName": "Klimatizácia",
      "icon": "❄️",
      "category": "comfort"
    },
    {
      "name": "gps",
      "displayName": "GPS navigácia", 
      "icon": "🗺️",
      "category": "navigation"
    }
  ]
}
```

## Reservation Endpoints

### 8. Create Public Reservation
**POST** `/reservations`

Create a reservation and automatically create customer account if needed.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "customer@example.com",
  "phone": "+421901234567",
  "dateOfBirth": "1990-01-01",
  "address": {
    "street": "123 Customer St",
    "city": "Bratislava",
    "zipCode": "12345",
    "country": "Slovakia"
  },
  "licenseNumber": "SK123456789",
  "licenseExpiry": "2030-01-01",
  "carId": "car_id_here",
  "startDate": "2025-07-01T10:00:00.000Z",
  "endDate": "2025-07-05T10:00:00.000Z",
  "pickupLocation": {
    "name": "Main Office",
    "address": {
      "street": "123 Main St",
      "city": "Bratislava"
    }
  },
  "additionalDrivers": [],
  "specialRequests": "Baby seat needed"
}
```

### 9. Create Tenant-Specific Reservation
**POST** `/users/:email/reservations`

Same as above but for a specific tenant. Supports discount codes.

**Parameters:**
- `email` (string, required): User's email to identify tenant

**Additional Fields:**
- `discountCode` (string): Optional discount code

**Example Request:**
```bash
curl -X POST "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/reservations" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "customer@example.com",
    "phone": "+421901234567",
    "carId": "car_id_here",
    "startDate": "2025-07-01T10:00:00.000Z",
    "endDate": "2025-07-05T10:00:00.000Z",
    "discountCode": "SUMMER2024"
  }'
```

## Website Settings Endpoints

### 10. Get Website Settings
**GET** `/users/:email/website-settings`

Returns public website settings for a tenant including branding, contact info, and configuration.

**Parameters:**
- `email` (string, required): User's email to identify tenant

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/website-settings"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "_id": "settings_id",
    "branding": {
      "companyName": "Rival Car Rental",
      "logo": {
        "url": "https://storage.googleapis.com/bucket/logo.png",
        "alt": "Company Logo"
      },
      "favicon": {
        "url": "https://storage.googleapis.com/bucket/favicon.ico"
      },
      "colors": {
        "primary": "#1976D2",
        "secondary": "#FFC107",
        "accent": "#4CAF50"
      }
    },
    "contact": {
      "phone": "+421901234567",
      "email": "info@rival.sk",
      "address": {
        "street": "Hlavná 123",
        "city": "Bratislava",
        "zipCode": "12345",
        "country": "Slovensko"
      },
      "workingHours": {
        "monday": "8:00-18:00",
        "tuesday": "8:00-18:00",
        "wednesday": "8:00-18:00",
        "thursday": "8:00-18:00",
        "friday": "8:00-18:00",
        "saturday": "9:00-15:00",
        "sunday": "Zatvorené"
      }
    },
    "features": {
      "onlineReservation": true,
      "paymentGateway": true,
      "multiLanguage": ["sk", "en"],
      "currency": "EUR"
    },
    "seo": {
      "title": "Rival Car Rental - Prenájom áut",
      "description": "Profesionálny prenájom vozidiel v Bratislave",
      "keywords": ["prenájom áut", "car rental", "Bratislava"]
    }
  }
}
```

### 11. Get Info Bar
**GET** `/users/:email/info-bar`

Returns active info bar configuration for displaying promotional messages.

**Parameters:**
- `email` (string, required): User's email to identify tenant

**Query Parameters:**
- `page` (string, optional): Current page (homepage, pricing, all-pages)

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/info-bar?page=homepage"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "_id": "infobar_id",
    "isActive": true,
    "message": "🎉 Letná akcia! Zľava 20% na všetky rezervácie do 31.8.2024",
    "link": {
      "url": "https://rival.carflow.sk/akcie",
      "text": "Viac informácií",
      "isEnabled": true
    },
    "styling": {
      "backgroundColor": "#4CAF50",
      "textColor": "#FFFFFF",
      "fontSize": "14px",
      "position": "top"
    },
    "schedule": {
      "startDate": "2024-06-01T00:00:00Z",
      "endDate": "2024-08-31T23:59:59Z",
      "isScheduled": true
    }
  }
}
```

### 12. Get Modal/Popup
**GET** `/users/:email/modal`

Returns active modal/popup configuration for displaying promotional popups.

**Parameters:**
- `email` (string, required): User's email to identify tenant

**Query Parameters:**
- `page` (string, optional): Current page context

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/modal?page=homepage"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "_id": "modal_id",
    "isActive": true,
    "title": "Vítajte v Rival Car Rental!",
    "content": "Získajte 15% zľavu na vašu prvú rezerváciu. Použite kód: WELCOME15",
    "image": {
      "url": "https://storage.googleapis.com/bucket/welcome_modal.jpg",
      "alt": "Welcome modal image"
    },
    "button": {
      "text": "Rezervovať teraz",
      "url": "https://rival.carflow.sk/rezervacia",
      "style": "primary"
    },
    "settings": {
      "showDelay": 3000,
      "autoClose": false,
      "showOnce": true,
      "cookieExpiry": 7
    },
    "styling": {
      "backgroundColor": "#FFFFFF",
      "textColor": "#333333",
      "borderRadius": "8px",
      "overlay": {
        "backgroundColor": "#000000",
        "opacity": 0.7
      }
    }
  }
}
```

### 13. Newsletter Subscription
**POST** `/users/:email/newsletter`

Subscribe to newsletter for a specific tenant.

**Parameters:**
- `email` (string, required): User's email to identify tenant

**Request Body:**
```json
{
  "subscriberEmail": "subscriber@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Example Request:**
```bash
curl -X POST "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/newsletter" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriberEmail": "subscriber@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Successfully subscribed to newsletter",
  "data": {
    "email": "subscriber@example.com",
    "subscribedAt": "2024-07-15T10:30:00Z"
  }
}
```

## Complete Integration Example for rival@test.sk

Here's a complete example showing how to integrate all endpoints for the rival@test.sk tenant:

```javascript
const API_BASE = 'https://carflow-reservation-system.onrender.com/api/public';
const USER_EMAIL = 'rival@test.sk';

// 1. Get website settings and branding
const websiteSettings = await fetch(`${API_BASE}/users/${USER_EMAIL}/website-settings`);
const settings = await websiteSettings.json();
console.log('Company:', settings.data.branding.companyName);

// 2. Get info bar for homepage
const infoBarResponse = await fetch(`${API_BASE}/users/${USER_EMAIL}/info-bar?page=homepage`);
const infoBar = await infoBarResponse.json();
if (infoBar.data?.isActive) {
  console.log('Info bar message:', infoBar.data.message);
}

// 3. Get modal settings
const modalResponse = await fetch(`${API_BASE}/users/${USER_EMAIL}/modal?page=homepage`);
const modal = await modalResponse.json();
if (modal.data?.isActive) {
  console.log('Modal title:', modal.data.title);
}

// 4. Get homepage banners
const bannersResponse = await fetch(`${API_BASE}/users/${USER_EMAIL}/banners/page/homepage`);
const banners = await bannersResponse.json();
console.log('Homepage banners:', banners.count);

// 5. Get available cars
const carsResponse = await fetch(`${API_BASE}/users/${USER_EMAIL}/cars?available=true&limit=12`);
const cars = await carsResponse.json();
console.log('Available cars:', cars.count);

// 6. Get economy cars specifically
const economyCars = await fetch(`${API_BASE}/users/${USER_EMAIL}/cars/category/economy`);
const economyData = await economyCars.json();
console.log('Economy cars:', economyData.count);

// 7. Check car availability
const carId = cars.data[0]._id;
const availability = await fetch(`${API_BASE}/users/${USER_EMAIL}/cars/${carId}/availability?startDate=2024-07-15&endDate=2024-07-20`);
const availabilityData = await availability.json();
console.log('Car available:', availabilityData.data.isAvailable);

// 8. Get additional services
const servicesResponse = await fetch(`${API_BASE}/users/${USER_EMAIL}/services`);
const services = await servicesResponse.json();
console.log('Available services:', services.count);

// 9. Get services for specific vehicle
const vehicleServices = await fetch(`${API_BASE}/users/${USER_EMAIL}/services/vehicle/${carId}`);
const vehicleServicesData = await vehicleServices.json();
console.log('Vehicle-specific services:', vehicleServicesData.count);

// 10. Calculate service price
const priceCalculation = await fetch(`${API_BASE}/users/${USER_EMAIL}/services/calculate-price`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    serviceId: services.data[0]._id,
    quantity: 1,
    days: 5
  })
});
const priceData = await priceCalculation.json();
console.log('Service price:', priceData.data.calculatedPrice);

// 11. Get available features
const featuresResponse = await fetch(`${API_BASE}/users/${USER_EMAIL}/features`);
const features = await featuresResponse.json();
console.log('Available features:', features.data.map(f => f.displayName));

// 12. Create a reservation
const reservationData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+421901234567',
  carId: carId,
  startDate: '2024-07-15T10:00:00Z',
  endDate: '2024-07-20T10:00:00Z',
  discountCode: 'SUMMER2024'
};

const createReservation = await fetch(`${API_BASE}/users/${USER_EMAIL}/reservations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(reservationData)
});
const reservationResult = await createReservation.json();
console.log('Reservation created:', reservationResult.success);

// 13. Subscribe to newsletter
const newsletterData = {
  subscriberEmail: 'subscriber@example.com',
  firstName: 'Jane',
  lastName: 'Smith'
};

const subscribe = await fetch(`${API_BASE}/users/${USER_EMAIL}/newsletter`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newsletterData)
});
const subscribeResult = await subscribe.json();
console.log('Newsletter subscription:', subscribeResult.success);
```

## React Integration Example

```jsx
import React, { useState, useEffect } from 'react';

const RivalCarRental = () => {
  const [websiteData, setWebsiteData] = useState({});
  const [cars, setCars] = useState([]);
  const [banners, setBanners] = useState([]);
  const [infoBar, setInfoBar] = useState(null);
  const [modal, setModal] = useState(null);

  const API_BASE = 'https://carflow-reservation-system.onrender.com/api/public';
  const USER_EMAIL = 'rival@test.sk';

  useEffect(() => {
    const loadWebsiteData = async () => {
      try {
        // Load all website data in parallel
        const [settingsRes, carsRes, bannersRes, infoBarRes, modalRes] = await Promise.all([
          fetch(`${API_BASE}/users/${USER_EMAIL}/website-settings`),
          fetch(`${API_BASE}/users/${USER_EMAIL}/cars?available=true&limit=12`),
          fetch(`${API_BASE}/users/${USER_EMAIL}/banners/page/homepage`),
          fetch(`${API_BASE}/users/${USER_EMAIL}/info-bar?page=homepage`),
          fetch(`${API_BASE}/users/${USER_EMAIL}/modal?page=homepage`)
        ]);

        const [settings, carsData, bannersData, infoBarData, modalData] = await Promise.all([
          settingsRes.json(),
          carsRes.json(),
          bannersRes.json(),
          infoBarRes.json(),
          modalRes.json()
        ]);

        setWebsiteData(settings.data);
        setCars(carsData.data);
        setBanners(bannersData.data);
        setInfoBar(infoBarData.data?.isActive ? infoBarData.data : null);
        setModal(modalData.data?.isActive ? modalData.data : null);
      } catch (error) {
        console.error('Error loading website data:', error);
      }
    };

    loadWebsiteData();
  }, []);

  return (
    <div className="rival-website">
      {/* Info Bar */}
      {infoBar && (
        <div 
          className="info-bar"
          style={{ 
            backgroundColor: infoBar.styling.backgroundColor,
            color: infoBar.styling.textColor 
          }}
        >
          {infoBar.message}
          {infoBar.link?.isEnabled && (
            <a href={infoBar.link.url}>{infoBar.link.text}</a>
          )}
        </div>
      )}

      {/* Header with branding */}
      <header>
        <img 
          src={websiteData.branding?.logo?.url} 
          alt={websiteData.branding?.companyName}
        />
        <h1>{websiteData.branding?.companyName}</h1>
      </header>

      {/* Homepage banners */}
      <section className="hero-banners">
        {banners.map(banner => (
          <div key={banner._id} className="banner">
            <img src={banner.image?.url} alt={banner.image?.alt} />
            <div className="banner-content">
              <h2>{banner.title}</h2>
              <p>{banner.description}</p>
              {banner.link?.isEnabled && (
                <a 
                  href={banner.link.url} 
                  target={banner.link.target}
                  className="banner-button"
                >
                  {banner.link.text}
                </a>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Available cars */}
      <section className="cars-section">
        <h2>Dostupné vozidlá</h2>
        <div className="cars-grid">
          {cars.map(car => (
            <div key={car._id} className="car-card">
              <img src={car.images[0]?.url} alt={`${car.brand} ${car.model}`} />
              <h3>{car.brand} {car.model}</h3>
              <p className="car-price">{car.pricing.dailyRate}€/deň</p>
              <div className="car-features">
                {car.features.slice(0, 3).map(feature => (
                  <span key={feature} className="feature">{feature}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact info */}
      <footer>
        <div className="contact-info">
          <p>📞 {websiteData.contact?.phone}</p>
          <p>✉️ {websiteData.contact?.email}</p>
          <p>📍 {websiteData.contact?.address?.street}, {websiteData.contact?.address?.city}</p>
        </div>
      </footer>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" style={{ backgroundColor: modal.styling.overlay.backgroundColor }}>
          <div className="modal" style={{ backgroundColor: modal.styling.backgroundColor }}>
            <h2>{modal.title}</h2>
            <p>{modal.content}</p>
            {modal.image?.url && <img src={modal.image.url} alt={modal.image.alt} />}
            {modal.button && (
              <a href={modal.button.url} className={`modal-button ${modal.button.style}`}>
                {modal.button.text}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RivalCarRental;
```

## Car Categories

| Category | Description |
|----------|-------------|
| `economy` | Economical city cars for daily use |
| `compact` | Comfortable vehicles with sufficient space |
| `midsize` | Mid-range vehicles for family trips |
| `fullsize` | Larger vehicles with premium features |
| `luxury` | High-end vehicles with luxury amenities |
| `suv` | Sport utility vehicles |
| `minivan` | Multi-seat vehicles for groups |
| `utility` | Commercial vehicles for cargo |
| `caravan` | Fully equipped recreational vehicles |
| `motorcycle` | Motorcycles for adventure riding |
| `sports` | Sports cars for performance driving |
| `electric` | Electric vehicles for eco-friendly transport |

## Fuel Types

- `gasoline` - Gasoline/Petrol
- `diesel` - Diesel
- `hybrid` - Hybrid (gas + electric)
- `electric` - Fully electric
- `lpg` - LPG (Liquefied Petroleum Gas)

## Transmission Types

- `manual` - Manual transmission
- `automatic` - Automatic transmission
- `cvt` - CVT (Continuously Variable Transmission)

## Error Handling

The API returns standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "statusCode": 400
  },
  "message": "User-friendly error message"
}
```

## Rate Limiting

No rate limiting currently implemented for public endpoints.

## Data Security

- Sensitive fields (VIN, owner, tenant info) are automatically excluded from public responses
- Customer data is only accessible to authenticated users within the same tenant
- All API responses are filtered to show only appropriate public information

## Example Integration

### JavaScript/Frontend Integration
```javascript
// Get all cars
const response = await fetch('https://carflow-reservation-system.onrender.com/api/public/cars');
const data = await response.json();

if (data.success) {
  const cars = data.data;
  // Display cars in your UI
}

// Create reservation
const reservationData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+421901234567',
  carId: 'car_id_here',
  startDate: '2025-07-01T10:00:00.000Z',
  endDate: '2025-07-05T10:00:00.000Z',
  licenseNumber: 'SK123456789'
};

const reservation = await fetch('https://carflow-reservation-system.onrender.com/api/public/reservations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(reservationData)
});
```

### cURL Examples
```bash
# Get cars with filtering
curl "https://carflow-reservation-system.onrender.com/api/public/cars?category=economy&transmission=automatic&limit=5"

# Check availability
curl "https://carflow-reservation-system.onrender.com/api/public/users/admin@company.com/cars/car_id/availability?startDate=2025-07-01&endDate=2025-07-05"

# Create reservation
curl -X POST "https://carflow-reservation-system.onrender.com/api/public/reservations" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+421901234567",
    "carId": "car_id_here",
    "startDate": "2025-07-01T10:00:00.000Z",
    "endDate": "2025-07-05T10:00:00.000Z",
    "licenseNumber": "SK123456789"
  }'
```

## Support

For API support and integration questions, contact the development team.

## 🛠️ Troubleshooting

### Common Issues

#### 500 Internal Server Error
**Fixed as of July 2025** - Previously caused by legacy mileage data migration. All endpoints now working correctly.

**If you still encounter 500 errors:**
1. Verify your request URL is correct
2. Check that car IDs are valid MongoDB ObjectIds
3. Ensure dates are in proper ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
4. Contact support if issues persist

#### Car Data Not Loading
**Fixed as of July 2025** - Admin panel and all public endpoints now loading cars correctly.

#### Empty Responses
- Check that the tenant has cars in their fleet
- Verify the user email exists in the system for tenant-specific endpoints
- Ensure cars have `status: "active"` and `isActive: true`

#### Image URLs Not Working
- Images are stored in Google Cloud Storage
- Check that the car has uploaded images
- URLs are provided in multiple sizes: thumbnail, medium, large, original

### API Status Check
To verify all endpoints are working:
```bash
# Quick health check
curl "https://carflow-reservation-system.onrender.com/api/public/cars?limit=1"
```

### Equipment and Badge Data
New enhanced features include:
- **Equipment**: Detailed car amenities with icons and descriptions
- **Badges**: Marketing labels like "NOVINKA", "AKCIA", "TOP PONUKA"
- **Enhanced Pricing**: Tiered pricing for different rental durations
- **Technical Specs**: Engine details, fuel consumption, emissions data

## Enhanced Car Filtering (Updated)

### 1. Get All Cars (Public) - Enhanced Filtering
**GET** `/cars`

Now supports advanced filtering with availability checking and fallback logic.

**Query Parameters:**
- `category` (string[]): Car categories (economy, compact, midsize, etc.)
- `carClass` (string): Slovak car class filter
  - `ekonomicka` - Economy cars (Skoda Fabia, Renault Clio)
  - `stredna` - Midsize cars (Kia Ceed, Skoda Octavia)
  - `vyssia` - Higher class cars (Skoda Superb, Kia Sportage)
  - `viacmiestne` - Multi-seat vehicles (Renault Trafic, Opel Vivaro)
  - `uzitkove` - Utility vehicles (Renault Master, Fiat Ducato)
  - `karavany` - Caravans (Novastar 420CP, Weinsberg W51)
  - `motorky` - Motorcycles (Honda Africa Twin)
  - `sportove` - Sports cars (Audi RS6)
  - `elektromobily` - Electric vehicles (Tesla 3, Renault Megane E-Tech)
- `fuelType` (string[]): Fuel types (benzin, diesel, hybrid, elektro, plyn)
- `transmission` (string[]): Transmission types (automat, manual)
- `seats` (number[]): Number of seats (2, 3, 5, 7, 9)
- `startDate` (string): Start date for availability check (ISO format)
- `endDate` (string): End date for availability check (ISO format)
- `unlimitedKm` (boolean): Filter by unlimited kilometers
- `petsAllowed` (boolean): Filter by pets allowed
- `childSeat` (boolean): Filter by child seat availability
- `navigation` (boolean): Filter by navigation system
- `roofBox` (boolean): Filter by roof box availability
- `internationalTravel` (boolean): Filter by international travel capability
- `tenantId` (string): Filter by specific tenant (optional)
- `sort` (string): Sort field (price, dailyRate, -price for descending)
- `page` (number): Page number for pagination
- `limit` (number): Items per page

**Advanced Features:**
- **Availability Checking**: When `startDate` and `endDate` are provided, only shows cars available for those dates
- **Fallback Logic**: If no cars match the filters for the specified dates, shows available alternatives sorted by price
- **Real-time Filtering**: Filters react immediately without search button
- **Additional Services Integration**: Automatically suggests related services for out-of-hours pickup

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/cars?carClass=ekonomicka&startDate=2024-01-15&endDate=2024-01-20&seats=5&fuelType=benzin&unlimitedKm=true"
```

**Example Response:**
```json
{
  "success": true,
  "count": 5,
  "total": 12,
  "pagination": {
    "next": { "page": 2, "limit": 20 }
  },
  "filters": {
    "carClass": "ekonomicka",
    "fuelType": ["benzin"],
    "seats": [5],
    "startDate": "2024-01-15",
    "endDate": "2024-01-20",
    "additionalServices": ["unlimited_km"]
  },
  "data": [
    {
      "_id": "car_id",
      "brand": "Skoda",
      "model": "Fabia",
      "year": 2022,
      "category": "economy",
      "fuelType": "benzin",
      "transmission": "manual",
      "seats": 5,
      "pricing": {
        "dailyRate": 25.00
      },
      "features": ["unlimited_km", "navigation"],
      "images": ["image_url"],
      "status": "active"
    }
  ]
}
```

**Fallback Response (No matches for dates):**
```json
{
  "success": true,
  "count": 8,
  "total": 8,
  "isFallback": true,
  "message": "Vami vybrané vozidlo momentálne nie je dostupné. Zobrazujeme dostupné alternatívy pre zadaný dátum vzostupne podľa ceny.",
  "data": [
    // Available cars sorted by price ascending
  ]
}
```

### 2. Get Cars by User/Tenant - Enhanced Filtering
**GET** `/users/:email/cars`

Same enhanced filtering capabilities as above, but filtered by specific tenant.

**Parameters:**
- `email` (string, required): User's email to identify tenant
- All query parameters from enhanced filtering above

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars?carClass=stredna&transmission=automat&startDate=2024-01-15&endDate=2024-01-20"
```

## Public Banner Endpoints

### 18. Get Public Banners
**GET** `/banners`

Returns active banners for website embedding.

**Query Parameters:**
- `tenantId` (string, required): Tenant ID to filter banners
- `page` (string, optional): Page filter (homepage, car-listing, reservation, all-pages)
- `position` (string, optional): Position filter (top, middle, bottom, sidebar)

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/banners?tenantId=tenant_id&page=homepage&position=top"
```

**Example Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "banner_id",
      "title": "Zimná akcia",
      "description": "Až 30% zľava na prenájom vozidiel",
      "image": {
        "url": "https://storage.googleapis.com/bucket/banner_image.jpg",
        "alt": "Zimná akcia banner"
      },
      "link": {
        "url": "https://example.com/winter-sale",
        "text": "Rezervovať teraz",
        "target": "_blank",
        "isEnabled": true
      },
      "carousel": {
        "isEnabled": true,
        "displayDuration": 5000,
        "transition": "fade",
        "autoPlay": true,
        "showDots": true,
        "showArrows": true
      },
      "placement": {
        "page": "homepage",
        "position": "top",
        "priority": 10
      },
      "styling": {
        "backgroundColor": "#ffffff",
        "textColor": "#000000",
        "borderRadius": 8,
        "shadow": true,
        "overlay": {
          "isEnabled": true,
          "color": "#000000",
          "opacity": 0.3
        }
      },
      "isCurrentlyActive": true,
      "imageUrls": {
        "thumbnail": "https://storage.googleapis.com/bucket/banner_thumb.jpg",
        "medium": "https://storage.googleapis.com/bucket/banner_medium.jpg",
        "large": "https://storage.googleapis.com/bucket/banner_large.jpg",
        "original": "https://storage.googleapis.com/bucket/banner_original.jpg"
      }
    }
  ]
}
```

### 19. Get Public Banners by User/Tenant
**GET** `/users/:email/banners`

Returns active banners for a specific tenant identified by user email.

**Parameters:**
- `email` (string, required): User's email to identify tenant

**Query Parameters:**
- `page` (string, optional): Page filter (homepage, car-listing, reservation, all-pages)
- `position` (string, optional): Position filter (top, middle, bottom, sidebar)

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/banners?page=homepage"
```

**Example Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "banner_id",
      "title": "Letná ponuka",
      "description": "Bezplatné navigácie ku všetkým vozidlám",
      "image": {
        "url": "https://storage.googleapis.com/bucket/summer_banner.jpg",
        "alt": "Letná ponuka banner"
      },
      "link": {
        "url": "https://example.com/summer-offer",
        "text": "Viac informácií",
        "target": "_self",
        "isEnabled": true
      },
      "carousel": {
        "isEnabled": false
      },
      "placement": {
        "page": "homepage",
        "position": "top",
        "priority": 5
      },
      "styling": {
        "backgroundColor": "#f0f8ff",
        "textColor": "#003366",
        "borderRadius": 12,
        "shadow": true
      },
      "isCurrentlyActive": true
    }
  ]
}
```

### 20. Get Banners by Page and User/Tenant  
**GET** `/users/:email/banners/page/:page`

Returns banners for a specific page and tenant.

**Parameters:**
- `email` (string, required): User's email to identify tenant
- `page` (string, required): Page identifier (homepage, car-listing, reservation, all-pages)

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/banners/page/homepage"
```

### 21. Get Banners by Page (Generic)
**GET** `/banners/page/:page`

Returns banners for a specific page (same as adding page parameter to main endpoint).

**Parameters:**
- `page` (string, required): Page identifier (homepage, car-listing, reservation, all-pages)

**Query Parameters:**
- `tenantId` (string, required): Tenant ID to filter banners
- `position` (string, optional): Position filter

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/banners/page/car-listing?tenantId=tenant_id"
```

### Banner Integration Examples

**Homepage Hero Banner for rival@test.sk:**
```javascript
// Fetch homepage banners for Rival Car Rental
const response = await fetch('/api/public/users/rival@test.sk/banners?page=homepage&position=top');
const banners = await response.json();

// Display as carousel if multiple banners
if (banners.data.length > 1) {
  const carouselBanners = banners.data.filter(banner => banner.carousel.isEnabled);
  // Initialize carousel with banner.carousel.displayDuration
}
```

**Car Listing Sidebar Banner for rival@test.sk:**
```javascript
// Fetch sidebar banners for car listing page
const response = await fetch('/api/public/users/rival@test.sk/banners?page=car-listing&position=sidebar');
const banners = await response.json();

// Display as static banners
banners.data.forEach(banner => {
  // Apply banner.styling properties
  // Show banner.image.url with banner.title overlay
  // Add click handler for banner.link.url if enabled
});
```

**Complete Banner Integration for rival@test.sk:**
```javascript
const loadAllBanners = async () => {
  const USER_EMAIL = 'rival@test.sk';
  const API_BASE = 'https://carflow-reservation-system.onrender.com/api/public';
  
  // Load banners for different pages
  const [homePageBanners, carListingBanners, reservationBanners] = await Promise.all([
    fetch(`${API_BASE}/users/${USER_EMAIL}/banners/page/homepage`),
    fetch(`${API_BASE}/users/${USER_EMAIL}/banners/page/car-listing`),
    fetch(`${API_BASE}/users/${USER_EMAIL}/banners/page/reservation`)
  ]);
  
  const [homeData, carData, reservationData] = await Promise.all([
    homePageBanners.json(),
    carListingBanners.json(),
    reservationBanners.json()
  ]);
  
  return {
    homepage: homeData.data,
    carListing: carData.data,
    reservation: reservationData.data
  };
};
```

## Error Handling

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Invalid request parameters"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal server error"
}
```

## Rate Limiting

- **Public endpoints**: 500 requests per 15 minutes
- **Admin endpoints**: 200 requests per 15 minutes
- **Tenant-specific endpoints**: Same as public endpoints

## CORS Policy

The API supports requests from:
- `https://carflow-reservation-admin.netlify.app`
- `https://carflowdemowebsite.netlify.app`
- `https://admindemo.carflow.sk`
- `https://rentaldemo.carflow.sk`
- `https://rival.carflow.sk`
- Local development (`http://localhost:*`)

## Response Format

All successful responses follow this format:
```json
{
  "success": true,
  "count": number,
  "total": number,
  "pagination": {
    "next": { "page": number, "limit": number },
    "prev": { "page": number, "limit": number }
  },
  "data": array|object
}
```

## Contact

For API support or questions:
- Email: support@carflow.sk
- Documentation: https://docs.carflow.sk

---

**Last Updated**: July 3, 2025
**API Version**: v1
**Status**: ✅ All endpoints operational 