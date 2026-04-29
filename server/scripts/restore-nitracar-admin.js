/**
 * One-shot script to revert the NitraCar admin user back to:
 *   email     = nitra-car@nitra-car.sk
 *   firstName = NitraCar
 *   lastName  = Admin
 *
 * Usage:
 *   cd server
 *   node scripts/restore-nitracar-admin.js
 *
 * Requires MONGODB_URI in env (already loaded from server/.env).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const TARGET = {
  desiredEmail: 'nitra-car@nitra-car.sk',
  desiredFirstName: 'NitraCar',
  desiredLastName: 'Admin',
  // Identify the affected user by either of these — adjust if your situation differs
  knownBadEmails: ['test@test.sk', 'aliksei@gmail.com'],
  knownBadName: { firstName: 'Aliksei', lastName: 'Netserau' }
};

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set. Make sure server/.env has it, or export it before running.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const Users = mongoose.connection.collection('users');

  // Try to find the affected user by either bad email or bad name.
  const orClauses = [
    ...TARGET.knownBadEmails.map(e => ({ email: e.toLowerCase() })),
    { firstName: TARGET.knownBadName.firstName, lastName: TARGET.knownBadName.lastName }
  ];

  const candidates = await Users.find({ role: 'admin', $or: orClauses }).toArray();
  if (candidates.length === 0) {
    console.log('ℹ️ No admin user matched the bad email/name. Listing all admin users for inspection:');
    const allAdmins = await Users.find({ role: 'admin' }).project({ email: 1, firstName: 1, lastName: 1, tenantId: 1 }).toArray();
    allAdmins.forEach(u => console.log(`  • _id=${u._id}  email=${u.email}  name="${u.firstName} ${u.lastName}"  tenantId=${u.tenantId}`));
    console.log('\nIf one of these IS the NitraCar admin, edit this script (knownBadEmails / knownBadName) and re-run, or update directly in Mongo.');
    await mongoose.disconnect();
    process.exit(0);
  }

  if (candidates.length > 1) {
    console.warn(`⚠️ Found ${candidates.length} matching admin users — too ambiguous, refusing to update automatically.`);
    candidates.forEach(u => console.warn(`  • _id=${u._id}  email=${u.email}  name="${u.firstName} ${u.lastName}"  tenantId=${u.tenantId}`));
    await mongoose.disconnect();
    process.exit(1);
  }

  const user = candidates[0];
  console.log(`🎯 Will update user _id=${user._id}`);
  console.log(`   before: email=${user.email}  name="${user.firstName} ${user.lastName}"`);

  // Make sure no other tenant already has the desired email — would violate the partial unique index
  const conflict = await Users.findOne({
    email: TARGET.desiredEmail,
    tenantId: user.tenantId,
    _id: { $ne: user._id }
  });
  if (conflict) {
    console.error(`❌ Another user in the same tenant already uses ${TARGET.desiredEmail} (_id=${conflict._id}). Resolve manually before running.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  await Users.updateOne(
    { _id: user._id },
    {
      $set: {
        email: TARGET.desiredEmail,
        firstName: TARGET.desiredFirstName,
        lastName: TARGET.desiredLastName
      }
    }
  );

  const after = await Users.findOne({ _id: user._id }, { projection: { email: 1, firstName: 1, lastName: 1, tenantId: 1 } });
  console.log(`✅ Updated.`);
  console.log(`   after:  email=${after.email}  name="${after.firstName} ${after.lastName}"`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected. Done.');
}

main().catch(err => {
  console.error('💥 Failed:', err);
  process.exit(1);
});
