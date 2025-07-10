// 🔧 Fix Orphaned Reservations Script
// This script finds reservations without tenantId and assigns them to the correct tenant based on their car

const mongoose = require('mongoose');
const Car = require('./models/Car');
const Reservation = require('./models/Reservation');
const User = require('./models/User');
require('dotenv').config();

const fixOrphanedReservations = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/car-rental');
    console.log('📦 Connected to MongoDB');

    // Find reservations without tenantId
    const orphanedReservations = await Reservation.find({ 
      $or: [
        { tenantId: { $exists: false } },
        { tenantId: null }
      ]
    }).populate('car');

    console.log(`🔍 Found ${orphanedReservations.length} orphaned reservations`);

    if (orphanedReservations.length === 0) {
      console.log('✅ No orphaned reservations found');
      return;
    }

    let fixed = 0;
    let failed = 0;

    for (const reservation of orphanedReservations) {
      try {
        if (!reservation.car) {
          console.log(`❌ Reservation ${reservation._id} has no car - skipping`);
          failed++;
          continue;
        }

        const car = await Car.findById(reservation.car._id || reservation.car);
        if (!car || !car.tenantId) {
          console.log(`❌ Car ${reservation.car._id || reservation.car} has no tenantId - skipping reservation ${reservation._id}`);
          failed++;
          continue;
        }

        // Update reservation with tenantId from car
        await Reservation.findByIdAndUpdate(reservation._id, {
          tenantId: car.tenantId
        });

        // Also fix customer if they don't have tenantId
        if (reservation.customer) {
          const customer = await User.findById(reservation.customer);
          if (customer && (!customer.tenantId || customer.tenantId.toString() !== car.tenantId.toString())) {
            await User.findByIdAndUpdate(customer._id, {
              tenantId: car.tenantId
            });
            console.log(`✅ Fixed customer ${customer.email} tenantId`);
          }
        }

        console.log(`✅ Fixed reservation ${reservation._id} - assigned to tenant ${car.tenantId}`);
        fixed++;
      } catch (error) {
        console.error(`❌ Failed to fix reservation ${reservation._id}:`, error.message);
        failed++;
      }
    }

    console.log(`\n📊 Results:`);
    console.log(`✅ Fixed: ${fixed} reservations`);
    console.log(`❌ Failed: ${failed} reservations`);

    // Show summary by tenant
    const reservationsByTenant = await Reservation.aggregate([
      { $match: { tenantId: { $exists: true, $ne: null } } },
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: 'tenantId', as: 'users' } },
      { $project: { count: 1, adminUser: { $arrayElemAt: ['$users', 0] } } }
    ]);

    console.log(`\n📈 Reservations by tenant:`);
    for (const tenant of reservationsByTenant) {
      const adminEmail = tenant.adminUser ? tenant.adminUser.email : 'Unknown';
      console.log(`  ${adminEmail}: ${tenant.count} reservations`);
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  fixOrphanedReservations()
    .then(() => {
      console.log('🎉 Script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = fixOrphanedReservations; 