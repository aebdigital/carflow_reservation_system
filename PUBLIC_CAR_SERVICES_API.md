# Public Car Services API Endpoints

This document describes the **PUBLIC** API endpoints for viewing car services without authentication. This API is designed for frontend web applications to display car information to customers.

## Base URL
All public endpoints are prefixed with `/api/public`

## Authentication
**NO AUTHENTICATION REQUIRED** - These are public endpoints accessible without tokens.

---

## Extended Insurance (Rozšírené poistenie)

### Get Extended Insurance Options for a Car
```
GET /api/public/users/:email/cars/:carId/extended-insurance
```

**Description:** Returns available extended insurance options for a specific car.

**Parameters:**
- `email` - Tenant owner's email address
- `carId` - Car ID

**Response:**
```json
{
  "success": true,
  "data": {
    "carId": "60d5ec49f1b2c8b1f8123456",
    "carInfo": {
      "brand": "BMW",
      "model": "X5",
      "year": 2023
    },
    "extendedInsurance": [
      {
        "_id": "60d5ec49f1b2c8b1f8123457",
        "name": "Rozšírené poistenie Premium",
        "description": "Kompletné pokrytie škôd vrátane vandalizmu a krádeže",
        "price": 15.50,
        "unit": "per_day"
      },
      {
        "_id": "60d5ec49f1b2c8b1f8123458",
        "name": "Rozšírené poistenie Basic",
        "description": "Základné rozšírené poistenie",
        "price": 8.00,
        "unit": "per_day"
      }
    ]
  }
}
```

---

## Equipment (Výbavy)

### Get Equipment for a Car
```
GET /api/public/users/:email/cars/:carId/equipment
```

**Description:** Returns all equipment/features available in a specific car.

**Parameters:**
- `email` - Tenant owner's email address
- `carId` - Car ID

**Response:**
```json
{
  "success": true,
  "data": {
    "carId": "60d5ec49f1b2c8b1f8123456",
    "carInfo": {
      "brand": "BMW",
      "model": "X5",
      "year": 2023
    },
    "equipment": [
      {
        "_id": "60d5ec49f1b2c8b1f8123459",
        "name": "GPS Navigácia",
        "icon": "gps_fixed",
        "description": "Moderná GPS navigácia s mapami Európy",
        "category": "technology",
        "isStandard": true
      },
      {
        "_id": "60d5ec49f1b2c8b1f8123460",
        "name": "Kožené sedadlá",
        "icon": "airline_seat_legroom_extra",
        "description": "Prémiové kožené sedadlá s vykurovaním",
        "category": "comfort",
        "isStandard": false
      }
    ]
  }
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

---

## Badges (Značky)

### Get Badges for a Car
```
GET /api/public/users/:email/cars/:carId/badges
```

**Description:** Returns all display badges/labels for a specific car.

**Parameters:**
- `email` - Tenant owner's email address
- `carId` - Car ID

**Response:**
```json
{
  "success": true,
  "data": {
    "carId": "60d5ec49f1b2c8b1f8123456",
    "carInfo": {
      "brand": "BMW",
      "model": "X5", 
      "year": 2023
    },
    "badges": [
      {
        "_id": "60d5ec49f1b2c8b1f8123461",
        "text": "NOVINKA",
        "type": "corner",
        "style": {
          "backgroundColor": "#ff4444",
          "textColor": "#ffffff",
          "position": "top-right"
        },
        "priority": 1,
        "isActive": true
      },
      {
        "_id": "60d5ec49f1b2c8b1f8123462",
        "text": "POPULÁRNE",
        "type": "pill",
        "style": {
          "backgroundColor": "#4caf50",
          "textColor": "#ffffff",
          "position": "top-left"
        },
        "priority": 2,
        "isActive": true
      }
    ]
  }
}
```

**Badge Types:**
- `corner` - Rohová značka (pre rohy obrázkov)
- `pill` - Okrúhla značka (pre texty v piliach)

**Badge Positions:**
- `top-left` - Ľavý horný roh
- `top-right` - Pravý horný roh  
- `bottom-left` - Ľavý dolný roh
- `bottom-right` - Pravý dolný roh

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Car not found"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `404` - Car not found or User not found
- `500` - Internal Server Error

---

## Usage Examples

### Getting Extended Insurance for a BMW X5
```bash
curl "http://localhost:3001/api/public/users/admin@example.com/cars/60d5ec49f1b2c8b1f8123456/extended-insurance"
```

### Getting Equipment for a Car
```bash
curl "http://localhost:3001/api/public/users/admin@example.com/cars/60d5ec49f1b2c8b1f8123456/equipment"
```

### Getting Badges for a Car
```bash
curl "http://localhost:3001/api/public/users/admin@example.com/cars/60d5ec49f1b2c8b1f8123456/badges"
```

### JavaScript Fetch Examples

```javascript
// Get extended insurance options
const getExtendedInsurance = async (email, carId) => {
  const response = await fetch(`/api/public/users/${email}/cars/${carId}/extended-insurance`);
  const data = await response.json();
  return data.data.extendedInsurance;
};

// Get car equipment
const getCarEquipment = async (email, carId) => {
  const response = await fetch(`/api/public/users/${email}/cars/${carId}/equipment`);
  const data = await response.json();
  return data.data.equipment;
};

// Get car badges
const getCarBadges = async (email, carId) => {
  const response = await fetch(`/api/public/users/${email}/cars/${carId}/badges`);
  const data = await response.json();
  return data.data.badges;
};
```

### React Example

```jsx
import React, { useEffect, useState } from 'react';

const CarDetails = ({ tenantEmail, carId }) => {
  const [extendedInsurance, setExtendedInsurance] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCarDetails = async () => {
      try {
        const [insuranceRes, equipmentRes, badgesRes] = await Promise.all([
          fetch(`/api/public/users/${tenantEmail}/cars/${carId}/extended-insurance`),
          fetch(`/api/public/users/${tenantEmail}/cars/${carId}/equipment`),
          fetch(`/api/public/users/${tenantEmail}/cars/${carId}/badges`)
        ]);

        const insuranceData = await insuranceRes.json();
        const equipmentData = await equipmentRes.json();
        const badgesData = await badgesRes.json();

        setExtendedInsurance(insuranceData.data.extendedInsurance);
        setEquipment(equipmentData.data.equipment);
        setBadges(badgesData.data.badges);
      } catch (error) {
        console.error('Error fetching car details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCarDetails();
  }, [tenantEmail, carId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {/* Car Badges */}
      <div className="car-badges">
        {badges.map(badge => (
          <span 
            key={badge._id}
            className={`badge badge-${badge.type}`}
            style={{
              backgroundColor: badge.style.backgroundColor,
              color: badge.style.textColor
            }}
          >
            {badge.text}
          </span>
        ))}
      </div>

      {/* Car Equipment */}
      <div className="car-equipment">
        <h3>Výbava vozidla</h3>
        <ul>
          {equipment.map(item => (
            <li key={item._id}>
              <i className={`icon ${item.icon}`}></i>
              <strong>{item.name}</strong>
              {item.isStandard && <span className="standard">Štandardne</span>}
              <p>{item.description}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Extended Insurance */}
      <div className="extended-insurance">
        <h3>Rozšírené poistenie</h3>
        {extendedInsurance.map(insurance => (
          <div key={insurance._id} className="insurance-option">
            <h4>{insurance.name}</h4>
            <p>{insurance.description}</p>
            <span className="price">
              {insurance.price}€ / {insurance.unit === 'per_day' ? 'deň' : insurance.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CarDetails;
```

---

## Notes

1. **No Authentication Required** - These are completely public endpoints
2. **Tenant Separation** - Each tenant's data is accessed via their email address
3. **Active Cars Only** - Only returns data for active, available cars
4. **Available Insurance Only** - Extended insurance endpoint filters to show only available options
5. **Active Badges Only** - Only returns badges where `isActive: true`
6. **Rate Limited** - Public endpoints have rate limiting to prevent abuse
7. **CORS Enabled** - Accessible from web browsers and different domains

These endpoints are perfect for building customer-facing websites, car listing pages, and booking interfaces where users need to see car details without authentication.