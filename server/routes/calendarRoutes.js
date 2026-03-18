const express = require('express');
const router = express.Router();
const ical = require('ical-generator').default;
const CalendarToken = require('../models/CalendarToken');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// NitraCar tenant email for filtering
const NITRACAR_EMAIL = 'nitra-car@nitra-car.sk';

/**
 * GET /api/calendar/ics
 * Public endpoint - returns ICS calendar feed for a valid token
 * Used by Apple Calendar, Google Calendar, Outlook, etc.
 */
router.get('/ics', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Missing token parameter' });
    }

    // Find and validate the token
    const calendarToken = await CalendarToken.findByToken(token);

    if (!calendarToken) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Get user info to verify it's a NitraCar user
    const user = await User.findById(calendarToken.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is NitraCar (only NitraCar users can use this feature)
    const isNitraCar = user.email?.toLowerCase() === NITRACAR_EMAIL.toLowerCase() ||
                       user.tenantEmail?.toLowerCase() === NITRACAR_EMAIL.toLowerCase();

    if (!isNitraCar) {
      return res.status(403).json({ message: 'Calendar feed is only available for NitraCar users' });
    }

    // Record access for security monitoring
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await calendarToken.recordAccess(clientIp);

    // Fetch active reservations for this tenant
    const reservations = await Reservation.find({
      tenantId: calendarToken.tenantId,
      status: { $in: ['confirmed', 'awaiting_payment', 'zaplatene', 'ongoing'] }
    })
    .populate('customer', 'firstName lastName email phone')
    .populate('car', 'make model licensePlate year color brand registrationNumber')
    .sort({ startDate: 1 });

    // Create ICS calendar
    const calendar = ical({
      name: 'NitraCar Rezervacie',
      prodId: { company: 'CarFlow', product: 'NitraCar Calendar', language: 'SK' },
      timezone: 'Europe/Bratislava',
      ttl: 300 // Refresh every 5 minutes
    });

    // Add each reservation as an all-day event
    for (const reservation of reservations) {
      const customerName = reservation.customer
        ? `${reservation.customer.firstName || ''} ${reservation.customer.lastName || ''}`.trim()
        : 'Neznamy zakaznik';

      const carInfo = reservation.car
        ? `${reservation.car.brand || reservation.car.make || ''} ${reservation.car.model || ''}`.trim()
        : 'Neznamy vozidlo';

      const licensePlate = reservation.car?.registrationNumber || reservation.car?.licensePlate || '';

      // Create event summary: "BRAND MODEL - Customer Name"
      const summary = `${carInfo}${licensePlate ? ` (${licensePlate})` : ''} - ${customerName}`;

      // Create detailed description
      const description = buildEventDescription(reservation, customerName, carInfo);

      // Create a single all-day spanning event for the entire rental period
      const startDate = new Date(reservation.startDate);
      const endDate = new Date(reservation.endDate);

      // For all-day events, end date must be the day AFTER the last day (exclusive)
      const endDateExclusive = new Date(endDate);
      endDateExclusive.setDate(endDateExclusive.getDate() + 1);

      calendar.createEvent({
        id: reservation._id.toString(),
        summary: summary,
        description: description,
        start: startDate,
        end: endDateExclusive,
        allDay: true,
        timestamp: reservation.updatedAt || reservation.createdAt,
        categories: [{ name: 'Rezervacia' }],
        status: 'CONFIRMED',
        location: reservation.pickupLocation?.name || '',
        url: `https://admindemo.carflow.sk/reservations?id=${reservation._id}`
      });
    }

    // Generate ICS content
    const icsContent = calendar.toString();

    // Set headers for calendar subscription
    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="nitracar-calendar.ics"',
      'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
    });

    res.send(icsContent);

  } catch (error) {
    console.error('Error generating ICS calendar:', error);
    res.status(500).json({ message: 'Error generating calendar feed' });
  }
});

/**
 * POST /api/calendar/token
 * Protected endpoint - creates a new calendar subscription token
 * Only for NitraCar users
 */
router.post('/token', protect, async (req, res) => {
  try {
    const user = req.user;
    const { name } = req.body;

    // Check if user is NitraCar
    const isNitraCar = user.email?.toLowerCase() === NITRACAR_EMAIL.toLowerCase() ||
                       user.tenantEmail?.toLowerCase() === NITRACAR_EMAIL.toLowerCase();

    if (!isNitraCar) {
      return res.status(403).json({ message: 'Calendar feed is only available for NitraCar users' });
    }

    // Create new subscription token
    const subscription = await CalendarToken.createSubscription(
      user._id,
      user.tenantId,
      name || 'NitraCar Calendar'
    );

    // Build the subscription URLs
    const baseUrl = process.env.API_BASE_URL || 'https://carflow-reservation-system.onrender.com';
    const httpsUrl = `${baseUrl}/api/calendar/ics?token=${subscription.token}`;
    const webcalUrl = httpsUrl.replace('https://', 'webcal://');

    res.status(201).json({
      success: true,
      data: {
        id: subscription._id,
        token: subscription.token,
        name: subscription.name,
        urls: {
          https: httpsUrl,
          webcal: webcalUrl
        },
        instructions: {
          apple: 'V Apple Calendar vyberte Subor > Nova odber kalendara a prilepte HTTPS URL',
          google: 'V Google Calendar vyberte Iny kalendar > Z URL a prilepte HTTPS URL',
          outlook: 'V Outlook vyberte Pridat kalendar > Pridat z internetu a prilepte HTTPS URL'
        },
        createdAt: subscription.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating calendar token:', error);
    res.status(500).json({ message: 'Error creating calendar subscription' });
  }
});

/**
 * GET /api/calendar/tokens
 * Protected endpoint - lists all calendar tokens for the current user
 */
router.get('/tokens', protect, async (req, res) => {
  try {
    const user = req.user;

    // Check if user is NitraCar
    const isNitraCar = user.email?.toLowerCase() === NITRACAR_EMAIL.toLowerCase() ||
                       user.tenantEmail?.toLowerCase() === NITRACAR_EMAIL.toLowerCase();

    if (!isNitraCar) {
      return res.status(403).json({ message: 'Calendar feed is only available for NitraCar users' });
    }

    const tokens = await CalendarToken.find({
      userId: user._id,
      revokedAt: null
    }).select('-token').sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tokens
    });

  } catch (error) {
    console.error('Error listing calendar tokens:', error);
    res.status(500).json({ message: 'Error listing calendar subscriptions' });
  }
});

/**
 * DELETE /api/calendar/token/:id
 * Protected endpoint - revokes a calendar token
 */
router.delete('/token/:id', protect, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const token = await CalendarToken.findOne({
      _id: id,
      userId: user._id
    });

    if (!token) {
      return res.status(404).json({ message: 'Token not found' });
    }

    await token.revoke();

    res.json({
      success: true,
      message: 'Calendar subscription revoked successfully'
    });

  } catch (error) {
    console.error('Error revoking calendar token:', error);
    res.status(500).json({ message: 'Error revoking calendar subscription' });
  }
});

/**
 * Build detailed event description
 */
function buildEventDescription(reservation, customerName, carInfo) {
  const totalAmount = reservation.pricing?.totalAmount || reservation.pricing?.total || 0;
  const days = reservation.pricing?.totalDays || Math.ceil((new Date(reservation.endDate) - new Date(reservation.startDate)) / (1000 * 60 * 60 * 24));

  const lines = [
    `Zakaznik: ${customerName}`,
    `Vozidlo: ${carInfo}`,
    (reservation.car?.registrationNumber || reservation.car?.licensePlate) ? `SPZ: ${reservation.car.registrationNumber || reservation.car.licensePlate}` : null,
    `Cislo rezervacie: ${reservation.reservationNumber || reservation._id}`,
    `Pocet dni: ${days}`,
    `Status: ${getStatusText(reservation.status)}`,
    '',
    `Prevzatie: ${reservation.pickupLocation?.name || 'Neuvedene'} (${formatDateTime(reservation.startDate)})`,
    `Vratenie: ${reservation.dropoffLocation?.name || 'Neuvedene'} (${formatDateTime(reservation.endDate)})`,
    '',
    reservation.customer?.phone ? `Telefon: ${reservation.customer.phone}` : null,
    reservation.customer?.email ? `Email: ${reservation.customer.email}` : null,
    '',
    totalAmount ? `Celkova cena: ${Number(totalAmount).toFixed(2)} EUR` : null,
    reservation.pricing?.deposit ? `Zaloha: ${Number(reservation.pricing.deposit).toFixed(2)} EUR` : null
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Format date/time for display in description
 */
function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('sk-SK', { timeZone: 'Europe/Bratislava', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Get Slovak status text
 */
function getStatusText(status) {
  const statusMap = {
    'pending': 'Cakajuca',
    'awaiting_payment': 'Caka na platbu',
    'confirmed': 'Potvrdena',
    'zaplatene': 'Zaplatena',
    'ongoing': 'Prebiehajuca',
    'completed': 'Ukoncena',
    'cancelled': 'Zrusena',
    'no-show': 'Neprišiel'
  };
  return statusMap[status] || status;
}

module.exports = router;
