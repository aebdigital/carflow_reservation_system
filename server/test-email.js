require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmailService() {
  console.log('🧪 Testing SMTP2GO Email Service...');
  console.log('=====================================');
  
  // Check configuration
  console.log('📋 Configuration Check:');
  console.log('   EMAIL_PROVIDER:', process.env.EMAIL_PROVIDER || 'Not set');
  console.log('   SMTP2GO_API_KEY:', process.env.SMTP2GO_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('   EMAIL_FROM:', process.env.EMAIL_FROM || 'Not set');
  console.log('   CONTACT_EMAIL:', process.env.CONTACT_EMAIL || 'Not set');
  console.log('');
  
  // Test if service is configured
  console.log('🔧 Service Status:', emailService.isConfigured ? '✅ Configured' : '❌ Not configured');
  console.log('');
  
  if (!emailService.isConfigured) {
    console.log('❌ Email service not configured. Please check your .env file.');
    console.log('');
    console.log('Required environment variables:');
    console.log('   EMAIL_PROVIDER=smtp2go');
    console.log('   SMTP2GO_API_KEY=your-actual-api-key');
    console.log('   EMAIL_FROM=CarFlow <noreply@carflow.sk>');
    console.log('   CONTACT_EMAIL=peter@aebdig.com');
    process.exit(1);
  }
  
  // Test email sending
  try {
    console.log('📧 Sending test email...');
    
    const testEmail = process.env.CONTACT_EMAIL || 'peter@aebdig.com';
    const testSubject = 'CarFlow SMTP2GO Test Email';
    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">🎉 SMTP2GO Email Test Successful!</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>✅ Your CarFlow email service is working correctly!</p>
          <p><strong>Service:</strong> SMTP2GO</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Test Type:</strong> Direct API call</p>
        </div>
        <p>This email confirms that your SMTP2GO configuration is working properly.</p>
        <p>CarFlow Admin System</p>
      </div>
    `;
    
    const result = await emailService.sendEmail(testEmail, testSubject, testHtml);
    
    console.log('✅ Test email sent successfully!');
    console.log('📧 Result:', result);
    console.log('');
    console.log('🎉 SMTP2GO Email Service is working correctly!');
    console.log('   Check your email inbox for the test message.');
    
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    console.error('   Error details:', error);
    process.exit(1);
  }
}

// Run test
testEmailService(); 