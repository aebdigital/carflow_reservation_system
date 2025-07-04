const mongoose = require('mongoose');
require('dotenv').config();

async function setupDemoData() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/car-rental');
    console.log('Connected to MongoDB');
    
    const User = require('./models/User');
    const Car = require('./models/Car');
    const Reservation = require('./models/Reservation');
    
    const userCount = await User.countDocuments();
    const carCount = await Car.countDocuments();
    const reservationCount = await Reservation.countDocuments();
    
    console.log('Database Statistics:');
    console.log('Users:', userCount);
    console.log('Cars:', carCount);
    console.log('Reservations:', reservationCount);
    
    if (userCount === 0) {
      console.log('\nNo users found. Creating demo users...');
      
      await User.create([
        {
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@example.com',
          password: 'admin123',
          role: 'admin',
          phone: '+1234567890'
        },
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'customer123',
          role: 'customer',
          phone: '+1234567891',
          licenseNumber: 'JD123456',
          licenseExpiry: new Date('2025-12-31'),
          dateOfBirth: new Date('1990-05-15')
        },
        {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          password: 'customer123',
          role: 'customer',
          phone: '+1234567892',
          licenseNumber: 'JS123456',
          licenseExpiry: new Date('2025-12-31'),
          dateOfBirth: new Date('1988-08-22')
        }
      ]);
      console.log('Demo users created');
    }
    
    if (carCount === 0) {
      console.log('\nNo cars found. Creating demo cars...');
      await Car.create([
        {
          brand: 'Toyota',
          model: 'Camry',
          year: 2023,
          registrationNumber: 'TOY-001',
          vin: 'TOY12345678901234',
          color: 'Silver',
          category: 'midsize',
          fuelType: 'gasoline',
          transmission: 'automatic',
          seats: 5,
          doors: 4,
          mileage: 15000,
          dailyRate: 45,
          status: 'active',
          location: {
            name: 'Main Office',
            address: {
              street: '123 Main St',
              city: 'Downtown',
              state: 'CA',
              zipCode: '90210',
              country: 'USA'
            }
          },
          features: ['air-conditioning', 'gps', 'bluetooth']
        },
        {
          brand: 'Honda',
          model: 'CR-V',
          year: 2023,
          registrationNumber: 'HON-001',
          vin: 'HON12345678901234',
          color: 'White',
          category: 'suv',
          fuelType: 'gasoline',
          transmission: 'automatic',
          seats: 5,
          doors: 4,
          mileage: 12000,
          dailyRate: 65,
          status: 'active',
          location: {
            name: 'Main Office',
            address: {
              street: '123 Main St',
              city: 'Downtown',
              state: 'CA',
              zipCode: '90210',
              country: 'USA'
            }
          },
          features: ['air-conditioning', 'gps', 'bluetooth', 'backup-camera']
        },
        {
          brand: 'BMW',
          model: 'X3',
          year: 2023,
          registrationNumber: 'BMW-001',
          vin: 'BMW12345678901234',
          color: 'Black',
          category: 'luxury',
          fuelType: 'gasoline',
          transmission: 'automatic',
          seats: 5,
          doors: 4,
          mileage: 8000,
          dailyRate: 95,
          status: 'active',
          location: {
            name: 'Main Office',
            address: {
              street: '123 Main St',
              city: 'Downtown',
              state: 'CA',
              zipCode: '90210',
              country: 'USA'
            }
          },
          features: ['air-conditioning', 'gps', 'bluetooth', 'heated-seats', 'sunroof', 'leather-seats']
        }
      ]);
      console.log('Demo cars created');
    }
    
    console.log('\nSetup complete!');
    console.log('\nDemo accounts:');
    console.log('Admin: admin@example.com / admin123');
    console.log('Customer: john@example.com / customer123');
    console.log('Customer: jane@example.com / customer123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setupDemoData(); 