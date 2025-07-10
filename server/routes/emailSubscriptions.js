const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const emailSubscriptionController = require('../controllers/emailSubscriptionController');

// Validation middleware
const validateEmailSubscription = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('firstName').optional().trim().isLength({ max: 50 }),
  body('lastName').optional().trim().isLength({ max: 50 }),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('source').optional().isIn(['website', 'newsletter', 'manual', 'import', 'popup', 'footer']),
  body('tags').optional().isArray(),
  body('isActive').optional().isBoolean(),
  body('notes').optional().trim().isLength({ max: 500 })
];

const validatePublicSubscription = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('firstName').optional().trim().isLength({ max: 50 }),
  body('lastName').optional().trim().isLength({ max: 50 }),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('source').optional().isIn(['website', 'newsletter', 'popup', 'footer']),
  body('consent').isBoolean().withMessage('Consent is required')
];

// === ADMIN ROUTES (require authentication) ===

// GET /api/email-subscriptions - Get all email subscriptions
router.get('/', protect, emailSubscriptionController.getEmailSubscriptions);

// GET /api/email-subscriptions/stats - Get email subscription statistics
router.get('/stats', protect, emailSubscriptionController.getEmailSubscriptionStats);

// GET /api/email-subscriptions/export - Export email subscriptions to CSV
router.get('/export', protect, emailSubscriptionController.exportEmailSubscriptions);

// GET /api/email-subscriptions/:id - Get single email subscription
router.get('/:id', protect, emailSubscriptionController.getEmailSubscription);

// POST /api/email-subscriptions - Create new email subscription
router.post('/', protect, validateEmailSubscription, emailSubscriptionController.createEmailSubscription);

// PUT /api/email-subscriptions/:id - Update email subscription
router.put('/:id', protect, validateEmailSubscription, emailSubscriptionController.updateEmailSubscription);

// POST /api/email-subscriptions/:id/toggle - Toggle active/inactive status
router.post('/:id/toggle', protect, emailSubscriptionController.toggleEmailSubscription);

// DELETE /api/email-subscriptions/:id - Delete email subscription
router.delete('/:id', protect, emailSubscriptionController.deleteEmailSubscription);

// POST /api/email-subscriptions/bulk-import - Bulk import emails from CSV
router.post('/bulk-import', protect, emailSubscriptionController.bulkImportEmails);

// === PUBLIC ROUTES (no authentication required) ===

// Middleware to set tenant from header or subdomain
const resolveTenant = async (req, res, next) => {
  try {
    // Try to get tenant ID from header
    let tenantId = req.headers['x-tenant-id'];
    
    // If no header, try to resolve from subdomain or domain
    if (!tenantId) {
      const host = req.get('Host');
      if (host) {
        // Extract subdomain or use domain mapping
        const subdomain = host.split('.')[0];
        
        // You might want to implement a mapping system
        // For now, we'll use a simple approach
        const User = require('../models/User');
        const tenant = await User.findOne({ 
          role: 'admin', 
          $or: [
            { subdomain: subdomain },
            { domain: host }
          ]
        });
        
        if (tenant) {
          tenantId = tenant._id;
        }
      }
    }
    
    req.tenantId = tenantId;
    next();
  } catch (error) {
    console.error('Error resolving tenant:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/public/subscribe - Public subscription endpoint
router.post('/public/subscribe', 
  resolveTenant,
  validatePublicSubscription, 
  emailSubscriptionController.publicSubscribe
);

// GET /api/public/unsubscribe/:token - Public unsubscribe endpoint
router.get('/public/unsubscribe/:token', emailSubscriptionController.publicUnsubscribe);

// POST /api/public/unsubscribe/:token - Public unsubscribe endpoint (POST for forms)
router.post('/public/unsubscribe/:token', emailSubscriptionController.publicUnsubscribe);

// POST /api/public/preferences/:token - Update subscription preferences
router.post('/public/preferences/:token', emailSubscriptionController.publicUpdatePreferences);

module.exports = router; 