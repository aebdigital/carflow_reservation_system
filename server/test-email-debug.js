const emailService = require('./services/emailService');

async function testEmail() {
  console.log('🧪 Testing email service...');
  
  try {
    console.log('📧 Email service configured:', emailService.isConfigured);
    
    if (!emailService.isConfigured) {
      console.log('❌ Email service not configured');
      return;
    }
    
    const result = await emailService.sendEmail(
      'test@example.com',
      'Test Subject',
      '<h1>Test HTML</h1><p>This is a test email with <strong>bold text</strong> and 10€ price.</p>',
      'Test plain text with 10€ price'
    );
    
    console.log('✅ Email sent successfully:', result);
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.error('❌ Error details:', error);
  }
}

testEmail();