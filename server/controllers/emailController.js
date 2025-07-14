const emailService = require('../services/emailService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Send contact form email
// @route   POST /api/send-email
// @access  Public
const sendContactEmail = asyncHandler(async (req, res, next) => {
  const { name, email, phone, subject, message, type } = req.body;

  // Validate required fields
  if (!name || !email || !subject || !message) {
    return next(new AppError('Name, email, subject, and message are required', 400));
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('Invalid email format', 400));
  }

  try {
    // Determine recipient based on type or use default
    const recipientEmail = process.env.CONTACT_EMAIL || 'peter@aebdig.com';
    
    const formData = {
      name,
      email,
      phone,
      subject,
      message,
      type: type || 'contact'
    };

    // Send email using email service
    const result = await emailService.sendContactForm(recipientEmail, formData);

    // Send confirmation email to sender
    const confirmationSubject = 'Ďakujeme za vašu správu - CarFlow';
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Ďakujeme za vašu správu</h2>
        <p>Vážený/á ${name},</p>
        <p>Vaša správa bola úspešne odoslaná. Odpovieme vám čo najskôr.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Vaša správa</h3>
          <p><strong>Predmet:</strong> ${subject}</p>
          <p><strong>Správa:</strong></p>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
        
        <p>S pozdravom,<br>CarFlow Team</p>
      </div>
    `;

    await emailService.sendEmail(email, confirmationSubject, confirmationHtml);

    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      data: {
        messageId: result.messageId,
        recipientEmail: recipientEmail
      }
    });

  } catch (error) {
    console.error('Email sending error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return next(new AppError(`Failed to send email: ${error.message}`, 500));
  }
});

// @desc    Send reservation confirmation email
// @route   POST /api/send-email/reservation
// @access  Private
const sendReservationEmail = asyncHandler(async (req, res, next) => {
  const { 
    customerEmail, 
    customerName, 
    reservationNumber, 
    carInfo,
    startDate,
    endDate,
    totalPrice
  } = req.body;

  // Validate required fields
  if (!customerEmail || !customerName || !reservationNumber) {
    return next(new AppError('Customer email, name, and reservation number are required', 400));
  }

  try {
    const subject = `Potvrdenie rezervácie #${reservationNumber}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Potvrdenie rezervácie</h2>
        <p>Vážený/á ${customerName},</p>
        <p>Vaša rezervácia bola úspešne prijatá.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Detaily rezervácie</h3>
          <p><strong>Číslo rezervácie:</strong> ${reservationNumber}</p>
          <p><strong>Vozidlo:</strong> ${carInfo || 'N/A'}</p>
          <p><strong>Dátum vyzdvihnutia:</strong> ${startDate || 'N/A'}</p>
          <p><strong>Dátum vrátenia:</strong> ${endDate || 'N/A'}</p>
          <p><strong>Celková cena:</strong> ${totalPrice || 'N/A'}€</p>
        </div>
        
        <p>Ďakujeme za vašu rezerváciu!</p>
        <p>CarFlow Team</p>
      </div>
    `;

    const result = await emailService.sendEmail(customerEmail, subject, html);

    res.status(200).json({
      success: true,
      message: 'Reservation confirmation email sent successfully',
      data: {
        messageId: result.messageId
      }
    });

  } catch (error) {
    console.error('Reservation email sending error:', error);
    return next(new AppError('Failed to send reservation confirmation email', 500));
  }
});

// @desc    Test email service connection
// @route   GET /api/send-email/test
// @access  Private/Admin
const testEmailService = asyncHandler(async (req, res, next) => {
  try {
    // Check if service is configured
    if (!emailService.isConfigured) {
      return next(new AppError('Email service not configured. Please check SMTP2GO_API_KEY environment variable.', 500));
    }
    
    // Send test email
    const testEmail = req.query.email || process.env.CONTACT_EMAIL || 'test@example.com';
    const result = await emailService.sendEmail(
      testEmail,
      'Test Email - CarFlow',
      '<h1>Test Email</h1><p>This is a test email from CarFlow system.</p><p>If you receive this, the email service is working correctly.</p>',
      'Test Email - CarFlow\n\nThis is a test email from CarFlow system.\nIf you receive this, the email service is working correctly.'
    );

    res.status(200).json({
      success: true,
      message: 'Email service is working correctly',
      data: {
        messageId: result.messageId,
        testEmail: testEmail
      }
    });

  } catch (error) {
    console.error('Email service test error:', error);
    return next(new AppError(`Email service test failed: ${error.message}`, 500));
  }
});

module.exports = {
  sendContactEmail,
  sendReservationEmail,
  testEmailService
}; 