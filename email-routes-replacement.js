/* ----------------------------------
   EMAIL ROUTES (Updated to use comprehensive email service)
---------------------------------- */
const emailService = require('./services/emailService');

// Add a simple, direct email endpoint for easier testing
app.post('/send-email', async (req, res) => {
  try {
    console.log('=== Simple Email Request ===');
    const { to, subject, text, html } = req.body;
    
    console.log('Creating simple email with:', { to, subject });
    
    const contactEmail = process.env.CONTACT_EMAIL || 'eurocentrum.reality@gmail.com';
    const emailHtml = html || `
      <h2>Nová správa</h2>
      <p><strong>Predmet:</strong> ${subject}</p>
      <p><strong>Obsah:</strong></p>
      <p>${text ? text.replace(/\n/g, '<br>') : ''}</p>
    `;
    
    const result = await emailService.sendEmail(contactEmail, subject, emailHtml, text);
    
    console.log('Simple email sent successfully!');
    res.status(200).json({ 
      success: true, 
      message: 'Email sent successfully!',
      details: result 
    });
  } catch (error) {
    console.error('Error sending simple email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send email',
      message: error.message 
    });
  }
});

// Send email from contact form
app.post('/api/send-email', async (req, res) => {
  try {
    console.log('=== Email Request Start ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { name, email, subject, message, gdpr, listingInfo } = req.body;
    
    // Validate inputs
    if (!name || !email || !message) {
      console.log('Validation failed - missing fields:', { name, email, message });
      return res.status(400).json({ success: false, message: 'Name, email and message are required' });
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Validation failed - invalid email format:', email);
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    
    // Check GDPR compliance
    if (!gdpr) {
      console.log('Validation failed - GDPR consent not given');
      return res.status(400).json({ success: false, message: 'GDPR consent is required' });
    }

    console.log('Creating email message...');
    
    const contactEmail = process.env.CONTACT_EMAIL || 'eurocentrum.reality@gmail.com';
    const formData = {
      name,
      email,
      subject: subject || 'Nová správa z kontaktného formulára',
      message,
      phone: req.body.phone || '',
      listingInfo
    };
    
    const result = await emailService.sendContactForm(contactEmail, formData);
    
    console.log('Email sent successfully via EmailService!');
    console.log('=== Email Request End - Success ===');
    
    res.status(200).json({ 
      success: true, 
      message: 'Email sent successfully',
      details: result 
    });
    
  } catch (error) {
    console.error('Error during email sending:', error);
    console.log('=== Email Request End - Error ===');
    
    // User-friendly error message
    res.status(500).json({ 
      success: false, 
      message: 'Unable to send email. Please try again later.',
      error: error.message 
    });
  }
});

// Test email service endpoint
app.get('/api/test-email', async (req, res) => {
  try {
    console.log('=== Test Email Request ===');
    console.log('Server Time:', new Date().toISOString());
    
    const testEmail = req.query.email || process.env.EMAIL_FROM || 'test@example.com';
    
    const result = await emailService.testConnection();
    
    console.log('Test email sent successfully!');
    res.status(200).json({ 
      success: true, 
      message: 'Test email sent successfully',
      testEmail,
      details: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error sending test email:', error);
    
    res.status(500).json({ 
      success: false, 
      message: 'Test email failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Email service status endpoint
app.get('/api/email-status', (req, res) => {
  try {
    const status = {
      configured: emailService.isConfigured,
      provider: emailService.provider,
      timestamp: new Date().toISOString(),
      environmentVariables: {
        EMAIL_PROVIDER: !!process.env.EMAIL_PROVIDER,
        EMAIL_FROM: !!process.env.EMAIL_FROM,
        CONTACT_EMAIL: !!process.env.CONTACT_EMAIL,
        EMAIL_HOST: !!process.env.EMAIL_HOST,
        EMAIL_USER: !!process.env.EMAIL_USER,
        EMAIL_PASS: !!process.env.EMAIL_PASS,
        SMTP2GO_API_KEY: !!process.env.SMTP2GO_API_KEY
      }
    };
    
    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Unable to check email service status',
      error: error.message 
    });
  }
}); 