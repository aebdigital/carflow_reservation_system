# CarFlow Public API - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Base Configuration](#base-configuration)
3. [Authentication](#authentication)
4. [Response Format](#response-format)
5. [Car Endpoints](#car-endpoints)
6. [Reservation Endpoints](#reservation-endpoints)
7. [Settings & Pickup Locations](#settings--pickup-locations)
8. [Website Content](#website-content)
9. [Banner Management](#banner-management)
10. [Blog System](#blog-system)
11. [Email Subscription](#email-subscription)
12. [Additional Services](#additional-services)
13. [Calendar & Availability](#calendar--availability)
14. [QR Code & Payment Integration](#qr-code--payment-integration)
15. [Error Handling](#error-handling)
16. [Rate Limiting](#rate-limiting)
17. [Examples & Integration](#examples--integration)

## Overview

The CarFlow Public API provides comprehensive public access to car rental functionality without requiring authentication. This API is designed for public-facing websites, mobile applications, and third-party integrations.

### Key Features
- ✅ **Multi-tenant architecture** - Each user/business has isolated data
- ✅ **No authentication required** for public endpoints
- ✅ **RESTful design** with consistent response formats
- ✅ **Comprehensive car rental functionality**
- ✅ **Real-time availability checking**
- ✅ **Integrated payment processing with QR codes**
- ✅ **Email notifications and SMS support**
- ✅ **Dynamic pickup location management**
- ✅ **Blog and content management**
- ✅ **Banner and modal systems**

## Base Configuration

**Production Base URL**: `https://carflow-reservation-system.onrender.com/api/public`

### Tenant-Based Routing
All public endpoints use tenant-based routing where `:email` represents the business owner's email address:

```
/api/public/users/{business-email}/{endpoint}
```

**Example**: `rival@test.sk` is the main tenant in examples below.

## Authentication

❌ **No authentication required** for public endpoints.
All endpoints are publicly accessible and tenant-scoped by the business email in the URL.

## Response Format

All API responses follow this consistent JSON format:

```json
{
  "success": true|false,
  "data": {}, // Response data (object or array)
  "count": 0, // For list endpoints (optional)
  "pagination": { // For paginated endpoints (optional)
    "page": 1,
    "limit": 25,
    "total": 100,
    "pages": 4
  },
  "message": "Success/Error message" // (optional)
}
```

## Car Endpoints

### 1. Get All Cars for Business
**GET** `/users/{email}/cars`

Returns all publicly available cars for a specific business.

**Query Parameters:**
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 25, max: 100): Items per page
- `category` (string): Filter by car category
- `fuelType` (string): Filter by fuel type ('petrol', 'diesel', 'electric', 'hybrid')
- `transmission` (string): Filter by transmission ('manual', 'automatic')
- `seats` (integer): Filter by number of seats
- `minPrice` (number): Minimum daily rate
- `maxPrice` (number): Maximum daily rate
- `available` (boolean): Show only available cars
- `sort` (string): Sort by field (e.g., 'dailyRate', '-year', 'brand')

**Example Request:**
```bash
GET /api/public/users/rival@test.sk/cars?category=compact&fuelType=petrol&sort=dailyRate
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "car123",
      "brand": "Škoda",
      "model": "Octavia",
      "year": 2023,
      "color": "Biela",
      "category": "compact",
      "fuelType": "petrol",
      "transmission": "manual",
      "seats": 5,
      "doors": 4,
      "description": "Pohodlné rodinné vozidlo s nízkou spotrebou paliva",
      "pricing": {
        "dailyRate": 45.00,
        "weeklyRate": 280.00,
        "monthlyRate": 1050.00,
        "deposit": 500.00,
        "currency": "EUR"
      },
      "features": [
        "Klimatizácia",
        "GPS navigácia", 
        "Bluetooth",
        "USB porty"
      ],
      "images": [
        {
          "url": "https://storage.googleapis.com/car_rental_carflow/cars/image1.jpg",
          "isPrimary": true,
          "order": 0
        }
      ],
      "equipment": ["Zimné pneumatiky", "Diaľničná známka"],
      "badges": ["Nové vozidlo", "Najpopulárnejšie"],
      "status": "available",
      "mileage": 15420
    }
  ],
  "count": 1,
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 1,
    "pages": 1
  }
}
```

### 2. Get Single Car Details
**GET** `/users/{email}/cars/{carId}`

Returns detailed information about a specific car.

**Example Request:**
```bash
GET /api/public/users/rival@test.sk/cars/car123
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "_id": "car123",
    "brand": "Škoda",
    "model": "Octavia",
    // ... full car details with all fields
    "specifications": {
      "engine": "1.5 TSI",
      "power": "150 HP",
      "fuelConsumption": "5.8L/100km",
      "emissions": "132 g/km CO2"
    },
    "location": {
      "name": "Banska Bystrica - Hlavné",
      "address": "Banska Bystrica, Slovensko",
      "coordinates": {
        "lat": 48.7396,
        "lng": 19.1507
      }
    }
  }
}
```

### 3. Check Car Availability
**GET** `/users/{email}/cars/{carId}/availability`

Check if a car is available for specific dates.

**Query Parameters:**
- `startDate` (string, required): Start date (ISO 8601)
- `endDate` (string, required): End date (ISO 8601)

**Example Request:**
```bash
GET /api/public/users/rival@test.sk/cars/car123/availability?startDate=2025-02-01T10:00:00Z&endDate=2025-02-05T10:00:00Z
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "isAvailable": true,
    "startDate": "2025-02-01T10:00:00Z",
    "endDate": "2025-02-05T10:00:00Z",
    "duration": 4,
    "conflictingReservations": [],
    "pricing": {
      "dailyRate": 45.00,
      "totalDays": 4,
      "subtotal": 180.00,
      "taxes": 36.00,
      "totalAmount": 216.00,
      "deposit": 500.00,
      "currency": "EUR"
    }
  }
}
```

### 4. Get Cars by Category
**GET** `/users/{email}/cars/category/{category}`

Get all cars in a specific category.

**Available Categories:**
- `economy` - Ekonomické vozidlá
- `compact` - Kompaktné vozidlá  
- `midsize` - Stredné vozidlá
- `fullsize` - Veľké vozidlá
- `luxury` - Luxusné vozidlá
- `suv` - SUV vozidlá
- `minivan` - Minivany
- `convertible` - Kabrioly
- `sports` - Športové vozidlá
- `utility` - Úžitkové vozidlá
- `caravan` - Karavany
- `motorcycle` - Motocykle
- `electric` - Elektrické vozidlá

**Example Request:**
```bash
GET /api/public/users/rival@test.sk/cars/category/compact
```

## Reservation Endpoints

### 1. Create New Reservation
**POST** `/users/{email}/reservations`

Create a new car reservation. The system will automatically create a customer account if the email doesn't exist.

**Request Body:**
```json
{
  "firstName": "Ján",
  "lastName": "Novák", 
  "email": "jan.novak@email.sk",
  "phone": "+421901234567",
  "dateOfBirth": "1990-05-15",
  "licenseNumber": "SK1234567890",
  "address": {
    "street": "Hlavná 123",
    "city": "Bratislava",
    "state": "Bratislavský kraj",
    "zipCode": "81101",
    "country": "Slovensko"
  },
  "carId": "car123",
  "startDate": "2025-02-01T10:00:00Z",
  "endDate": "2025-02-05T10:00:00Z",
  "pickupLocation": {
    "name": "Banska Bystrica - Hlavné",
    "address": "Banska Bystrica, Slovensko"
  },
  "dropoffLocation": {
    "name": "Banska Bystrica - Hlavné", 
    "address": "Banska Bystrica, Slovensko"
  },
  "discountCodes": ["PROMO10"],
  "additionalServices": [
    {
      "serviceId": "service123",
      "quantity": 1
    }
  ],
  "additionalDrivers": [
    {
      "firstName": "Mária",
      "lastName": "Nováková",
      "licenseNumber": "SK0987654321",
      "dateOfBirth": "1992-03-20"
    }
  ],
  "specialRequests": "Potrebujem detskú sedačku",
  "agreeToTerms": true,
  "marketingConsent": false
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "reservationId": "res123",
    "reservationNumber": "RES-8264-1738123456789",
    "status": "pending",
    "customer": {
      "_id": "customer123",
      "firstName": "Ján",
      "lastName": "Novák",
      "email": "jan.novak@email.sk"
    },
    "car": {
      "_id": "car123",
      "brand": "Škoda",
      "model": "Octavia"
    },
    "dates": {
      "startDate": "2025-02-01T10:00:00Z",
      "endDate": "2025-02-05T10:00:00Z",
      "duration": 4
    },
    "pricing": {
      "subtotal": 180.00,
      "discounts": 18.00,
      "taxes": 32.40,
      "totalAmount": 194.40,
      "deposit": 500.00,
      "currency": "EUR"
    },
    "qrCodes": {
      "payBySquareRental": "...", // QR code data for rental payment
      "payBySquareDeposit": "...", // QR code data for deposit
      "variableSymbol": "1234567890",
      "bankAccount": "SK6807200000000000000000"
    },
    "emailSent": true,
    "smsSent": false,
    "createdAt": "2025-01-15T10:30:00Z"
  },
  "message": "Rezervácia bola úspešne vytvorená a čaká na potvrdenie administrátorom."
}
```

### 2. Get Reservation Details by ID
**GET** `/users/{email}/reservations/{reservationId}`

Retrieve details of a specific reservation.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "_id": "res123",
    "reservationNumber": "RES-8264-1738123456789",
    "status": "confirmed",
    "customer": {
      "firstName": "Ján",
      "lastName": "Novák",
      "email": "jan.novak@email.sk",
      "phone": "+421901234567"
    },
    // ... full reservation details
  }
}
```

### 3. Get QR Payment Codes
**GET** `/users/{email}/reservations/{reservationId}/qr`

Get QR codes for payment (PayBySquare format for Slovak banking).

**Example Response:**
```json
{
  "success": true,
  "data": {
    "reservationNumber": "RES-8264-1738123456789",
    "qrCodes": {
      "rental": {
        "amount": 194.40,
        "qrData": "...",
        "qrImageUrl": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=...",
        "description": "Platba za prenájom vozidla"
      },
      "deposit": {
        "amount": 500.00,
        "qrData": "...",
        "qrImageUrl": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=...",
        "description": "Kaucia za vozidlo"
      }
    },
    "bankDetails": {
      "account": "SK6807200000000000000000",
      "variableSymbol": "1234567890",
      "currency": "EUR"
    }
  }
}
```

### 4. Get Slovak Rental Agreement PDF
**GET** `/users/{email}/reservations/{reservationId}/slovak-agreement`

Download the official Slovak rental agreement as PDF.

**Query Parameters:**
- `preview` (boolean, default: false): Open in browser instead of download

**Example Request:**
```bash
GET /api/public/users/rival@test.sk/reservations/res123/slovak-agreement?preview=true
```

**Response:** PDF file stream

## Settings & Pickup Locations

### 1. Get Pickup Locations
**GET** `/users/{email}/pickup-locations`

Get all available pickup/return locations for the business.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "pickupLocations": [
      {
        "id": "loc123",
        "name": "Banska Bystrica - Hlavné",
        "address": "Banska Bystrica, Slovensko",
        "openingHours": "08:00 - 18:00",
        "isDefault": true,
        "coordinates": {
          "lat": 48.7396,
          "lng": 19.1507
        },
        "notes": "Hlavné odovzdávacie miesto s parkingom"
      },
      {
        "id": "loc124", 
        "name": "Banska Bystrica - Letisko",
        "address": "Letisko Sliač, Slovensko",
        "openingHours": "06:00 - 22:00",
        "isDefault": false,
        "coordinates": {
          "lat": 48.6376,
          "lng": 19.1341
        },
        "notes": "Dostupné pre lety, dodatočný poplatok 25€"
      }
    ],
    "defaultLocation": "Banska Bystrica - Hlavné"
  }
}
```

## Website Content

### 1. Get Website Settings
**GET** `/users/{email}/website-settings`

Get website settings including business information, contact details, and display preferences.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "business": {
      "name": "RIVAL Autopožičovňa",
      "description": "Moderná autopožičovňa s najnovšími vozidlami",
      "phone": "+421 907 633 517",
      "email": "info@rivalcars.sk",
      "address": {
        "street": "Hlavná 123",
        "city": "Banska Bystrica",
        "zipCode": "97401", 
        "country": "Slovensko"
      },
      "workingHours": {
        "monday": "08:00 - 18:00",
        "tuesday": "08:00 - 18:00",
        "wednesday": "08:00 - 18:00",
        "thursday": "08:00 - 18:00",
        "friday": "08:00 - 18:00",
        "saturday": "09:00 - 15:00",
        "sunday": "Zatvorené"
      }
    },
    "social": {
      "facebook": "https://facebook.com/rivalcars",
      "instagram": "https://instagram.com/rivalcars",
      "website": "https://rivalcars.sk"
    },
    "policies": {
      "terms": "https://rivalcars.sk/terms",
      "privacy": "https://rivalcars.sk/privacy",
      "cancellation": "Bezplatné zrušenie do 24 hodín pred vyzdvihnutím"
    }
  }
}
```

### 2. Get Info Bar
**GET** `/users/{email}/info-bar`

Get active info bar message for website display.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "isActive": true,
    "message": "🎉 Špeciálna ponuka: -20% na všetky rezervácie do konca januára!",
    "type": "promotion",
    "backgroundColor": "#2196F3",
    "textColor": "#FFFFFF",
    "link": "https://rivalcars.sk/promo",
    "isCloseable": true
  }
}
```

### 3. Get Active Modal
**GET** `/users/{email}/modal`

Get active modal for website display (popups, announcements).

**Example Response:**
```json
{
  "success": true,
  "data": {
    "isActive": true,
    "title": "Vitajte v RIVAL Autopožičovni!",
    "content": "<p>Získajte <strong>15% zľavu</strong> na vašu prvú rezerváciu.</p>",
    "type": "welcome",
    "displayRules": {
      "showOnFirstVisit": true,
      "showDelay": 3000,
      "showOnPages": ["home", "cars"]
    },
    "design": {
      "size": "medium",
      "position": "center",
      "backgroundColor": "#FFFFFF",
      "borderColor": "#2196F3"
    },
    "ctaButton": {
      "text": "Rezervovať teraz",
      "link": "/cars",
      "color": "#2196F3"
    }
  }
}
```

## Banner Management

### 1. Get Banners by Position
**GET** `/users/{email}/banners/position/{position}`

Get banners for specific website positions.

**Available Positions:**
- `hero` - Main hero banner
- `header` - Header banner
- `footer` - Footer banner
- `sidebar` - Sidebar banner
- `popup` - Popup banner
- `carousel` - Carousel banners

**Example Request:**
```bash
GET /api/public/users/rival@test.sk/banners/position/hero
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "banner123",
      "title": "Zimná akcia 2025",
      "description": "Až 30% zľava na všetky SUV vozidlá",
      "position": "hero",
      "type": "promotional",
      "images": [
        {
          "url": "https://storage.googleapis.com/car_rental_carflow/banners/winter-promo.jpg",
          "alt": "Zimná akcia",
          "order": 0
        }
      ],
      "ctaButton": {
        "text": "Rezervovať teraz",
        "link": "/cars?category=suv",
        "color": "#FF5722"
      },
      "displayRules": {
        "startDate": "2025-01-01T00:00:00Z",
        "endDate": "2025-03-31T23:59:59Z",
        "isActive": true
      },
      "sortOrder": 1
    }
  ]
}
```

### 2. Get All Active Banners
**GET** `/users/{email}/banners`

Get all active banners for the business.

**Query Parameters:**
- `position` (string): Filter by position
- `type` (string): Filter by type

## Blog System

### 1. Get All Blog Posts
**GET** `/users/{email}/blogs`

Get published blog posts for the business.

**Query Parameters:**
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 10): Posts per page
- `category` (string): Filter by category
- `tag` (string): Filter by tag
- `search` (string): Search in title and content
- `sort` (string, default: '-publishDate'): Sort order

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "blog123",
      "title": "Ako si vybrať správne auto na dovolenku",
      "slug": "ako-si-vybrat-spravne-auto-na-dovolenku",
      "excerpt": "Praktické tipy pre výber ideálneho vozidla na vašu dovolenku...",
      "content": "...",
      "author": {
        "name": "RIVAL Autopožičovňa",
        "email": "info@rivalcars.sk"
      },
      "publishDate": "2025-01-10T10:00:00Z",
      "category": "Tipy a rady",
      "tags": ["dovolenka", "auto", "tipy"],
      "featuredImage": {
        "url": "https://storage.googleapis.com/car_rental_carflow/blogs/vacation-car.jpg",
        "alt": "Auto na dovolenku"
      },
      "seo": {
        "metaTitle": "Ako si vybrať správne auto na dovolenku | RIVAL",
        "metaDescription": "Praktické tipy pre výber ideálneho vozidla...",
        "keywords": ["autopožičovňa", "dovolenka", "auto"]
      },
      "stats": {
        "views": 245,
        "likes": 18,
        "comments": 5
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### 2. Get Single Blog Post
**GET** `/users/{email}/blogs/{slug}`

Get a specific blog post by slug.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "_id": "blog123",
    "title": "Ako si vybrať správne auto na dovolenku",
    "slug": "ako-si-vybrat-spravne-auto-na-dovolenku",
    "content": "<p>Výber správneho vozidla na dovolenku...</p>",
    // ... full blog post details
    "relatedPosts": [
      {
        "_id": "blog124",
        "title": "Kontrola vozidla pred odchodom",
        "slug": "kontrola-vozidla-pred-odchodom"
      }
    ]
  }
}
```

### 3. Get Blog Categories
**GET** `/users/{email}/blog-categories`

Get all blog categories.

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Tipy a rady",
      "slug": "tipy-a-rady",
      "count": 8
    },
    {
      "name": "Novinky",
      "slug": "novinky", 
      "count": 5
    }
  ]
}
```

### 4. Like Blog Post
**POST** `/users/{email}/blogs/{slug}/like`

Like a blog post (anonymous, tracked by IP).

**Example Response:**
```json
{
  "success": true,
  "data": {
    "liked": true,
    "totalLikes": 19
  }
}
```

### 5. Add Blog Comment
**POST** `/users/{email}/blogs/{slug}/comments`

Add a comment to a blog post.

**Request Body:**
```json
{
  "name": "Ján Novák",
  "email": "jan.novak@email.sk",
  "comment": "Veľmi užitočný článok, ďakujem!",
  "website": "https://jannovak.sk" // optional
}
```

## Email Subscription

### 1. Subscribe to Newsletter
**POST** `/users/{email}/subscribe`

Subscribe to the business newsletter.

**Request Body:**
```json
{
  "email": "subscriber@email.sk",
  "firstName": "Ján", // optional
  "lastName": "Novák", // optional
  "preferences": {
    "newsletter": true,
    "promotions": true,
    "newCars": false
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "email": "subscriber@email.sk",
    "subscribed": true,
    "subscribedAt": "2025-01-15T10:30:00Z"
  },
  "message": "Úspešne ste sa prihlásili na odber noviniek!"
}
```

### 2. Simple Newsletter Subscription
**POST** `/users/{email}/subscribe/simple`

Simple email-only subscription.

**Request Body:**
```json
{
  "email": "subscriber@email.sk"
}
```

## Additional Services

### 1. Get Available Services
**GET** `/users/{email}/services`

Get all available additional services.

**Query Parameters:**
- `category` (string): Filter by category
- `vehicleCategory` (string): Filter by vehicle compatibility

**Available Categories:**
- `driving_comfort` - Pohodlie pri jazde
- `insurance_assistance` - Poistenie a asistenčné služby
- `time_services` - Časové služby
- `delivery_pickup` - Pristavenie/Vyzdvihnutie
- `family_accessories` - Rodinné doplnky
- `specialized` - Špecializované služby

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "service123",
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
        "vehicleCategories": ["economy", "compact", "midsize"],
        "seasonal": {
          "isActive": false
        }
      },
      "behavior": {
        "isAutoSelected": false,
        "isRequired": false,
        "maxQuantity": 1
      },
      "icon": "🛣️",
      "color": "#4CAF50"
    }
  ]
}
```

### 2. Get Services for Vehicle
**GET** `/users/{email}/services/vehicle/{carId}`

Get available services for a specific vehicle.

### 3. Calculate Service Price
**POST** `/users/{email}/services/calculate`

Calculate total price for selected services.

**Request Body:**
```json
{
  "services": [
    {
      "serviceId": "service123",
      "quantity": 1
    }
  ],
  "rentalDays": 4,
  "vehicleCategory": "compact"
}
```

## Calendar & Availability

### 1. Get Car Calendar
**GET** `/users/{email}/cars/{carId}/calendar`

Get calendar view of car availability.

**Query Parameters:**
- `year` (integer, default: current year)
- `month` (integer, default: current month)

**Example Response:**
```json
{
  "success": true,
  "data": {
    "year": 2025,
    "month": 2,
    "calendar": [
      {
        "date": "2025-02-01",
        "isAvailable": true,
        "dailyRate": 45.00,
        "reservations": []
      },
      {
        "date": "2025-02-02", 
        "isAvailable": false,
        "dailyRate": 45.00,
        "reservations": [
          {
            "reservationNumber": "RES-8264-1738123456789",
            "customerName": "J. Novák",
            "startDate": "2025-02-02T10:00:00Z",
            "endDate": "2025-02-05T10:00:00Z"
          }
        ]
      }
    ]
  }
}
```

### 2. Get Reserved Dates
**GET** `/users/{email}/cars/{carId}/reserved-dates`

Get simple list of reserved dates for a car.

**Query Parameters:**
- `startDate` (string): Start date range (ISO 8601)
- `endDate` (string): End date range (ISO 8601)

**Example Response:**
```json
{
  "success": true,
  "data": {
    "reservedDates": [
      "2025-02-02",
      "2025-02-03", 
      "2025-02-04",
      "2025-02-05"
    ],
    "reservations": [
      {
        "startDate": "2025-02-02T10:00:00Z",
        "endDate": "2025-02-05T10:00:00Z",
        "reservationNumber": "RES-8264-1738123456789"
      }
    ]
  }
}
```

## QR Code & Payment Integration

### PayBySquare Integration

The system generates Slovak PayBySquare QR codes for easy mobile banking payments.

**QR Code Structure:**
- **Rental Payment**: Main reservation amount minus deposit
- **Deposit Payment**: Security deposit amount
- **Bank Account**: SK6807200000000000000000
- **Variable Symbol**: Generated from reservation number

**QR Code URLs:**
QR codes are available as both raw data and image URLs:
```
https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={encoded_qr_data}
```

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error information"
  }
}
```

### Common HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict (booking dates, etc.)
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Common Error Codes

- `VALIDATION_ERROR`: Request validation failed
- `CAR_NOT_AVAILABLE`: Car not available for requested dates
- `USER_NOT_FOUND`: Business email not found
- `RESERVATION_CONFLICT`: Date conflict with existing reservation
- `DISCOUNT_CODE_INVALID`: Invalid or expired discount code
- `PAYMENT_REQUIRED`: Payment information missing
- `SERVICE_UNAVAILABLE`: Requested service not available

## Rate Limiting

Public API endpoints have rate limiting to prevent abuse:

- **General endpoints**: 1000 requests per hour per IP
- **Reservation creation**: 10 requests per hour per IP
- **Email subscription**: 5 requests per hour per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642694400
```

## Examples & Integration

### Frontend Integration Example

```javascript
// Initialize API client
const API_BASE = 'https://carflow-reservation-system.onrender.com/api/public';
const BUSINESS_EMAIL = 'rival@test.sk';

// Get available cars
async function getCars(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/users/${BUSINESS_EMAIL}/cars?${params}`);
  const data = await response.json();
  
  if (data.success) {
    return data.data;
  }
  throw new Error(data.message);
}

// Create reservation
async function createReservation(reservationData) {
  const response = await fetch(`${API_BASE}/users/${BUSINESS_EMAIL}/reservations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(reservationData)
  });
  
  const data = await response.json();
  
  if (data.success) {
    return data.data;
  }
  throw new Error(data.message);
}

// Get pickup locations
async function getPickupLocations() {
  const response = await fetch(`${API_BASE}/users/${BUSINESS_EMAIL}/pickup-locations`);
  const data = await response.json();
  
  if (data.success) {
    return data.data.pickupLocations;
  }
  throw new Error(data.message);
}

// Usage example
async function bookCar() {
  try {
    // Get available cars
    const cars = await getCars({ category: 'compact', available: true });
    console.log('Available cars:', cars);
    
    // Get pickup locations
    const locations = await getPickupLocations();
    console.log('Pickup locations:', locations);
    
    // Create reservation
    const reservation = await createReservation({
      firstName: 'Ján',
      lastName: 'Novák',
      email: 'jan.novak@email.sk',
      phone: '+421901234567',
      carId: cars[0]._id,
      startDate: '2025-02-01T10:00:00Z',
      endDate: '2025-02-05T10:00:00Z',
      pickupLocation: locations.find(loc => loc.isDefault),
      dropoffLocation: locations.find(loc => loc.isDefault),
      agreeToTerms: true
    });
    
    console.log('Reservation created:', reservation);
    
    // Display QR codes for payment
    if (reservation.qrCodes) {
      console.log('Rental payment QR:', reservation.qrCodes.payBySquareRental);
      console.log('Deposit payment QR:', reservation.qrCodes.payBySquareDeposit);
    }
    
  } catch (error) {
    console.error('Booking failed:', error.message);
  }
}
```

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';

const CarBookingForm = () => {
  const [cars, setCars] = useState([]);
  const [pickupLocations, setPickupLocations] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [reservation, setReservation] = useState(null);
  
  const API_BASE = 'https://carflow-reservation-system.onrender.com/api/public';
  const BUSINESS_EMAIL = 'rival@test.sk';
  
  useEffect(() => {
    // Load cars and pickup locations
    Promise.all([
      fetch(`${API_BASE}/users/${BUSINESS_EMAIL}/cars`).then(r => r.json()),
      fetch(`${API_BASE}/users/${BUSINESS_EMAIL}/pickup-locations`).then(r => r.json())
    ]).then(([carsData, locationsData]) => {
      if (carsData.success) setCars(carsData.data);
      if (locationsData.success) setPickupLocations(locationsData.data.pickupLocations);
    });
  }, []);
  
  const handleBooking = async (formData) => {
    try {
      const response = await fetch(`${API_BASE}/users/${BUSINESS_EMAIL}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          carId: selectedCar._id,
          pickupLocation: pickupLocations.find(loc => loc.isDefault),
          dropoffLocation: pickupLocations.find(loc => loc.isDefault)
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setReservation(data.data);
      }
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };
  
  return (
    <div>
      {/* Car selection */}
      <div>
        <h3>Vyberte vozidlo:</h3>
        {cars.map(car => (
          <div key={car._id} onClick={() => setSelectedCar(car)}>
            <h4>{car.brand} {car.model}</h4>
            <p>{car.pricing.dailyRate}€/deň</p>
          </div>
        ))}
      </div>
      
      {/* Pickup locations */}
      <div>
        <h3>Miesta vyzdvihnutia:</h3>
        {pickupLocations.map(location => (
          <div key={location.id}>
            <h4>{location.name}</h4>
            <p>{location.address}</p>
            <p>{location.openingHours}</p>
            {location.isDefault && <span>Predvolené</span>}
          </div>
        ))}
      </div>
      
      {/* Reservation confirmation */}
      {reservation && (
        <div>
          <h3>Rezervácia vytvorená!</h3>
          <p>Číslo: {reservation.reservationNumber}</p>
          <p>Celková suma: {reservation.pricing.totalAmount}€</p>
          
          {/* QR Codes for payment */}
          {reservation.qrCodes && (
            <div>
              <h4>Platobné QR kódy:</h4>
              <div>
                <h5>Prenájom ({reservation.pricing.totalAmount - reservation.pricing.deposit}€)</h5>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(reservation.qrCodes.payBySquareRental)}`} alt="QR kód pre prenájom" />
              </div>
              <div>
                <h5>Kaucia ({reservation.pricing.deposit}€)</h5>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(reservation.qrCodes.payBySquareDeposit)}`} alt="QR kód pre kauciu" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CarBookingForm;
```

### Mobile App Integration (React Native)

```javascript
import { Camera } from 'react-native-camera-kit';

// QR Code scanner for payment verification
const QRScanner = ({ onScan }) => {
  return (
    <Camera
      scanBarcode={true}
      onReadCode={(event) => onScan(event.nativeEvent.codeStringValue)}
      showFrame={true}
      style={{ flex: 1 }}
    />
  );
};

// Payment processing with QR codes
const processPayment = async (qrData, reservationId) => {
  // Process PayBySquare QR code
  // This would integrate with Slovak banking apps
  const paymentResult = await bankingApp.processPayBySquare(qrData);
  
  if (paymentResult.success) {
    // Notify backend of successful payment
    await fetch(`${API_BASE}/users/${BUSINESS_EMAIL}/reservations/${reservationId}/payment-confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethod: 'payBySquare',
        transactionId: paymentResult.transactionId
      })
    });
  }
};
```

## Advanced Features

### Webhook Support (Future Enhancement)

The API can be extended to support webhooks for real-time notifications:

```javascript
// Webhook payload example
{
  "event": "reservation.created",
  "data": {
    "reservationId": "res123",
    "reservationNumber": "RES-8264-1738123456789",
    "status": "pending",
    "customer": {
      "email": "jan.novak@email.sk"
    }
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Caching Strategy

For better performance, implement caching for frequently accessed data:

```javascript
// Redis cache example
const redis = require('redis');
const client = redis.createClient();

// Cache car data for 5 minutes
const getCachedCars = async (businessEmail) => {
  const cacheKey = `cars:${businessEmail}`;
  let cars = await client.get(cacheKey);
  
  if (!cars) {
    cars = await fetchCarsFromDB(businessEmail);
    await client.setex(cacheKey, 300, JSON.stringify(cars));
  } else {
    cars = JSON.parse(cars);
  }
  
  return cars;
};
```

## Testing

### API Testing with Postman

Import the following Postman collection for comprehensive API testing:

```json
{
  "info": {
    "name": "CarFlow Public API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://carflow-reservation-system.onrender.com/api/public"
    },
    {
      "key": "businessEmail", 
      "value": "rival@test.sk"
    }
  ],
  "item": [
    {
      "name": "Get Cars",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/users/{{businessEmail}}/cars"
      }
    },
    {
      "name": "Create Reservation",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/users/{{businessEmail}}/reservations",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"firstName\": \"Test\",\n  \"lastName\": \"User\",\n  \"email\": \"test@example.com\",\n  \"phone\": \"+421901234567\",\n  \"carId\": \"car123\",\n  \"startDate\": \"2025-02-01T10:00:00Z\",\n  \"endDate\": \"2025-02-05T10:00:00Z\",\n  \"agreeToTerms\": true\n}"
        }
      }
    }
  ]
}
```

### Unit Testing Example

```javascript
// Jest test example
const request = require('supertest');
const app = require('../server');

describe('Public API', () => {
  test('GET /users/:email/cars should return cars', async () => {
    const response = await request(app)
      .get('/api/public/users/rival@test.sk/cars')
      .expect(200);
      
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
  
  test('POST /users/:email/reservations should create reservation', async () => {
    const reservationData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '+421901234567',
      carId: 'validCarId',
      startDate: '2025-02-01T10:00:00Z',
      endDate: '2025-02-05T10:00:00Z',
      agreeToTerms: true
    };
    
    const response = await request(app)
      .post('/api/public/users/rival@test.sk/reservations')
      .send(reservationData)
      .expect(201);
      
    expect(response.body.success).toBe(true);
    expect(response.body.data.reservationNumber).toBeDefined();
  });
});
```

## Security Considerations

### Input Validation
All endpoints validate input data and sanitize user inputs to prevent:
- SQL injection
- XSS attacks
- Data corruption

### Rate Limiting
Implement rate limiting to prevent:
- API abuse
- DDoS attacks
- Excessive reservation attempts

### Data Privacy
- Customer data is properly encrypted
- PII is handled according to GDPR requirements
- Audit logs are maintained for all API access

### CORS Configuration
```javascript
const cors = require('cors');

app.use(cors({
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

## Deployment & Production

### Environment Variables

```bash
# Production environment variables
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/carflow
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Email Configuration (SMTP2GO)
SMTP2GO_API_KEY=your-smtp2go-api-key
EMAIL_FROM="RIVAL Autopožičovňa <noreply@rivalcars.sk>"

# SMS Configuration (BulkGate)
BULKGATE_APPLICATION_ID=your-bulkgate-app-id
BULKGATE_APPLICATION_TOKEN=your-bulkgate-token

# Google Cloud Storage
GCS_PROJECT_ID=your-gcs-project-id
GCS_BUCKET_NAME=your-bucket-name
GCS_CREDENTIALS=base64-encoded-service-account-json

# Public URLs
CLIENT_URL=https://rivalcars.sk
GOOGLE_REVIEW_URL=https://g.page/r/YOUR_GOOGLE_BUSINESS_ID/review
```

### Health Check Endpoint

```javascript
// Health check for monitoring
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV
  });
});
```

## Support & Contact

For technical support and integration assistance:

- **Email**: reachout@aebdig.com
- **Documentation**: This document
- **API Status**: https://carflow-reservation-system.onrender.com/health

## Changelog

### Version 2.0 (January 2025)
- ✅ Added pickup location management
- ✅ Enhanced PayBySquare QR code integration  
- ✅ Implemented SMS notification system
- ✅ Added comprehensive blog system
- ✅ Enhanced banner management with positions
- ✅ Improved error handling and validation
- ✅ Added Slovak rental agreement PDF generation
- ✅ Implemented email subscription system

### Version 1.5 (December 2024)
- ✅ Multi-tenant architecture implementation
- ✅ Public API endpoints for car listings
- ✅ Reservation system with customer management
- ✅ Basic email notifications

---

**© 2025 CarFlow Public API - Complete Documentation**
**Generated by Claude Code - Last Updated: January 2025**