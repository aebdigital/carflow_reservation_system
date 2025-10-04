require('dotenv').config();
const smtp2goService = require('../services/smtp2goService');
const emailTemplateService = require('../services/emailTemplateService');
const emailIconHelper = require('../utils/emailIconHelper');

async function testCIDEmail() {
  console.log('🧪 Testing Email with CID Icon Attachments\n');

  try {
    // Test email address
    const testEmail = process.env.TEST_EMAIL || 'peter@aebdig.com';

    // Get icon attachments
    const iconAttachments = emailIconHelper.getIconAttachments();
    console.log('📎 Icon attachments prepared:', iconAttachments.length);
    iconAttachments.forEach(att => {
      console.log(`  - ${att.filename} (CID: ${att.cid})`);
    });

    // Prepare test template variables
    const templateVariables = {
      customer_name: 'Test User',
      car_brand: 'BMW',
      car_model: 'X5',
      car_image: 'https://via.placeholder.com/300x200',
      start_date: '15.10.2025',
      end_date: '20.10.2025',
      start_time: '10:00',
      end_time: '10:00',
      pickup_location: 'Bratislava Airport',
      dropoff_location: 'Bratislava Airport',
      company_name: 'RIVAL Autopožičovňa',
      company_email: process.env.EMAIL_FROM || 'info@rival.sk',
      company_phone: '+421 907 633 517',
      link_view: 'https://app.carflow.sk/reservations/TEST123',
      current_year: new Date().getFullYear()
    };

    // Get processed email template
    console.log('\n📧 Processing email template...');
    const emailData = await emailTemplateService.getEmailTemplate(
      'reservation-confirmation',
      templateVariables
    );

    // Send test email with CID attachments
    console.log('\n📤 Sending test email to:', testEmail);
    const result = await smtp2goService.sendEmail(
      testEmail,
      '🧪 Test - Reservation Confirmation with CID Icons',
      emailData.html,
      null,
      null
    );

    console.log('\n✅ Test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('\n💡 Check your inbox at:', testEmail);
    console.log('💡 Icons should now display correctly in Gmail!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testCIDEmail();
