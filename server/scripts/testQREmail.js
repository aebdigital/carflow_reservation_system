const mongoose = require('mongoose');
require('dotenv').config();

// Import services and models
const smtp2goService = require('../services/smtp2goService');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const Car = require('../models/Car');

async function testQREmail() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    // Find the latest reservation with QR codes (legacy or new format)
    const reservation = await Reservation.findOne({
      $or: [
        { 'qrCodes.payBySquareRental': { $exists: true } },
        { 'qrCodes.payBySquare': { $exists: true } }
      ]
    })
    .populate([
      { path: 'customer', select: 'firstName lastName email phone' },
      { path: 'car', select: 'brand model' }
    ])
    .sort({ createdAt: -1 });

    if (!reservation) {
      console.log('❌ No reservation with QR codes found');
      return;
    }

    console.log('🎯 Found reservation:', reservation.reservationNumber);
    console.log('📱 QR codes available:', {
      legacy: !!reservation.qrCodes.payBySquare,
      rental: !!reservation.qrCodes.payBySquareRental,
      deposit: !!reservation.qrCodes.payBySquareDeposit
    });

    // Prepare reservation data for email
    const reservationData = {
      reservationNumber: reservation.reservationNumber,
      customerName: `${reservation.customer.firstName} ${reservation.customer.lastName}`,
      customerEmail: reservation.customer.email,
      customerPhone: reservation.customer.phone,
      carInfo: `${reservation.car.brand} ${reservation.car.model}`,
      startDate: reservation.startDate.toLocaleDateString('sk-SK'),
      totalPrice: reservation.pricing.totalAmount,
      deposit: reservation.pricing.deposit
    };

    // Send test email with QR codes
    console.log('📧 Sending test confirmation email with QR codes...');
    const result = await smtp2goService.sendCustomerReservationConfirmed(
      'peter@aebdig.com', // Test email
      reservationData,
      reservation // Pass full reservation for QR codes
    );

    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log('📧 Email ID:', result.messageId);
    } else {
      console.log('❌ Failed to send test email');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testQREmail();