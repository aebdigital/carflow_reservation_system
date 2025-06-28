require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Car = require('./models/Car');
const Reservation = require('./models/Reservation');

async function checkTenantSeparation() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/car-rental';
    console.log('Connecting to:', mongoUri);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');
    
    // Get all users
    const users = await User.find({}).select('email tenantId role storageFolder');
    console.log('\n=== ALL USERS ===');
    users.forEach(user => {
      console.log(`📧 ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   TenantID: ${user.tenantId}`);
      console.log(`   StorageFolder: ${user.storageFolder || 'Not set'}`);
      console.log('');
    });
    
    // Get all cars
    const cars = await Car.find({}).select('brand model year tenantId owner');
    console.log(`\n=== ALL CARS (${cars.length} total) ===`);
    cars.forEach(car => {
      console.log(`🚗 ${car.brand} ${car.model} (${car.year})`);
      console.log(`   TenantID: ${car.tenantId}`);
      console.log(`   Owner: ${car.owner}`);
      console.log('');
    });
    
    // Get all reservations
    const reservations = await Reservation.find({}).select('tenantId customer car status reservationNumber');
    console.log(`\n=== ALL RESERVATIONS (${reservations.length} total) ===`);
    reservations.forEach(res => {
      console.log(`📅 ${res.reservationNumber || res._id}`);
      console.log(`   Status: ${res.status}`);
      console.log(`   TenantID: ${res.tenantId}`);
      console.log(`   Customer: ${res.customer}`);
      console.log(`   Car: ${res.car}`);
      console.log('');
    });
    
    // Check specific users
    console.log('\n=== TENANT SEPARATION TEST ===');
    
    // Check rival@test.sk
    const rivalUser = await User.findOne({ email: 'rival@test.sk' });
    if (rivalUser) {
      console.log('🔍 RIVAL USER (rival@test.sk):');
      console.log(`   TenantID: ${rivalUser.tenantId}`);
      
      const rivalCars = await Car.find({ tenantId: rivalUser.tenantId });
      const rivalReservations = await Reservation.find({ tenantId: rivalUser.tenantId });
      
      console.log(`   Should see: ${rivalCars.length} cars, ${rivalReservations.length} reservations`);
      console.log('');
    } else {
      console.log('❌ rival@test.sk user not found');
    }
    
    // Check admin@example.com
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    if (adminUser) {
      console.log('🔍 ADMIN USER (admin@example.com):');
      console.log(`   TenantID: ${adminUser.tenantId}`);
      
      const adminCars = await Car.find({ tenantId: adminUser.tenantId });
      const adminReservations = await Reservation.find({ tenantId: adminUser.tenantId });
      
      console.log(`   Should see: ${adminCars.length} cars, ${adminReservations.length} reservations`);
      console.log('');
    } else {
      console.log('❌ admin@example.com user not found');
    }
    
    // Check if data is properly separated
    const uniqueTenants = [...new Set(users.map(u => u.tenantId.toString()))];
    console.log(`\n📊 TENANT SEPARATION SUMMARY:`);
    console.log(`   Total users: ${users.length}`);
    console.log(`   Unique tenants: ${uniqueTenants.length}`);
    console.log(`   Total cars: ${cars.length}`);
    console.log(`   Total reservations: ${reservations.length}`);
    
    if (uniqueTenants.length === users.length) {
      console.log('✅ Each user has their own tenant - PERFECT ISOLATION');
    } else {
      console.log('⚠️  Some users share tenants');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Database check complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTenantSeparation(); 