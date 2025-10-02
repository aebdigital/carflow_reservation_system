const fs = require('fs');
const path = require('path');

// Template mappings
const templateMappings = {
  'reservation_confirmation.html': 'reservation-confirmation.html',
  'reservation_confirmed_email_template.html': 'reservation-confirmed.html',
  'reservation_cancelled_email_template.html': 'reservation-cancelled.html',
  'reservation_edited_email_template.html': 'reservation-edited.html',
  'reservation_reminder_email_template.html': 'reminder-notification.html',
  'reservation_review_email_template.html': 'leave-review.html'
};

// Variable mappings from new templates to current system
const variableMappings = {
  '{meno}': '{{customer_name}}',
  '{car_brand}': '{{car_brand}}',
  '{car_model}': '{{car_model}}',
  '{car_image}': '{{car_image}}',
  '{date}': '{{start_date}}', // Default to start date, will need manual adjustment
  '{time}': '{{start_time}}',
  '{place}': '{{pickup_location}}',
  '{deposit}': '{{deposit_amount}}',
  'rival': '{{company_name}}',
  'RIVAL': '{{company_name}}',
  'info@pozicauto.sk': '{{company_email}}',
  '+421 907 633 517': '{{company_phone}}',
  'AUTOPOŽIČOVŇA': 'AUTOPOŽIČOVŇA' // Keep as is
};

const newTemplatesDir = '/Users/peterbobak/rezervacny/server/templates/new_email';
const emailTemplatesDir = '/Users/peterbobak/rezervacny/server/templates/email';

console.log('Processing email templates...');

Object.entries(templateMappings).forEach(([newFile, targetFile]) => {
  const newFilePath = path.join(newTemplatesDir, newFile);
  const targetFilePath = path.join(emailTemplatesDir, targetFile);

  if (fs.existsSync(newFilePath)) {
    console.log(`Processing: ${newFile} -> ${targetFile}`);

    let content = fs.readFileSync(newFilePath, 'utf8');

    // Replace variables
    Object.entries(variableMappings).forEach(([oldVar, newVar]) => {
      content = content.replace(new RegExp(oldVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newVar);
    });

    // Update title and other hardcoded text
    content = content.replace(/Rival Autopožičovňa/g, '{{company_name}}');
    content = content.replace(/rival/g, '{{company_name}}');
    content = content.replace(/RIVAL/g, '{{company_name}}');

    fs.writeFileSync(targetFilePath, content);
    console.log(`✅ Updated: ${targetFile}`);
  } else {
    console.log(`❌ Source file not found: ${newFile}`);
  }
});

console.log('Template processing complete!');