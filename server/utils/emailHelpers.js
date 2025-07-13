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
      minute: '2-digit'
    }),
    endDate: endDate.toLocaleDateString('sk-SK', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

    // Pricing info
    dailyRate: (reservation.pricing?.dailyRate || car.dailyRate || 0).toFixed(2),
    subtotal: (reservation.pricing?.subtotal || reservation.pricing?.totalAmount || 0).toFixed(2),
    discount: totalDiscounts.toFixed(2),
    totalPrice: (reservation.pricing?.totalAmount || 0).toFixed(2),
    deposit: (car.pricing?.deposit || car.deposit || 0).toFixed(2)
  };
}

/**
 * Send admin notification email for new reservation
 */
async function sendAdminNotificationEmail(reservation, car, customer) {
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
    
    // Send email to admin
    const adminEmail = 'peter@aebdig.com';
    const result = await emailService.sendAdminReservationNotification(adminEmail, emailData);
    
    console.log('✅ [EMAIL] Admin notification sent successfully');
    return { success: true, result };
    
  } catch (error) {
    console.error('❌ [EMAIL] Failed to send admin notification:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  prepareReservationEmailData,
  sendAdminNotificationEmail
}; 