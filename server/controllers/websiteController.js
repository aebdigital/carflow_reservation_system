const { WebsiteSettings } = require('../models/WebsiteSettings');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Get website settings for tenant
// @route   GET /api/website/settings
// @access  Private
const getWebsiteSettings = asyncHandler(async (req, res, next) => {
  let settings = await WebsiteSettings.findOne({ 
    tenantId: req.user.tenantId 
  }).populate('lastUpdatedBy', 'firstName lastName email');

  // If no settings exist, create default ones
  if (!settings) {
    settings = await WebsiteSettings.create({
      tenantId: req.user.tenantId,
      lastUpdatedBy: req.user._id
    });
  }

  res.status(200).json({
    success: true,
    data: settings
  });
});

// @desc    Update website settings
// @route   PUT /api/website/settings
// @access  Private/Admin
const updateWebsiteSettings = asyncHandler(async (req, res, next) => {
  const updateData = {
    ...req.body,
    lastUpdatedBy: req.user._id
  };

  let settings = await WebsiteSettings.findOneAndUpdate(
    { tenantId: req.user.tenantId },
    updateData,
    {
      new: true,
      runValidators: true,
      upsert: true
    }
  ).populate('lastUpdatedBy', 'firstName lastName email');

  res.status(200).json({
    success: true,
    data: settings,
    message: 'Website settings updated successfully'
  });
});

// @desc    Update info bar settings
// @route   PUT /api/website/settings/info-bar
// @access  Private/Admin
const updateInfoBar = asyncHandler(async (req, res, next) => {
  const { text, color, backgroundColor, textColor, displayLocation, isActive, startDate, endDate } = req.body;

  // Validate required fields
  if (!text) {
    return next(new AppError('Info bar text is required', 400));
  }

  const updateData = {
    'infoBar.text': text,
    'infoBar.color': color || 'blue',
    'infoBar.backgroundColor': backgroundColor || '#1976d2',
    'infoBar.textColor': textColor || '#ffffff',
    'infoBar.displayLocation': displayLocation || 'all-pages',
    'infoBar.isActive': isActive !== undefined ? isActive : true,
    lastUpdatedBy: req.user._id
  };

  if (startDate) updateData['infoBar.startDate'] = new Date(startDate);
  if (endDate) updateData['infoBar.endDate'] = new Date(endDate);

  const settings = await WebsiteSettings.findOneAndUpdate(
    { tenantId: req.user.tenantId },
    updateData,
    {
      new: true,
      runValidators: true,
      upsert: true
    }
  ).populate('lastUpdatedBy', 'firstName lastName email');

  res.status(200).json({
    success: true,
    data: settings.infoBar,
    message: 'Info bar updated successfully'
  });
});

// @desc    Update modal settings
// @route   PUT /api/website/settings/modal
// @access  Private/Admin
const updateModal = asyncHandler(async (req, res, next) => {
  const { 
    title, 
    content, 
    type, 
    displayLocation, 
    triggerRule, 
    isActive, 
    startDate, 
    endDate,
    emailPlaceholder,
    buttonText,
    discountCode,
    discountPercentage,
    backgroundColor,
    textColor,
    buttonColor
  } = req.body;

  // Validate required fields
  if (!title || !content || !type) {
    return next(new AppError('Title, content, and type are required', 400));
  }

  const updateData = {
    'modal.title': title,
    'modal.content': content,
    'modal.type': type,
    'modal.displayLocation': displayLocation || 'all-pages',
    'modal.isActive': isActive !== undefined ? isActive : true,
    'modal.emailPlaceholder': emailPlaceholder || 'Zadajte váš email',
    'modal.buttonText': buttonText || 'Získať zľavu',
    'modal.backgroundColor': backgroundColor || '#ffffff',
    'modal.textColor': textColor || '#333333',
    'modal.buttonColor': buttonColor || '#1976d2',
    lastUpdatedBy: req.user._id
  };

  if (triggerRule) {
    updateData['modal.triggerRule'] = triggerRule;
  }

  if (startDate) updateData['modal.startDate'] = new Date(startDate);
  if (endDate) updateData['modal.endDate'] = new Date(endDate);
  
  if (discountCode) updateData['modal.discountCode'] = discountCode;
  if (discountPercentage) updateData['modal.discountPercentage'] = discountPercentage;

  const settings = await WebsiteSettings.findOneAndUpdate(
    { tenantId: req.user.tenantId },
    updateData,
    {
      new: true,
      runValidators: true,
      upsert: true
    }
  ).populate('lastUpdatedBy', 'firstName lastName email');

  res.status(200).json({
    success: true,
    data: settings.modal,
    message: 'Modal settings updated successfully'
  });
});

// @desc    Toggle info bar status
// @route   PATCH /api/website/settings/info-bar/toggle
// @access  Private/Admin
const toggleInfoBar = asyncHandler(async (req, res, next) => {
  const settings = await WebsiteSettings.findOne({ tenantId: req.user.tenantId });
  
  if (!settings) {
    return next(new AppError('Website settings not found', 404));
  }

  const newStatus = !settings.infoBar?.isActive;
  
  const updatedSettings = await WebsiteSettings.findOneAndUpdate(
    { tenantId: req.user.tenantId },
    { 
      'infoBar.isActive': newStatus,
      lastUpdatedBy: req.user._id
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: { isActive: newStatus },
    message: `Info bar ${newStatus ? 'activated' : 'deactivated'} successfully`
  });
});

// @desc    Toggle modal status
// @route   PATCH /api/website/settings/modal/toggle
// @access  Private/Admin
const toggleModal = asyncHandler(async (req, res, next) => {
  const settings = await WebsiteSettings.findOne({ tenantId: req.user.tenantId });
  
  if (!settings) {
    return next(new AppError('Website settings not found', 404));
  }

  const newStatus = !settings.modal?.isActive;
  
  const updatedSettings = await WebsiteSettings.findOneAndUpdate(
    { tenantId: req.user.tenantId },
    { 
      'modal.isActive': newStatus,
      lastUpdatedBy: req.user._id
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: { isActive: newStatus },
    message: `Modal ${newStatus ? 'activated' : 'deactivated'} successfully`
  });
});

module.exports = {
  getWebsiteSettings,
  updateWebsiteSettings,
  updateInfoBar,
  updateModal,
  toggleInfoBar,
  toggleModal
}; 