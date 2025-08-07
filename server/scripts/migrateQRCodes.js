const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/carflow', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Reservation = require('../models/Reservation');
const bySquareService = require('../services/bySquareService');

/**
 * Migration script to update reservations with legacy QR codes
 * to use the new dual QR format (payBySquareRental + payBySquareDeposit)
 */
async function migrateQRCodes() {
  try {
    console.log('🔄 Starting QR code migration...');
    
    // Find reservations with legacy QR format
    const legacyReservations = await Reservation.find({
      $and: [
        { 'qrCodes.payBySquare': { $exists: true, $ne: null } },
        { $or: [
          { 'qrCodes.payBySquareRental': { $exists: false } },
          { 'qrCodes.payBySquareRental': null }
        ]}
      ]
    }).populate('customer car');
    
    console.log(`📊 Found ${legacyReservations.length} reservations with legacy QR format`);
    
    if (legacyReservations.length === 0) {
      console.log('✅ No legacy QR codes found. Migration complete!');
      return;
    }
    
    let updated = 0;
    let errors = 0;
    
    for (const reservation of legacyReservations) {
      try {
        console.log(`🔄 Processing reservation ${reservation.reservationNumber}...`);
        
        // Check if bySquare service is configured
        if (!bySquareService.isConfigured()) {
          console.warn('⚠️ bySquare service not configured, skipping QR regeneration');
          continue;
        }
        
        // Generate new QR codes
        const qrResult = await bySquareService.generateReservationQR(
          reservation,
          reservation.car,
          reservation.customer
        );
        
        if (qrResult.success && qrResult.qrCodes) {
          // Update with new format, preserving existing metadata
          reservation.qrCodes = {
            ...reservation.qrCodes.toObject(),
            payBySquareRental: qrResult.qrCodes.payBySquareRental,
            payBySquareDeposit: qrResult.qrCodes.payBySquareDeposit,
            lastUpdated: new Date(),
            // Remove legacy fields
            payBySquare: undefined,
            qrPlatbaCz: undefined,
            invoiceBySquare: undefined
          };
          
          await reservation.save();
          updated++;
          console.log(`✅ Updated ${reservation.reservationNumber}`);
        } else {
          console.error(`❌ Failed to generate QR for ${reservation.reservationNumber}:`, qrResult.error);
          errors++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${reservation.reservationNumber}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Successfully updated: ${updated} reservations`);
    console.log(`❌ Errors: ${errors} reservations`);
    console.log(`📈 Total processed: ${legacyReservations.length} reservations`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateQRCodes()
    .then(() => {
      console.log('🎉 Migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateQRCodes;