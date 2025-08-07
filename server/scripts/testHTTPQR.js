const mongoose = require('mongoose');
const https = require('https');
require('dotenv').config();

// Import models to find a reservation
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const Car = require('../models/Car');

async function testHTTPQR() {
  try {
    // Connect to MongoDB to get a reservation ID
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

    await mongoose.disconnect();
    
    console.log('🎯 Testing HTTP request for reservation:', reservation.reservationNumber);
    console.log('📱 Reservation ID:', reservation._id);

    // Make HTTP request to the actual API endpoint
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/public/reservations/${reservation._id}/qr`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      console.log('📤 Response status:', res.statusCode);
      console.log('📤 Response headers:', res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log('📤 Response data:', JSON.stringify(jsonData, null, 2));
        } catch (error) {
          console.log('📤 Raw response data:', data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
    });

    req.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testHTTPQR();