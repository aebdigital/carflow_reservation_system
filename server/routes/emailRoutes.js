const express = require('express');
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const {
  sendContactEmail,
  sendReservationEmail,
  testEmailService
} = require('../controllers/emailController');

const router = express.Router();

// Public routes
router.post('/', sendContactEmail); // POST /api/send-email
router.post('/contact', sendContactEmail); // Alternative endpoint

// Protected routes
router.use(protect);
router.post('/reservation', sendReservationEmail);

// Admin only routes
router.get('/test', requireAdmin, testEmailService);

// New test endpoint for SMTP2GO verification
router.get('/test-smtp2go', protect, requireAdmin, async (req, res) => {
  try {
    const emailService = require('../services/emailService');
    
    // Check if service is configured
    if (!emailService.isConfigured) {
      return res.status(500).json({
        success: false,
        message: 'Email service not configured. Please check SMTP2GO_API_KEY environment variable.'
      });
    }
    
    // Send test email
    const testEmail = process.env.CONTACT_EMAIL || 'peter@aebdig.com';
    const testSubject = 'CarFlow SMTP2GO Production Test';
    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">🎉 SMTP2GO Production Test Successful!</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>✅ Your CarFlow email service is working correctly in production!</p>
          <p><strong>Service:</strong> SMTP2GO</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Test Type:</strong> Production API call</p>
        </div>
        <p>This email confirms that your SMTP2GO configuration is working properly in production.</p>
        <p>CarFlow Admin System</p>
      </div>
    `;
    
    const result = await emailService.sendEmail(testEmail, testSubject, testHtml);
    
    res.json({
      success: true,
      message: 'Test email sent successfully!',
      result: result
    });
    
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Test email failed',
      error: error.message
    });
  }
});

module.exports = router; 