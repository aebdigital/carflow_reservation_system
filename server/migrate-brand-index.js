/**
 * Migration script to update Brand model indexes
 * This fixes the issue where deleted brands prevent creating new brands with the same name
 *
 * Run with: node migrate-brand-index.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function migrateBrandIndexes() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Brand = mongoose.connection.collection('brands');

    console.log('\n📋 Current indexes:');
    const indexes = await Brand.indexes();
    indexes.forEach(index => {
      console.log('  -', JSON.stringify(index));
    });

    // Drop the old unique index on tenantId + name
    console.log('\n🗑️  Dropping old unique index on tenantId + name...');
    try {
      await Brand.dropIndex('tenantId_1_name_1');
      console.log('✅ Old index dropped successfully');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  Index does not exist, skipping...');
      } else {
        throw error;
      }
    }

    // Create new partial unique index (only for active brands)
    console.log('\n✨ Creating new partial unique index...');
    await Brand.createIndex(
      { tenantId: 1, name: 1 },
      {
        unique: true,
        partialFilterExpression: { isActive: true },
        name: 'tenantId_1_name_1_partial_active'
      }
    );
    console.log('✅ New partial index created successfully');

    console.log('\n📋 Updated indexes:');
    const newIndexes = await Brand.indexes();
    newIndexes.forEach(index => {
      console.log('  -', JSON.stringify(index));
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('ℹ️  You can now delete brands and recreate them with the same name.');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration
migrateBrandIndexes();
