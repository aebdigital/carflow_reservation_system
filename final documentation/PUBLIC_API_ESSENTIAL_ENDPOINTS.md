# CarFlow Public API - Essential Endpoints

## Overview
This document covers the three essential public API endpoints needed for basic car rental integration.

**Base URL**: `https://carflow-reservation-system.onrender.com/api/public`
**Business Email**: `rival@test.sk` (replace with actual business email)

---

## 1. Create Reservation (POST)

**Endpoint**: `POST /users/{email}/reservations`

Creates a new car reservation with complete customer and booking information.

### Request URL
```
POST https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/reservations
```

### Request Headers
```
Content-Type: application/json
```

### Complete Request Payload
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
    },
    {
      "serviceId": "service124",
      "quantity": 2
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
  "specialRequests": "Potrebujem detskú sedačku a GPS navigáciu",
  "notes": "Uprednostňujem vyzdvihnutie popoludní",
  "agreeToTerms": true,
  "marketingConsent": false,
  "emergencyContact": {
    "name": "Peter Novák",
    "phone": "+421905123456",
    "relationship": "Brat"
  },
  "paymentPreference": "payBySquare",
  "insuranceOptions": {
    "fullCoverage": true,
    "theftProtection": true,
    "glassProtection": false
  }
}
```

### Payload Field Descriptions

#### Required Fields
- `firstName` (string): Customer's first name
- `lastName` (string): Customer's last name  
- `email` (string): Customer's email address
- `phone` (string): Customer's phone number (Slovak format: +421...)
- `carId` (string): ID of the car to reserve
- `startDate` (string): Reservation start date (ISO 8601 format)
- `endDate` (string): Reservation end date (ISO 8601 format)
- `agreeToTerms` (boolean): Must be true

#### Optional Fields
- `dateOfBirth` (string): Customer's date of birth (YYYY-MM-DD)
- `licenseNumber` (string): Driver's license number
- `address` (object): Customer's address
  - `street` (string): Street address
  - `city` (string): City
  - `state` (string): State/region
  - `zipCode` (string): Postal code
  - `country` (string): Country
- `pickupLocation` (object): Pickup location details
  - `name` (string): Location name
  - `address` (string): Location address
- `dropoffLocation` (object): Drop-off location details
- `discountCodes` (array): Array of discount code strings
- `additionalServices` (array): Array of service objects
  - `serviceId` (string): Service ID
  - `quantity` (number): Service quantity
- `additionalDrivers` (array): Array of additional driver objects
- `specialRequests` (string): Special customer requests
- `notes` (string): Additional notes
- `marketingConsent` (boolean): Marketing email consent
- `emergencyContact` (object): Emergency contact information
- `paymentPreference` (string): Payment method preference
- `insuranceOptions` (object): Insurance selections

### Success Response (201 Created)
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
      "email": "jan.novak@email.sk",
      "phone": "+421901234567"
    },
    "car": {
      "_id": "car123",
      "brand": "Škoda",
      "model": "Octavia",
      "year": 2023,
      "registrationNumber": "BA123AB"
    },
    "dates": {
      "startDate": "2025-02-01T10:00:00Z",
      "endDate": "2025-02-05T10:00:00Z",
      "duration": 4
    },
    "locations": {
      "pickup": {
        "name": "Banska Bystrica - Hlavné",
        "address": "Banska Bystrica, Slovensko"
      },
      "dropoff": {
        "name": "Banska Bystrica - Hlavné",
        "address": "Banska Bystrica, Slovensko"
      }
    },
    "pricing": {
      "dailyRate": 45.00,
      "subtotal": 180.00,
      "servicesTotal": 25.00,
      "discounts": 18.00,
      "taxes": 32.40,
      "totalAmount": 219.40,
      "deposit": 500.00,
      "currency": "EUR"
    },
    "services": [
      {
        "serviceId": "service123",
        "name": "Bez obmedzenia kilometrov",
        "quantity": 1,
        "unitPrice": 15.00,
        "totalPrice": 15.00
      },
      {
        "serviceId": "service124", 
        "name": "Detská sedačka",
        "quantity": 2,
        "unitPrice": 5.00,
        "totalPrice": 10.00
      }
    ],
    "qrCodes": {
      "payBySquareRental": "...", 
      "payBySquareDeposit": "...",
      "variableSymbol": "1234567890",
      "bankAccount": "SK6807200000000000000000"
    },
    "notifications": {
      "emailSent": true,
      "smsSent": true
    },
    "createdAt": "2025-01-15T10:30:00Z"
  },
  "message": "Rezervácia bola úspešne vytvorená a čaká na potvrdenie administrátorom."
}
```

### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    },
    {
      "field": "startDate",
      "message": "Start date must be in the future"
    }
  ]
}
```

---

## 2. Get Booked Dates for Cars (GET)

**Endpoint**: `GET /users/{email}/cars/{carId}/reserved-dates`

Retrieves all booked/reserved dates for a specific car to prevent double bookings.

### Request URL
```
GET https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars/car123/reserved-dates
```

### Query Parameters
- `startDate` (optional): Start date for date range (ISO 8601 format)
- `endDate` (optional): End date for date range (ISO 8601 format)

### Example Request with Date Range
```
GET https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars/car123/reserved-dates?startDate=2025-02-01T00:00:00Z&endDate=2025-02-28T23:59:59Z
```

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "carId": "car123",
    "carInfo": {
      "brand": "Škoda",
      "model": "Octavia",
      "year": 2023,
      "registrationNumber": "BA123AB"
    },
    "reservedDates": [
      "2025-02-02",
      "2025-02-03",
      "2025-02-04",
      "2025-02-05",
      "2025-02-15",
      "2025-02-16",
      "2025-02-17"
    ],
    "reservations": [
      {
        "reservationId": "res123",
        "reservationNumber": "RES-8264-1738123456789",
        "startDate": "2025-02-02T10:00:00Z",
        "endDate": "2025-02-05T10:00:00Z",
        "status": "confirmed",
        "customerName": "J. Novák"
      },
      {
        "reservationId": "res124",
        "reservationNumber": "RES-8264-1738123456790",
        "startDate": "2025-02-15T14:00:00Z",
        "endDate": "2025-02-17T10:00:00Z",
        "status": "confirmed",
        "customerName": "M. Svoboda"
      }
    ],
    "availableDates": [
      "2025-02-01",
      "2025-02-06",
      "2025-02-07",
      "2025-02-08",
      "2025-02-09",
      "2025-02-10",
      "2025-02-11",
      "2025-02-12",
      "2025-02-13",
      "2025-02-14",
      "2025-02-18",
      "2025-02-19",
      "2025-02-20"
    ],
    "totalReservedDays": 7,
    "dateRange": {
      "startDate": "2025-02-01T00:00:00Z",
      "endDate": "2025-02-28T23:59:59Z"
    }
  }
}
```

### Get Multiple Cars' Reserved Dates
To get reserved dates for multiple cars, make separate requests for each car:

```javascript
// Example: Get reserved dates for multiple cars
const carIds = ['car123', 'car124', 'car125'];
const businessEmail = 'rival@test.sk';

const getAllReservedDates = async () => {
  const promises = carIds.map(carId => 
    fetch(`https://carflow-reservation-system.onrender.com/api/public/users/${businessEmail}/cars/${carId}/reserved-dates`)
      .then(response => response.json())
  );
  
  const results = await Promise.all(promises);
  return results;
};
```

---

## 3. Get Additional Services (GET)

**Endpoint**: `GET /users/{email}/services`

Retrieves all available additional services with their names, descriptions, and pricing.

### Request URL
```
GET https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/services
```

### Query Parameters
- `category` (optional): Filter by service category
- `vehicleCategory` (optional): Filter by vehicle compatibility
- `isActive` (optional): Filter by active status (default: true)

### Available Service Categories
- `driving_comfort` - Pohodlie pri jazde
- `insurance_assistance` - Poistenie a asistenčné služby  
- `time_services` - Časové služby
- `delivery_pickup` - Pristavenie/Vyzdvihnutie
- `family_accessories` - Rodinné doplnky
- `specialized` - Špecializované služby

### Example Request with Filters
```
GET https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/services?category=family_accessories&vehicleCategory=compact
```

### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "_id": "service123",
      "name": "Bez obmedzenia kilometrov",
      "description": "Možnosť jazdiť bez obmedzenia počtu najazdených kilometrov počas celého prenájmu",
      "category": "driving_comfort",
      "categoryName": "Pohodlie pri jazde",
      "pricing": {
        "type": "per_day",
        "amount": 15.00,
        "currency": "EUR",
        "displayPrice": "15,00 € / deň"
      },
      "availability": {
        "isGlobal": true,
        "vehicleCategories": ["economy", "compact", "midsize", "fullsize"],
        "seasonal": {
          "isActive": false,
          "startMonth": 1,
          "endMonth": 12
        }
      },
      "behavior": {
        "isAutoSelected": false,
        "isRequired": false,
        "maxQuantity": 1,
        "requiresApproval": false
      },
      "icon": "🛣️",
      "color": "#4CAF50",
      "sortOrder": 1,
      "isActive": true,
      "isPopular": true
    },
    {
      "_id": "service124",
      "name": "Detská sedačka (0-4 roky)",
      "description": "Bezpečnostná detská sedačka pre deti od 0 do 4 rokov podľa európskych noriem",
      "category": "family_accessories",
      "categoryName": "Rodinné doplnky",
      "pricing": {
        "type": "per_day",
        "amount": 5.00,
        "currency": "EUR",
        "displayPrice": "5,00 € / deň"
      },
      "availability": {
        "isGlobal": true,
        "vehicleCategories": ["compact", "midsize", "fullsize", "suv", "minivan"],
        "seasonal": {
          "isActive": false
        }
      },
      "behavior": {
        "isAutoSelected": false,
        "isRequired": false,
        "maxQuantity": 3,
        "requiresApproval": false
      },
      "icon": "👶",
      "color": "#FF9800",
      "sortOrder": 2,
      "isActive": true,
      "isPopular": false
    },
    {
      "_id": "service125",
      "name": "GPS navigácia",
      "description": "Moderná GPS navigácia s mapami Európy a hlasovým navigovaním v slovenčine",
      "category": "driving_comfort",
      "categoryName": "Pohodlie pri jazde",
      "pricing": {
        "type": "fixed",
        "amount": 25.00,
        "currency": "EUR",
        "displayPrice": "25,00 € / rezervácia"
      },
      "availability": {
        "isGlobal": false,
        "vehicleCategories": ["economy", "compact"],
        "seasonal": {
          "isActive": false
        }
      },
      "behavior": {
        "isAutoSelected": false,
        "isRequired": false,
        "maxQuantity": 1,
        "requiresApproval": false
      },
      "icon": "🗺️",
      "color": "#2196F3",
      "sortOrder": 3,
      "isActive": true,
      "isPopular": true
    },
    {
      "_id": "service126",
      "name": "Plné poistenie (kasko)",
      "description": "Rozšírené poistenie pokrývajúce všetky škody na vozidle s nulovou spoluúčasťou",
      "category": "insurance_assistance",
      "categoryName": "Poistenie a asistenčné služby",
      "pricing": {
        "type": "percentage",
        "amount": 20.00,
        "currency": "EUR",
        "displayPrice": "20% z ceny prenájmu"
      },
      "availability": {
        "isGlobal": true,
        "vehicleCategories": ["luxury", "sports", "suv"],
        "seasonal": {
          "isActive": false
        }
      },
      "behavior": {
        "isAutoSelected": false,
        "isRequired": false,
        "maxQuantity": 1,
        "requiresApproval": true
      },
      "icon": "🛡️",
      "color": "#9C27B0",
      "sortOrder": 4,
      "isActive": true,
      "isPopular": false
    },
    {
      "_id": "service127",
      "name": "Prídavný vodič",
      "description": "Možnosť pridať ďalšieho vodiča k rezervácii za zvýhodnený poplatok",
      "category": "specialized",
      "categoryName": "Špecializované služby",
      "pricing": {
        "type": "fixed",
        "amount": 35.00,
        "currency": "EUR",
        "displayPrice": "35,00 € / vodič"
      },
      "availability": {
        "isGlobal": true,
        "vehicleCategories": ["economy", "compact", "midsize", "fullsize", "luxury", "suv"],
        "seasonal": {
          "isActive": false
        }
      },
      "behavior": {
        "isAutoSelected": false,
        "isRequired": false,
        "maxQuantity": 3,
        "requiresApproval": false
      },
      "icon": "👥",
      "color": "#607D8B",
      "sortOrder": 5,
      "isActive": true,
      "isPopular": false
    }
  ],
  "count": 5,
  "categories": [
    {
      "category": "driving_comfort",
      "name": "Pohodlie pri jazde",
      "count": 2,
      "services": ["service123", "service125"]
    },
    {
      "category": "family_accessories", 
      "name": "Rodinné doplnky",
      "count": 1,
      "services": ["service124"]
    },
    {
      "category": "insurance_assistance",
      "name": "Poistenie a asistenčné služby", 
      "count": 1,
      "services": ["service126"]
    },
    {
      "category": "specialized",
      "name": "Špecializované služby",
      "count": 1,
      "services": ["service127"]
    }
  ]
}
```

### Service Pricing Types
- `per_day` - Daily rate (amount × rental days)
- `fixed` - One-time fixed amount
- `per_km` - Per kilometer rate
- `percentage` - Percentage of rental amount

### Example: Filter Services by Category
```
GET https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/services?category=family_accessories
```

---

## Integration Examples

### JavaScript Example: Complete Booking Flow
```javascript
const API_BASE = 'https://carflow-reservation-system.onrender.com/api/public';
const BUSINESS_EMAIL = 'rival@test.sk';

// 1. Get available services
async function getServices() {
  const response = await fetch(`${API_BASE}/users/${BUSINESS_EMAIL}/services`);
  const data = await response.json();
  return data.success ? data.data : [];
}

// 2. Check car availability
async function checkCarAvailability(carId, startDate, endDate) {
  const response = await fetch(
    `${API_BASE}/users/${BUSINESS_EMAIL}/cars/${carId}/reserved-dates?startDate=${startDate}&endDate=${endDate}`
  );
  const data = await response.json();
  return data.success ? data.data : null;
}

// 3. Create reservation
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
  } else {
    throw new Error(data.message);
  }
}

// Complete booking workflow
async function completeBooking() {
  try {
    // Get services for display
    const services = await getServices();
    console.log('Available services:', services);
    
    // Check car availability
    const carId = 'car123';
    const startDate = '2025-02-01T10:00:00Z';
    const endDate = '2025-02-05T10:00:00Z';
    
    const availability = await checkCarAvailability(carId, startDate, endDate);
    console.log('Car availability:', availability);
    
    if (availability.reservedDates.length === 0) {
      // Car is available, create reservation
      const reservationData = {
        firstName: 'Ján',
        lastName: 'Novák',
        email: 'jan.novak@email.sk',
        phone: '+421901234567',
        carId: carId,
        startDate: startDate,
        endDate: endDate,
        additionalServices: [
          { serviceId: 'service123', quantity: 1 }, // Unlimited kilometers
          { serviceId: 'service124', quantity: 1 }  // Child seat
        ],
        agreeToTerms: true
      };
      
      const reservation = await createReservation(reservationData);
      console.log('Reservation created:', reservation);
      
      // Display QR codes for payment
      if (reservation.qrCodes) {
        console.log('Payment QR codes available');
      }
      
    } else {
      console.log('Car not available for selected dates');
    }
    
  } catch (error) {
    console.error('Booking failed:', error.message);
  }
}
```

### PHP Example: Service Integration
```php
<?php
$apiBase = 'https://carflow-reservation-system.onrender.com/api/public';
$businessEmail = 'rival@test.sk';

// Get services
function getServices($apiBase, $businessEmail) {
    $url = "$apiBase/users/$businessEmail/services";
    $response = file_get_contents($url);
    $data = json_decode($response, true);
    
    return $data['success'] ? $data['data'] : [];
}

// Create reservation
function createReservation($apiBase, $businessEmail, $reservationData) {
    $url = "$apiBase/users/$businessEmail/reservations";
    
    $options = [
        'http' => [
            'header' => "Content-type: application/json\r\n",
            'method' => 'POST',
            'content' => json_encode($reservationData)
        ]
    ];
    
    $context = stream_context_create($options);
    $response = file_get_contents($url, false, $context);
    $data = json_decode($response, true);
    
    return $data;
}

// Usage
$services = getServices($apiBase, $businessEmail);
echo "Available services: " . count($services) . "\n";

foreach ($services as $service) {
    echo "- {$service['name']}: {$service['pricing']['displayPrice']}\n";
}
?>
```

---

## Error Handling

### Common Error Responses

**Car Not Available (409 Conflict)**
```json
{
  "success": false,
  "message": "Car is not available for the selected dates",
  "error": {
    "code": "CAR_NOT_AVAILABLE",
    "conflictingDates": ["2025-02-02", "2025-02-03"],
    "conflictingReservations": ["RES-8264-1738123456789"]
  }
}
```

**Invalid Service (400 Bad Request)**
```json
{
  "success": false,
  "message": "Invalid additional service",
  "error": {
    "code": "INVALID_SERVICE", 
    "details": "Service 'service999' not found or not available for this vehicle"
  }
}
```

**Car Not Found (404 Not Found)**
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

---

## Rate Limits

- **Reservation Creation**: 10 requests per hour per IP
- **Car Availability**: 100 requests per hour per IP  
- **Services**: 200 requests per hour per IP

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
```

---

**Last Updated**: January 2025
**API Version**: 2.0