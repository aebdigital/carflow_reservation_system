const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const Car = require('../models/Car');

async function debugQRAPI() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    // Find a reservation with QR codes
    const reservation = await Reservation.findOne({
      'qrCodes.payBySquare': { $exists: true }
    })
    .select('qrCodes pricing status customer car startDate endDate reservationNumber')
    .populate('customer', 'firstName lastName email')
    .populate('car', 'brand model year pricing');

    if (!reservation) {
      console.log('❌ No reservation with QR codes found');
      return;
    }

    console.log('🎯 Found reservation:', reservation.reservationNumber);
    console.log('📱 QR Codes object:', JSON.stringify(reservation.qrCodes, null, 2));

    // Test the API logic
    const hasQRCodes = reservation.qrCodes && (reservation.qrCodes.payBySquareRental || reservation.qrCodes.payBySquare);
    console.log('✅ API Logic Test:');
    console.log('   Has qrCodes object:', !!reservation.qrCodes);
    console.log('   Has payBySquareRental:', !!reservation.qrCodes?.payBySquareRental);
    console.log('   Has payBySquare:', !!reservation.qrCodes?.payBySquare);
    console.log('   Final hasQRCodes result:', hasQRCodes);

    // Test the failing condition
    const failingCondition = !reservation.qrCodes || (!reservation.qrCodes.payBySquareRental && !reservation.qrCodes.payBySquare);
    console.log('❌ Failing condition result:', failingCondition);
    console.log('   Should be false for QRs to show, but is:', failingCondition);

    if (reservation.qrCodes) {
      console.log('\n🔍 QR Codes structure:');
      console.log('Available fields:', Object.keys(reservation.qrCodes));
      
      if (reservation.qrCodes.payBySquare) {
        console.log('payBySquare preview:', reservation.qrCodes.payBySquare.substring(0, 50) + '...');
      }
      if (reservation.qrCodes.payBySquareRental) {
        console.log('payBySquareRental preview:', reservation.qrCodes.payBySquareRental.substring(0, 50) + '...');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

debugQRAPI();