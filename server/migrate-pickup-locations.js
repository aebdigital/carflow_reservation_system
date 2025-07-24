const mongoose = require('mongoose');
require('dotenv').config();

// Import the Settings model
const Settings = require('./models/Settings');

const migratePickupLocations = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/car-rental', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('🔗 Connected to MongoDB');
    
    // Find all settings documents
    const allSettings = await Settings.find({});
    console.log(`📊 Found ${allSettings.length} settings documents`);
    
    for (const settings of allSettings) {
      let updated = false;
      
      // Update default pickup location if it's still Bratislava
      if (settings.business.defaultPickupLocation === 'Bratislava') {
        settings.business.defaultPickupLocation = 'Banska Bystrica';
        console.log(`🔧 Updated defaultPickupLocation for tenant ${settings.tenantId}`);
        updated = true;
      }
      
      // Update pickup locations that are still Bratislava
      for (const location of settings.business.pickupLocations) {
        if (location.name.includes('Bratislava')) {
          location.name = location.name.replace('Bratislava', 'Banska Bystrica');
          location.address = location.address.replace('Bratislava', 'Banska Bystrica');
          console.log(`🏢 Updated pickup location for tenant ${settings.tenantId}: ${location.name}`);
          updated = true;
        }
      }
      
      if (updated) {
        await settings.save();
        console.log(`✅ Saved updates for tenant ${settings.tenantId}`);
      } else {
        console.log(`⏭️  No updates needed for tenant ${settings.tenantId}`);
      }
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
};

// Run the migration
migratePickupLocations();