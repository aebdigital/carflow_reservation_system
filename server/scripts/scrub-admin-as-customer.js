/**
 * NitraCar-only cleanup of legacy reservations whose `customer` field points
 * at the NitraCar admin (nitra-car@nitra-car.sk). For each one, we mint a
 * fresh customer record using whatever data we still have (the contract
 * snapshot if a contract exists, otherwise a "Neznámy zákazník" placeholder),
 * and re-link the reservation to that new record.
 *
 * Other tenants' admin/staff users are intentionally untouched — running this
 * script never crosses the NitraCar tenant boundary.
 *
 * Safe to run repeatedly. Pass --dry to preview without writing.
 *
 *   cd server
 *   node scripts/scrub-admin-as-customer.js --dry    # preview only
 *   node scripts/scrub-admin-as-customer.js          # apply
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const DRY = process.argv.includes('--dry');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');
  if (DRY) console.log('🔎 DRY RUN — no writes will be made.');

  const Users = mongoose.connection.collection('users');
  const Reservations = mongoose.connection.collection('reservations');
  const Contracts = mongoose.connection.collection('contracts');

  // Step 1: find the NitraCar admin user (script is scoped to this tenant only).
  const nitraAdmin = await Users.findOne({
    email: 'nitra-car@nitra-car.sk',
    role: 'admin'
  }, { projection: { _id: 1, email: 1, firstName: 1, lastName: 1, role: 1, tenantId: 1 } });

  if (!nitraAdmin) {
    console.log('ℹ️ NitraCar admin (nitra-car@nitra-car.sk) not found — nothing to scrub.');
    await mongoose.disconnect();
    return;
  }
  console.log(`🔍 NitraCar admin: _id=${nitraAdmin._id}  tenantId=${nitraAdmin.tenantId}`);

  // Step 2: reservations whose customer field points at the NitraCar admin,
  // scoped to NitraCar's tenant for an extra layer of safety.
  const affected = await Reservations
    .find({ customer: nitraAdmin._id, tenantId: nitraAdmin.tenantId })
    .toArray();
  console.log(`\n📦 Affected NitraCar reservations: ${affected.length}`);
  if (affected.length === 0) {
    await mongoose.disconnect();
    return;
  }

  let migrated = 0;
  let failed = 0;

  for (const r of affected) {
    try {
      // Try to recover real customer info from the contract snapshot
      const contract = await Contracts.findOne({ reservation: r._id }, { projection: { customer: 1 } });
      const snapshot = contract?.customer || null;

      const fallbackName = `Neznámy zákazník ${r.reservationNumber || r._id.toString().slice(-6)}`;
      const newCustomer = {
        firstName: (snapshot?.firstName && snapshot.firstName !== 'Neuvedené') ? snapshot.firstName : fallbackName,
        lastName: (snapshot?.lastName && snapshot.lastName !== 'Neuvedené') ? snapshot.lastName : '—',
        phone: (snapshot?.phone && snapshot.phone !== 'Neuvedené') ? snapshot.phone : '',
        // No email — explicitly. The whole point of this cleanup is to detach
        // the nitra-car@nitra-car.sk email from these reservations.
        role: 'customer',
        isActive: true,
        tenantId: r.tenantId,
        address: snapshot?.address && typeof snapshot.address === 'object' ? snapshot.address : undefined,
        idNumber: snapshot?.idNumber || undefined,
        rodneCislo: snapshot?.rodneCislo || undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Strip undefineds so Mongo doesn't store them as nulls
      Object.keys(newCustomer).forEach(k => newCustomer[k] === undefined && delete newCustomer[k]);

      console.log(`  → reservation ${r.reservationNumber || r._id}  →  new customer "${newCustomer.firstName} ${newCustomer.lastName}"`);

      if (!DRY) {
        const ins = await Users.insertOne(newCustomer);
        await Reservations.updateOne(
          { _id: r._id },
          { $set: { customer: ins.insertedId, updatedAt: new Date() } }
        );
      }
      migrated++;
    } catch (err) {
      failed++;
      console.error(`  ❌ Failed to migrate reservation ${r._id}: ${err.message}`);
    }
  }

  console.log(`\n${DRY ? '[DRY] Would have' : 'Successfully'} migrated ${migrated}/${affected.length} reservations${failed ? ` (${failed} failed)` : ''}.`);
  await mongoose.disconnect();
  console.log('🔌 Disconnected.');
}

main().catch(err => {
  console.error('💥 Failed:', err);
  process.exit(1);
});
