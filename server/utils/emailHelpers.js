/**
 * Helper function to prepare reservation data for admin notification emails
 */
function prepareReservationEmailData(reservation, car, customer) {
  // Helper to get status text in Slovak
  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Čakajúca';
      case 'confirmed': return 'Potvrdená';
      case 'ongoing': return 'Prebiehajúca';
      case 'completed': return 'Dokončená';
      case 'cancelled': return 'Zrušená';
      default: return 'Neznámy';
    }
  };

  // Calculate duration
  const startDate = new Date(reservation.startDate);
  const endDate = new Date(reservation.endDate);
  const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  // Calculate discount amount
  const totalDiscounts = reservation.pricing?.discounts?.reduce((sum, discount) => sum + (discount.amount || 0), 0) || 0;

  // Helper function to generate QR image URL
  const getQRImageUrl = (qrCode) => {
    if (!qrCode) return null;
    const encodedData = encodeURIComponent(qrCode);
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}&format=png`;
  };

  return {
    // Reservation info
    reservationNumber: reservation.reservationNumber || reservation._id.toString().slice(-8),
    status: reservation.status,
    statusText: getStatusText(reservation.status),
    startDate: startDate.toLocaleDateString('sk-SK', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Bratislava'
    }),
    endDate: endDate.toLocaleDateString('sk-SK', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Bratislava'
    }),
    duration: duration,
    specialRequests: reservation.specialRequests || reservation.notes || '',

    // Customer info
    customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
    customerEmail: customer.email || '',
    customerPhone: customer.phone || '',
    customerLicense: customer.licenseNumber || '',

    // Car info
    carInfo: `${car.brand || ''} ${car.model || ''} ${car.year || ''}`.trim(),
    carRegistration: car.registrationNumber || car.licensePlate || '',
    carCategory: car.category || car.type || '',
    carImage: car.images && car.images.length > 0 ? car.images[0] : (car.imageUrl || ''),
    carBrand: car.brand || '',
    carModel: car.model || '',

    // Pricing info
    dailyRate: (reservation.pricing?.dailyRate || car.dailyRate || 0).toFixed(2),
    subtotal: (reservation.pricing?.subtotal || reservation.pricing?.totalAmount || 0).toFixed(2),
    discount: totalDiscounts.toFixed(2),
    totalPrice: (reservation.pricing?.totalAmount || 0).toFixed(2),
    deposit: (car.pricing?.deposit || car.deposit || 0).toFixed(2),

    // QR Code information
    qr_codes_available: !!(reservation.qrCodes && (reservation.qrCodes.payBySquareRental || reservation.qrCodes.payBySquare)),
    qr_rental_url: getQRImageUrl(reservation.qrCodes?.payBySquareRental || reservation.qrCodes?.payBySquare),
    qr_deposit_url: getQRImageUrl(reservation.qrCodes?.payBySquareDeposit || reservation.qrCodes?.qrPlatbaCz),
    rental_amount: ((reservation.pricing?.totalAmount || 0) - (car.pricing?.deposit || car.deposit || 0)).toFixed(2),
    deposit_amount: (car.pricing?.deposit || car.deposit || 0).toFixed(2),
    total_amount: (reservation.pricing?.totalAmount || 0).toFixed(2),
    variable_symbol: reservation.qrCodes?.variableSymbol || reservation.reservationNumber?.replace(/[^0-9]/g, '') || '',
    bank_account: reservation.qrCodes?.bankAccount || 'SK6807200000000000000000',
    
    // Display control variables
    qr_section_display: (reservation.qrCodes && (reservation.qrCodes.payBySquareRental || reservation.qrCodes.payBySquare)) ? 'block' : 'none',
    qr_rental_display: (reservation.qrCodes?.payBySquareRental || reservation.qrCodes?.payBySquare) ? 'block' : 'none',
    qr_deposit_display: (reservation.qrCodes?.payBySquareDeposit || reservation.qrCodes?.qrPlatbaCz) ? 'block' : 'none',

    // LeRent logo URL (from environment variable or fallback)
    lerent_logo_url: process.env.LERENT_LOGO_URL || 'https://storage.googleapis.com/car_rental_carflow/tenant-5e482191fe5890cb9f9ad402/user-5e482191fe5890cb9f9ad402/logoRENT.png',

    // Tenant info for settings lookup
    tenantId: reservation.tenantId || customer.tenantId || car.tenantId
  };
}

/**
 * Get admin email based on tenant
 */
function getAdminEmailForTenant(user) {
  // If user context is provided, check tenant
  if (user && user.email) {
    const userEmail = user.email.toLowerCase().trim();

    // Special case for rival tenant
    if (userEmail === 'rival@test.sk') {
      return 'rivalautopozicovna@gmail.com';
    }
  }

  // Default admin email for all other tenants
  return 'peter@aebdig.com';
}

/**
 * Send admin notification email for new reservation
 */
async function sendAdminNotificationEmail(reservation, car, customer, user = null) {
  try {
    console.log('📧 [EMAIL] Sending admin notification for reservation:', reservation._id);

    // Import email service
    const emailService = require('../services/emailService');

    // Check if email service is configured
    if (!emailService.isConfigured) {
      console.warn('⚠️ [EMAIL] Email service not configured, skipping admin notification');
      return { success: false, error: 'Email service not configured' };
    }

    // Prepare email data
    const emailData = prepareReservationEmailData(reservation, car, customer);

    // Get admin email based on tenant
    const adminEmail = getAdminEmailForTenant(user);
    console.log('📧 [EMAIL] Admin email for tenant:', adminEmail, '(User:', user?.email || 'No user context', ')');

    const result = await emailService.sendAdminReservationNotification(adminEmail, emailData, user);

    console.log('✅ [EMAIL] Admin notification sent successfully to:', adminEmail);
    return { success: true, result };

  } catch (error) {
    console.error('❌ [EMAIL] Failed to send admin notification:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send both admin notification and customer confirmation emails for new reservation
 */
async function sendReservationEmails(reservation, car, customer, user = null) {
  try {
    console.log('📧 [EMAIL] Sending reservation emails for reservation:', reservation._id);
    
    // Import email service
    const emailService = require('../services/emailService');
    
    // Check if email service is configured
    if (!emailService.isConfigured) {
      console.warn('⚠️ [EMAIL] Email service not configured, skipping reservation emails');
      return { success: false, error: 'Email service not configured' };
    }

    // Prepare email data
    const emailData = prepareReservationEmailData(reservation, car, customer);
    
    const results = [];

    // Send email to admin
    try {
      const adminEmail = getAdminEmailForTenant(user);
      console.log('📧 [EMAIL] Sending admin notification to:', adminEmail);
      console.log('📧 [EMAIL] Admin email user context:', user ? { email: user.email, tenantId: user.tenantId } : 'No user context');
      const adminResult = await emailService.sendAdminReservationNotification(adminEmail, emailData, user);
      results.push({ type: 'admin', success: true, result: adminResult });
      console.log('✅ [EMAIL] Admin notification sent successfully to:', adminEmail);
    } catch (adminError) {
      console.error('❌ [EMAIL] Failed to send admin notification:', adminError.message);
      results.push({ type: 'admin', success: false, error: adminError.message });
    }
    
    // Send confirmation email to customer
    try {
      // DEBUG: Log all customer data to identify the email issue
      console.log('📧 [EMAIL] Sending customer confirmation to:', customer.email);
      console.log('📧 [EMAIL] Customer data full object:', JSON.stringify(customer, null, 2));
      console.log('📧 [EMAIL] Customer email user context:', user ? { email: user.email, tenantId: user.tenantId } : 'No user context');
      console.log('📧 [EMAIL] Actual recipient should be:', customer.email, 'NOT admin email');
      
      const customerResult = await emailService.sendCustomerReservationConfirmation(customer.email, emailData, user, reservation);
      results.push({ type: 'customer_email', success: true, result: customerResult });
      console.log('✅ [EMAIL] Customer confirmation sent successfully to:', customer.email);
    } catch (customerError) {
      console.error('❌ [EMAIL] Failed to send customer confirmation:', customerError.message);
      console.error('❌ [EMAIL] Customer error stack:', customerError.stack);
      results.push({ type: 'customer_email', success: false, error: customerError.message });
    }
    
    // Send confirmation SMS to customer (ONLY for rival@test.sk tenant)
    try {
      const userEmail = user?.email ? user.email.toLowerCase().trim() : '';
      const isRivalTenant = userEmail === 'rival@test.sk';

      if (!isRivalTenant) {
        console.log('📱 [SMS] Skipping SMS - not rival@test.sk tenant (user:', userEmail || 'NO USER', ')');
        results.push({ type: 'customer_sms', success: false, error: 'SMS only enabled for Rival tenant' });
      } else if (customer.phone) {
        console.log('📱 [SMS] Sending customer confirmation SMS to:', customer.phone, '(Rival tenant)');
        const bulkGateService = require('../services/bulkGateService');

        if (bulkGateService.isConfigured) {
          // Create SMS data with raw reservation dates, not formatted emailData
          const smsData = {
            ...emailData,
            startDate: reservation.startDate,  // Raw date from DB
            endDate: reservation.endDate       // Raw date from DB
          };
          const smsResult = await bulkGateService.sendReservationConfirmation(customer.phone, smsData);
          results.push({ type: 'customer_sms', success: true, result: smsResult });
          console.log('✅ [SMS] Customer confirmation SMS sent successfully to:', customer.phone);
        } else {
          console.warn('⚠️ [SMS] BulkGate not configured, skipping SMS');
          results.push({ type: 'customer_sms', success: false, error: 'BulkGate not configured' });
        }
      } else {
        console.warn('⚠️ [SMS] No phone number provided, skipping SMS');
        results.push({ type: 'customer_sms', success: false, error: 'No phone number' });
      }
    } catch (smsError) {
      console.error('❌ [SMS] Failed to send customer confirmation SMS:', smsError.message);
      results.push({ type: 'customer_sms', success: false, error: smsError.message });
    }
    
    // Check if at least one email was sent successfully
    const successCount = results.filter(r => r.success).length;
    const success = successCount > 0;
    
    console.log(`📧 [EMAIL] Reservation emails completed: ${successCount}/${results.length} successful`);
    return { success, results };
    
  } catch (error) {
    console.error('❌ [EMAIL] Failed to send reservation emails:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  prepareReservationEmailData,
  getAdminEmailForTenant,
  sendAdminNotificationEmail,
  sendReservationEmails
}; 