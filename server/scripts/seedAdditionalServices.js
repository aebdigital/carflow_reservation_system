const mongoose = require('mongoose');
const AdditionalService = require('../models/AdditionalService');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rezervacny');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Default services data
const defaultServices = [
  // JAZDA A KOMFORT
  {
    name: 'Bez obmedzenia kilometrov',
    description: 'Možnosť jazdiť bez obmedzenia počtu najazdených kilometrov počas celej doby prenájmu.',
    category: 'driving_comfort',
    pricing: {
      type: 'per_day',
      amount: 15.00,
      currency: 'EUR'
    },
    availability: {
      isGlobal: true,
      vehicleCategories: [],
      excludedVehicles: [],
      seasonal: { isActive: false }
    },
    behavior: {
      isAutoSelected: false,
      isRequired: false,
      requiresApproval: false,
      maxQuantity: 1
    },
    color: '#4caf50',
    icon: 'directions_car',
    isActive: true,
    isPublic: true,
    sortOrder: 1
  },
  {
    name: 'Druhý / ďalší vodič',
    description: 'Možnosť pridania druhého alebo ďalšieho vodiča k rezervácii vozidla.',
    category: 'driving_comfort',
    pricing: {
      type: 'fixed',
      amount: 25.00,
      currency: 'EUR'
    },
    availability: {
      isGlobal: true,
      vehicleCategories: [],
      excludedVehicles: [],
      seasonal: { isActive: false }
    },
    behavior: {
      isAutoSelected: false,
      isRequired: false,
      requiresApproval: true,
      maxQuantity: 3
    },
    color: '#4caf50',
    icon: 'people',
    isActive: true,
    isPublic: true,
    sortOrder: 2
  },
  {
    name: 'Aktualizované mapy / prídavná navigácia',
    description: 'GPS navigácia s aktuálnymi mapami a dopravnými informáciami.',
    category: 'driving_comfort',
    pricing: {
      type: 'per_day',
      amount: 8.00,
      currency: 'EUR'
    },
    availability: {
      isGlobal: true,
      vehicleCategories: [],
      excludedVehicles: [],
      seasonal: { isActive: false }
    },
    behavior: {
      isAutoSelected: false,
      isRequired: false,
      requiresApproval: false,
      maxQuantity: 1
    },
    color: '#4caf50',
    icon: 'navigation',
    isActive: true,
    isPublic: true,
    sortOrder: 3
  },
  {
    name: 'Domáce zvieratá povolené',
    description: 'Možnosť prepravy domácich zvierat vo vozidle s dodatočnou ochranou.',
    category: 'driving_comfort',
    pricing: {
      type: 'fixed',
      amount: 30.00,
      currency: 'EUR'
    },
    availability: {
      isGlobal: true,
      vehicleCategories: [],
      excludedVehicles: [],
      seasonal: { isActive: false }
    },
    behavior: {
      isAutoSelected: false,
      isRequired: false,
      requiresApproval: true,
      maxQuantity: 1
    },
    color: '#4caf50',
    icon: 'pets',
    isActive: true,
    isPublic: true,
    sortOrder: 4
  },

  // POISTENIE A ASISTENCIA
  {
    name: 'Poistenie v cene',
    description: 'Základné poistenie zahrnuté v cene prenájmu - zákonné a havarijné poistenie so štandardným krytím.',
    category: 'insurance_assistance',
    pricing: {
      type: 'fixed',
      amount: 0.00,
      currency: 'EUR'
    },
    availability: {
      isGlobal: true,
      vehicleCategories: [],
      excludedVehicles: [],
      seasonal: { isActive: false }
    },
    behavior: {
      isAutoSelected: true,
      isRequired: true,
      requiresApproval: false,
      maxQuantity: 1
    },
    color: '#ff9800',
    icon: 'security',
    isActive: true,
    isPublic: true,
    sortOrder: 1
  },
  {
    name: 'Náhradné vozidlo pri poruche',
    description: 'V prípade poruchy vášho prenajatého vozidla zabezpečíme náhradné vozidlo do 2 hodín.',
    category: 'insurance_assistance',
    pricing: {
      type: 'per_day',
      amount: 12.00,
      currency: 'EUR'
    },
    availability: {
      isGlobal: true,
      vehicleCategories: [],
      excludedVehicles: [],
      seasonal: { isActive: false }
    },
    behavior: {
      isAutoSelected: false,
      isRequired: false,
      requiresApproval: false,
      maxQuantity: 1
    },
    color: '#ff9800',
    icon: 'build',
    isActive: true,
    isPublic: true,
    sortOrder: 2
  },
  {
    name: 'Poistenie bez spoluúčasti',
    description: 'Zrušenie zodpovednosti za škody - nemusíte platiť spoluúčasť pri poistnej udalosti.',
    category: 'insurance_assistance',
    pricing: {
      type: 'per_day',
      amount: 18.00,
      currency: 'EUR'
    },
    availability: {
      isGlobal: true,
      vehicleCategories: [],
      excludedVehicles: [],
      seasonal: { isActive: false }
    },
    behavior: {
      isAutoSelected: false,
      isRequired: false,
      requiresApproval: false,
      maxQuantity: 1
    },
    color: '#ff9800',
    icon: 'verified_user',
    isActive: true,
    isPublic: true,
    sortOrder: 3
  },
  {
    name: 'Cestovanie do zahraničia (EÚ)',
    description: 'Povolenie na cestovanie do krajín EÚ vrátane rozšíreného poistenia a asistenčných služieb 24/7.',
    category: 'insurance_assistance',
    pricing: {
      type: 'per_day',
      amount: 22.00,
      currency: 'EUR'
    },
    availability: {
      isGlobal: true,
      vehicleCategories: [],
      excludedVehicles: [],
      seasonal: { isActive: false }
    },
    behavior: {
      isAutoSelected: false,
      isRequired: false,
      requiresApproval: true,
      maxQuantity: 1
    },
    color: '#ff9800',
    icon: 'public',
    isActive: true,
    isPublic: true,
    sortOrder: 4
  },

  // ČASOVÉ SLUŽBY A PREVZATIE
  {
    name: 'Vyzdvihnutie mimo otváracích hodín',
    description: 'Možnosť vyzdvihnutia vozidla mimo štandardných otváracích hodín (večer, víkend, sviatky).',
    category: 'time_services',
    pricing: {
      type: 'fixed',
      amount: 35.00,
      currency: 'EUR'
    },
    availability: {
      isGlobal: true,
      vehicleCategories: [],
      excludedVehicles: [],
      seasonal: { isActive: false }
    },
    behavior: {
      isAutoSelected: false,
      isRequired: false,
      requiresApproval: true,
      maxQuantity: 1
    },
    color: '#2196f3',
    icon: 'schedule',
    isActive: true,
    isPublic: true,
    sortOrder: 1
  },
  {
    name: 'Odovzdanie mimo otváracích hodín',
    description: 'Možnosť vrátenia vozidla mimo štandardných otváracích hodín (večer, víkend, sviatky).',
    category: 'time_services',
    pricing: {
      type: 'fixed',
      amount: 35.00,
      currency: 'EUR'
    },
    availability: {
      isGlobal: true,
      vehicleCategories: [],
      excludedVehicles: [],
      seasonal: { isActive: false }
    },
    behavior: {
      isAutoSelected: false,
      isRequired: false,
      requiresApproval: true,
      maxQuantity: 1
    },
    color: '#2196f3',
    icon: 'schedule',
    isActive: true,
    isPublic: true,
    sortOrder: 2
  },

  // PRISTAVENIE / VYZDVIHNUTIE MIMO STREDISKA
  {
    name: 'Pristavenie vozidla mimo strediska',
    description: 'Doručíme vozidlo na vami určenú adresu. Cena sa počíta dynamicky podľa vzdialenosti.',
    category: 'delivery_pickup',
    pricing: {
      type: 'fixed',
      amount: 25.00,
      currency: 'EUR'
    },
    availability: {
      isGlobal: true,
      vehicleCategories: [],
      excludedVehicles: [],
      seasonal: { isActive: false }
    },
    behavior: {
      isAutoSelected: false,
      isRequired: false,
      requiresApproval: true,
      maxQuantity: 1
    },
    dynamicPricing: {
      isEnabled: true,
      basePrice: 25.00,
      pricePerKm: 0.50,
      minimumPrice: 25.00,
      maximumPrice: 150.00,
      useGoogleMapsAPI: true
    },
    color: '#9c27b0',
    icon: 'local_shipping',
    isActive: true,
    isPublic: true,
    sortOrder: 1
  },
  {
    name: 'Vyzdvihnutie vozidla mimo strediska',
    description: 'Vyzdvihneme vozidlo na vami určenej adrese. Cena sa počíta dynamicky podľa vzdialenosti.',
    category: 'delivery_pickup',
    pricing: {
      type: 'fixed',
      amount: 25.00,
      currency: 'EUR'
    },
    availability: {
      isGlobal: true,
      vehicleCategories: [],
      excludedVehicles: [],
      seasonal: { isActive: false }
    },
    behavior: {
      isAutoSelected: false,
      isRequired: false,
      requiresApproval: true,
      maxQuantity: 1
    },
    dynamicPricing: {
      isEnabled: true,
      basePrice: 25.00,
      pricePerKm: 0.50,
      minimumPrice: 25.00,
      maximumPrice: 150.00,
      useGoogleMapsAPI: true
    },
    color: '#9c27b0',
    icon: 'local_shipping',
    isActive: true,
    isPublic: true,
    sortOrder: 2
  },

  // RODINA A DOPLNKY
  {
    name: 'Detská sedačka - ekonomická trieda',
    description: 'Bezpečnostná detská sedačka vhodná pre deti od 9 do 36 kg.',
    category: 'family_accessories',
    pricing: {
      type: 'per_day',
      amount: 8.00,
      currency: 'EUR'
    },
    availability: {
      isGlobal: false,
      vehicleCategories: ['economy', 'compact', 'midsize', 'fullsize'],
      excludedVehicles: [],
      seasonal: { isActive: false }
    },
    behavior: {
      isAutoSelected: false,
      isRequired: false,
      requiresApproval: false,
      maxQuantity: 2
    },
    color: '#e91e63',
    icon: 'baby_changing_station',
    isActive: true,
    isPublic: true,
    sortOrder: 1
  },
  {
    name: 'Detská sedačka - vyššia trieda + elektro',
    description: 'Prémiová detská sedačka s pokročilými bezpečnostnými prvkami.',
    category: 'family_accessories',
    pricing: {
      type: 'per_day',
      amount: 15.00,
      currency: 'EUR'
    },
    availability: {
      isGlobal: false,
      vehicleCategories: ['luxury', 'suv', 'electric'],
      excludedVehicles: [],
      seasonal: { isActive: false }
    },
    behavior: {
      isAutoSelected: false,
      isRequired: false,
      requiresApproval: false,
      maxQuantity: 2
    },
    color: '#e91e63',
    icon: 'baby_changing_station',
    isActive: true,
    isPublic: true,
    sortOrder: 2
  },
  {
    name: 'Strešný box - univerzálny',
    description: 'Strešný box na prepravu dodatočného batožinového priestoru.',
    category: 'family_accessories',
    pricing: {
      type: 'per_day',
      amount: 12.00,
      currency: 'EUR'
    },
    availability: {
      isGlobal: false,
      vehicleCategories: ['compact', 'midsize', 'fullsize', 'suv'],
      excludedVehicles: [],
      seasonal: { isActive: false }
    },
    behavior: {
      isAutoSelected: false,
      isRequired: false,
      requiresApproval: false,
      maxQuantity: 1
    },
    color: '#e91e63',
    icon: 'luggage',
    isActive: true,
    isPublic: true,
    sortOrder: 3
  },
  {
    name: 'Snehové reťaze',
    description: 'Snehové reťaze pre bezpečnú jazdu v zimných podmienkach. Dostupné sezónne.',
    category: 'family_accessories',
    pricing: {
      type: 'per_day',
      amount: 6.00,
      currency: 'EUR'
    },
    availability: {
      isGlobal: true,
      vehicleCategories: [],
      excludedVehicles: [],
      seasonal: {
        isActive: true,
        startMonth: 11,
        endMonth: 3
      }
    },
    behavior: {
      isAutoSelected: false,
      isRequired: false,
      requiresApproval: false,
      maxQuantity: 1
    },
    color: '#e91e63',
    icon: 'ac_unit',
    isActive: true,
    isPublic: true,
    sortOrder: 4
  },

  // ŠPECIALIZOVANÉ DOPLNKY
  {
    name: 'Nájazdová rampa',
    description: 'Špeciálna nájazdová rampa pre nakladanie ťažkých predmetov - len pre úžitkové vozidlá.',
    category: 'specialized',
    pricing: {
      type: 'per_day',
      amount: 20.00,
      currency: 'EUR'
    },
    availability: {
      isGlobal: false,
      vehicleCategories: ['utility'],
      excludedVehicles: [],
      seasonal: { isActive: false }
    },
    behavior: {
      isAutoSelected: false,
      isRequired: false,
      requiresApproval: true,
      maxQuantity: 1
    },
    color: '#607d8b',
    icon: 'construction',
    isActive: true,
    isPublic: true,
    sortOrder: 1
  },
  {
    name: 'Rýchlonabíjanie',
    description: 'Prístup k sieti rýchlonabíjacích staníc pre elektromobily s predplatenou kartou.',
    category: 'specialized',
    pricing: {
      type: 'per_day',
      amount: 10.00,
      currency: 'EUR'
    },
    availability: {
      isGlobal: false,
      vehicleCategories: ['electric'],
      excludedVehicles: [],
      seasonal: { isActive: false }
    },
    behavior: {
      isAutoSelected: false,
      isRequired: false,
      requiresApproval: false,
      maxQuantity: 1
    },
    color: '#607d8b',
    icon: 'electric_car',
    isActive: true,
    isPublic: true,
    sortOrder: 2
  }
];

// Seed function
const seedAdditionalServices = async () => {
  try {
    await connectDB();

    console.log('🌱 Starting to seed additional services...');

    // Clear existing services (optional - remove this if you want to keep existing services)
    // await AdditionalService.deleteMany({});
    // console.log('🗑️  Cleared existing additional services');

    // Add dummy tenant ID for development (replace with actual tenant ID in production)
    const dummyTenantId = new mongoose.Types.ObjectId();
    const dummyUserId = new mongoose.Types.ObjectId();

    const servicesWithTenant = defaultServices.map(service => ({
      ...service,
      tenantId: dummyTenantId,
      createdBy: dummyUserId
    }));

    // Insert services
    const insertedServices = await AdditionalService.insertMany(servicesWithTenant);
    
    console.log(`✅ Successfully seeded ${insertedServices.length} additional services:`);
    
    // Group by category for nice output
    const servicesByCategory = insertedServices.reduce((acc, service) => {
      if (!acc[service.category]) {
        acc[service.category] = [];
      }
      acc[service.category].push(service.name);
      return acc;
    }, {});

    Object.entries(servicesByCategory).forEach(([category, services]) => {
      console.log(`\n📂 ${category.toUpperCase()}:`);
      services.forEach(name => console.log(`   - ${name}`));
    });

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n⚠️  Note: Services were created with dummy tenant/user IDs.');
    console.log('   In production, update the script to use actual tenant/user IDs.');

  } catch (error) {
    console.error('❌ Error seeding additional services:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('📤 Database connection closed');
  }
};

// Run the seeding
if (require.main === module) {
  seedAdditionalServices();
}

module.exports = { seedAdditionalServices, defaultServices }; 