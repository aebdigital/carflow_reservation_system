const mongoose = require('mongoose');
require('dotenv').config();

async function migrateEmailIndex() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('users');

    console.log('🔍 Checking existing indexes...');
    const indexes = await collection.listIndexes().toArray();
    console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key, unique: idx.unique })));

    // Drop the old email_1 unique index if it exists
    try {
      console.log('🗑️ Dropping old email_1 unique index...');
      await collection.dropIndex('email_1');
      console.log('✅ Dropped email_1 index');
    } catch (error) {
      if (error.code === 27) { // Index not found
        console.log('ℹ️ email_1 index not found, skipping drop');
      } else {
        console.error('❌ Error dropping email_1 index:', error.message);
      }
    }

    // Create the new compound unique index
    try {
      console.log('🔨 Creating compound unique index { email: 1, tenantId: 1 }...');
      await collection.createIndex(
        { email: 1, tenantId: 1 }, 
        { unique: true, name: 'email_1_tenantId_1' }
      );
      console.log('✅ Created compound unique index');
    } catch (error) {
      if (error.code === 85) { // Index already exists
        console.log('ℹ️ Compound index already exists, skipping creation');
      } else {
        console.error('❌ Error creating compound index:', error.message);
        throw error;
      }
    }

    console.log('🔍 Checking final indexes...');
    const finalIndexes = await collection.listIndexes().toArray();
    console.log('Final indexes:', finalIndexes.map(idx => ({ name: idx.name, key: idx.key, unique: idx.unique })));

    console.log('✅ Email index migration completed successfully!');
    console.log('📧 Emails can now be unique per tenant instead of globally unique');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
if (require.main === module) {
  migrateEmailIndex()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateEmailIndex;