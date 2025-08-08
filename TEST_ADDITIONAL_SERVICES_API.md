# Additional Services Public API - Field Analysis

## Endpoints that return "typ účtovania" (pricing.type):

### 1. **GET /api/public/services**
- **Description**: Get all public additional services
- **Authentication**: None required
- **Includes pricing.type**: ✅ **YES**

### 2. **GET /api/public/users/:email/services** 
- **Description**: Get public services for specific tenant
- **Authentication**: None required
- **Includes pricing.type**: ✅ **YES**

### 3. **GET /api/public/services/vehicle/:vehicleId**
- **Description**: Get services available for specific vehicle
- **Authentication**: None required  
- **Includes pricing.type**: ✅ **YES**

### 4. **GET /api/additional-services/public**
- **Description**: Get public services (alternate route)
- **Authentication**: None required
- **Includes pricing.type**: ✅ **YES**

## Sample Response Structure:

```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789abcdef0",
      "tenantId": "64a1b2c3d4e5f6789abcdef1",
      "name": "GPS navigácia",
      "description": "Moderná GPS navigácia s mapami Európy",
      "category": "driving_comfort",
      "image": {
        "url": "https://storage.googleapis.com/...",
        "filename": "gps.jpg"
      },
      "color": "#2196f3",
      "icon": "navigation",
      "pricing": {
        "type": "per_day",     // ← This is "typ účtovania"!
        "amount": 5,
        "currency": "EUR"
      },
      "availability": {
        "isGlobal": true,
        "vehicleCategories": ["economy", "midsize"],
        "excludedVehicles": []
      },
      "behavior": {
        "isRequired": false,
        "isAutoSelected": false,
        "maxQuantity": 1,
        "dependsOn": []
      },
      "dynamicPricing": {
        "isEnabled": false
      },
      "isActive": true,
      "isPublic": true,
      "sortOrder": 1,
      "createdAt": "2023-07-02T10:30:00.000Z",
      "updatedAt": "2023-07-02T10:30:00.000Z"
    }
  ]
}
```

## Pricing Type Values:

The `pricing.type` field can have these values:

| Value | Slovak Label | Description |
|-------|--------------|-------------|
| `fixed` | Pevná cena | Jednorazový poplatok |
| `per_day` | Cena za deň | Počet dní × cena |
| `per_km` | Cena za km | Počet kilometrov × cena |
| `percentage` | Percentuálny poplatok | % zo základnej ceny |

## Conclusion:

✅ **YES** - The "typ účtovania" (pricing.type) field **IS included** in all public additional services API endpoints.

The public API returns the complete AdditionalService document (excluding sensitive fields), which includes the pricing.type field that corresponds to "typ účtovania" in the admin interface.