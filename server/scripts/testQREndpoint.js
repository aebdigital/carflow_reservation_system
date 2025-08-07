const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();

// Import the controller directly to test
const { getReservationQR } = require('../controllers/publicController');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const Car = require('../models/Car');

async function testQREndpoint() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    // Find a reservation with QR codes
    const reservation = await Reservation.findOne({
      'qrCodes.payBySquare': { $exists: true }
    });

    if (!reservation) {
      console.log('❌ No reservation with QR codes found');
      return;
    }

    console.log('🎯 Testing QR endpoint for reservation:', reservation.reservationNumber);
    console.log('📱 Reservation ID:', reservation._id);

    // Simulate API call by calling the controller directly
    const req = {
      params: { id: reservation._id.toString() }
    };

    const res = {
      status: (code) => {
        console.log('📤 Response status:', code);
        return {
          json: (data) => {
            console.log('📤 Response data:', JSON.stringify(data, null, 2));
            return res;
          }
        };
      }
    };

    const next = (error) => {
      if (error) {
        console.log('❌ Error from controller:', error.message);
      }
    };

    // Call the controller
    await getReservationQR(req, res, next);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testQREndpoint();