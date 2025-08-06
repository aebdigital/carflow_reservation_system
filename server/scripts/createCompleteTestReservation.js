const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Reservation = require('../models/Reservation');
const AdditionalService = require('../models/AdditionalService');
const Insurance = require('../models/Insurance');
const User = require('../models/User');
const Car = require('../models/Car');

async function createCompleteTestReservation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    // Find a tenant that has existing data
    const existingReservation = await Reservation.findOne().sort({ createdAt: -1 });
    if (!existingReservation) {
      console.log('❌ No existing reservations found');
      return;
    }
    
    const tenantId = existingReservation.tenantId;
    const adminUser = await User.findOne({ tenantId, role: 'admin' });
    
    if (!adminUser) {
      console.log('❌ No admin user found for tenant');
      return;
    }
    console.log(`🏢 Using tenant ID: ${tenantId}`);

    // Find a customer and car for this tenant
    const customer = await User.findOne({ tenantId, role: 'customer' });
    const car = await Car.findOne({ tenantId });
    
    if (!customer || !car) {
      console.log('❌ No customer or car found for this tenant');
      return;
    }

    console.log(`👤 Customer: ${customer.firstName} ${customer.lastName}`);
    console.log(`🚗 Car: ${car.brand} ${car.model}`);

    // Find some services and insurance
    const services = await AdditionalService.find({ tenantId }).limit(2);
    const insuranceOptions = await Insurance.find({ tenantId }).limit(2);
    
    console.log(`📋 Found ${services.length} services`);
    console.log(`🛡️ Found ${insuranceOptions.length} insurance options`);

    // Calculate dates
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 2); // Start in 2 days
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3); // 3 day rental

    // Prepare pricing
    const dailyRate = car.dailyRate || 50;
    const totalDays = 3;
    const subtotal = dailyRate * totalDays;
    const deposit = 300;
    const taxes = subtotal * 0.2;
    const totalAmount = subtotal + taxes;

    // Prepare selected services
    const selectedServices = services.map((service, index) => ({
      service: service._id,
      name: service.name,
      category: service.category,
      quantity: index + 1,
      unitPrice: service.pricing?.amount || 20,
      totalPrice: (service.pricing?.amount || 20) * (index + 1),
      pricingType: service.pricing?.type || 'fixed'
    }));

    // Prepare selected insurance
    const selectedInsurance = insuranceOptions.map(insurance => ({
      insurance: insurance._id,
      name: insurance.name,
      type: insurance.type,
      coverage: insurance.coverage,
      price: insurance.pricing?.amount || 30,
      deductible: insurance.coverage_limits?.deductible || 200,
      limits: {
        perIncident: insurance.coverage_limits?.maxCoverage || 10000,
        perPerson: 5000,
        aggregate: 25000
      }
    }));

    // Create new reservation with all data
    const reservationData = {
      tenantId,
      customer: customer._id,
      car: car._id,
      startDate,
      endDate,
      status: 'confirmed',
      pickupLocation: {
        name: 'Main Office',
        address: {
          street: 'Test Street 123',
          city: 'Bratislava',
          state: 'Bratislava',
          zipCode: '12345',
          country: 'Slovakia'
        }
      },
      dropoffLocation: {
        name: 'Main Office',
        address: {
          street: 'Test Street 123',
          city: 'Bratislava',
          state: 'Bratislava',
          zipCode: '12345',
          country: 'Slovakia'
        }
      },
      pricing: {
        dailyRate,
        totalDays,
        subtotal,
        taxes,
        deposit,
        totalAmount
      },
      selectedServices,
      selectedInsurance,
      specialRequests: 'Test reservation with complete data including services and insurance',
      createdBy: adminUser._id
    };

    // Create the reservation
    const newReservation = new Reservation(reservationData);
    await newReservation.save();

    console.log('✅ Created complete test reservation:');
    console.log(`   📝 Reservation Number: ${newReservation.reservationNumber}`);
    console.log(`   💰 Total Amount: ${newReservation.pricing.totalAmount}€`);
    console.log(`   💳 Deposit: ${newReservation.pricing.deposit}€`);
    console.log(`   📋 Services: ${newReservation.selectedServices.length}`);
    console.log(`   🛡️ Insurance: ${newReservation.selectedInsurance.length}`);

    console.log('\n📋 Selected Services:');
    newReservation.selectedServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.name} - ${service.totalPrice}€ (${service.category})`);
    });

    console.log('\n🛡️ Selected Insurance:');
    newReservation.selectedInsurance.forEach((insurance, index) => {
      console.log(`   ${index + 1}. ${insurance.name} - ${insurance.price}€ (${insurance.type})`);
    });

    console.log(`\n🎯 Test reservation created: ${newReservation.reservationNumber}`);
    console.log('You can now view this reservation in the frontend to see ALL the data!');

  } catch (error) {
    console.error('❌ Error creating test reservation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createCompleteTestReservation();