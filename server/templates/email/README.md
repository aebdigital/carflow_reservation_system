# Email Templates 📧

This directory contains HTML email templates with full UTF-8 and emoji support for SMTP2GO integration.

## Available Templates

### 1. welcome.html 🎉
Welcome email for new users
- **Usage**: New user registration, account activation
- **Variables**: `customer_name`, `customer_email`, `company_name`, `registration_date`, `action_url`, `company_email`, `company_phone`

### 2. reservation-confirmation.html 🚗
Booking confirmation email
- **Usage**: Reservation confirmations, booking details
- **Variables**: `customer_name`, `reservation_id`, `car_name`, `start_date`, `start_time`, `end_date`, `end_time`, `duration`, `total_price`, `manage_reservation_url`, `company_name`

### 3. payment-receipt.html 💳
Payment confirmation and receipt
- **Usage**: Payment confirmations, invoices
- **Variables**: `customer_name`, `invoice_number`, `payment_date`, `payment_amount`, `payment_method`, `transaction_id`, `service_name`, `service_period`, `service_amount`, `download_receipt_url`

### 4. reminder-notification.html 🔔
Automated reminders and notifications
- **Usage**: Booking reminders, upcoming reservations
- **Variables**: `customer_name`, `reminder_type`, `days_remaining`, `hours_remaining`, `minutes_remaining`, `reservation_id`, `car_name`, `start_datetime`, `pickup_location`, `total_amount`, `confirm_url`, `modify_url`

### 5. newsletter.html 📰
Marketing newsletter template
- **Usage**: Monthly newsletters, promotions
- **Variables**: `customer_name`, `company_name`, `newsletter_title`, `news_url_1`, `news_url_2`, `discount_percentage`, `promo_code`, `promo_expiry`, `promo_url`, `popular_car`, `unsubscribe_url`

## Usage Examples

### Basic Template Loading
```javascript
const emailTemplateService = require('../services/emailTemplateService');

// Load and process a template
const emailData = await emailTemplateService.getEmailTemplate('welcome', {
  customer_name: 'Ján Novák',
  customer_email: 'jan@example.com',
  company_name: 'CarFlow',
  registration_date: '15.01.2025',
  action_url: 'https://app.carflow.sk/dashboard'
});

// Send via SMTP2GO
const smtp2go = require('../services/smtp2goService');
await smtp2go.sendEmail(
  'jan@example.com',
  emailData.subject,
  emailData.html
);
```

### Reservation Confirmation Example
```javascript
const reservationEmail = await emailTemplateService.getEmailTemplate('reservation-confirmation', {
  customer_name: 'Peter Novák',
  reservation_id: 'R2025001',
  car_name: 'BMW 520d',
  start_date: '25.01.2025',
  start_time: '10:00',
  end_date: '30.01.2025', 
  end_time: '18:00',
  duration: '5',
  total_price: '299.00',
  manage_reservation_url: 'https://app.carflow.sk/reservations/R2025001',
  company_name: 'CarFlow',
  company_email: 'info@carflow.sk',
  company_phone: '+421 123 456 789'
});
```

### Newsletter with Emoji Support
```javascript
const newsletterEmail = await emailTemplateService.getEmailTemplate('newsletter', {
  customer_name: 'Anna Kováčová',
  company_name: 'CarFlow',
  newsletter_title: 'Mesačné novinky - Január 2025',
  discount_percentage: '25',
  promo_code: 'JANUARY25',
  promo_expiry: '31.01.2025',
  popular_car: 'Tesla Model 3',
  facebook_url: 'https://facebook.com/carflow',
  instagram_url: 'https://instagram.com/carflow',
  unsubscribe_url: 'https://app.carflow.sk/unsubscribe/token123'
});
```

## Template Features

✅ **UTF-8 Encoding**: Full support for Slovak characters (ľ, š, č, ť, ž, ý, á, í, é, ó, ú)  
✅ **Emoji Support**: Native emoji rendering in all email clients  
✅ **Responsive Design**: Mobile-friendly layouts  
✅ **SMTP2GO Integration**: Proper headers for reliable delivery  
✅ **Variable Substitution**: Dynamic content with `{{variable}}` syntax  
✅ **Professional Styling**: Modern, clean designs with gradients and shadows  

## Technical Implementation

### Headers for UTF-8 Support
```javascript
headers: {
  'Content-Type': 'text/html; charset=UTF-8',
  'Content-Transfer-Encoding': '8bit', 
  'MIME-Version': '1.0'
}
```

### Variable Syntax
- Use `{{variable_name}}` in templates
- Variables are replaced during processing
- `current_year` is automatically added
- Missing variables are replaced with empty strings

### Template Validation
```javascript
// Check required variables for a template
const validation = await emailTemplateService.validateTemplateVariables('welcome', {
  customer_name: 'Ján',
  company_name: 'CarFlow'
});

if (!validation.valid) {
  console.log('Missing variables:', validation.missingVariables);
}
```

## Customization

### Editing Templates
1. Edit HTML files directly in this directory
2. Use standard HTML with inline CSS for best compatibility
3. Test with emoji characters: 🎉 💰 🚗 📧 ⭐ 🔔
4. Clear template cache in development: `emailTemplateService.clearCache()`

### Adding New Templates
1. Create new `.html` file in this directory
2. Use existing templates as reference
3. Add subject logic to `emailTemplateService.js`
4. Document variables in this README

### Slovak Language Support
All templates support full Slovak localization:
- Characters: ľščťžýáíéóú ĽŠČŤŽÝÁÍÉÓÚ
- Date formats: DD.MM.YYYY
- Currency: €EUR
- Common phrases: "Vážený/á", "Ďakujeme", "S pozdravom"

## Integration with Existing Services

These templates work seamlessly with:
- `smtp2goService.js` - Email delivery
- `emailService.js` - Service wrapper  
- `emailController.js` - REST endpoints
- Multi-tenant system - Tenant-aware variables

For support contact: info@carflow.sk 📧