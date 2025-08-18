const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const carRoutes = require('./routes/carRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const userRoutes = require('./routes/userRoutes');
const publicRoutes = require('./routes/publicRoutes');
const websiteRoutes = require('./routes/websiteRoutes');
const discountCodeRoutes = require('./routes/discountCodeRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const additionalServiceRoutes = require('./routes/additionalServices');
const insuranceRoutes = require('./routes/insuranceRoutes');
const rivalInsuranceRoutes = require('./routes/rivalInsuranceRoutes');
const extendedInsuranceRoutes = require('./routes/extendedInsuranceRoutes');
const rivalExtendedInsuranceRoutes = require('./routes/rivalExtendedInsuranceRoutes');
const bannerRoutes = require('./routes/banners');
const emailRoutes = require('./routes/emailRoutes');
const contractRoutes = require('./routes/contractRoutes');
const blogRoutes = require('./routes/blogRoutes');
const emailSubscriptionRoutes = require('./routes/emailSubscriptions');
const settingsRoutes = require('./routes/settingsRoutes');
const testRoutes = require('./routes/testRoutes');
const krosTestRoutes = require('./routes/krosTestRoutes');
const carServicesRoutes = require('./routes/carServices');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting (more lenient for public endpoints)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200 // increased for public access
});
app.use('/api/', limiter);

// More permissive rate limiting for public endpoints
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500 // higher limit for public browsing
});

// CORS configuration - more permissive for public access
const allowedOrigins = [
  'https://carflow-reservation-admin.netlify.app',
  'https://carflowdemowebsite.netlify.app',
  'https://demobusinesscar.netlify.app',
  'https://admindemo.carflow.sk',
  'https://rentaldemo.carflow.sk',
  'https://rival.carflow.sk',
  'https://nitracar.carflow.sk',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3005',
  'http://localhost:8080'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('CORS: Allowing request with no origin (mobile/curl)');
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`CORS: Allowing origin: ${origin}`);
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      console.log('Allowed origins:', allowedOrigins);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Additional debugging for CORS (but no conflicting headers)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log(`🌐 [CORS DEBUG] ${req.method} ${req.url} from origin: ${origin || 'no-origin'}`);
  
  // Only log, don't set headers (let cors library handle them)
  if (req.method === 'OPTIONS') {
    console.log(`🌐 [CORS] Preflight OPTIONS request for ${req.url}`);
  }
  
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logging middleware
app.use((req, res, next) => {
  console.log(`🌐 [REQUEST] ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/car-rental', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

connectDB();

// Routes
app.use('/api/public', publicLimiter, publicRoutes); // Public routes (no auth required)
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/cars', carServicesRoutes); // Car services: extended insurance, equipment, badges
app.use('/api/reservations', reservationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/website', websiteRoutes);
app.use('/api/discount-codes', discountCodeRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/additional-services', additionalServiceRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/rival-insurance', rivalInsuranceRoutes);
app.use('/api/extended-insurance', extendedInsuranceRoutes);
app.use('/api/rival-extended-insurance', rivalExtendedInsuranceRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/send-email', emailRoutes); // Direct endpoint for frontend compatibility
app.use('/api/contracts', contractRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/email-subscriptions', emailSubscriptionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/test', testRoutes); // Test routes for debugging
app.use('/api/test', krosTestRoutes); // Kros integration test routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Car Rental Admin API is running',
    timestamp: new Date().toISOString(),
    corsFixed: true,
    version: '1.1.0'
  });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.status(200).json({ 
    message: 'CORS test endpoint',
    origin: req.headers.origin,
    allowedOrigins: allowedOrigins,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

// Start the reminder scheduler
const reminderScheduler = require('./services/reminderScheduler');
reminderScheduler.start();

// Initialize the invoice PDF scheduler
const invoicePdfScheduler = require('./services/invoicePdfScheduler');
console.log('📧 Invoice PDF scheduler initialized');

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 