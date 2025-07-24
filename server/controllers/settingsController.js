const asyncHandler = require('express-async-handler');
const Settings = require('../models/Settings');
const AppError = require('../utils/AppError');

// @desc    Get settings for current tenant
// @route   GET /api/settings
// @access  Private/Admin
const getSettings = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  
  const settings = await Settings.getForTenant(tenantId);
  
  res.status(200).json({
    success: true,
    data: settings
  });
});

// @desc    Update settings for current tenant
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  
  const settings = await Settings.findOneAndUpdate(
    { tenantId },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  
  if (!settings) {
    return res.status(404).json({
      success: false,
      message: 'Settings not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: settings
  });
});

// @desc    Add pickup location
// @route   POST /api/settings/pickup-locations
// @access  Private/Admin
const addPickupLocation = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const { name, address, isDefault, coordinates, openingHours, notes } = req.body;
  
  if (!name || !address) {
    return res.status(400).json({
      success: false,
      message: 'Name and address are required'
    });
  }
  
  const settings = await Settings.getForTenant(tenantId);
  
  // If this is set as default, remove default from others
  if (isDefault) {
    settings.business.pickupLocations.forEach(loc => {
      loc.isDefault = false;
    });
  }
  
  const newLocation = {
    name,
    address,
    isDefault: isDefault || false,
    isActive: true,
    coordinates,
    openingHours: openingHours || '08:00 - 18:00',
    notes
  };
  
  settings.business.pickupLocations.push(newLocation);
  await settings.save();
  
  res.status(201).json({
    success: true,
    data: settings
  });
});

// @desc    Update pickup location
// @route   PUT /api/settings/pickup-locations/:locationId
// @access  Private/Admin
const updatePickupLocation = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const { locationId } = req.params;
  
  const settings = await Settings.getForTenant(tenantId);
  
  const location = settings.business.pickupLocations.id(locationId);
  if (!location) {
    return res.status(404).json({
      success: false,
      message: 'Pickup location not found'
    });
  }
  
  // If this is set as default, remove default from others
  if (req.body.isDefault) {
    settings.business.pickupLocations.forEach(loc => {
      if (loc._id.toString() !== locationId) {
        loc.isDefault = false;
      }
    });
  }
  
  // Update location properties
  Object.keys(req.body).forEach(key => {
    if (req.body[key] !== undefined) {
      location[key] = req.body[key];
    }
  });
  
  await settings.save();
  
  res.status(200).json({
    success: true,
    data: settings
  });
});

// @desc    Delete pickup location
// @route   DELETE /api/settings/pickup-locations/:locationId
// @access  Private/Admin
const deletePickupLocation = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const { locationId } = req.params;
  
  const settings = await Settings.getForTenant(tenantId);
  
  const location = settings.business.pickupLocations.id(locationId);
  if (!location) {
    return res.status(404).json({
      success: false,
      message: 'Pickup location not found'
    });
  }
  
  // Don't allow deleting the last location
  if (settings.business.pickupLocations.length <= 1) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete the last pickup location'
    });
  }
  
  // If deleting default location, set another one as default
  if (location.isDefault) {
    const otherLocation = settings.business.pickupLocations.find(
      loc => loc._id.toString() !== locationId && loc.isActive
    );
    if (otherLocation) {
      otherLocation.isDefault = true;
    }
  }
  
  location.remove();
  await settings.save();
  
  res.status(200).json({
    success: true,
    data: settings
  });
});

// @desc    Send customer support contact form
// @route   POST /api/settings/contact-support
// @access  Private/Admin
const sendSupportContact = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message, urgency } = req.body;
  
  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, subject and message are required'
    });
  }
  
  try {
    const emailService = require('../services/emailService');
    
    if (!emailService.isConfigured) {
      return res.status(500).json({
        success: false,
        message: 'Email service not configured'
      });
    }
    
    // Prepare support email data
    const supportEmailData = {
      name,
      email,
      phone: phone || 'Nezadané',
      subject,
      message,
      urgency: urgency || 'normal',
      timestamp: new Date().toLocaleString('sk-SK', {
        timeZone: 'Europe/Bratislava'
      }),
      userAgent: req.get('User-Agent') || 'Unknown',
      tenantId: req.user?.tenantId || 'Unknown'
    };
    
    // Send email to support
    const supportEmail = 'reachout@aebdig.com';
    const emailSubject = 'Máte otázku alebo potrebujete pomoc? Kontaktuje zákaznícku podporu CarFlow';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #2196F3; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="margin: 0;">🚗 CarFlow Zákaznícka Podpora</h2>
          <p style="margin: 10px 0 0 0;">Nová požiadavka o pomoc</p>
        </div>
        
        <div style="border: 1px solid #ddd; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #1976D2;">📋 Detaily kontaktu</h3>
            <p><strong>Meno:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>Telefón:</strong> ${supportEmailData.phone}</p>
            <p><strong>Predmet:</strong> ${subject}</p>
            <p><strong>Naliehavosť:</strong> ${urgency === 'high' ? '🔴 Vysoká' : urgency === 'medium' ? '🟡 Stredná' : '🟢 Nízka'}</p>
          </div>
          
          <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; border-left: 4px solid #FF9800;">
            <h3 style="margin: 0 0 10px 0; color: #F57C00;">💬 Správa</h3>
            <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
          </div>
          
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p><strong>Odoslané:</strong> ${supportEmailData.timestamp}</p>
            <p><strong>Tenant ID:</strong> ${supportEmailData.tenantId}</p>
            <p><strong>User Agent:</strong> ${supportEmailData.userAgent}</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 15px; background-color: #e3f2fd; border-radius: 5px;">
            <p style="margin: 0; color: #1976D2;">
              <strong>📞 Odpovedať:</strong> <a href="mailto:${email}" style="color: #1976D2;">${email}</a>
              ${supportEmailData.phone !== 'Nezadané' ? ` | <strong>☎️ Zavolať:</strong> ${supportEmailData.phone}` : ''}
            </p>
          </div>
        </div>
      </div>
    `;
    
    await emailService.sendEmail(supportEmail, emailSubject, html);
    
    console.log('✅ [SUPPORT] Contact form sent successfully to:', supportEmail);
    
    res.status(200).json({
      success: true,
      message: 'Vaša správa bola úspešne odoslaná zákazníckej podpore. Odpovieme vám čo najskôr.'
    });
    
  } catch (error) {
    console.error('❌ [SUPPORT] Failed to send contact form:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Nepodarilo sa odoslať správu. Skúste to prosím znovu alebo nás kontaktujte priamo na +421 907 633 517.'
    });
  }
});

module.exports = {
  getSettings,
  updateSettings,
  addPickupLocation,
  updatePickupLocation,
  deletePickupLocation,
  sendSupportContact
};