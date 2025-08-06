const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Reservation = require('../models/Reservation');
const Insurance = require('../models/Insurance');
const User = require('../models/User');

async function addInsuranceToReservationTenant() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    // Find the latest reservation
    const reservation = await Reservation.findOne().sort({ createdAt: -1 });
    if (!reservation) {
      console.log('❌ No reservations found');
      return;
    }

    console.log(`🎯 Found reservation: ${reservation.reservationNumber}`);
    console.log(`🏢 Reservation tenant ID: ${reservation.tenantId}`);

    // Find an admin user for this tenant
    const adminUser = await User.findOne({ tenantId: reservation.tenantId, role: 'admin' });
    if (!adminUser) {
      console.log('❌ No admin user found for this tenant');
      return;
    }

    console.log(`👤 Found admin: ${adminUser.firstName} ${adminUser.lastName}`);

    // Create insurance options for this specific tenant
    const testInsuranceOptions = [
      {
        tenantId: reservation.tenantId,
        createdBy: adminUser._id,
        name: 'Základné poistenie',
        description: 'Základné krytie škôd na vozidle',
        coverage: 'Pokrytie škôd do 10,000€',
        type: 'collision_damage',
        pricing: {
          type: 'per_day',
          amount: 25,
          currency: 'EUR'
        },
        coverage_limits: {
          deductible: 500,
          maxCoverage: 10000,
          currency: 'EUR'
        },
        legal: {
          insuranceProvider: {
            name: 'Test Insurance Company',
            licenseNumber: 'TIC-12345',
            address: 'Bratislava, Slovakia',
            phone: '+421 123 456 789',
            email: 'info@testinsurance.sk'
          }
        },
        isActive: true,
        isPublic: true
      },
      {
        tenantId: reservation.tenantId,
        createdBy: adminUser._id,
        name: 'Rozšírené poistenie',
        description: 'Rozšírené krytie včítane krádeže',
        coverage: 'Plné pokrytie škôd a krádeže do 25,000€',
        type: 'comprehensive',
        pricing: {
          type: 'per_day',
          amount: 45,
          currency: 'EUR'
        },
        coverage_limits: {
          deductible: 200,
          maxCoverage: 25000,
          currency: 'EUR'
        },
        legal: {
          insuranceProvider: {
            name: 'Premium Insurance Ltd',
            licenseNumber: 'PIL-67890',
            address: 'Bratislava, Slovakia',
            phone: '+421 987 654 321',
            email: 'premium@insurance.sk'
          }
        },
        isActive: true,
        isPublic: true
      }
    ];

    // Create the insurance options
    const createdInsurance = await Insurance.insertMany(testInsuranceOptions);
    
    console.log('✅ Created insurance options:');
    createdInsurance.forEach((insurance, index) => {
      console.log(`   ${index + 1}. ${insurance.name} - ${insurance.pricing.amount}€ (${insurance.type})`);
    });

    // Now update the reservation with insurance data
    const selectedInsurance = createdInsurance.map(insurance => ({
      insurance: insurance._id,
      name: insurance.name,
      type: insurance.type,
      coverage: insurance.coverage,
      price: insurance.pricing.amount,
      deductible: insurance.coverage_limits.deductible,
      limits: {
        perIncident: insurance.coverage_limits.maxCoverage,
        perPerson: 5000,
        aggregate: 50000
      }
    }));

    // Update the reservation using $set to replace the array
    const updatedReservation = await Reservation.findByIdAndUpdate(
      reservation._id,
      { $set: { selectedInsurance } },
      { new: true, runValidators: false }
    );

    console.log(`\n✅ Updated reservation ${reservation.reservationNumber} with ${selectedInsurance.length} insurance options`);
    
    console.log('\n🛡️ Added Insurance:');
    updatedReservation.selectedInsurance.forEach((insurance, index) => {
      console.log(`   ${index + 1}. ${insurance.name} - ${insurance.price}€ (${insurance.type})`);
    });

    console.log('\n🎯 You can now view this reservation in the frontend to see the insurance data!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addInsuranceToReservationTenant();