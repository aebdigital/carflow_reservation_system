const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Reservation = require('../models/Reservation');
const AdditionalService = require('../models/AdditionalService');
const Insurance = require('../models/Insurance');

async function addTestDataToReservation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    // Find the first reservation to add test data to
    const reservation = await Reservation.findOne().sort({ createdAt: -1 });
    
    if (!reservation) {
      console.log('❌ No reservations found');
      return;
    }

    console.log(`🎯 Found reservation: ${reservation.reservationNumber}`);

    // Find some additional services to add
    const services = await AdditionalService.find({ tenantId: reservation.tenantId }).limit(2);
    console.log(`📋 Found ${services.length} additional services`);

    // Find some insurance options to add
    const insuranceOptions = await Insurance.find({ 
      tenantId: reservation.tenantId,
      isActive: true 
    }).limit(2);
    console.log(`🛡️ Found ${insuranceOptions.length} insurance options`);
    
    // Debug: Show all insurance options for this tenant
    const allInsurance = await Insurance.find({ tenantId: reservation.tenantId });
    console.log(`🔍 DEBUG: Total insurance for tenant ${reservation.tenantId}: ${allInsurance.length}`);
    if (allInsurance.length > 0) {
      allInsurance.forEach(ins => {
        console.log(`   - ${ins.name} (${ins.type}) - Active: ${ins.isActive}`);
      });
    }

    // Prepare test service data
    const selectedServices = services.map((service, index) => ({
      service: service._id,
      name: service.name,
      category: service.category,
      quantity: index + 1,
      unitPrice: service.pricing?.amount || 15,
      totalPrice: (service.pricing?.amount || 15) * (index + 1),
      pricingType: service.pricing?.type || 'fixed'
    }));

    // Prepare test insurance data
    const selectedInsurance = insuranceOptions.map(insurance => ({
      insurance: insurance._id,
      name: insurance.name,
      type: insurance.type,
      coverage: insurance.coverage,
      price: insurance.pricing?.amount || 50,
      deductible: insurance.coverage_limits?.deductible || 200,
      limits: {
        perIncident: insurance.coverage_limits?.maxCoverage || 10000,
        perPerson: 5000,
        aggregate: 20000
      }
    }));

    // Update the reservation with test data
    const updateData = {
      selectedServices,
      selectedInsurance,
      'pricing.deposit': 300 // Add a deposit
    };

    const updatedReservation = await Reservation.findByIdAndUpdate(
      reservation._id,
      updateData,
      { new: true, runValidators: true }
    );

    console.log('✅ Updated reservation with test data:');
    console.log(`   - Deposit: ${updatedReservation.pricing.deposit}€`);
    console.log(`   - Services: ${updatedReservation.selectedServices.length}`);
    console.log(`   - Insurance: ${updatedReservation.selectedInsurance.length}`);
    
    // Display the added data
    console.log('\n📋 Added Services:');
    updatedReservation.selectedServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.name} - ${service.totalPrice}€ (${service.category})`);
    });

    console.log('\n🛡️ Added Insurance:');
    updatedReservation.selectedInsurance.forEach((insurance, index) => {
      console.log(`   ${index + 1}. ${insurance.name} - ${insurance.price}€ (${insurance.type})`);
    });

    console.log(`\n🎯 Test data added to reservation: ${reservation.reservationNumber}`);
    console.log('You can now view this reservation in the frontend to see the new fields!');

  } catch (error) {
    console.error('❌ Error adding test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addTestDataToReservation();