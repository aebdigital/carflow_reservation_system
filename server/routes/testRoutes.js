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

module.exports = router; 