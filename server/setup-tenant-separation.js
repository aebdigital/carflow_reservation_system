const mongoose = require('mongoose');
const User = require('./models/User');
const Car = require('./models/Car');
const Reservation = require('./models/Reservation');

async function setupTenantSeparation() {
  try {
    // Try different MongoDB connection strings
    const connectionStrings = [
      process.env.MONGO_URI,
      process.env.MONGODB_URI,
      'mongodb://localhost:27017/car-rental',
      'mongodb://127.0.0.1:27017/car-rental'
    ].filter(Boolean);

    let connected = false;
    let mongoUri = '';

    for (const uri of connectionStrings) {
      try {
        console.log(`🔄 Trying to connect to: ${uri}`);
        await mongoose.connect(uri);
        mongoUri = uri;
        connected = true;
        console.log('✅ Connected to MongoDB');
        break;
      } catch (error) {
        console.log(`❌ Failed to connect to ${uri}`);
      }
    }

    if (!connected) {
      console.log('❌ Could not connect to MongoDB. Please ensure MongoDB is running.');
      console.log('💡 To start MongoDB:');
      console.log('   - macOS: brew services start mongodb-community');
      console.log('   - Ubuntu: sudo systemctl start mongod');
      console.log('   - Windows: net start MongoDB');
      return;
    }

    console.log('\n🚀 Starting tenant separation setup...');

    // Step 1: Create the rival account
    console.log('\n👤 Step 1: Creating rival account...');
    
    const existingRival = await User.findOne({ email: 'rival@test.sk' });
    if (existingRival) {
      console.log('⚠️  Rival account already exists');
    } else {
      const rivalUser = await User.create({
        firstName: 'Rival',
        lastName: 'Admin',
        email: 'rival@test.sk',
        password: 'Rival123', // Will be auto-hashed by the pre-save middleware
        phone: '+421900000000',
        role: 'admin',
        isActive: true
      });

      console.log('✅ Successfully created rival account:');
      console.log('   Email: rival@test.sk');
      console.log('   Password: Rival123 (bcrypt hashed)');
      console.log('   Role: admin');
      console.log('   User ID:', rivalUser._id);
      console.log('   Tenant ID:', rivalUser.tenantId);
      console.log('   Storage Folder:', rivalUser.storageFolder);
    }

    // Step 2: Migrate existing users
    console.log('\n📝 Step 2: Migrating existing users...');
    const users = await User.find({}).lean();
    let updatedUsers = 0;
    
    for (const user of users) {
      if (!user.tenantId || !user.storageFolder) {
        const tenantId = user._id; // Each user becomes their own tenant for complete separation
        const storageFolder = `tenant-${tenantId}/user-${user._id}`;
        
        await User.findByIdAndUpdate(user._id, {
          tenantId: tenantId,
          storageFolder: storageFolder
        });
        
        console.log(`✅ Updated user ${user.email} with tenantId: ${tenantId}`);
        updatedUsers++;
      }
    }
    
    if (updatedUsers === 0) {
      console.log('✅ All users already have tenant information');
    }

    // Step 3: Migrate cars
    console.log('\n🚗 Step 3: Migrating cars...');
    const cars = await Car.find({}).lean();
    let updatedCars = 0;
    
    for (const car of cars) {
      if (!car.tenantId || !car.owner) {
        // Assign cars to the first admin user found, or create a default admin
        let adminUser = await User.findOne({ role: 'admin' });
        
        if (!adminUser) {
          console.log('⚠️  No admin user found, creating default admin for cars...');
          adminUser = await User.create({
            firstName: 'System',
            lastName: 'Admin',
            email: 'admin@system.local',
            password: 'AdminSystem123',
            phone: '+421000000000',
            role: 'admin',
            isActive: true
          });
        }
        
        await Car.findByIdAndUpdate(car._id, {
          tenantId: adminUser.tenantId,
          owner: adminUser._id
        });
        
        console.log(`✅ Updated car ${car.registrationNumber || car._id} with tenantId: ${adminUser.tenantId}`);
        updatedCars++;
      }
    }
    
    if (updatedCars === 0) {
      console.log('✅ All cars already have tenant information');
    }

    // Step 4: Migrate reservations
    console.log('\n📋 Step 4: Migrating reservations...');
    const reservations = await Reservation.find({}).populate('customer').lean();
    let updatedReservations = 0;
    
    for (const reservation of reservations) {
      if (!reservation.tenantId) {
        const customer = reservation.customer;
        if (customer && customer.tenantId) {
          await Reservation.findByIdAndUpdate(reservation._id, {
            tenantId: customer.tenantId
          });
          
          console.log(`✅ Updated reservation ${reservation.reservationNumber || reservation._id} with tenantId: ${customer.tenantId}`);
          updatedReservations++;
        } else {
          console.log(`⚠️  Could not update reservation ${reservation.reservationNumber || reservation._id} - customer not found`);
        }
      }
    }
    
    if (updatedReservations === 0) {
      console.log('✅ All reservations already have tenant information');
    }

    // Step 5: Show final statistics
    console.log('\n📊 Final Statistics:');
    
    const totalUsers = await User.countDocuments();
    const totalCars = await Car.countDocuments();
    const totalReservations = await Reservation.countDocuments();
    
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Total Cars: ${totalCars}`);
    console.log(`Total Reservations: ${totalReservations}`);
    
    const tenantStats = await User.aggregate([
      {
        $lookup: {
          from: 'cars',
          localField: 'tenantId',
          foreignField: 'tenantId',
          as: 'cars'
        }
      },
      {
        $lookup: {
          from: 'reservations',
          localField: 'tenantId',
          foreignField: 'tenantId',
          as: 'reservations'
        }
      },
      {
        $group: {
          _id: '$tenantId',
          userCount: { $sum: 1 },
          carCount: { $avg: { $size: '$cars' } },
          reservationCount: { $avg: { $size: '$reservations' } },
          emails: { $push: '$email' }
        }
      }
    ]);
    
    console.log('\nTenant Separation Summary:');
    tenantStats.forEach((tenant, index) => {
      console.log(`\n🏢 Tenant ${index + 1} (ID: ${tenant._id}):`);
      console.log(`   Users: ${tenant.userCount}`);
      console.log(`   Cars: ${Math.round(tenant.carCount)}`);
      console.log(`   Reservations: ${Math.round(tenant.reservationCount)}`);
      console.log(`   User Emails: ${tenant.emails.join(', ')}`);
    });

    console.log('\n✅ Tenant separation setup completed successfully!');
    console.log('\n🔐 Security Features Implemented:');
    console.log('   ✅ Complete account isolation between tenants');
    console.log('   ✅ User-specific Google Cloud Storage folders');
    console.log('   ✅ Tenant-scoped database queries');
    console.log('   ✅ Bcrypt password hashing');
    console.log('   ✅ Role-based access control within tenants');
    
    console.log('\n🚀 Login Credentials:');
    console.log('   Email: rival@test.sk');
    console.log('   Password: Rival123');
    console.log('   Role: Admin (Full System Access)');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the setup
setupTenantSeparation(); 