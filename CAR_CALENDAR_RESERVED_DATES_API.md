# 📅 Car Calendar & Reserved Dates API Documentation

## Overview
This documentation covers all endpoints for checking car availability, reserved dates, and booking calendars in the CarFlow system. These endpoints are essential for frontend integration when displaying car availability calendars, checking booking conflicts, and showing reserved periods.

**Base URL**: `https://carflow-reservation-system.onrender.com/api/public`

## 🚀 Quick Reference

| Endpoint | Method | Purpose | Tenant-Specific |
|----------|--------|---------|----------------|
| `/cars/:id/calendar` | GET | Get general car calendar | ❌ No |
| `/users/:email/cars/:carId/calendar` | GET | Get car calendar for tenant | ✅ Yes |
| `/users/:email/cars/:carId/availability` | GET | Check specific date availability | ✅ Yes |
| `/users/:email/cars/reserved-dates` | GET | Get reserved dates for multiple cars | ✅ Yes |

---

## 📋 General Endpoints (No Tenant Restriction)

### 1. Get Car Calendar (General)
**GET** `/cars/:id/calendar`

Returns booking calendar for any car without tenant restrictions.

**Parameters:**
- `id` (string): Car ID

**Query Parameters:**
- `startDate` (optional): Start date for calendar (ISO format: YYYY-MM-DD)
- `endDate` (optional): End date for calendar (ISO format: YYYY-MM-DD)
- `includePending` (optional): Include pending reservations (`true`/`false`)

**Default Behavior:**
- If no dates provided: Shows next 6 months
- Status filter: Only `confirmed` and `ongoing` reservations
- Date format: All dates returned in ISO format

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/cars/64f5b8c2e1234567890abcde/calendar?startDate=2025-01-01&endDate=2025-03-31&includePending=true"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "carId": "64f5b8c2e1234567890abcde",
    "car": {
      "brand": "BMW",
      "model": "X5",
      "year": 2023,
      "status": "active"
    },
    "isOperational": true,
    "calendar": {
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-03-31T23:59:59.999Z",
      "bookedDates": [
        {
          "date": "2025-01-15",
          "reservationNumber": "RES-TEST-1234567890",
          "status": "confirmed",
          "isStartDate": true,
          "isEndDate": false
        },
        {
          "date": "2025-01-16", 
          "reservationNumber": "RES-TEST-1234567890",
          "status": "confirmed",
          "isStartDate": false,
          "isEndDate": false
        },
        {
          "date": "2025-01-17",
          "reservationNumber": "RES-TEST-1234567890", 
          "status": "confirmed",
          "isStartDate": false,
          "isEndDate": true
        }
      ],
      "totalBookedDays": 3
    }
  }
}
```

---

## 🏢 Tenant-Specific Endpoints

### 2. Get Car Calendar (Tenant-Specific)
**GET** `/users/:email/cars/:carId/calendar`

Returns detailed booking calendar for a car within a specific tenant, including customer information.

**Parameters:**
- `email` (string): Email of any user from the target tenant
- `carId` (string): Car ID

**Query Parameters:**
- `startDate` (optional): Start date for calendar (ISO format)
- `endDate` (optional): End date for calendar (ISO format)
- `includePending` (optional): Include pending reservations (`true`/`false`)

**Features:**
- ✅ Tenant-isolated data
- ✅ Customer names included
- ✅ Detailed reservation information
- ✅ Start/end date markers for each reservation

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars/64f5b8c2e1234567890abcde/calendar?startDate=2025-01-01&endDate=2025-02-28"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "carId": "64f5b8c2e1234567890abcde",
    "car": {
      "brand": "BMW",
      "model": "X5", 
      "year": 2023,
      "status": "active"
    },
    "isOperational": true,
    "calendar": {
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-02-28T23:59:59.999Z",
      "bookedDates": [
        {
          "date": "2025-01-15",
          "reservationNumber": "RES-RIVAL-1234567890",
          "status": "confirmed",
          "isStartDate": true,
          "isEndDate": false
        }
      ],
      "totalBookedDays": 5,
      "uniqueReservations": 2
    },
    "reservations": [
      {
        "reservationNumber": "RES-RIVAL-1234567890",
        "startDate": "2025-01-15T10:00:00.000Z",
        "endDate": "2025-01-19T18:00:00.000Z",
        "status": "confirmed",
        "customerName": "John Doe"
      }
    ]
  }
}
```

### 3. Check Car Availability (Tenant-Specific)
**GET** `/users/:email/cars/:carId/availability`

Checks if a car is available for specific dates within a tenant.

**Parameters:**
- `email` (string): Email of any user from the target tenant
- `carId` (string): Car ID

**Query Parameters:**
- `startDate` (required): Check from this date (ISO format)
- `endDate` (required): Check until this date (ISO format)

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars/64f5b8c2e1234567890abcde/availability?startDate=2025-02-01&endDate=2025-02-05"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "isAvailable": true,
    "status": "active",
    "isAvailableForDates": true,
    "conflictingReservations": 0
  }
}
```

### 4. Get Reserved Dates for Multiple Cars
**GET** `/users/:email/cars/reserved-dates`

Returns reserved dates and booking information for multiple cars within a tenant.

**Parameters:**
- `email` (string): Email of any user from the target tenant

**Query Parameters:**
- `carIds` (optional): Comma-separated list of car IDs to filter
- `startDate` (optional): Start date for search (default: today)
- `endDate` (optional): End date for search (default: +3 months)
- `includePending` (optional): Include pending reservations (`true`/`false`)

**Use Cases:**
- 🚗 Fleet availability overview
- 📊 Booking analytics dashboard
- 📅 Multi-car calendar displays
- 📈 Utilization reports

**Example Request:**
```bash
curl "https://carflow-reservation-system.onrender.com/api/public/users/rival@test.sk/cars/reserved-dates?carIds=64f5b8c2e1234567890abcde,64f5b8c2e1234567890abcdf&startDate=2025-01-01&endDate=2025-03-31"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "cars": [
      {
        "car": {
          "id": "64f5b8c2e1234567890abcde",
          "brand": "BMW",
          "model": "X5",
          "year": 2023,
          "status": "active"
        },
        "reservations": [
          {
            "reservationNumber": "RES-RIVAL-1234567890",
            "startDate": "2025-01-15T10:00:00.000Z",
            "endDate": "2025-01-19T18:00:00.000Z",
            "status": "confirmed",
            "customerName": "John Doe",
            "daysInRange": 5
          }
        ],
        "bookedDays": 5
      }
    ],
    "summary": {
      "totalCars": 2,
      "totalReservations": 3,
      "dateRange": {
        "start": "2025-01-01T00:00:00.000Z",
        "end": "2025-03-31T23:59:59.999Z"
      },
      "totalBookedDays": 15
    }
  }
}
```

---

## 🛠️ Implementation Examples

### Frontend Calendar Integration (React)

```javascript
// Fetch car calendar data
const fetchCarCalendar = async (carId, email) => {
  try {
    const response = await fetch(
      `https://carflow-reservation-system.onrender.com/api/public/users/${email}/cars/${carId}/calendar?startDate=2025-01-01&endDate=2025-12-31`
    );
    const data = await response.json();
    
    if (data.success) {
      return data.data.calendar.bookedDates;
    }
  } catch (error) {
    console.error('Failed to fetch calendar:', error);
    return [];
  }
};

// Check if date is available
const isDateAvailable = (date, bookedDates) => {
  return !bookedDates.some(booking => booking.date === date);
};

// Usage in calendar component
const CalendarComponent = ({ carId, tenantEmail }) => {
  const [bookedDates, setBookedDates] = useState([]);
  
  useEffect(() => {
    fetchCarCalendar(carId, tenantEmail)
      .then(setBookedDates);
  }, [carId, tenantEmail]);
  
  const renderDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const isBooked = !isDateAvailable(dateStr, bookedDates);
    
    return (
      <div className={`calendar-date ${isBooked ? 'booked' : 'available'}`}>
        {date.getDate()}
      </div>
    );
  };
};
```

### Fleet Overview Dashboard

```javascript
// Fetch fleet availability
const fetchFleetStatus = async (tenantEmail) => {
  try {
    const response = await fetch(
      `https://carflow-reservation-system.onrender.com/api/public/users/${tenantEmail}/cars/reserved-dates?includePending=true`
    );
    const data = await response.json();
    
    if (data.success) {
      return {
        cars: data.data.cars,
        summary: data.data.summary
      };
    }
  } catch (error) {
    console.error('Failed to fetch fleet status:', error);
    return { cars: [], summary: {} };
  }
};
```

### Date Availability Checker

```javascript
// Check specific date range availability
const checkAvailability = async (carId, tenantEmail, startDate, endDate) => {
  try {
    const response = await fetch(
      `https://carflow-reservation-system.onrender.com/api/public/users/${tenantEmail}/cars/${carId}/availability?startDate=${startDate}&endDate=${endDate}`
    );
    const data = await response.json();
    
    return data.success ? data.data.isAvailableForDates : false;
  } catch (error) {
    console.error('Failed to check availability:', error);
    return false;
  }
};
```

---

## 📊 Response Field Reference

### Calendar Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `carId` | string | Unique car identifier |
| `car` | object | Basic car information (brand, model, year, status) |
| `isOperational` | boolean | Whether car is currently operational |
| `calendar.startDate` | string | Calendar start date (ISO format) |
| `calendar.endDate` | string | Calendar end date (ISO format) |
| `calendar.bookedDates` | array | Array of booked date objects |
| `calendar.totalBookedDays` | number | Total number of booked days |
| `bookedDates[].date` | string | Date in YYYY-MM-DD format |
| `bookedDates[].reservationNumber` | string | Unique reservation identifier |
| `bookedDates[].status` | string | Reservation status (confirmed, ongoing, pending) |
| `bookedDates[].isStartDate` | boolean | Whether this is the reservation start date |
| `bookedDates[].isEndDate` | boolean | Whether this is the reservation end date |

### Reservation Status Values

| Status | Description |
|--------|-------------|
| `pending` | Reservation awaiting approval |
| `confirmed` | Approved and confirmed reservation |
| `ongoing` | Currently active rental |
| `completed` | Finished rental |
| `cancelled` | Cancelled reservation |
| `no-show` | Customer didn't show up |

---

## 🚨 Error Handling

### Common Error Responses

```json
{
  "success": false,
  "error": "Car not found with id: invalid-car-id"
}
```

```json
{
  "success": false,
  "error": "End date must be after start date"
}
```

```json
{
  "success": false,
  "error": "User not found with email: invalid@email.com"
}
```

### Error Prevention Tips

1. **Validate Car IDs**: Ensure car IDs are valid MongoDB ObjectIds
2. **Check Date Formats**: Use ISO date format (YYYY-MM-DD)
3. **Verify Email Addresses**: Ensure tenant email exists in the system
4. **Handle Timezones**: All dates are handled in UTC
5. **Rate Limiting**: Implement reasonable request intervals

---

## 🎯 Use Case Examples

### Booking Calendar Widget
```javascript
// Display availability calendar for car selection
const bookingCalendar = await fetchCarCalendar(carId, tenantEmail);
// Show booked dates in red, available dates in green
```

### Fleet Management Dashboard
```javascript
// Show overview of all cars and their current bookings
const fleetStatus = await fetchFleetStatus(tenantEmail);
// Display utilization rates, upcoming reservations
```

### Availability Validator
```javascript
// Before creating reservation, check if dates are free
const isAvailable = await checkAvailability(carId, tenantEmail, startDate, endDate);
if (!isAvailable) {
  showError('Selected dates are not available');
}
```

### Multi-Car Comparison
```javascript
// Compare availability across multiple cars
const reservedDates = await fetchReservedDates(tenantEmail, carIds);
// Show side-by-side calendar comparison
```

---

## 🔗 Related APIs

- **[Car Listings API](CAR_LISTINGS_API.md)**: For browsing available cars
- **[Public Reservation API](PUBLIC_RESERVATION_API.md)**: For creating bookings
- **[Website Settings API](WEBSITE_SETTINGS_API.md)**: For tenant customization

---

## 📝 Integration Checklist

- [ ] Choose appropriate endpoint (general vs tenant-specific)
- [ ] Implement proper date validation
- [ ] Handle timezone conversions appropriately  
- [ ] Add loading states for API calls
- [ ] Implement error handling and user feedback
- [ ] Test with various date ranges and car IDs
- [ ] Optimize API calls (caching, debouncing)
- [ ] Ensure responsive calendar display
- [ ] Add accessibility features for date pickers
- [ ] Test across different tenant configurations

---

*Last Updated: December 2024*
*API Version: 1.0* 