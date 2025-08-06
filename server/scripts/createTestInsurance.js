const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Insurance = require('../models/Insurance');
const User = require('../models/User');

async function createTestInsurance() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    // Find a tenant ID (admin user)
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ No admin user found');
      return;
    }

    const tenantId = adminUser.tenantId;
    const createdBy = adminUser._id;
    console.log(`🏢 Using tenant ID: ${tenantId}`);
    console.log(`👤 Created by user: ${adminUser.firstName} ${adminUser.lastName}`);

    // Create test insurance options
    const testInsuranceOptions = [
      {
        tenantId,
        createdBy,
        name: 'Základné poistenie',
        description: 'Základné krytie škôd na vozidle',
        coverage: 'Pokrytie škôd do 10,000€',
        type: 'collision_damage',
        pricing: {
          type: 'per_day',
          amount: 25,
          currency: 'EUR'
        },
        coverage_limits: {
          deductible: 500,
          maxCoverage: 10000,
          currency: 'EUR'
        },
        legal: {
          insuranceProvider: {
            name: 'Test Insurance Company',
            licenseNumber: 'TIC-12345',
            address: 'Bratislava, Slovakia',
            phone: '+421 123 456 789',
            email: 'info@testinsurance.sk'
          }
        },
        isActive: true,
        isPublic: true
      },
      {
        tenantId,
        createdBy,
        name: 'Rozšírené poistenie',
        description: 'Rozšírené krytie včítane krádeže',
        coverage: 'Plné pokrytie škôd a krádeže do 25,000€',
        type: 'comprehensive',
        pricing: {
          type: 'per_day',
          amount: 45,
          currency: 'EUR'
        },
        coverage_limits: {
          deductible: 200,
          maxCoverage: 25000,
          currency: 'EUR'
        },
        legal: {
          insuranceProvider: {
            name: 'Premium Insurance Ltd',
            licenseNumber: 'PIL-67890',
            address: 'Bratislava, Slovakia',
            phone: '+421 987 654 321',
            email: 'premium@insurance.sk'
          }
        },
        isActive: true,
        isPublic: true
      },
      {
        tenantId,
        createdBy,
        name: 'Prémiové poistenie',
        description: 'Najvyššie krytie s asistenčnými službami',
        coverage: 'Kompletné pokrytie s 24/7 asistenčnými službami',
        type: 'roadside_assistance',
        pricing: {
          type: 'per_day',
          amount: 75,
          currency: 'EUR'
        },
        coverage_limits: {
          deductible: 0,
          maxCoverage: 50000,
          currency: 'EUR'
        },
        legal: {
          insuranceProvider: {
            name: 'Elite Insurance Group',
            licenseNumber: 'EIG-24681',
            address: 'Bratislava, Slovakia',
            phone: '+421 111 222 333',
            email: 'elite@insurance.sk'
          }
        },
        claims: {
          phoneNumber: '+421 800 123 456',
          email: 'claims@elite-insurance.sk',
          website: 'www.elite-insurance.sk',
          supportHours: '24/7'
        },
        isActive: true,
        isPublic: true
      }
    ];

    // Create insurance options
    const createdInsurance = await Insurance.insertMany(testInsuranceOptions);
    
    console.log('✅ Created test insurance options:');
    createdInsurance.forEach((insurance, index) => {
      console.log(`   ${index + 1}. ${insurance.name} - ${insurance.pricing.amount}€ (${insurance.type})`);
    });

    console.log(`\n🎯 Created ${createdInsurance.length} insurance options for tenant ${tenantId}`);

  } catch (error) {
    console.error('❌ Error creating test insurance:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createTestInsurance();