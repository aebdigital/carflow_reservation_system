# Car Services API Endpoints

This document describes the new API endpoints for managing car services: extended insurance (rozšírené poistenie), equipment (výbavy), and badges (značky).

## Base URL
All endpoints are prefixed with `/api/cars`

## Authentication
All endpoints require authentication and admin/staff role access.

---

## Extended Insurance (Rozšírené poistenie)

### Get All Extended Insurance Options
```
GET /api/cars/extended-insurance
```
Returns extended insurance options across all cars.

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "carId": "60d5ec49f1b2c8b1f8123456",
      "carName": "BMW X5 2023",
      "insuranceId": "60d5ec49f1b2c8b1f8123457",
      "name": "Rozšírené poistenie Premium",
      "description": "Kompletné pokrytie škôd vrátane vandalizmu",
      "price": 15.50,
      "unit": "per_day",
      "isAvailable": true
    }
  ]
}
```

### Add Extended Insurance to Car
```
POST /api/cars/:carId/extended-insurance
```

**Request Body:**
```json
{
  "name": "Rozšírené poistenie Premium",
  "description": "Kompletné pokrytie škôd vrátane vandalizmu",
  "price": 15.50,
  "unit": "per_day"
}
```

### Update Extended Insurance
```
PUT /api/cars/:carId/extended-insurance/:insuranceId
```

**Request Body:**
```json
{
  "name": "Rozšírené poistenie Premium Plus",
  "description": "Updated description",
  "price": 18.00,
  "unit": "per_day",
  "isAvailable": true
}
```

### Delete Extended Insurance
```
DELETE /api/cars/:carId/extended-insurance/:insuranceId
```

---

## Equipment (Výbavy)

### Get All Equipment
```
GET /api/cars/equipment
```
Returns all equipment across all cars.

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "carId": "60d5ec49f1b2c8b1f8123456",
      "carName": "BMW X5 2023",
      "equipmentId": "60d5ec49f1b2c8b1f8123458",
      "name": "GPS Navigácia",
      "icon": "gps_fixed",
      "description": "Moderná GPS navigácia s mapami Európy",
      "category": "technology",
      "isStandard": true
    }
  ]
}
```

### Get Equipment for Specific Car
```
GET /api/cars/:carId/equipment
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": {
    "carId": "60d5ec49f1b2c8b1f8123456",
    "carName": "BMW X5 2023",
    "equipment": [
      {
        "_id": "60d5ec49f1b2c8b1f8123458",
        "name": "GPS Navigácia",
        "icon": "gps_fixed",
        "description": "Moderná GPS navigácia s mapami Európy",
        "category": "technology",
        "isStandard": true
      }
    ]
  }
}
```

### Add Equipment to Car
```
POST /api/cars/:carId/equipment
```

**Request Body:**
```json
{
  "name": "Kožené sedadlá",
  "icon": "airline_seat_legroom_extra",
  "description": "Prémiové kožené sedadlá s vykurovaním",
  "category": "comfort",
  "isStandard": false
}
```

**Equipment Categories:**
- `safety` - Bezpečnosť
- `comfort` - Pohodlie
- `technology` - Technológie
- `performance` - Výkon
- `exterior` - Exteriér
- `interior` - Interiér
- `custom` - Vlastné

### Update Equipment
```
PUT /api/cars/:carId/equipment/:equipmentId
```

### Delete Equipment
```
DELETE /api/cars/:carId/equipment/:equipmentId
```

---

## Badges (Značky)

### Get All Badges
```
GET /api/cars/badges
```
Returns all badges across all cars.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "carId": "60d5ec49f1b2c8b1f8123456",
      "carName": "BMW X5 2023",
      "badgeId": "60d5ec49f1b2c8b1f8123459",
      "text": "NOVINKA",
      "type": "corner",
      "style": {
        "backgroundColor": "#ff4444",
        "textColor": "#ffffff",
        "position": "top-right"
      },
      "priority": 1,
      "isActive": true
    }
  ]
}
```

### Get Badges for Specific Car
```
GET /api/cars/:carId/badges
```

### Add Badge to Car
```
POST /api/cars/:carId/badges
```

**Request Body:**
```json
{
  "text": "NOVINKA",
  "type": "corner",
  "style": {
    "backgroundColor": "#ff4444",
    "textColor": "#ffffff",
    "position": "top-right"
  },
  "priority": 1,
  "isActive": true
}
```

**Badge Types:**
- `corner` - Rohová značka
- `pill` - Okrúhla značka

**Badge Positions:**
- `top-left` - Ľavý horný roh
- `top-right` - Pravý horný roh (default)
- `bottom-left` - Ľavý dolný roh
- `bottom-right` - Pravý dolný roh

### Update Badge
```
PUT /api/cars/:carId/badges/:badgeId
```

### Delete Badge
```
DELETE /api/cars/:carId/badges/:badgeId
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message in Slovak"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Usage Examples

### Adding Extended Insurance to BMW X5
```bash
curl -X POST "http://localhost:3001/api/cars/60d5ec49f1b2c8b1f8123456/extended-insurance" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rozšírené poistenie Premium",
    "description": "Kompletné pokrytie škôd vrátane vandalizmu a krádeže",
    "price": 15.50,
    "unit": "per_day"
  }'
```

### Adding GPS Equipment
```bash
curl -X POST "http://localhost:3001/api/cars/60d5ec49f1b2c8b1f8123456/equipment" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPS Navigácia",
    "icon": "gps_fixed",
    "description": "Moderná GPS navigácia s mapami Európy",
    "category": "technology",
    "isStandard": true
  }'
```

### Adding "NEW" Badge
```bash
curl -X POST "http://localhost:3001/api/cars/60d5ec49f1b2c8b1f8123456/badges" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "NOVINKA",
    "type": "corner",
    "style": {
      "backgroundColor": "#ff4444",
      "textColor": "#ffffff",
      "position": "top-right"
    },
    "priority": 1,
    "isActive": true
  }'
```

---

## Notes

1. All endpoints support tenant separation - users can only access cars within their tenant
2. Extended insurance is stored as part of the car's `addons` array
3. Equipment is stored in the car's `equipment` array
4. Badges are stored in the car's `badges` array
5. Badge text is limited to 20 characters maximum
6. All endpoints require admin or staff role permissions