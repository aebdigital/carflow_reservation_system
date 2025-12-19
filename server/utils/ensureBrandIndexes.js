/**
 * Utility to ensure Brand model has correct indexes
 * This will automatically fix the index issue on server startup
 */

const mongoose = require('mongoose');

async function ensureBrandIndexes() {
  try {
    const Brand = mongoose.connection.collection('brands');

    console.log('🔍 Checking Brand collection indexes...');

    // Get current indexes
    const indexes = await Brand.indexes();
    const hasOldIndex = indexes.some(idx =>
      idx.name === 'tenantId_1_name_1' && !idx.partialFilterExpression
    );

    if (hasOldIndex) {
      console.log('🔄 Found old unique index, updating...');

      // Drop old index
      try {
        await Brand.dropIndex('tenantId_1_name_1');
        console.log('✅ Dropped old index');
      } catch (error) {
        if (error.code !== 27) { // 27 = index not found
          console.warn('⚠️  Could not drop old index:', error.message);
        }
      }

      // Create new partial index
      await Brand.createIndex(
        { tenantId: 1, name: 1 },
        {
          unique: true,
          partialFilterExpression: { isActive: true },
          name: 'tenantId_1_name_1_partial_active'
        }
      );
      console.log('✅ Created new partial unique index for active brands');
    } else {
      console.log('✅ Brand indexes are up to date');
    }

  } catch (error) {
    console.error('❌ Error ensuring Brand indexes:', error.message);
    // Don't throw - allow server to continue starting
  }
}

module.exports = { ensureBrandIndexes };
