# CarFlow Public API - Complete Car Data

## Overview
This document covers the public API endpoints for accessing complete car information including all specifications, pricing, equipment, badges, and media content.

**Base URL**: `https://carflow-reservation-system.onrender.com/api/public`
**Business Email**: `rival@test.sk` (replace with actual business email)

---

## Car Data Structure

### Complete Car Object
All car endpoints return this comprehensive data structure with all available information.

```json
{
  "_id": "car123",
  "brand": "Škoda",
  "model": "Octavia",
  "year": 2023,
  "color": "Biela",
  "category": "compact",
  "registrationNumber": "BA123AB",
  "fuelType": "petrol",
  "transmission": "manual",
  "seats": 5,
  "doors": 4,
  "description": "Moderné a spoľahlivé vozidlo ideálne pre mestskú i diaľkovú jazdu",
  "mileage": 15420,
  "status": "available",
  
  // Technické údaje (Technical Specifications)
  "specifications": {
    "engine": {
      "displacement": "1.5 TSI",
      "power": "150 HP",
      "torque": "250 Nm",
      "cylinders": 4,
      "fuelSystem": "Priame vstrekovanej",
      "engineCode": "DADA"
    },
    "performance": {
      "topSpeed": "202 km/h",
      "acceleration": "8.5 s (0-100 km/h)",
      "fuelConsumption": {
        "city": "6.8 L/100km",
        "highway": "4.8 L/100km",
        "combined": "5.8 L/100km"
      },
      "emissions": "132 g/km CO2",
      "fuelTankCapacity": "50 L"
    },
    "dimensions": {
      "length": "4689 mm",
      "width": "1829 mm",
      "height": "1468 mm",
      "wheelbase": "2686 mm",
      "trunkCapacity": "600 L",
      "weight": {
        "empty": "1361 kg",
        "gross": "1910 kg",
        "payload": "549 kg"
      }
    },
    "drivetrain": {
      "drive": "Predný pohon",
      "gearbox": "6-stupňová manuálna",
      "differential": "Štandardný",
      "suspension": {
        "front": "McPherson",
        "rear": "Viacprvková"
      }
    },
    "safety": {
      "euroNCAP": "5 hviezd",
      "abs": true,
      "esp": true,
      "airbags": "6 airbagov",
      "isofix": true
    }
  },
  
  // Cenník (Pricing)
  "pricing": {
    "dailyRate": 45.00,
    "weeklyRate": 280.00,
    "monthlyRate": 1050.00,
    "weekendRate": 50.00,
    "holidayRate": 55.00,
    "deposit": 500.00,
    "currency": "EUR",
    "mileageLimit": {
      "daily": 200,
      "weekly": 1400,
      "monthly": 6000,
      "extraKmRate": 0.25
    },
    "fuelPolicy": "full-to-full",
    "lateFee": 25.00,
    "cleaningFee": 35.00,
    "smokingPenalty": 150.00,
    "damageDeductible": 800.00,
    "seasonalMultiplier": {
      "summer": 1.2,
      "winter": 1.0,
      "spring": 1.1,
      "autumn": 0.9
    },
    "discounts": {
      "weeklyDiscount": 15,
      "monthlyDiscount": 25,
      "loyaltyDiscount": 10,
      "earlyBookingDiscount": 5
    }
  },
  
  // Výbava (Equipment)
  "equipment": [
    {
      "_id": "eq123",
      "name": "Klimatizácia",
      "description": "Automatická klimatizácia s 2-zónovou reguláciou teploty",
      "icon": "https://storage.googleapis.com/car_rental_carflow/equipment/ac-icon.png",
      "category": "comfort",
      "isStandard": true,
      "isOptional": false,
      "additionalCost": 0.00
    },
    {
      "_id": "eq124",
      "name": "GPS navigácia",
      "description": "Moderná GPS navigácia s mapami Európy a hlasovým navigovaním v slovenčine",
      "icon": "https://storage.googleapis.com/car_rental_carflow/equipment/gps-icon.png",
      "category": "technology",
      "isStandard": true,
      "isOptional": false,
      "additionalCost": 0.00
    },
    {
      "_id": "eq125",
      "name": "Bluetooth",
      "description": "Bluetooth pripojenie pre handsfree volanie a prehrávanie hudby",
      "icon": "https://storage.googleapis.com/car_rental_carflow/equipment/bluetooth-icon.png",
      "category": "technology",
      "isStandard": true,
      "isOptional": false,
      "additionalCost": 0.00
    },
    {
      "_id": "eq126",
      "name": "USB porty",
      "description": "Viacero USB portov pre nabíjanie a pripojenie zariadení",
      "icon": "https://storage.googleapis.com/car_rental_carflow/equipment/usb-icon.png",
      "category": "technology",
      "isStandard": true,
      "isOptional": false,
      "additionalCost": 0.00
    },
    {
      "_id": "eq127",
      "name": "Zimné pneumatiky",
      "description": "Kvalitné zimné pneumatiky pre bezpečnú jazdu v zimných podmienkach",
      "icon": "https://storage.googleapis.com/car_rental_carflow/equipment/winter-tires-icon.png",
      "category": "safety",
      "isStandard": false,
      "isOptional": true,
      "additionalCost": 5.00,
      "seasonal": {
        "availableMonths": [10, 11, 12, 1, 2, 3],
        "mandatory": true
      }
    },
    {
      "_id": "eq128",
      "name": "Diaľničná známka",
      "description": "Platná diaľničná známka pre Slovensko a susedné krajiny",
      "icon": "https://storage.googleapis.com/car_rental_carflow/equipment/highway-sticker-icon.png",
      "category": "legal",
      "isStandard": true,
      "isOptional": false,
      "additionalCost": 0.00
    }
  ],
  
  // Značky (Badges)
  "badges": [
    {
      "_id": "badge123",
      "text": "NOVINKA",
      "type": "corner",
      "style": {
        "backgroundColor": "#4caf50",
        "textColor": "#ffffff",
        "position": "top-right",
        "borderRadius": "4px",
        "fontSize": "12px",
        "fontWeight": "bold"
      },
      "priority": 1,
      "isActive": true,
      "validUntil": "2025-03-31T23:59:59Z"
    },
    {
      "_id": "badge124",
      "text": "TOP PONUKA",
      "type": "banner",
      "style": {
        "backgroundColor": "#2196f3",
        "textColor": "#ffffff",
        "position": "center",
        "borderRadius": "20px",
        "fontSize": "14px",
        "fontWeight": "bold"
      },
      "priority": 2,
      "isActive": true,
      "validUntil": null
    },
    {
      "_id": "badge125",
      "text": "ECO",
      "type": "icon",
      "style": {
        "backgroundColor": "#8bc34a",
        "textColor": "#ffffff",
        "position": "bottom-left",
        "borderRadius": "50%",
        "fontSize": "10px",
        "fontWeight": "bold"
      },
      "priority": 3,
      "isActive": true,
      "validUntil": null,
      "description": "Ekologické vozidlo s nízkou spotrebou paliva"
    }
  ],
  
  // Fotografie (Photos)
  "images": [
    {
      "_id": "img123",
      "url": "https://storage.googleapis.com/car_rental_carflow/cars/skoda-octavia-exterior-front.jpg",
      "alt": "Škoda Octavia - čelný pohľad",
      "type": "exterior",
      "view": "front",
      "isPrimary": true,
      "order": 0,
      "uploadDate": "2025-01-10T10:30:00Z",
      "dimensions": {
        "width": 1920,
        "height": 1080
      },
      "fileSize": 245632
    },
    {
      "_id": "img124", 
      "url": "https://storage.googleapis.com/car_rental_carflow/cars/skoda-octavia-exterior-side.jpg",
      "alt": "Škoda Octavia - bočný pohľad",
      "type": "exterior",
      "view": "side",
      "isPrimary": false,
      "order": 1,
      "uploadDate": "2025-01-10T10:31:00Z",
      "dimensions": {
        "width": 1920,
        "height": 1080
      },
      "fileSize": 238471
    },
    {
      "_id": "img125",
      "url": "https://storage.googleapis.com/car_rental_carflow/cars/skoda-octavia-exterior-rear.jpg", 
      "alt": "Škoda Octavia - zadný pohľad",
      "type": "exterior",
      "view": "rear",
      "isPrimary": false,
      "order": 2,
      "uploadDate": "2025-01-10T10:32:00Z",
      "dimensions": {
        "width": 1920,
        "height": 1080
      },
      "fileSize": 251893
    },
    {
      "_id": "img126",
      "url": "https://storage.googleapis.com/car_rental_carflow/cars/skoda-octavia-interior-dashboard.jpg",
      "alt": "Škoda Octavia - interiér, palubná doska",
      "type": "interior", 
      "view": "dashboard",
      "isPrimary": false,
      "order": 3,
      "uploadDate": "2025-01-10T10:33:00Z",
      "dimensions": {
        "width": 1920,
        "height": 1080
      },
      "fileSize": 267422
    },
    {
      "_id": "img127",
      "url": "https://storage.googleapis.com/car_rental_carflow/cars/skoda-octavia-interior-seats.jpg",
      "alt": "Škoda Octavia - interiér, sedadlá",
      "type": "interior",
      "view": "seats", 
      "isPrimary": false,
      "order": 4,
      "uploadDate": "2025-01-10T10:34:00Z",
      "dimensions": {
        "width": 1920,
        "height": 1080
      },
      "fileSize": 259387
    },
    {
      "_id": "img128",
      "url": "https://storage.googleapis.com/car_rental_carflow/cars/skoda-octavia-trunk.jpg",
      "alt": "Škoda Octavia - batožinový priestor",
      "type": "trunk",
      "view": "trunk",
      "isPrimary": false,
      "order": 5,
      "uploadDate": "2025-01-10T10:35:00Z",
      "dimensions": {
        "width": 1920,
        "height": 1080
      },
      "fileSize": 234567
    }
  ],
  
  // Dodatočné informácie
  "features": [
    "Automatická klimatizácia",
    "GPS navigácia", 
    "Bluetooth pripojenie",
    "USB porty",
    "Elektrické okná",
    "Centrálne zamykanie",
    "ABS brzdový systém",
    "ESP stabilizačný systém",
    "6 airbagov",
    "ISOFIX"
  ],
  
  "location": {
    "name": "Banska Bystrica - Hlavné",
    "address": "Banska Bystrica, Slovensko",
    "coordinates": {
      "lat": 48.7396,
      "lng": 19.1507
    },
    "openingHours": "08:00 - 18:00",
    "contactPhone": "+421 907 633 517"
  },
  
  "availability": {
    "isAvailable": true,
    "nextAvailableDate": "2025-01-16T10:00:00Z",
    "unavailableDates": [
      "2025-02-02",
      "2025-02-03", 
      "2025-02-04",
      "2025-02-05"
    ]
  },
  
  "createdAt": "2024-12-15T10:00:00Z",
  "updatedAt": "2025-01-15T14:30:00Z",
  "tenantId": "685ddbc2979b5b9b6c4b8264"
}
```

---

## API Endpoints

### 1. Get All Cars with Complete Data
**GET** `/users/{email}/cars`

Returns all cars with complete information including specifications, pricing, equipment, badges, and photos.

**Query Parameters:**
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 25, max: 100): Items per page
- `brand` (string): Filter by brand (značka)
- `model` (string): Filter by model
- `year` (integer): Filter by year (rok výroby)
- `color` (string): Filter by color (farba)
- `category` (string): Filter by category (zaradenie vozidla)
- `fuelType` (string): Filter by fuel type
- `transmission` (string): Filter by transmission
- `minPrice` (number): Minimum daily rate
- `maxPrice` (number): Maximum daily rate
- `equipment` (string): Filter by equipment (comma-separated)
- `badges` (string): Filter by badges (comma-separated)
- `available` (boolean): Show only available cars
- `sort` (string): Sort by field

**Available Categories (Zaradenie vozidla):**
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
GET /api/public/users/rival@test.sk/cars?brand=Škoda&year=2023&category=compact&available=true
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      // Complete car object as shown above
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

### 2. Get Single Car with Complete Data
**GET** `/users/{email}/cars/{carId}`

Returns detailed information about a specific car with all data.

**Example Request:**
```bash
GET /api/public/users/rival@test.sk/cars/car123
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    // Complete car object with all specifications, pricing, equipment, badges, and photos
  }
}
```

### 3. Get Cars by Brand (Značka)
**GET** `/users/{email}/cars/brand/{brand}`

Get all cars from a specific brand.

**Available Brands:**
- `Škoda`, `Volkswagen`, `BMW`, `Mercedes-Benz`, `Audi`, `Toyota`, `Honda`, `Ford`, `Opel`, `Renault`, `Peugeot`, `Citroën`, `Hyundai`, `Kia`, `Nissan`, `Mazda`, `Volvo`, `SEAT`, etc.

**Example Request:**
```bash
GET /api/public/users/rival@test.sk/cars/brand/Škoda
```

### 4. Get Cars by Model
**GET** `/users/{email}/cars/model/{model}`

Get all cars of a specific model.

**Example Request:**
```bash
GET /api/public/users/rival@test.sk/cars/model/Octavia
```

### 5. Get Cars by Year (Rok výroby)
**GET** `/users/{email}/cars/year/{year}`

Get all cars from a specific production year.

**Example Request:**
```bash
GET /api/public/users/rival@test.sk/cars/year/2023
```

### 6. Get Cars by Color (Farba)
**GET** `/users/{email}/cars/color/{color}`

Get all cars of a specific color.

**Available Colors:**
- `Biela`, `Čierna`, `Sivá`, `Strieborná`, `Modrá`, `Červená`, `Zelená`, `Žltá`, `Oranžová`, `Hnedá`, `Fialová`, `Ružová`

**Example Request:**
```bash
GET /api/public/users/rival@test.sk/cars/color/Biela
```

### 7. Get Cars by Category (Zaradenie vozidla)
**GET** `/users/{email}/cars/category/{category}`

Get all cars in a specific category.

**Example Request:**
```bash
GET /api/public/users/rival@test.sk/cars/category/compact
```

### 8. Get Car Technical Specifications
**GET** `/users/{email}/cars/{carId}/specifications`

Get only the technical specifications (technické údaje) for a specific car.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "carId": "car123",
    "brand": "Škoda",
    "model": "Octavia",
    "year": 2023,
    "specifications": {
      "engine": {
        "displacement": "1.5 TSI",
        "power": "150 HP",
        "torque": "250 Nm",
        "cylinders": 4,
        "fuelSystem": "Priame vstrekovanej",
        "engineCode": "DADA"
      },
      "performance": {
        "topSpeed": "202 km/h",
        "acceleration": "8.5 s (0-100 km/h)",
        "fuelConsumption": {
          "city": "6.8 L/100km",
          "highway": "4.8 L/100km", 
          "combined": "5.8 L/100km"
        },
        "emissions": "132 g/km CO2",
        "fuelTankCapacity": "50 L"
      },
      "dimensions": {
        "length": "4689 mm",
        "width": "1829 mm", 
        "height": "1468 mm",
        "wheelbase": "2686 mm",
        "trunkCapacity": "600 L",
        "weight": {
          "empty": "1361 kg",
          "gross": "1910 kg",
          "payload": "549 kg"
        }
      },
      "drivetrain": {
        "drive": "Predný pohon",
        "gearbox": "6-stupňová manuálna",
        "differential": "Štandardný",
        "suspension": {
          "front": "McPherson",
          "rear": "Viacprvková"
        }
      },
      "safety": {
        "euroNCAP": "5 hviezd",
        "abs": true,
        "esp": true,
        "airbags": "6 airbagov",
        "isofix": true
      }
    }
  }
}
```

### 9. Get Car Pricing (Cenník)
**GET** `/users/{email}/cars/{carId}/pricing`

Get only the pricing information for a specific car.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "carId": "car123",
    "brand": "Škoda",
    "model": "Octavia",
    "pricing": {
      "dailyRate": 45.00,
      "weeklyRate": 280.00,
      "monthlyRate": 1050.00,
      "weekendRate": 50.00,
      "holidayRate": 55.00,
      "deposit": 500.00,
      "currency": "EUR",
      "mileageLimit": {
        "daily": 200,
        "weekly": 1400,
        "monthly": 6000,
        "extraKmRate": 0.25
      },
      "fuelPolicy": "full-to-full",
      "fees": {
        "lateFee": 25.00,
        "cleaningFee": 35.00,
        "smokingPenalty": 150.00,
        "damageDeductible": 800.00
      },
      "seasonalMultiplier": {
        "summer": 1.2,
        "winter": 1.0,
        "spring": 1.1,
        "autumn": 0.9
      },
      "discounts": {
        "weeklyDiscount": 15,
        "monthlyDiscount": 25,
        "loyaltyDiscount": 10,
        "earlyBookingDiscount": 5
      }
    }
  }
}
```

### 10. Get Car Equipment (Výbava)
**GET** `/users/{email}/cars/{carId}/equipment`

Get only the equipment information for a specific car.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "carId": "car123",
    "brand": "Škoda",
    "model": "Octavia",
    "equipment": [
      {
        "_id": "eq123",
        "name": "Klimatizácia",
        "description": "Automatická klimatizácia s 2-zónovou reguláciou teploty",
        "icon": "https://storage.googleapis.com/car_rental_carflow/equipment/ac-icon.png",
        "category": "comfort",
        "isStandard": true,
        "isOptional": false,
        "additionalCost": 0.00
      }
      // ... more equipment items
    ],
    "categories": {
      "comfort": [
        {
          "name": "Klimatizácia",
          "isStandard": true
        }
      ],
      "technology": [
        {
          "name": "GPS navigácia",
          "isStandard": true
        },
        {
          "name": "Bluetooth",
          "isStandard": true
        }
      ],
      "safety": [
        {
          "name": "Zimné pneumatiky",
          "isStandard": false,
          "additionalCost": 5.00
        }
      ]
    },
    "standardEquipment": 6,
    "optionalEquipment": 2,
    "totalEquipmentValue": 180.00
  }
}
```

### 11. Get Car Badges (Značky)
**GET** `/users/{email}/cars/{carId}/badges`

Get only the badges information for a specific car.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "carId": "car123",
    "brand": "Škoda",
    "model": "Octavia",
    "badges": [
      {
        "_id": "badge123",
        "text": "NOVINKA",
        "type": "corner",
        "style": {
          "backgroundColor": "#4caf50",
          "textColor": "#ffffff",
          "position": "top-right",
          "borderRadius": "4px",
          "fontSize": "12px",
          "fontWeight": "bold"
        },
        "priority": 1,
        "isActive": true,
        "validUntil": "2025-03-31T23:59:59Z"
      }
      // ... more badges
    ],
    "activeBadges": 2,
    "badgeTypes": ["corner", "banner", "icon"],
    "promotionalBadges": 1,
    "featureBadges": 1
  }
}
```

### 12. Get Car Photos (Fotografie)
**GET** `/users/{email}/cars/{carId}/photos`

Get only the photos for a specific car.

**Query Parameters:**
- `type` (string): Filter by photo type (exterior, interior, trunk)
- `view` (string): Filter by view (front, side, rear, dashboard, seats)
- `primary` (boolean): Show only primary photo

**Example Request:**
```bash
GET /api/public/users/rival@test.sk/cars/car123/photos?type=exterior
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "carId": "car123",
    "brand": "Škoda",
    "model": "Octavia",
    "photos": [
      {
        "_id": "img123",
        "url": "https://storage.googleapis.com/car_rental_carflow/cars/skoda-octavia-exterior-front.jpg",
        "alt": "Škoda Octavia - čelný pohľad",
        "type": "exterior",
        "view": "front",
        "isPrimary": true,
        "order": 0,
        "uploadDate": "2025-01-10T10:30:00Z",
        "dimensions": {
          "width": 1920,
          "height": 1080
        },
        "fileSize": 245632,
        "thumbnails": {
          "small": "https://storage.googleapis.com/car_rental_carflow/cars/thumbs/skoda-octavia-exterior-front-small.jpg",
          "medium": "https://storage.googleapis.com/car_rental_carflow/cars/thumbs/skoda-octavia-exterior-front-medium.jpg",
          "large": "https://storage.googleapis.com/car_rental_carflow/cars/thumbs/skoda-octavia-exterior-front-large.jpg"
        }
      }
      // ... more photos
    ],
    "photoCount": {
      "total": 6,
      "exterior": 3,
      "interior": 2,
      "trunk": 1
    },
    "primaryPhoto": {
      "url": "https://storage.googleapis.com/car_rental_carflow/cars/skoda-octavia-exterior-front.jpg",
      "alt": "Škoda Octavia - čelný pohľad"
    }
  }
}
```

---

## Advanced Filtering & Search

### 1. Multi-Parameter Search
**GET** `/users/{email}/cars/search`

Advanced search with multiple parameters.

**Query Parameters:**
- `q` (string): General search query
- `brand` (string): Brand filter
- `model` (string): Model filter
- `yearFrom` (integer): Year from
- `yearTo` (integer): Year to
- `colors` (string): Colors (comma-separated)
- `categories` (string): Categories (comma-separated)
- `priceFrom` (number): Price from
- `priceTo` (number): Price to
- `equipment` (string): Required equipment (comma-separated)
- `badges` (string): Required badges (comma-separated)
- `fuelTypes` (string): Fuel types (comma-separated)
- `transmissions` (string): Transmissions (comma-separated)
- `seatsMin` (integer): Minimum seats
- `seatsMax` (integer): Maximum seats
- `available` (boolean): Only available cars
- `sortBy` (string): Sort field
- `sortOrder` (string): asc/desc

**Example Request:**
```bash
GET /api/public/users/rival@test.sk/cars/search?brand=Škoda&yearFrom=2020&yearTo=2024&colors=Biela,Sivá&categories=compact,midsize&equipment=Klimatizácia,GPS&badges=NOVINKA&available=true&sortBy=dailyRate&sortOrder=asc
```

### 2. Equipment-Based Search
**GET** `/users/{email}/cars/by-equipment/{equipmentName}`

Find cars with specific equipment.

**Example Request:**
```bash
GET /api/public/users/rival@test.sk/cars/by-equipment/Klimatizácia
```

### 3. Badge-Based Search
**GET** `/users/{email}/cars/by-badge/{badgeText}`

Find cars with specific badge.

**Example Request:**
```bash
GET /api/public/users/rival@test.sk/cars/by-badge/NOVINKA
```

---

## Integration Examples

### JavaScript Example: Complete Car Display
```javascript
const API_BASE = 'https://carflow-reservation-system.onrender.com/api/public';
const BUSINESS_EMAIL = 'rival@test.sk';

// Get complete car data
async function getCarDetails(carId) {
  const response = await fetch(`${API_BASE}/users/${BUSINESS_EMAIL}/cars/${carId}`);
  const data = await response.json();
  
  if (data.success) {
    return data.data;
  }
  throw new Error(data.message);
}

// Display car information
async function displayCar(carId) {
  try {
    const car = await getCarDetails(carId);
    
    // Basic Information (Základné údaje)
    console.log('=== ZÁKLADNÉ ÚDAJE ===');
    console.log(`Značka: ${car.brand}`);
    console.log(`Model: ${car.model}`);
    console.log(`Rok výroby: ${car.year}`);
    console.log(`Farba: ${car.color}`);
    console.log(`Zaradenie vozidla: ${car.category}`);
    console.log(`Palivový systém: ${car.fuelType}`);
    console.log(`Prevodovka: ${car.transmission}`);
    console.log(`Počet sedadiel: ${car.seats}`);
    console.log(`Počet dverí: ${car.doors}`);
    console.log(`Stav tachometra: ${car.mileage} km`);
    
    // Technical Specifications (Technické údaje)
    console.log('\n=== TECHNICKÉ ÚDAJE ===');
    const specs = car.specifications;
    
    console.log('Motor:');
    console.log(`  Objem: ${specs.engine.displacement}`);
    console.log(`  Výkon: ${specs.engine.power}`);
    console.log(`  Krútiaci moment: ${specs.engine.torque}`);
    console.log(`  Počet valcov: ${specs.engine.cylinders}`);
    
    console.log('Výkon:');
    console.log(`  Maximálna rýchlosť: ${specs.performance.topSpeed}`);
    console.log(`  Zrýchlenie 0-100 km/h: ${specs.performance.acceleration}`);
    console.log(`  Spotreba v meste: ${specs.performance.fuelConsumption.city}`);
    console.log(`  Spotreba na diaľnici: ${specs.performance.fuelConsumption.highway}`);
    console.log(`  Kombinovaná spotreba: ${specs.performance.fuelConsumption.combined}`);
    console.log(`  Emisie CO2: ${specs.performance.emissions}`);
    
    console.log('Rozmery:');
    console.log(`  Dĺžka: ${specs.dimensions.length}`);
    console.log(`  Šírka: ${specs.dimensions.width}`);
    console.log(`  Výška: ${specs.dimensions.height}`);
    console.log(`  Rozvor: ${specs.dimensions.wheelbase}`);
    console.log(`  Objem kufra: ${specs.dimensions.trunkCapacity}`);
    console.log(`  Hmotnosť: ${specs.dimensions.weight.empty}`);
    
    // Pricing (Cenník)
    console.log('\n=== CENNÍK ===');
    const pricing = car.pricing;
    console.log(`Denná sadzba: ${pricing.dailyRate}€`);
    console.log(`Týždenná sadzba: ${pricing.weeklyRate}€`);
    console.log(`Mesačná sadzba: ${pricing.monthlyRate}€`);
    console.log(`Víkendová sadzba: ${pricing.weekendRate}€`);
    console.log(`Kaucia: ${pricing.deposit}€`);
    console.log(`Limit km/deň: ${pricing.mileageLimit.daily} km`);
    console.log(`Poplatok za extra km: ${pricing.mileageLimit.extraKmRate}€/km`);
    console.log(`Palivová politika: ${pricing.fuelPolicy}`);
    
    // Equipment (Výbava)
    console.log('\n=== VÝBAVA ===');
    car.equipment.forEach(item => {
      const type = item.isStandard ? '[ŠTANDARDNÁ]' : '[VOLITEĽNÁ]';
      const cost = item.additionalCost > 0 ? ` (+${item.additionalCost}€)` : '';
      console.log(`${type} ${item.name}${cost}`);
      if (item.description) {
        console.log(`  ${item.description}`);
      }
    });
    
    // Badges (Značky)
    console.log('\n=== ZNAČKY ===');
    car.badges.forEach(badge => {
      console.log(`🏷️ ${badge.text} (${badge.type})`);
      if (badge.description) {
        console.log(`  ${badge.description}`);
      }
    });
    
    // Photos (Fotografie) 
    console.log('\n=== FOTOGRAFIE ===');
    car.images.forEach(image => {
      console.log(`📷 ${image.type} - ${image.view} ${image.isPrimary ? '[HLAVNÁ]' : ''}`);
      console.log(`  ${image.url}`);
      console.log(`  ${image.alt}`);
    });
    
  } catch (error) {
    console.error('Chyba pri načítaní vozidla:', error.message);
  }
}

// Search cars with filters
async function searchCars(filters = {}) {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  
  const response = await fetch(`${API_BASE}/users/${BUSINESS_EMAIL}/cars/search?${params}`);
  const data = await response.json();
  
  if (data.success) {
    return data.data;
  }
  throw new Error(data.message);
}

// Usage example
searchCars({
  brand: 'Škoda',
  yearFrom: 2020,
  categories: 'compact,midsize',
  equipment: 'Klimatizácia,GPS',
  available: true
}).then(cars => {
  console.log(`Nájdené vozidlá: ${cars.length}`);
  cars.forEach(car => {
    console.log(`${car.brand} ${car.model} (${car.year}) - ${car.pricing.dailyRate}€/deň`);
  });
});
```

### React Component Example: Car Detail View
```jsx
import React, { useState, useEffect } from 'react';

const CarDetailView = ({ carId, businessEmail }) => {
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');
  
  const API_BASE = 'https://carflow-reservation-system.onrender.com/api/public';
  
  useEffect(() => {
    const fetchCar = async () => {
      try {
        const response = await fetch(`${API_BASE}/users/${businessEmail}/cars/${carId}`);
        const data = await response.json();
        
        if (data.success) {
          setCar(data.data);
        }
      } catch (error) {
        console.error('Chyba pri načítaní vozidla:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCar();
  }, [carId, businessEmail]);
  
  if (loading) return <div>Načítavam...</div>;
  if (!car) return <div>Vozidlo nenájdené</div>;
  
  return (
    <div className="car-detail">
      {/* Car Header */}
      <div className="car-header">
        <h1>{car.brand} {car.model}</h1>
        <div className="badges">
          {car.badges.map(badge => (
            <span 
              key={badge._id} 
              className="badge"
              style={{
                backgroundColor: badge.style.backgroundColor,
                color: badge.style.textColor
              }}
            >
              {badge.text}
            </span>
          ))}
        </div>
      </div>
      
      {/* Primary Photo */}
      <div className="primary-photo">
        {car.images.find(img => img.isPrimary) && (
          <img 
            src={car.images.find(img => img.isPrimary).url}
            alt={car.images.find(img => img.isPrimary).alt}
          />
        )}
      </div>
      
      {/* Tabs */}
      <div className="tabs">
        <button 
          className={activeTab === 'basic' ? 'active' : ''}
          onClick={() => setActiveTab('basic')}
        >
          Základné údaje
        </button>
        <button 
          className={activeTab === 'specs' ? 'active' : ''}
          onClick={() => setActiveTab('specs')}
        >
          Technické údaje
        </button>
        <button 
          className={activeTab === 'pricing' ? 'active' : ''}
          onClick={() => setActiveTab('pricing')}
        >
          Cenník
        </button>
        <button 
          className={activeTab === 'equipment' ? 'active' : ''}
          onClick={() => setActiveTab('equipment')}
        >
          Výbava
        </button>
        <button 
          className={activeTab === 'photos' ? 'active' : ''}
          onClick={() => setActiveTab('photos')}
        >
          Fotografie
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'basic' && (
          <div className="basic-info">
            <h3>Základné informácie</h3>
            <div className="info-grid">
              <div><strong>Značka:</strong> {car.brand}</div>
              <div><strong>Model:</strong> {car.model}</div>
              <div><strong>Rok výroby:</strong> {car.year}</div>
              <div><strong>Farba:</strong> {car.color}</div>
              <div><strong>Zaradenie vozidla:</strong> {car.category}</div>
              <div><strong>Palivo:</strong> {car.fuelType}</div>
              <div><strong>Prevodovka:</strong> {car.transmission}</div>
              <div><strong>Sedadlá:</strong> {car.seats}</div>
              <div><strong>Dvere:</strong> {car.doors}</div>
              <div><strong>Tachometer:</strong> {car.mileage} km</div>
            </div>
          </div>
        )}
        
        {activeTab === 'specs' && (
          <div className="specifications">
            <h3>Technické údaje</h3>
            
            <div className="spec-section">
              <h4>Motor</h4>
              <div><strong>Objem:</strong> {car.specifications.engine.displacement}</div>
              <div><strong>Výkon:</strong> {car.specifications.engine.power}</div>
              <div><strong>Krútiaci moment:</strong> {car.specifications.engine.torque}</div>
            </div>
            
            <div className="spec-section">
              <h4>Výkon</h4>
              <div><strong>Max. rýchlosť:</strong> {car.specifications.performance.topSpeed}</div>
              <div><strong>Zrýchlenie:</strong> {car.specifications.performance.acceleration}</div>
              <div><strong>Spotreba kombinovaná:</strong> {car.specifications.performance.fuelConsumption.combined}</div>
            </div>
            
            <div className="spec-section">
              <h4>Rozmery</h4>
              <div><strong>Dĺžka:</strong> {car.specifications.dimensions.length}</div>
              <div><strong>Šírka:</strong> {car.specifications.dimensions.width}</div>
              <div><strong>Výška:</strong> {car.specifications.dimensions.height}</div>
              <div><strong>Objem kufra:</strong> {car.specifications.dimensions.trunkCapacity}</div>
            </div>
          </div>
        )}
        
        {activeTab === 'pricing' && (
          <div className="pricing">
            <h3>Cenník</h3>
            <div className="price-grid">
              <div className="price-item">
                <strong>Denná sadzba</strong>
                <span>{car.pricing.dailyRate}€</span>
              </div>
              <div className="price-item">
                <strong>Týždenná sadzba</strong>
                <span>{car.pricing.weeklyRate}€</span>
              </div>
              <div className="price-item">
                <strong>Mesačná sadzba</strong>
                <span>{car.pricing.monthlyRate}€</span>
              </div>
              <div className="price-item">
                <strong>Kaucia</strong>
                <span>{car.pricing.deposit}€</span>
              </div>
            </div>
            
            <div className="additional-fees">
              <h4>Dodatočné poplatky</h4>
              <div>Poplatok za oneskorenie: {car.pricing.lateFee}€</div>
              <div>Poplatok za čistenie: {car.pricing.cleaningFee}€</div>
              <div>Extra km: {car.pricing.mileageLimit.extraKmRate}€/km</div>
            </div>
          </div>
        )}
        
        {activeTab === 'equipment' && (
          <div className="equipment">
            <h3>Výbava vozidla</h3>
            <div className="equipment-grid">
              {car.equipment.map(item => (
                <div key={item._id} className="equipment-item">
                  {item.icon && <img src={item.icon} alt="" width="24" height="24" />}
                  <div>
                    <strong>{item.name}</strong>
                    {item.isStandard ? 
                      <span className="badge standard">Štandardná</span> : 
                      <span className="badge optional">Voliteľná (+{item.additionalCost}€)</span>
                    }
                    {item.description && <p>{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'photos' && (
          <div className="photos">
            <h3>Fotografie vozidla</h3>
            <div className="photo-grid">
              {car.images.map(image => (
                <div key={image._id} className="photo-item">
                  <img src={image.url} alt={image.alt} />
                  <div className="photo-info">
                    <span>{image.type} - {image.view}</span>
                    {image.isPrimary && <span className="primary">Hlavná</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CarDetailView;
```

### PHP Integration Example
```php
<?php
class CarFlowAPI {
    private $apiBase = 'https://carflow-reservation-system.onrender.com/api/public';
    private $businessEmail;
    
    public function __construct($businessEmail) {
        $this->businessEmail = $businessEmail;
    }
    
    public function getCarDetails($carId) {
        $url = "{$this->apiBase}/users/{$this->businessEmail}/cars/{$carId}";
        $response = file_get_contents($url);
        $data = json_decode($response, true);
        
        return $data['success'] ? $data['data'] : null;
    }
    
    public function searchCars($filters = []) {
        $query = http_build_query($filters);
        $url = "{$this->apiBase}/users/{$this->businessEmail}/cars/search?{$query}";
        $response = file_get_contents($url);
        $data = json_decode($response, true);
        
        return $data['success'] ? $data['data'] : [];
    }
    
    public function displayCarBasicInfo($carId) {
        $car = $this->getCarDetails($carId);
        if (!$car) return;
        
        echo "<h2>{$car['brand']} {$car['model']}</h2>\n";
        echo "<div class='car-basic-info'>\n";
        echo "  <p><strong>Rok výroby:</strong> {$car['year']}</p>\n";
        echo "  <p><strong>Farba:</strong> {$car['color']}</p>\n";
        echo "  <p><strong>Zaradenie vozidla:</strong> {$car['category']}</p>\n";
        echo "  <p><strong>Prevodovka:</strong> {$car['transmission']}</p>\n";
        echo "  <p><strong>Palivo:</strong> {$car['fuelType']}</p>\n";
        echo "  <p><strong>Cena:</strong> {$car['pricing']['dailyRate']}€/deň</p>\n";
        echo "</div>\n";
        
        // Display primary photo
        $primaryPhoto = array_filter($car['images'], function($img) {
            return $img['isPrimary'];
        });
        
        if (!empty($primaryPhoto)) {
            $photo = array_values($primaryPhoto)[0];
            echo "<img src='{$photo['url']}' alt='{$photo['alt']}' class='primary-photo'>\n";
        }
        
        // Display badges
        if (!empty($car['badges'])) {
            echo "<div class='badges'>\n";
            foreach ($car['badges'] as $badge) {
                $style = "background-color: {$badge['style']['backgroundColor']}; color: {$badge['style']['textColor']};";
                echo "  <span class='badge' style='{$style}'>{$badge['text']}</span>\n";
            }
            echo "</div>\n";
        }
    }
    
    public function displayCarSpecs($carId) {
        $car = $this->getCarDetails($carId);
        if (!$car || !isset($car['specifications'])) return;
        
        $specs = $car['specifications'];
        
        echo "<h3>Technické údaje</h3>\n";
        echo "<div class='specifications'>\n";
        
        echo "  <h4>Motor</h4>\n";
        echo "  <ul>\n";
        echo "    <li>Objem: {$specs['engine']['displacement']}</li>\n";
        echo "    <li>Výkon: {$specs['engine']['power']}</li>\n";
        echo "    <li>Krútiaci moment: {$specs['engine']['torque']}</li>\n";
        echo "  </ul>\n";
        
        echo "  <h4>Výkon</h4>\n";
        echo "  <ul>\n";
        echo "    <li>Max. rýchlosť: {$specs['performance']['topSpeed']}</li>\n";
        echo "    <li>Zrýchlenie: {$specs['performance']['acceleration']}</li>\n";
        echo "    <li>Spotreba: {$specs['performance']['fuelConsumption']['combined']}</li>\n";
        echo "  </ul>\n";
        
        echo "</div>\n";
    }
    
    public function displayCarEquipment($carId) {
        $car = $this->getCarDetails($carId);
        if (!$car || !isset($car['equipment'])) return;
        
        echo "<h3>Výbava vozidla</h3>\n";
        echo "<div class='equipment'>\n";
        
        foreach ($car['equipment'] as $item) {
            $type = $item['isStandard'] ? 'štandardná' : 'voliteľná';
            $cost = $item['additionalCost'] > 0 ? " (+{$item['additionalCost']}€)" : '';
            
            echo "  <div class='equipment-item'>\n";
            if (!empty($item['icon'])) {
                echo "    <img src='{$item['icon']}' alt='' width='24' height='24'>\n";
            }
            echo "    <div>\n";
            echo "      <strong>{$item['name']}</strong> <span class='type'>({$type}{$cost})</span>\n";
            if (!empty($item['description'])) {
                echo "      <p>{$item['description']}</p>\n";
            }
            echo "    </div>\n";
            echo "  </div>\n";
        }
        
        echo "</div>\n";
    }
}

// Usage example
$api = new CarFlowAPI('rival@test.sk');

// Display complete car information
$carId = 'car123';
echo "<div class='car-display'>\n";
$api->displayCarBasicInfo($carId);
$api->displayCarSpecs($carId);
$api->displayCarEquipment($carId);
echo "</div>\n";

// Search and display cars
$cars = $api->searchCars([
    'brand' => 'Škoda',
    'available' => true,
    'sortBy' => 'dailyRate'
]);

echo "<h2>Dostupné vozidlá značky Škoda</h2>\n";
foreach ($cars as $car) {
    echo "<div class='car-item'>\n";
    echo "  <h3>{$car['brand']} {$car['model']} ({$car['year']})</h3>\n";
    echo "  <p>Farba: {$car['color']}</p>\n";
    echo "  <p>Cena: {$car['pricing']['dailyRate']}€/deň</p>\n";
    echo "</div>\n";
}
?>
```

---

## Error Handling

### Common Error Responses

**Car Not Found (404)**
```json
{
  "success": false,
  "message": "Car not found",
  "error": {
    "code": "CAR_NOT_FOUND",
    "carId": "invalid_car_id"
  }
}
```

**Invalid Parameters (400)**
```json
{
  "success": false,
  "message": "Invalid filter parameters",
  "error": {
    "code": "INVALID_PARAMETERS",
    "details": "Invalid year range: yearFrom must be less than yearTo"
  }
}
```

**Business Not Found (404)**
```json
{
  "success": false,
  "message": "Business not found",
  "error": {
    "code": "BUSINESS_NOT_FOUND",
    "email": "invalid@email.com"
  }
}
```

---

## Rate Limits

- **Car listing**: 200 requests per hour per IP
- **Car details**: 500 requests per hour per IP
- **Search**: 100 requests per hour per IP
- **Photos**: 1000 requests per hour per IP

---

**Last Updated**: January 2025
**API Version**: 2.0