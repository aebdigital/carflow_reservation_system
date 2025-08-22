const express = require('express');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const krosApiService = require('../services/krosApiService');
const invoicePdfScheduler = require('../services/invoicePdfScheduler');
const Reservation = require('../models/Reservation');

const router = express.Router();

// @desc    Test Kros invoice creation with mock data
// @route   POST /api/test/kros-invoice
// @access  Public (for testing only)
const testKrosInvoiceCreation = asyncHandler(async (req, res, next) => {
  try {
    console.log('🧪 Testing Kros invoice creation with mock data');

    // Mock reservation data for testing
    const mockReservationData = {
      _id: '507f1f77bcf86cd799439011',
      reservationNumber: 'TEST-2024-001',
      customer: {
        firstName: 'Test',
        lastName: 'Customer',
        email: 'test@example.com',
        phone: '+421900123456',
        address: 'Testovacia 123',
        city: 'Bratislava',
        postalCode: '12345',
        country: 'SK'
      },
      car: {
        brand: 'BMW',
        model: 'X3',
        year: 2022,
        registrationNumber: 'BA123AB'
      },
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-01-20'),
      pricing: {
        totalDays: 5,
        pricePerDay: 45,
        subtotal: 225,
        totalAmount: 270
      },
      additionalServices: [
        {
          name: 'GPS navigácia',
          price: 25,
          quantity: 1
        },
        {
          name: 'Detské sedadlo',
          price: 20,
          quantity: 1
        }
      ]
    };

    if (!krosApiService.isReady()) {
      return res.status(400).json({
        success: false,
        message: 'Kros API not configured. Set KROS_API_TOKEN environment variable.',
        configured: false
      });
    }

    // Test invoice creation
    const invoiceResult = await krosApiService.createInvoice(mockReservationData);

    res.status(200).json({
      success: true,
      message: 'Kros invoice creation test completed',
      mockData: mockReservationData,
      krosResponse: invoiceResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Kros invoice test failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Kros invoice test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// @desc    Demo Kros payload generation (no API call)
// @route   GET /api/test/kros-demo-payload
// @access  Public (for testing only)
const demoKrosPayloadGeneration = asyncHandler(async (req, res, next) => {
  try {
    console.log('🧪 Demo: Generating Kros payload without API call');

    // Mock reservation data for testing
    const mockReservationData = {
      _id: '507f1f77bcf86cd799439011',
      reservationNumber: 'DEMO-2024-001',
      customer: {
        firstName: 'Ján',
        lastName: 'Novák',
        email: 'jan.novak@example.com',
        phone: '+421900123456',
        address: 'Hlavná 123',
        city: 'Bratislava',
        postalCode: '81101',
        country: 'SK'
      },
      car: {
        brand: 'BMW',
        model: 'X3',
        year: 2022,
        registrationNumber: 'BA123AB'
      },
      startDate: new Date('2024-08-15'),
      endDate: new Date('2024-08-20'),
      pricing: {
        totalDays: 5,
        pricePerDay: 55,
        subtotal: 275,
        totalAmount: 330
      },
      additionalServices: [
        {
          name: 'GPS navigácia',
          price: 30,
          quantity: 1
        },
        {
          name: 'Detské sedadlo',
          price: 25,
          quantity: 1
        }
      ]
    };

    // Generate the exact payload that would be sent to KROS
    const krosPayload = krosApiService.formatReservationForInvoice(mockReservationData);

    res.status(200).json({
      success: true,
      message: 'Demo Kros payload generated successfully',
      description: 'This is exactly what would be sent to POST https://api-economy.kros.sk/api/invoices',
      mockReservation: mockReservationData,
      krosPayload: krosPayload,
      apiEndpoint: 'POST https://api-economy.kros.sk/api/invoices',
      requiredHeaders: {
        'Authorization': 'Bearer YOUR_KROS_API_TOKEN',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Demo payload generation failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Demo payload generation failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// @desc    Test Kros API connection
// @route   GET /api/test/kros-connection
// @access  Public (for testing only)
const testKrosConnection = asyncHandler(async (req, res, next) => {
  try {
    console.log('🧪 Testing Kros API connection');

    const connectionResult = await krosApiService.testConnection();

    res.status(200).json({
      success: true,
      message: 'Kros connection test completed',
      connectionResult,
      configured: krosApiService.isReady(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Kros connection test failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Kros connection test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// @desc    Test PDF retrieval (requires existing invoice ID)
// @route   GET /api/test/kros-pdf/:invoiceId
// @access  Public (for testing only)
const testKrosPdfRetrieval = asyncHandler(async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    console.log(`🧪 Testing PDF retrieval for invoice: ${invoiceId}`);

    if (!krosApiService.isReady()) {
      return res.status(400).json({
        success: false,
        message: 'Kros API not configured',
        configured: false
      });
    }

    const pdfResult = await krosApiService.getInvoicePDF(invoiceId);

    res.status(200).json({
      success: pdfResult.success,
      message: 'PDF retrieval test completed',
      invoiceId,
      pdfSize: pdfResult.data?.length || 0,
      contentType: pdfResult.contentType,
      filename: pdfResult.filename,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ PDF retrieval test failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'PDF retrieval test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// @desc    Test invoice PDF email sending
// @route   POST /api/test/kros-pdf-email/:reservationId
// @access  Public (for testing only)
const testInvoicePdfEmail = asyncHandler(async (req, res, next) => {
  try {
    const { reservationId } = req.params;
    console.log(`🧪 Testing PDF email sending for reservation: ${reservationId}`);

    const result = await invoicePdfScheduler.sendInvoicePdfNow(reservationId);

    res.status(200).json({
      success: result.success,
      message: 'PDF email test completed',
      reservationId,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ PDF email test failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'PDF email test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// @desc    List reservations suitable for testing
// @route   GET /api/test/kros-reservations
// @access  Public (for testing only)
const listTestReservations = asyncHandler(async (req, res, next) => {
  try {
    console.log('🧪 Finding reservations suitable for Kros testing');

    // Find reservations in different states
    const confirmedReservations = await Reservation.find({
      status: 'confirmed'
    }).populate('customer car').limit(5);

    const paidReservations = await Reservation.find({
      status: 'zaplatene',
      krosInvoiceId: { $exists: true }
    }).populate('customer car').limit(5);

    const completedReservations = await Reservation.find({
      status: 'completed',
      krosInvoiceId: { $exists: true }
    }).populate('customer car').limit(5);

    res.status(200).json({
      success: true,
      message: 'Test reservations found',
      data: {
        confirmedReservations: confirmedReservations.map(r => ({
          id: r._id,
          reservationNumber: r.reservationNumber,
          customer: `${r.customer?.firstName} ${r.customer?.lastName}`,
          car: `${r.car?.brand} ${r.car?.model}`,
          status: r.status,
          canTestInvoiceCreation: true
        })),
        paidReservations: paidReservations.map(r => ({
          id: r._id,
          reservationNumber: r.reservationNumber,
          customer: `${r.customer?.firstName} ${r.customer?.lastName}`,
          krosInvoiceId: r.krosInvoiceId,
          status: r.status,
          canTestPdfRetrieval: true
        })),
        completedReservations: completedReservations.map(r => ({
          id: r._id,
          reservationNumber: r.reservationNumber,
          customer: `${r.customer?.firstName} ${r.customer?.lastName}`,
          krosInvoiceId: r.krosInvoiceId,
          status: r.status,
          pdfEmailSent: !!r.invoicePdfSentAt,
          canTestPdfEmail: true
        }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error listing test reservations:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to list test reservations',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Mount all test routes
router.post('/kros-invoice', testKrosInvoiceCreation);
router.get('/kros-demo-payload', demoKrosPayloadGeneration);
router.get('/kros-connection', testKrosConnection);
router.get('/kros-pdf/:invoiceId', testKrosPdfRetrieval);
router.post('/kros-pdf-email/:reservationId', testInvoicePdfEmail);
router.get('/kros-reservations', listTestReservations);

module.exports = router;