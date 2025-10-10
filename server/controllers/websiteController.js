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
      lastUpdatedBy: req.user._id,
      modals: [] // Initialize with empty modals array
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

// MODAL CRUD OPERATIONS

// @desc    Get all modals for tenant
// @route   GET /api/website/modals
// @access  Private
const getModals = asyncHandler(async (req, res, next) => {
  const settings = await WebsiteSettings.findOne({ 
    tenantId: req.user.tenantId 
  }).populate('modals.createdBy modals.lastUpdatedBy', 'firstName lastName email');

  if (!settings) {
    return res.status(200).json({
      success: true,
      data: []
    });
  }

  res.status(200).json({
    success: true,
    data: settings.modals || []
  });
});

// @desc    Create new modal
// @route   POST /api/website/modals
// @access  Private/Admin
const createModal = asyncHandler(async (req, res, next) => {
  const modalData = {
    ...req.body,
    createdBy: req.user._id,
    lastUpdatedBy: req.user._id
  };

  // Validate required fields
  if (!modalData.name || !modalData.title || !modalData.content || !modalData.type) {
    return next(new AppError('Name, title, content, and type are required', 400));
  }

  let settings = await WebsiteSettings.findOne({ tenantId: req.user.tenantId });
  
  if (!settings) {
    settings = await WebsiteSettings.create({
      tenantId: req.user.tenantId,
      lastUpdatedBy: req.user._id,
      modals: [modalData]
    });
  } else {
    // Check if modal name already exists
    const nameExists = settings.modals.some(modal => 
      modal.name.toLowerCase() === modalData.name.toLowerCase()
    );
    
    if (nameExists) {
      return next(new AppError('Modal with this name already exists', 400));
    }

    settings.modals.push(modalData);
    settings.lastUpdatedBy = req.user._id;
    await settings.save();
  }

  // Get the newly created modal
  const newModal = settings.modals[settings.modals.length - 1];

  res.status(201).json({
    success: true,
    data: newModal,
    message: 'Modal created successfully'
  });
});

// @desc    Update existing modal
// @route   PUT /api/website/modals/:id
// @access  Private/Admin
const updateModal = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updateData = {
    ...req.body,
    lastUpdatedBy: req.user._id
  };

  const settings = await WebsiteSettings.findOne({ tenantId: req.user.tenantId });
  
  if (!settings) {
    return next(new AppError('Website settings not found', 404));
  }

  const modalIndex = settings.modals.findIndex(modal => modal._id.toString() === id);
  
  if (modalIndex === -1) {
    return next(new AppError('Modal not found', 404));
  }

  // Check if updating name would create a duplicate
  if (updateData.name && updateData.name !== settings.modals[modalIndex].name) {
    const nameExists = settings.modals.some((modal, index) => 
      index !== modalIndex && modal.name.toLowerCase() === updateData.name.toLowerCase()
    );
    
    if (nameExists) {
      return next(new AppError('Modal with this name already exists', 400));
    }
  }

  // Update the modal
  Object.assign(settings.modals[modalIndex], updateData);
  settings.lastUpdatedBy = req.user._id;
  
  await settings.save();

  res.status(200).json({
    success: true,
    data: settings.modals[modalIndex],
    message: 'Modal updated successfully'
  });
});

// @desc    Delete modal
// @route   DELETE /api/website/modals/:id
// @access  Private/Admin
const deleteModal = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const settings = await WebsiteSettings.findOne({ tenantId: req.user.tenantId });
  
  if (!settings) {
    return next(new AppError('Website settings not found', 404));
  }

  const modalIndex = settings.modals.findIndex(modal => modal._id.toString() === id);
  
  if (modalIndex === -1) {
    return next(new AppError('Modal not found', 404));
  }

  const deletedModal = settings.modals[modalIndex];
  settings.modals.splice(modalIndex, 1);
  settings.lastUpdatedBy = req.user._id;
  
  await settings.save();

  res.status(200).json({
    success: true,
    data: deletedModal,
    message: 'Modal deleted successfully'
  });
});

// @desc    Toggle modal status
// @route   PATCH /api/website/modals/:id/toggle
// @access  Private/Admin
const toggleModal = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const settings = await WebsiteSettings.findOne({ tenantId: req.user.tenantId });
  
  if (!settings) {
    return next(new AppError('Website settings not found', 404));
  }

  const modalIndex = settings.modals.findIndex(modal => modal._id.toString() === id);
  
  if (modalIndex === -1) {
    return next(new AppError('Modal not found', 404));
  }

  // Toggle status or set to specific value
  const newStatus = isActive !== undefined ? isActive : !settings.modals[modalIndex].isActive;
  
  settings.modals[modalIndex].isActive = newStatus;
  settings.modals[modalIndex].lastUpdatedBy = req.user._id;
  settings.lastUpdatedBy = req.user._id;
  
  await settings.save();

  res.status(200).json({
    success: true,
    data: { 
      id: settings.modals[modalIndex]._id,
      isActive: newStatus,
      name: settings.modals[modalIndex].name
    },
    message: `Modal ${newStatus ? 'activated' : 'deactivated'} successfully`
  });
});

// @desc    Get active modals for specific page
// @route   GET /api/website/modals/active/:page?
// @access  Public
const getActiveModals = asyncHandler(async (req, res, next) => {
  const { page = 'homepage' } = req.params;
  const { tenantId } = req.query;

  if (!tenantId) {
    return next(new AppError('Tenant ID is required', 400));
  }

  const settings = await WebsiteSettings.findOne({ tenantId });
  
  if (!settings || !settings.modals) {
    return res.status(200).json({
      success: true,
      data: []
    });
  }

  const activeModals = settings.getActiveModals(page);

  res.status(200).json({
    success: true,
    data: activeModals
  });
});

// @desc    Record modal analytics
// @route   POST /api/website/modals/:id/analytics
// @access  Public
const recordModalAnalytics = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { action, tenantId } = req.body; // action: 'impression', 'click', 'conversion', 'dismissal'

  if (!tenantId) {
    return next(new AppError('Tenant ID is required', 400));
  }

  if (!['impression', 'click', 'conversion', 'dismissal'].includes(action)) {
    return next(new AppError('Invalid action type', 400));
  }

  const settings = await WebsiteSettings.findOne({ tenantId });
  
  if (!settings) {
    return next(new AppError('Website settings not found', 404));
  }

  const modal = settings.modals.id(id);
  
  if (!modal) {
    return next(new AppError('Modal not found', 404));
  }

  // Record the analytics
  switch (action) {
    case 'impression':
      modal.recordImpression();
      break;
    case 'click':
      modal.recordClick();
      break;
    case 'conversion':
      modal.recordConversion();
      break;
    case 'dismissal':
      modal.recordDismissal();
      break;
  }

  await settings.save();

  res.status(200).json({
    success: true,
    message: `${action} recorded successfully`
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

// @desc    Update info bar English translation
// @route   PUT /api/website/settings/info-bar/english
// @access  Private/Admin
const updateInfoBarEnglish = asyncHandler(async (req, res, next) => {
  const { textEn } = req.body;

  const updateData = {
    'infoBar.textEn': textEn || '',
    lastUpdatedBy: req.user._id
  };

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
    message: 'Info bar English translation updated successfully'
  });
});

// @desc    Update modal English translations
// @route   PUT /api/website/modals/:id/english
// @access  Private/Admin
const updateModalEnglish = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { titleEn, contentEn, emailPlaceholderEn, buttonTextEn, secondaryButtonTextEn } = req.body;

  const settings = await WebsiteSettings.findOne({ tenantId: req.user.tenantId });

  if (!settings) {
    return next(new AppError('Website settings not found', 404));
  }

  const modalIndex = settings.modals.findIndex(modal => modal._id.toString() === id);

  if (modalIndex === -1) {
    return next(new AppError('Modal not found', 404));
  }

  // Update English fields
  if (titleEn !== undefined) settings.modals[modalIndex].titleEn = titleEn;
  if (contentEn !== undefined) settings.modals[modalIndex].contentEn = contentEn;
  if (emailPlaceholderEn !== undefined) settings.modals[modalIndex].emailPlaceholderEn = emailPlaceholderEn;
  if (buttonTextEn !== undefined) settings.modals[modalIndex].buttonTextEn = buttonTextEn;
  if (secondaryButtonTextEn !== undefined) settings.modals[modalIndex].secondaryButtonTextEn = secondaryButtonTextEn;

  settings.modals[modalIndex].lastUpdatedBy = req.user._id;
  settings.lastUpdatedBy = req.user._id;

  await settings.save();

  res.status(200).json({
    success: true,
    data: settings.modals[modalIndex],
    message: 'Modal English translations updated successfully'
  });
});

module.exports = {
  getWebsiteSettings,
  updateWebsiteSettings,
  updateInfoBar,
  toggleInfoBar,
  updateInfoBarEnglish,
  // Modal CRUD operations
  getModals,
  createModal,
  updateModal,
  deleteModal,
  toggleModal,
  getActiveModals,
  recordModalAnalytics,
  updateModalEnglish
}; 