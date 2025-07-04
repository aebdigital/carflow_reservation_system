const mongoose = require('mongoose');
require('dotenv').config();

async function migrateCarStatus() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/car-rental');
    console.log('🔗 Connected to MongoDB');
    
    const Car = require('./models/Car');
    
    // Find all cars with old status 'available'
    const carsToUpdate = await Car.find({ status: 'available' });
    console.log(`🔍 Found ${carsToUpdate.length} cars with status 'available'`);
    
    if (carsToUpdate.length === 0) {
      console.log('✅ No cars need migration');
      process.exit(0);
    }
    
    // Update all cars from 'available' to 'active'
    const result = await Car.updateMany(
      { status: 'available' },
      { $set: { status: 'active' } }
    );
    
    console.log(`✅ Successfully updated ${result.modifiedCount} cars`);
    console.log('📋 Migration summary:');
    console.log(`   - Cars found with 'available' status: ${carsToUpdate.length}`);
    console.log(`   - Cars updated to 'active': ${result.modifiedCount}`);
    
    // Verify the update
    const remainingOldStatus = await Car.countDocuments({ status: 'available' });
    const newActiveCount = await Car.countDocuments({ status: 'active' });
    
    console.log('\n🔍 Post-migration verification:');
    console.log(`   - Cars still with 'available': ${remainingOldStatus}`);
    console.log(`   - Cars with 'active': ${newActiveCount}`);
    
    if (remainingOldStatus === 0) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('⚠️  Some cars still have old status');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateCarStatus(); 