/**
 * Utility to ensure User model has correct indexes.
 * Specifically rebuilds the (email, tenantId) unique index as a partial index
 * so customers without an email don't collide on a null value.
 * Runs on server startup; idempotent.
 */

const mongoose = require('mongoose');

async function ensureUserIndexes() {
  try {
    const Users = mongoose.connection.collection('users');

    console.log('🔍 Checking User collection indexes...');
    const indexes = await Users.indexes();

    const emailIndex = indexes.find(idx => idx.name === 'email_1_tenantId_1');
    const isOldStyle = emailIndex && !emailIndex.partialFilterExpression;

    if (isOldStyle) {
      console.log('🔄 Found legacy (email, tenantId) unique index — converting to partial...');
      try {
        await Users.dropIndex('email_1_tenantId_1');
        console.log('✅ Dropped legacy email_1_tenantId_1 index');
      } catch (error) {
        if (error.code !== 27) {
          console.warn('⚠️  Could not drop legacy email index:', error.message);
        }
      }

      await Users.createIndex(
        { email: 1, tenantId: 1 },
        {
          unique: true,
          partialFilterExpression: { email: { $type: 'string' } },
          name: 'email_1_tenantId_1'
        }
      );
      console.log('✅ Recreated email_1_tenantId_1 as partial unique index (only enforced when email is set)');
    } else if (!emailIndex) {
      console.log('ℹ️  email_1_tenantId_1 not found yet — Mongoose will create it on model load');
    } else {
      console.log('✅ User email index is already partial — nothing to do');
    }
  } catch (error) {
    console.error('❌ Error ensuring User indexes:', error.message);
    // Don't throw - allow server to continue starting
  }
}

module.exports = { ensureUserIndexes };
