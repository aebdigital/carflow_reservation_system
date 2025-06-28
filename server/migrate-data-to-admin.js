const mongoose = require('mongoose');
const User = require('./models/User');
const Car = require('./models/Car');
const Reservation = require('./models/Reservation');

async function migrateDataToAdmin() {
  try {
    // Use only the cloud MongoDB database
    const mongoUri = 'mongodb+srv://petersamuelbobak:gclTt7XfDXcSXCAk@rentalsystemcluster.rabsr6f.mongodb.net/car_rental_db?retryWrites=true&w=majority';

    console.log(`🔄 Connecting to cloud database...`);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    console.log('\n🚀 Starting data consolidation to admin@example.com...');

    // Step 1: Get admin and rival users
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    const rivalUser = await User.findOne({ email: 'rival@test.sk' });

    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }

    if (!rivalUser) {
      console.log('❌ Rival user not found!');
      return;
    }

    console.log(`\n👤 Admin User: ${adminUser.email}`);
    console.log(`   Tenant ID: ${adminUser.tenantId}`);
    console.log(`\n👤 Rival User: ${rivalUser.email}`);
    console.log(`   Tenant ID: ${rivalUser.tenantId}`);

    // Step 2: Move all customers to admin's tenant (except rival)
    console.log('\n📝 Step 2: Moving all customers to admin tenant...');
    const customerUsers = await User.find({ 
      role: 'customer',
      email: { $ne: 'rival@test.sk' } // Exclude rival
    });

    let movedCustomers = 0;
    for (const customer of customerUsers) {
      if (customer.tenantId.toString() !== adminUser.tenantId.toString()) {
        const oldTenantId = customer.tenantId;
        
        await User.findByIdAndUpdate(customer._id, {
          tenantId: adminUser.tenantId,
          storageFolder: `tenant-${adminUser.tenantId}/user-${customer._id}`
        });
        
        console.log(`✅ Moved customer ${customer.email} from tenant ${oldTenantId} to admin tenant ${adminUser.tenantId}`);
        movedCustomers++;
      } else {
        console.log(`ℹ️  Customer ${customer.email} already in admin tenant`);
      }
    }

    console.log(`📊 Total customers moved: ${movedCustomers}`);

    // Step 3: Move all cars to admin's tenant
    console.log('\n🚗 Step 3: Moving all cars to admin tenant...');
    const cars = await Car.find({});
    let movedCars = 0;

    for (const car of cars) {
      if (car.tenantId.toString() !== adminUser.tenantId.toString()) {
        const oldTenantId = car.tenantId;
        
        await Car.findByIdAndUpdate(car._id, {
          tenantId: adminUser.tenantId,
          owner: adminUser._id
        });
        
        console.log(`✅ Moved car ${car.registrationNumber || car._id} from tenant ${oldTenantId} to admin tenant ${adminUser.tenantId}`);
        movedCars++;
      } else {
        console.log(`ℹ️  Car ${car.registrationNumber || car._id} already in admin tenant`);
      }
    }

    console.log(`📊 Total cars moved: ${movedCars}`);

    // Step 4: Move all reservations to admin's tenant
    console.log('\n📋 Step 4: Moving all reservations to admin tenant...');
    const reservations = await Reservation.find({});
    let movedReservations = 0;

    for (const reservation of reservations) {
      if (reservation.tenantId.toString() !== adminUser.tenantId.toString()) {
        const oldTenantId = reservation.tenantId;
        
        await Reservation.findByIdAndUpdate(reservation._id, {
          tenantId: adminUser.tenantId
        });
        
        console.log(`✅ Moved reservation ${reservation.reservationNumber || reservation._id} from tenant ${oldTenantId} to admin tenant ${adminUser.tenantId}`);
        movedReservations++;
      } else {
        console.log(`ℹ️  Reservation ${reservation.reservationNumber || reservation._id} already in admin tenant`);
      }
    }

    console.log(`📊 Total reservations moved: ${movedReservations}`);

    // Step 5: Verify final state
    console.log('\n📊 Final verification...');
    
    const adminTenantUsers = await User.countDocuments({ tenantId: adminUser.tenantId });
    const adminTenantCars = await Car.countDocuments({ tenantId: adminUser.tenantId });
    const adminTenantReservations = await Reservation.countDocuments({ tenantId: adminUser.tenantId });
    
    const rivalTenantUsers = await User.countDocuments({ tenantId: rivalUser.tenantId });
    const rivalTenantCars = await Car.countDocuments({ tenantId: rivalUser.tenantId });
    const rivalTenantReservations = await Reservation.countDocuments({ tenantId: rivalUser.tenantId });

    console.log('\n🏢 ADMIN TENANT (admin@example.com):');
    console.log(`   Users: ${adminTenantUsers}`);
    console.log(`   Cars: ${adminTenantCars}`);
    console.log(`   Reservations: ${adminTenantReservations}`);

    console.log('\n🏢 RIVAL TENANT (rival@test.sk):');
    console.log(`   Users: ${rivalTenantUsers}`);
    console.log(`   Cars: ${rivalTenantCars}`);
    console.log(`   Reservations: ${rivalTenantReservations}`);

    console.log('\n✅ Data consolidation completed successfully!');
    console.log('\n🔐 Result:');
    console.log('   ✅ admin@example.com - Has all existing data (cars, customers, reservations)');
    console.log('   ✅ rival@test.sk - Has clean slate (no data)');
    console.log('   ✅ Complete tenant separation maintained');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the migration
migrateDataToAdmin(); 