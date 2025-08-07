const mongoose = require('mongoose');
require('dotenv').config();

async function checkQRCodes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');
    
    const Reservation = require('../models/Reservation');
    
    const total = await Reservation.countDocuments();
    const withQR = await Reservation.countDocuments({ 'qrCodes.payBySquare': { $exists: true } });
    const withRentalQR = await Reservation.countDocuments({ 'qrCodes.payBySquareRental': { $exists: true } });
    const withDepositQR = await Reservation.countDocuments({ 'qrCodes.payBySquareDeposit': { $exists: true } });
    
    console.log('📊 QR Code Status:');
    console.log('Total reservations:', total);
    console.log('With legacy payBySquare:', withQR);
    console.log('With payBySquareRental:', withRentalQR);
    console.log('With payBySquareDeposit:', withDepositQR);
    
    // Show latest reservations QR status
    const latest = await Reservation.find().sort({ createdAt: -1 }).limit(5);
    
    console.log('\n🎯 Latest 5 reservations QR status:');
    for (const res of latest) {
      console.log(`${res.reservationNumber}: qrCodes = ${!!res.qrCodes}, fields = ${res.qrCodes ? Object.keys(res.qrCodes).join(', ') : 'none'}`);
    }
    
    // Check bySquare service configuration
    const bySquareService = require('../services/bySquareService');
    console.log('\n🔧 bySquare Service Status:');
    console.log('Is configured:', bySquareService.isConfigured());
    console.log('Username set:', !!process.env.BYSQUARE_USERNAME);
    console.log('Password set:', !!process.env.BYSQUARE_PASSWORD);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkQRCodes();