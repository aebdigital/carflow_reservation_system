// 🔍 Check Reservations Script
// This script shows all reservations and their tenant assignments

const mongoose = require('mongoose');
const Car = require('./models/Car');
const Reservation = require('./models/Reservation');
const User = require('./models/User');
require('dotenv').config();

const checkReservations = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/car-rental');
    console.log('📦 Connected to MongoDB');

    // Get all reservations
    const allReservations = await Reservation.find({})
      .populate('customer', 'firstName lastName email tenantId')
      .populate('car', 'brand model tenantId')
      .sort({ createdAt: -1 });

    console.log(`\n📊 Found ${allReservations.length} total reservations\n`);

    if (allReservations.length === 0) {
      console.log('❌ No reservations found in database');
      return;
    }

    // Show each reservation
    allReservations.forEach((reservation, index) => {
      console.log(`${index + 1}. Reservation ID: ${reservation._id}`);
      console.log(`   Customer: ${reservation.customer?.firstName} ${reservation.customer?.lastName} (${reservation.customer?.email})`);
      console.log(`   Car: ${reservation.car?.brand} ${reservation.car?.model}`);
      console.log(`   Reservation tenantId: ${reservation.tenantId || 'MISSING ❌'}`);
      console.log(`   Customer tenantId: ${reservation.customer?.tenantId || 'MISSING ❌'}`);
      console.log(`   Car tenantId: ${reservation.car?.tenantId || 'MISSING ❌'}`);
      console.log(`   Status: ${reservation.status}`);
      console.log(`   Created: ${reservation.createdAt}`);
      console.log(`   Start Date: ${reservation.startDate}`);
      console.log(`   End Date: ${reservation.endDate}`);
      console.log('');
    });

    // Get user with email rival@test.sk
    const rivalUser = await User.findOne({ email: 'rival@test.sk' });
    if (rivalUser) {
      console.log(`\n🎯 rival@test.sk User Info:`);
      console.log(`   ID: ${rivalUser._id}`);
      console.log(`   TenantId: ${rivalUser.tenantId}`);
      console.log(`   Role: ${rivalUser.role}`);
      
      // Find reservations for this tenant
      const rivalReservations = await Reservation.find({ tenantId: rivalUser.tenantId });
      console.log(`   Reservations for this tenant: ${rivalReservations.length}`);
      
      if (rivalReservations.length > 0) {
        console.log(`   Reservation IDs: ${rivalReservations.map(r => r._id).join(', ')}`);
      }
    } else {
      console.log(`\n❌ User rival@test.sk NOT FOUND`);
    }

    // Check for any reservations without tenantId
    const orphaned = await Reservation.find({ 
      $or: [
        { tenantId: { $exists: false } },
        { tenantId: null }
      ]
    });
    console.log(`\n🔍 Orphaned reservations (no tenantId): ${orphaned.length}`);

    // Show tenant summary
    const tenantSummary = await Reservation.aggregate([
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log(`\n📈 Reservations by tenant:`);
    for (const tenant of tenantSummary) {
      const tenantLabel = tenant._id ? tenant._id : 'NO TENANT';
      console.log(`   ${tenantLabel}: ${tenant.count} reservations`);
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the script
checkReservations()
  .then(() => console.log('✅ Check completed'))
  .catch(error => console.error('💥 Check failed:', error)); 