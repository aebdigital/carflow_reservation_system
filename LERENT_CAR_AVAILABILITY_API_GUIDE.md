# LeRent Car Availability API Guide

## Overview

This guide explains how to fetch unavailable dates (blocked/booked dates) for cars on the LeRent website to prevent double-bookings and show customers when cars are available.

---

## API Endpoints for Availability

### 1. Get Car Calendar (Recommended for Single Car)

**Best for:** Showing unavailable dates on a car detail page or booking calendar

**Endpoint:** `GET /api/public/users/lerent@lerent.sk/cars/:carId/calendar`

**Purpose:** Get all booked dates for a specific car within a date range

**Request:**
```
GET https://carflow-reservation-system.onrender.com/api/public/users/lerent@lerent.sk/cars/64abc123.../calendar?startDate=2025-11-01&endDate=2026-05-01
```

**Query Parameters:**
| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `startDate` | No | Start of date range (defaults to today) | `2025-11-01` |
| `endDate` | No | End of date range (defaults to 6 months from now) | `2026-05-01` |
| `includePending` | No | Include pending reservations (`true`/`false`, default: `false`) | `true` |

**Response:**
```javascript
{
  "success": true,
  "data": {
    "carId": "64abc123...",
    "car": {
      "brand": "BMW",
      "model": "3 Series",
      "year": 2023,
      "status": "active"
    },
    "isOperational": true,
    "calendar": {
      "startDate": "2025-11-01T00:00:00.000Z",
      "endDate": "2026-05-01T00:00:00.000Z",
      "bookedDates": [
        {
          "date": "2025-11-15",
          "isBooked": true,
          "isStart": true,
          "isEnd": false,
          "reservationId": "68fe123...",
          "status": "confirmed"
        },
        {
          "date": "2025-11-16",
          "isBooked": true,
          "isStart": false,
          "isEnd": false,
          "reservationId": "68fe123...",
          "status": "confirmed"
        },
        {
          "date": "2025-11-17",
          "isBooked": true,
          "isStart": false,
          "isEnd": true,
          "reservationId": "68fe123...",
          "status": "confirmed"
        },
        {
          "date": "2025-12-01",
          "isBooked": true,
          "isStart": true,
          "isEnd": true,
          "reservationId": "68fe456...",
          "status": "confirmed"
        }
      ],
      "totalBookedDays": 4,
      "uniqueReservations": 2
    },
    "reservations": [
      {
        "reservationId": "68fe123...",
        "reservationNumber": "RES-1234-...",
        "startDate": "2025-11-15T10:00:00.000Z",
        "endDate": "2025-11-17T10:00:00.000Z",
        "status": "confirmed",
        "customerName": "Ján Novák"
      },
      {
        "reservationId": "68fe456...",
        "reservationNumber": "RES-5678-...",
        "startDate": "2025-12-01T10:00:00.000Z",
        "endDate": "2025-12-01T18:00:00.000Z",
        "status": "confirmed",
        "customerName": "Peter Kovács"
      }
    ]
  }
}
```

---

### 2. Get Reserved Dates for Multiple Cars

**Best for:** Showing availability for multiple cars on a listing page

**Endpoint:** `GET /api/public/users/lerent@lerent.sk/cars/reserved-dates`

**Purpose:** Get booked dates for multiple cars at once (efficient for car lists)

**Request:**
```
GET https://carflow-reservation-system.onrender.com/api/public/users/lerent@lerent.sk/cars/reserved-dates?carIds=64abc123,64def456&startDate=2025-11-01&endDate=2026-01-01
```

**Query Parameters:**
| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `carIds` | No | Comma-separated car IDs (omit for all cars) | `64abc123,64def456` |
| `startDate` | No | Start of date range (defaults to today) | `2025-11-01` |
| `endDate` | No | End of date range (defaults to 3 months from now) | `2026-01-01` |
| `includePending` | No | Include pending reservations (`true`/`false`) | `true` |

**Response:**
```javascript
{
  "success": true,
  "data": {
    "cars": [
      {
        "carId": "64abc123...",
        "brand": "BMW",
        "model": "3 Series",
        "year": 2023,
        "status": "active",
        "reservedDates": [
          {
            "date": "2025-11-15",
            "isStart": true,
            "isEnd": false,
            "reservationId": "68fe123...",
            "status": "confirmed"
          },
          {
            "date": "2025-11-16",
            "isStart": false,
            "isEnd": true,
            "reservationId": "68fe123...",
            "status": "confirmed"
          }
        ],
        "totalReservedDays": 2
      },
      {
        "carId": "64def456...",
        "brand": "Mercedes",
        "model": "E-Class",
        "year": 2024,
        "status": "active",
        "reservedDates": [],
        "totalReservedDays": 0
      }
    ],
    "dateRange": {
      "startDate": "2025-11-01T00:00:00.000Z",
      "endDate": "2026-01-01T00:00:00.000Z"
    }
  }
}
```

---

### 3. Check Availability for Specific Dates

**Best for:** Checking if a car is available for customer-selected dates

**Endpoint:** `GET /api/public/users/lerent@lerent.sk/cars/:carId/availability`

**Purpose:** Check if a specific car is available for a given date range

**Request:**
```
GET https://carflow-reservation-system.onrender.com/api/public/users/lerent@lerent.sk/cars/64abc123.../availability?startDate=2025-11-15T10:00:00Z&endDate=2025-11-17T10:00:00Z
```

**Query Parameters:**
| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `startDate` | Yes | Desired rental start date/time | `2025-11-15T10:00:00Z` |
| `endDate` | Yes | Desired rental end date/time | `2025-11-17T10:00:00Z` |

**Response:**
```javascript
{
  "success": true,
  "data": {
    "isAvailable": false,
    "status": "active",
    "conflicts": [
      {
        "reservationNumber": "RES-1234-...",
        "startDate": "2025-11-15T10:00:00.000Z",
        "endDate": "2025-11-17T10:00:00.000Z",
        "status": "confirmed"
      }
    ]
  }
}
```

Or if available:
```javascript
{
  "success": true,
  "data": {
    "isAvailable": true,
    "status": "active"
  }
}
```

---

## Frontend Implementation Examples

### Example 1: Date Picker with Disabled Dates (React)

```javascript
// src/components/CarBookingCalendar.jsx
import React, { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function CarBookingCalendar({ carId }) {
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [selectedStartDate, setSelectedStartDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);

  useEffect(() => {
    // Fetch unavailable dates for the next 6 months
    const fetchUnavailableDates = async () => {
      const today = new Date();
      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(today.getMonth() + 6);

      const startDate = today.toISOString().split('T')[0];
      const endDate = sixMonthsLater.toISOString().split('T')[0];

      try {
        const response = await fetch(
          `https://carflow-reservation-system.onrender.com/api/public/users/lerent@lerent.sk/cars/${carId}/calendar?startDate=${startDate}&endDate=${endDate}`
        );

        const result = await response.json();

        if (result.success) {
          // Convert booked dates to Date objects
          const bookedDates = result.data.calendar.bookedDates.map(
            item => new Date(item.date)
          );
          setUnavailableDates(bookedDates);
        }
      } catch (error) {
        console.error('Error fetching unavailable dates:', error);
      }
    };

    fetchUnavailableDates();
  }, [carId]);

  // Check if a date is unavailable
  const isDateUnavailable = (date) => {
    return unavailableDates.some(
      unavailableDate =>
        unavailableDate.toDateString() === date.toDateString()
    );
  };

  return (
    <div className="car-booking-calendar">
      <h3>Select Rental Dates</h3>

      <div className="date-pickers">
        <DatePicker
          selected={selectedStartDate}
          onChange={date => setSelectedStartDate(date)}
          selectsStart
          startDate={selectedStartDate}
          endDate={selectedEndDate}
          minDate={new Date()}
          excludeDates={unavailableDates}
          placeholderText="Pickup Date"
          dateFormat="dd/MM/yyyy"
        />

        <DatePicker
          selected={selectedEndDate}
          onChange={date => setSelectedEndDate(date)}
          selectsEnd
          startDate={selectedStartDate}
          endDate={selectedEndDate}
          minDate={selectedStartDate || new Date()}
          excludeDates={unavailableDates}
          placeholderText="Return Date"
          dateFormat="dd/MM/yyyy"
        />
      </div>

      {selectedStartDate && selectedEndDate && (
        <div className="selected-dates-info">
          <p>Rental period: {selectedStartDate.toLocaleDateString()} - {selectedEndDate.toLocaleDateString()}</p>
          <p>Duration: {Math.ceil((selectedEndDate - selectedStartDate) / (1000 * 60 * 60 * 24))} days</p>
        </div>
      )}
    </div>
  );
}

export default CarBookingCalendar;
```

---

### Example 2: Availability Check Before Booking

```javascript
// src/services/availabilityService.js

class AvailabilityService {
  async checkCarAvailability(carId, startDate, endDate) {
    try {
      const start = new Date(startDate).toISOString();
      const end = new Date(endDate).toISOString();

      const response = await fetch(
        `https://carflow-reservation-system.onrender.com/api/public/users/lerent@lerent.sk/cars/${carId}/availability?startDate=${start}&endDate=${end}`
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error('Failed to check availability');
      }

      return {
        isAvailable: result.data.isAvailable,
        conflicts: result.data.conflicts || []
      };
    } catch (error) {
      console.error('Error checking availability:', error);
      throw error;
    }
  }

  async getCarCalendar(carId, monthsAhead = 6) {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setMonth(today.getMonth() + monthsAhead);

      const startDate = today.toISOString().split('T')[0];
      const endDate = futureDate.toISOString().split('T')[0];

      const response = await fetch(
        `https://carflow-reservation-system.onrender.com/api/public/users/lerent@lerent.sk/cars/${carId}/calendar?startDate=${startDate}&endDate=${endDate}`
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error('Failed to fetch car calendar');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching car calendar:', error);
      throw error;
    }
  }

  async getMultipleCarAvailability(carIds, startDate, endDate) {
    try {
      const start = new Date(startDate).toISOString().split('T')[0];
      const end = new Date(endDate).toISOString().split('T')[0];
      const carIdString = carIds.join(',');

      const response = await fetch(
        `https://carflow-reservation-system.onrender.com/api/public/users/lerent@lerent.sk/cars/reserved-dates?carIds=${carIdString}&startDate=${start}&endDate=${end}`
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error('Failed to fetch reserved dates');
      }

      return result.data.cars;
    } catch (error) {
      console.error('Error fetching multiple car availability:', error);
      throw error;
    }
  }
}

export default new AvailabilityService();
```

---

### Example 3: Visual Calendar Component

```javascript
// src/components/CarAvailabilityCalendar.jsx
import React, { useEffect, useState } from 'react';
import availabilityService from '../services/availabilityService';
import './CarAvailabilityCalendar.css';

function CarAvailabilityCalendar({ carId }) {
  const [calendarData, setCalendarData] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadCalendarData();
  }, [carId, currentMonth]);

  const loadCalendarData = async () => {
    try {
      const data = await availabilityService.getCarCalendar(carId, 3);
      setCalendarData(data);
    } catch (error) {
      console.error('Error loading calendar:', error);
    }
  };

  const isDateBooked = (date) => {
    if (!calendarData) return false;

    const dateString = date.toISOString().split('T')[0];
    return calendarData.calendar.bookedDates.some(
      bookedDate => bookedDate.date.split('T')[0] === dateString
    );
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isBooked = isDateBooked(date);
      const isPast = date < new Date();

      days.push(
        <div
          key={day}
          className={`calendar-day ${isBooked ? 'booked' : ''} ${isPast ? 'past' : ''}`}
        >
          <span className="day-number">{day}</span>
          {isBooked && <span className="booked-indicator">●</span>}
        </div>
      );
    }

    return days;
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)));
  };

  if (!calendarData) {
    return <div>Loading calendar...</div>;
  }

  return (
    <div className="availability-calendar">
      <div className="calendar-header">
        <button onClick={prevMonth}>&lt;</button>
        <h3>{currentMonth.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })}</h3>
        <button onClick={nextMonth}>&gt;</button>
      </div>

      <div className="calendar-weekdays">
        <div>Po</div>
        <div>Ut</div>
        <div>St</div>
        <div>Št</div>
        <div>Pi</div>
        <div>So</div>
        <div>Ne</div>
      </div>

      <div className="calendar-grid">
        {renderCalendar()}
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color available"></span>
          <span>Dostupné</span>
        </div>
        <div className="legend-item">
          <span className="legend-color booked"></span>
          <span>Obsadené</span>
        </div>
        <div className="legend-item">
          <span className="legend-color past"></span>
          <span>Minulosť</span>
        </div>
      </div>

      <div className="reservations-summary">
        <h4>Nadchádzajúce rezervácie:</h4>
        {calendarData.reservations.length > 0 ? (
          <ul>
            {calendarData.reservations.map(reservation => (
              <li key={reservation.reservationId}>
                {new Date(reservation.startDate).toLocaleDateString('sk-SK')} -
                {new Date(reservation.endDate).toLocaleDateString('sk-SK')}
                <span className="status">{reservation.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Žiadne rezervácie</p>
        )}
      </div>
    </div>
  );
}

export default CarAvailabilityCalendar;
```

---

## Important Notes

### 1. **Tenant Isolation**

All endpoints use `lerent@lerent.sk` in the URL path, which ensures:
- ✅ Only LeRent cars are returned
- ✅ Only LeRent reservations are included
- ✅ Complete data isolation from other tenants

### 2. **Date Formats**

- **Query Parameters**: Use ISO date format `YYYY-MM-DD` or full ISO `YYYY-MM-DDTHH:mm:ssZ`
- **Response**: All dates are in ISO 8601 format with timezone

### 3. **Reservation Statuses**

By default, only `confirmed` and `ongoing` reservations block dates.

To include `pending` reservations, add `includePending=true`:
```
?includePending=true
```

### 4. **Performance**

- For single car details: Use `/cars/:carId/calendar`
- For car listings: Use `/cars/reserved-dates` (batch request)
- Cache results for 5-10 minutes on frontend to reduce API calls

---

## Complete Example: Booking Flow with Availability Check

```javascript
// src/pages/CarBooking.jsx
import React, { useState } from 'react';
import availabilityService from '../services/availabilityService';
import CarBookingCalendar from '../components/CarBookingCalendar';

function CarBooking({ car }) {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(null);

  const handleBooking = async () => {
    if (!startDate || !endDate) {
      alert('Please select pickup and return dates');
      return;
    }

    setIsChecking(true);
    setAvailabilityError(null);

    try {
      // Check availability before proceeding
      const availability = await availabilityService.checkCarAvailability(
        car._id,
        startDate,
        endDate
      );

      if (!availability.isAvailable) {
        setAvailabilityError(
          'This car is not available for the selected dates. Please choose different dates.'
        );
        setIsChecking(false);
        return;
      }

      // Proceed with booking
      // ... redirect to checkout or create reservation
      console.log('Car is available! Proceeding with booking...');

    } catch (error) {
      setAvailabilityError('Error checking availability. Please try again.');
      console.error(error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="car-booking-page">
      <h1>Book {car.brand} {car.model}</h1>

      <CarBookingCalendar
        carId={car._id}
        onSelectDates={(start, end) => {
          setStartDate(start);
          setEndDate(end);
        }}
      />

      {availabilityError && (
        <div className="error-message">
          {availabilityError}
        </div>
      )}

      <button
        onClick={handleBooking}
        disabled={!startDate || !endDate || isChecking}
      >
        {isChecking ? 'Checking availability...' : 'Proceed to Booking'}
      </button>
    </div>
  );
}

export default CarBooking;
```

---

## Summary

**For LeRent frontend developers:**

1. **Use Calendar API** for date pickers: `/api/public/users/lerent@lerent.sk/cars/:carId/calendar`
2. **Use Availability Check** before booking: `/api/public/users/lerent@lerent.sk/cars/:carId/availability`
3. **Use Reserved Dates** for car listings: `/api/public/users/lerent@lerent.sk/cars/reserved-dates`

All endpoints are public (no authentication required) and tenant-isolated for security.
