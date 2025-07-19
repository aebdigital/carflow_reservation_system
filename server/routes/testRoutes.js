const express = require('express');
const router = express.Router();
const bySquareService = require('../services/bySquareService');

// Test bySquare configuration
router.get('/bysquare-config', (req, res) => {
  console.log('🧪 Testing bySquare configuration...');
  
  const config = {
    isConfigured: bySquareService.isConfigured(),
    hasUsername: !!process.env.BYSQUARE_USERNAME,
    hasPassword: !!process.env.BYSQUARE_PASSWORD,
    username: process.env.BYSQUARE_USERNAME ? 'Set ✅' : 'Missing ❌',
    password: process.env.BYSQUARE_PASSWORD ? 'Set ✅' : 'Missing ❌',
    apiUrl: 'https://app.bysquare.com/api/uploadInvoiceQR_v2'
  };
  
  console.log('📋 bySquare Configuration Check:', config);
  
  res.json({
    success: true,
    message: 'bySquare Configuration Check',
    data: config
  });
});

// Test QR generation with sample data
router.post('/test-qr', async (req, res) => {
  try {
    console.log('🧪 Testing QR generation with sample data...');
    
    if (!bySquareService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'bySquare service not configured. Check BYSQUARE_USERNAME and BYSQUARE_PASSWORD environment variables.'
      });
    }
    
    // Sample reservation data
    const sampleReservation = {
      _id: 'test123',
      reservationNumber: 'TEST-001',
      createdAt: new Date(),
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // +3 days
      pricing: {
        totalAmount: 150,
        dailyRate: 50,
        totalDays: 3
      }
    };
    
    const sampleCar = {
      brand: 'Test',
      model: 'Vehicle',
      year: 2023,
      pricing: {
        deposit: 200
      }
    };
    
    const sampleCustomer = {
      firstName: 'Test',
      lastName: 'Customer',
      email: 'test@example.com',
      phone: '+421900123456'
    };
    
    console.log('📤 Sending test request to bySquare API...');
    
    const result = await bySquareService.generateReservationQR(
      sampleReservation,
      sampleCar, 
      sampleCustomer
    );
    
    console.log('📥 bySquare API Response:', result);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'QR codes generated successfully!',
        data: {
          hasPayBySquare: !!result.qrCodes.payBySquare,
          hasQrPlatbaCz: !!result.qrCodes.qrPlatbaCz,
          qrCodes: {
            payBySquare: result.qrCodes.payBySquare ? 'Generated ✅' : 'Missing ❌',
            qrPlatbaCz: result.qrCodes.qrPlatbaCz ? 'Generated ✅' : 'Missing ❌'
          },
          packageConsumption: result.packageConsumption
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to generate QR codes'
      });
    }
    
  } catch (error) {
    console.error('❌ Test QR generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Test QR generation failed'
    });
  }
});

// Regenerate QR codes for existing reservation
router.post('/regenerate-qr/:reservationId', async (req, res) => {
  try {
    const { reservationId } = req.params;
    console.log('🔄 Regenerating QR codes for reservation:', reservationId);
    
    if (!bySquareService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'bySquare service not configured.'
      });
    }
    
    // Import models
    const Reservation = require('../models/Reservation');
    
    // Find the reservation with populated data
    const reservation = await Reservation.findById(reservationId)
      .populate('customer', 'firstName lastName email phone address')
      .populate('car', 'brand model year pricing');
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found'
      });
    }
    
    console.log('📋 Found reservation:', reservation.reservationNumber);
    console.log('👤 Customer:', reservation.customer?.firstName, reservation.customer?.lastName);
    console.log('🚗 Car:', reservation.car?.brand, reservation.car?.model);
    
    // Generate QR codes
    const qrResult = await bySquareService.generateReservationQR(
      reservation,
      reservation.car,
      reservation.customer
    );
    
    if (qrResult.success && qrResult.qrCodes) {
      // Calculate total amount including deposit
      const rentalAmount = reservation.pricing?.totalAmount || (reservation.pricing?.dailyRate * reservation.pricing?.totalDays) || 0;
      const depositAmount = reservation.car.pricing?.deposit || 0;
      const totalAmount = rentalAmount + depositAmount;
      
      // Generate variable symbol from reservation number and ID
      const reservationDigits = reservation.reservationNumber ? 
        reservation.reservationNumber.replace(/[^0-9]/g, '') : 
        reservation._id.toString().slice(-8);
      const variableSymbol = reservationDigits.slice(-10).padStart(10, '0');
      
      // Update reservation with QR codes
      reservation.qrCodes = {
        payBySquare: qrResult.qrCodes.payBySquare,
        qrPlatbaCz: qrResult.qrCodes.qrPlatbaCz,
        invoiceBySquare: qrResult.qrCodes.invoiceBySquare,
        generatedAt: new Date(),
        lastUpdated: new Date(),
        isActive: true,
        bankAccount: 'SK1234567890123456789012',
        variableSymbol: variableSymbol,
        constantSymbol: '0308',
        specificSymbol: '',
        amount: totalAmount,
        beneficiaryName: 'CarFlow Rental',
        paymentNote: `Car rental + deposit: ${reservation.car.brand} ${reservation.car.model}`
      };
      
      await reservation.save();
      
      console.log('✅ QR codes regenerated and saved successfully');
      
      res.json({
        success: true,
        message: 'QR codes regenerated successfully!',
        data: {
          reservationId: reservation._id,
          reservationNumber: reservation.reservationNumber,
          totalAmount: totalAmount,
          variableSymbol: variableSymbol,
          hasPayBySquare: !!qrResult.qrCodes.payBySquare,
          hasQrPlatbaCz: !!qrResult.qrCodes.qrPlatbaCz
        }
      });
    } else {
      console.error('❌ Failed to generate QR codes:', qrResult.error);
      res.status(400).json({
        success: false,
        error: qrResult.error,
        message: 'Failed to regenerate QR codes'
      });
    }
    
  } catch (error) {
    console.error('❌ QR regeneration failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'QR regeneration failed'
    });
  }
});

module.exports = router; 