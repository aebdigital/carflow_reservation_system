# Public Car Pricing API

## Endpoint: GET /api/public/cars/:id/pricing

### Description
Get comprehensive pricing information for a specific car. This endpoint is public and requires no authentication.

### URL
```
GET /api/public/cars/:id/pricing
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Car ID (MongoDB ObjectId) |
| `days` | integer | No | Number of rental days for price calculation |

### Request Examples

#### Basic pricing information:
```bash
GET /api/public/cars/64a1b2c3d4e5f6789abcdef0/pricing
```

#### With price calculation for 7 days:
```bash
GET /api/public/cars/64a1b2c3d4e5f6789abcdef0/pricing?days=7
```

### Response Format

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "carId": "64a1b2c3d4e5f6789abcdef0",
    "carInfo": {
      "brand": "Skoda",
      "model": "Fabia",
      "year": 2020
    },
    "pricing": {
      "dailyRate": 25,
      "deposit": 200,
      "rates": {
        "1day": 30,
        "2-3days": 28,
        "4-10days": 25,
        "11-17days": 23,
        "18-24days": 21,
        "25-29days": 19,
        "30plus": "dohoda - volať/písať mail"
      },
      "weeklyRate": 160,
      "monthlyRate": 600
    },
    "calculation": {
      "days": 7,
      "totalPrice": 175,
      "dailyRate": 25,
      "appliedRate": "4-10 days rate"
    }
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `carId` | string | Unique car identifier |
| `carInfo.brand` | string | Car brand |
| `carInfo.model` | string | Car model |
| `carInfo.year` | number | Car year |
| `pricing.dailyRate` | number | Base daily rate (€) |
| `pricing.deposit` | number | Required deposit amount (€) |
| `pricing.rates.1day` | number/null | Special rate for 1 day rental |
| `pricing.rates.2-3days` | number/null | Daily rate for 2-3 day rentals |
| `pricing.rates.4-10days` | number/null | Daily rate for 4-10 day rentals |
| `pricing.rates.11-17days` | number/null | Daily rate for 11-17 day rentals |
| `pricing.rates.18-24days` | number/null | Daily rate for 18-24 day rentals |
| `pricing.rates.25-29days` | number/null | Daily rate for 25-29 day rentals |
| `pricing.rates.30plus` | string | Contact message for 30+ day rentals |
| `pricing.weeklyRate` | number/null | Weekly rate (€) |
| `pricing.monthlyRate` | number/null | Monthly rate (€) |
| `calculation` | object | Only present when `days` parameter is provided |
| `calculation.days` | number | Number of days for calculation |
| `calculation.totalPrice` | number | Total calculated price (€) |
| `calculation.dailyRate` | number | Effective daily rate used |
| `calculation.appliedRate` | string | Description of which rate tier was applied |

### Rate Calculation Logic

The system applies rates in the following priority order:

1. **1 day**: Uses `1day` rate if available, otherwise falls back to `dailyRate`
2. **2-3 days**: Uses `2-3days` rate × days if available
3. **4-10 days**: Uses `4-10days` rate × days if available
4. **11-17 days**: Uses `11-17days` rate × days if available
5. **18-24 days**: Uses `18-24days` rate × days if available
6. **25-29 days**: Uses `25-29days` rate × days if available
7. **30+ days**: Contact for pricing (uses monthly rate calculation if available)

If no specific rate is configured for a range, it falls back to:
- Weekly rate calculation (if days ≥ 7 and weekly rate is set)
- Monthly rate calculation (if days ≥ 30 and monthly rate is set)
- Daily rate × number of days

### Error Responses

#### Car Not Found (404)
```json
{
  "success": false,
  "error": "Car not found"
}
```

#### Invalid Car ID (400)
```json
{
  "success": false,
  "error": "Invalid car ID format"
}
```

#### Server Error (500)
```json
{
  "success": false,
  "error": "Error retrieving car pricing"
}
```

### Usage Examples

#### Frontend JavaScript
```javascript
// Get basic pricing
const response = await fetch('/api/public/cars/64a1b2c3d4e5f6789abcdef0/pricing');
const data = await response.json();

if (data.success) {
  console.log('Daily rate:', data.data.pricing.dailyRate);
  console.log('Deposit:', data.data.pricing.deposit);
  console.log('Available rates:', data.data.pricing.rates);
}

// Get pricing with calculation for 5 days
const calcResponse = await fetch('/api/public/cars/64a1b2c3d4e5f6789abcdef0/pricing?days=5');
const calcData = await calcResponse.json();

if (calcData.success && calcData.data.calculation) {
  console.log('Total for 5 days:', calcData.data.calculation.totalPrice);
  console.log('Applied rate:', calcData.data.calculation.appliedRate);
}
```

#### cURL
```bash
# Basic pricing
curl -X GET "https://your-domain.com/api/public/cars/64a1b2c3d4e5f6789abcdef0/pricing"

# With calculation
curl -X GET "https://your-domain.com/api/public/cars/64a1b2c3d4e5f6789abcdef0/pricing?days=14"
```

### Notes

- All prices are in EUR (€)
- The `deposit` amount is separate from rental pricing
- Special rates (`25-29days`) will only be returned if configured in the admin panel
- The `calculation` object is only included when the `days` parameter is provided
- This endpoint uses the same calculation logic as the reservation system
- Response includes `null` values for unconfigured rate tiers

### Related Endpoints

- `GET /api/public/cars` - List all available cars
- `GET /api/public/cars/:id` - Get full car details
- `GET /api/public/cars/:id/calendar` - Get car availability calendar