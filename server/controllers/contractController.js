const Contract = require('../models/Contract');
const Reservation = require('../models/Reservation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const PDFDocument = require('pdfkit');

// @desc    Get all contracts (tenant-scoped)
// @route   GET /api/contracts
// @access  Private/Staff
const getContracts = asyncHandler(async (req, res, next) => {
  // Build query with tenant filter
  const baseQuery = { tenantId: req.user.tenantId };
  
  // Copy req.query and merge with tenant filter
  const reqQuery = { ...req.query };
  
  // Fields to exclude from filtering
  const removeFields = ['select', 'sort', 'page', 'limit'];
  removeFields.forEach(param => delete reqQuery[param]);
  
  // Create query string
  let queryStr = JSON.stringify({ ...baseQuery, ...reqQuery });
  
  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
  
  // Finding resource with tenant filter
  let query = Contract.find(JSON.parse(queryStr));
  
  // Select fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }
  
  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }
  
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Contract.countDocuments(JSON.parse(queryStr));
  
  query = query.skip(startIndex).limit(limit);
  
  // Populate related fields
  query = query.populate([
    {
      path: 'reservation',
      select: 'reservationNumber status startDate endDate'
    },
    {
      path: 'createdBy',
      select: 'firstName lastName email'
    }
  ]);
  
  // Executing query
  const contracts = await query;
  
  // Pagination result
  const pagination = {};
  
  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }
  
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }
  
  res.status(200).json({
    success: true,
    count: contracts.length,
    pagination,
    data: contracts
  });
});

// @desc    Get single contract
// @route   GET /api/contracts/:id
// @access  Private/Staff
const getContract = asyncHandler(async (req, res, next) => {
  const contract = await Contract.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  }).populate([
    {
      path: 'reservation',
      select: 'reservationNumber status startDate endDate pricing'
    },
    {
      path: 'createdBy',
      select: 'firstName lastName email'
    },
    {
      path: 'lastModifiedBy',
      select: 'firstName lastName email'
    }
  ]);
  
  if (!contract) {
    return next(new AppError(`Contract not found with id of ${req.params.id}`, 404));
  }
  
  res.status(200).json({
    success: true,
    data: contract
  });
});

// @desc    Create contract from reservation
// @route   POST /api/contracts
// @access  Private/Staff
const createContract = asyncHandler(async (req, res, next) => {
  const { reservationId, additionalServices, specialServices, rentalRules, notes } = req.body;
  
  console.log('🔖 [CONTRACT] Creating contract with data:', { reservationId, additionalServices, specialServices, rentalRules, notes });
  
  if (!reservationId) {
    return next(new AppError('Reservation ID is required', 400));
  }
  
  // Check if contract already exists for this reservation
  const existingContract = await Contract.findOne({
    reservation: reservationId,
    tenantId: req.user.tenantId
  });
  
  if (existingContract) {
    return next(new AppError('Contract already exists for this reservation', 400));
  }
  
  try {
    console.log('🔖 [CONTRACT] Creating contract from reservation:', reservationId);
    console.log('🔖 [CONTRACT] User info:', { id: req.user._id, tenantId: req.user.tenantId });
    
    // Create contract from reservation
    const contract = await Contract.createFromReservation(
      reservationId,
      req.user.tenantId,
      req.user._id
    );
    
    console.log('🔖 [CONTRACT] Contract created successfully, ID:', contract._id);
    console.log('🔖 [CONTRACT] Contract data:', JSON.stringify(contract.toObject(), null, 2));
    
    // Add additional data if provided
    if (additionalServices) {
      contract.additionalServices = additionalServices;
    }
    
    if (specialServices) {
      contract.specialServices = { ...contract.specialServices, ...specialServices };
    }
    
    if (rentalRules) {
      contract.rentalRules = { ...contract.rentalRules, ...rentalRules };
    }
    
    if (notes) {
      contract.notes = notes;
    }
    
    console.log('🔖 [CONTRACT] Additional data added, saving contract...');
    await contract.save();
    console.log('🔖 [CONTRACT] Contract saved successfully');
    
    // Populate the contract before returning
    const populatedContract = await Contract.findById(contract._id).populate([
      {
        path: 'reservation',
        select: 'reservationNumber status startDate endDate'
      },
      {
        path: 'createdBy',
        select: 'firstName lastName email'
      }
    ]);
    
    console.log('🔖 [CONTRACT] Contract populated and ready to return');
    
    res.status(201).json({
      success: true,
      data: populatedContract
    });
  } catch (error) {
    console.error('🔖 [CONTRACT] Error creating contract:', error);
    console.error('🔖 [CONTRACT] Error stack:', error.stack);
    
    // More detailed error handling
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(e => e.message);
      return next(new AppError(`Validation failed: ${errorMessages.join(', ')}`, 400));
    }
    
    if (error.code === 11000) {
      return next(new AppError('Duplicate contract number generated. Please try again.', 400));
    }
    
    return next(new AppError(`Contract creation failed: ${error.message}`, 400));
  }
});

// @desc    Update contract
// @route   PUT /api/contracts/:id
// @access  Private/Staff
const updateContract = asyncHandler(async (req, res, next) => {
  let contract = await Contract.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });
  
  if (!contract) {
    return next(new AppError(`Contract not found with id of ${req.params.id}`, 404));
  }
  
  // Check if contract can be modified
  if (!contract.canBeModified()) {
    return next(new AppError('Contract cannot be modified in its current state', 400));
  }
  
  // Update contract
  const updateData = { ...req.body };
  updateData.lastModifiedBy = req.user._id;
  updateData.version = contract.version + 1;
  
  contract = await Contract.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true
  }).populate([
    {
      path: 'reservation',
      select: 'reservationNumber status startDate endDate'
    },
    {
      path: 'createdBy',
      select: 'firstName lastName email'
    },
    {
      path: 'lastModifiedBy',
      select: 'firstName lastName email'
    }
  ]);
  
  res.status(200).json({
    success: true,
    data: contract
  });
});

// @desc    Delete contract
// @route   DELETE /api/contracts/:id
// @access  Private/Staff
const deleteContract = asyncHandler(async (req, res, next) => {
  const contract = await Contract.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });
  
  if (!contract) {
    return next(new AppError(`Contract not found with id of ${req.params.id}`, 404));
  }
  
  // Check if contract can be deleted
  if (contract.status === 'signed') {
    return next(new AppError('Signed contracts cannot be deleted', 400));
  }
  
  await contract.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Update contract status
// @route   PUT /api/contracts/:id/status
// @access  Private/Staff
const updateContractStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  
  if (!status) {
    return next(new AppError('Status is required', 400));
  }
  
  const contract = await Contract.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });
  
  if (!contract) {
    return next(new AppError(`Contract not found with id of ${req.params.id}`, 404));
  }
  
  contract.status = status;
  contract.lastModifiedBy = req.user._id;
  
  await contract.save();
  
  res.status(200).json({
    success: true,
    data: contract
  });
});

// @desc    Sign contract (staff)
// @route   PUT /api/contracts/:id/sign-staff
// @access  Private/Staff
const signContractStaff = asyncHandler(async (req, res, next) => {
  const contract = await Contract.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });
  
  if (!contract) {
    return next(new AppError(`Contract not found with id of ${req.params.id}`, 404));
  }
  
  contract.signatures.staff = {
    signed: true,
    signedAt: new Date(),
    signedBy: req.user._id
  };
  
  // Update status if both signatures are present
  if (contract.signatures.customer.signed) {
    contract.status = 'signed';
  }
  
  await contract.save();
  
  res.status(200).json({
    success: true,
    data: contract
  });
});

// @desc    Generate contract PDF
// @route   GET /api/contracts/:id/pdf
// @access  Private/Staff
const generateContractPDF = asyncHandler(async (req, res, next) => {
  const contract = await Contract.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  }).populate([
    {
      path: 'reservation',
      select: 'reservationNumber status'
    },
    {
      path: 'createdBy',
      select: 'firstName lastName'
    }
  ]);
  
  if (!contract) {
    return next(new AppError(`Contract not found with id of ${req.params.id}`, 404));
  }
  
  // Create PDF document
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  
  // Set response headers
  const isPreviewing = req.query.preview === 'true';
  if (isPreviewing) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="zmluva-${contract.contractNumber}.pdf"`);
  } else {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="zmluva-${contract.contractNumber}.pdf"`);
  }
  
  doc.pipe(res);
  
  // Page dimensions
  const pageWidth = doc.page.width;
  const margin = 40;
  const contentWidth = pageWidth - (2 * margin);
  let yPos = margin;
  
  // Helper functions for better layout
  const addBox = (x, y, width, height, fillColor = '#F8F9FA', strokeColor = '#E0E0E0') => {
    doc.rect(x, y, width, height).fillAndStroke(fillColor, strokeColor);
  };
  
  const addLine = (x1, y1, x2, y2, color = '#E0E0E0') => {
    doc.strokeColor(color).moveTo(x1, y1).lineTo(x2, y2).stroke();
  };
  
  // HEADER SECTION
  doc.fontSize(24).font('Helvetica-Bold').fillColor('#1976D2').text('ZMLUVA O PRENÁJME VOZIDLA', margin, yPos);
  doc.fontSize(14).font('Helvetica').fillColor('#666666').text('CarFlow - Systém správy prenájmu vozidiel', margin, yPos + 30);
  
  // Contract info - right aligned
  const docInfoX = pageWidth - 250;
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text(`Číslo zmluvy: ${contract.contractNumber}`, docInfoX, yPos + 10);
  doc.fontSize(12).font('Helvetica').fillColor('#666666').text(`Dátum vytvorenia: ${new Date(contract.createdAt).toLocaleDateString('sk-SK')}`, docInfoX, yPos + 25);
  doc.fontSize(12).font('Helvetica').fillColor('#666666').text(`Status: ${contract.status}`, docInfoX, yPos + 40);
  
  yPos += 80;
  
  // Divider line
  addLine(margin, yPos, pageWidth - margin, yPos, '#1976D2');
  yPos += 30;
  
  // CUSTOMER INFORMATION
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#1976D2').text('INFORMÁCIE O ZÁKAZNÍKOVI', margin, yPos);
  yPos += 25;
  
  addBox(margin, yPos, contentWidth, 100, '#F8F9FA', '#E0E0E0');
  
  // Customer details
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Meno a priezvisko:', margin + 15, yPos + 15);
  doc.fontSize(12).font('Helvetica').fillColor('#666666').text(`${contract.customer.firstName} ${contract.customer.lastName}`, margin + 150, yPos + 15);
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Telefón:', margin + 15, yPos + 35);
  doc.fontSize(12).font('Helvetica').fillColor('#666666').text(contract.customer.phone, margin + 150, yPos + 35);
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('E-mail:', margin + 15, yPos + 55);
  doc.fontSize(12).font('Helvetica').fillColor('#666666').text(contract.customer.email, margin + 150, yPos + 55);
  
  if (contract.customer.address && contract.customer.address.street) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Adresa:', margin + 15, yPos + 75);
    const address = `${contract.customer.address.street}, ${contract.customer.address.city || ''}`;
    doc.fontSize(12).font('Helvetica').fillColor('#666666').text(address, margin + 150, yPos + 75);
  }
  
  if (contract.customer.ico) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('IČO:', margin + 350, yPos + 15);
    doc.fontSize(12).font('Helvetica').fillColor('#666666').text(contract.customer.ico, margin + 380, yPos + 15);
  }
  
  yPos += 120;
  
  // VEHICLE INFORMATION
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#1976D2').text('INFORMÁCIE O VOZIDLE', margin, yPos);
  yPos += 25;
  
  addBox(margin, yPos, contentWidth, 60, '#F8F9FA', '#E0E0E0');
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Značka, model:', margin + 15, yPos + 15);
  doc.fontSize(12).font('Helvetica').fillColor('#666666').text(`${contract.vehicle.brand} ${contract.vehicle.model}`, margin + 150, yPos + 15);
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Evidenčné číslo:', margin + 15, yPos + 35);
  doc.fontSize(12).font('Helvetica').fillColor('#666666').text(contract.vehicle.registrationNumber, margin + 150, yPos + 35);
  
  if (contract.vehicle.year) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Rok výroby:', margin + 350, yPos + 15);
    doc.fontSize(12).font('Helvetica').fillColor('#666666').text(contract.vehicle.year.toString(), margin + 420, yPos + 15);
  }
  
  yPos += 80;
  
  // RENTAL DETAILS
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#1976D2').text('DETAILY PRENÁJMU', margin, yPos);
  yPos += 25;
  
  addBox(margin, yPos, contentWidth, 120, '#F8F9FA', '#E0E0E0');
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Dátum a čas OD:', margin + 15, yPos + 15);
  doc.fontSize(12).font('Helvetica').fillColor('#666666').text(new Date(contract.rental.startDate).toLocaleDateString('sk-SK'), margin + 150, yPos + 15);
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Dátum a čas DO:', margin + 15, yPos + 35);
  doc.fontSize(12).font('Helvetica').fillColor('#666666').text(new Date(contract.rental.endDate).toLocaleDateString('sk-SK'), margin + 150, yPos + 35);
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Miesto prevzatia:', margin + 15, yPos + 55);
  doc.fontSize(12).font('Helvetica').fillColor('#666666').text(contract.rental.pickupLocation, margin + 150, yPos + 55);
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Miesto vrátenia:', margin + 15, yPos + 75);
  doc.fontSize(12).font('Helvetica').fillColor('#666666').text(contract.rental.returnLocation, margin + 150, yPos + 75);
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Počet dní:', margin + 15, yPos + 95);
  doc.fontSize(12).font('Helvetica').fillColor('#666666').text(contract.rental.totalDays.toString(), margin + 150, yPos + 95);
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Denná sadzba:', margin + 350, yPos + 15);
  doc.fontSize(12).font('Helvetica').fillColor('#666666').text(`${contract.rental.dailyRate}€`, margin + 450, yPos + 15);
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Výsledná suma:', margin + 350, yPos + 35);
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#1976D2').text(`${contract.calculateTotalAmount()}€`, margin + 450, yPos + 35);
  
  yPos += 140;
  
  // Check if we need a new page
  if (yPos > pageWidth - 200) {
    doc.addPage();
    yPos = margin;
  }
  
  // ADDITIONAL SERVICES
  if (contract.additionalServices.length > 0 || contract.specialServices.delivery.isSelected || contract.specialServices.afterHours.isSelected) {
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1976D2').text('DOPLNKOVÉ SLUŽBY', margin, yPos);
    yPos += 25;
    
    let servicesHeight = 40 + (contract.additionalServices.length * 20);
    if (contract.specialServices.delivery.isSelected) servicesHeight += 20;
    if (contract.specialServices.afterHours.isSelected) servicesHeight += 20;
    
    addBox(margin, yPos, contentWidth, servicesHeight, '#F8F9FA', '#E0E0E0');
    
    let serviceY = yPos + 15;
    
    // Regular additional services
    contract.additionalServices.forEach(service => {
      doc.fontSize(12).font('Helvetica').fillColor('#333333').text(`• ${service.name}`, margin + 15, serviceY);
      doc.fontSize(12).font('Helvetica').fillColor('#666666').text(`${service.price}€`, margin + 450, serviceY);
      serviceY += 20;
    });
    
    // Special services
    if (contract.specialServices.delivery.isSelected) {
      doc.fontSize(12).font('Helvetica').fillColor('#333333').text('• Pristavenie vozidla', margin + 15, serviceY);
      doc.fontSize(12).font('Helvetica').fillColor('#666666').text(`${contract.specialServices.delivery.price}€`, margin + 450, serviceY);
      serviceY += 20;
    }
    
    if (contract.specialServices.afterHours.isSelected) {
      doc.fontSize(12).font('Helvetica').fillColor('#333333').text('• Mimo otváracích hodín', margin + 15, serviceY);
      doc.fontSize(12).font('Helvetica').fillColor('#666666').text(`${contract.specialServices.afterHours.price}€`, margin + 450, serviceY);
      serviceY += 20;
    }
    
    yPos += servicesHeight + 20;
  }
  
  // RENTAL RULES
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#1976D2').text('PRAVIDLÁ PRENÁJMU', margin, yPos);
  yPos += 25;
  
  addBox(margin, yPos, contentWidth, 150, '#F8F9FA', '#E0E0E0');
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Denný limit km:', margin + 15, yPos + 15);
  doc.fontSize(12).font('Helvetica').fillColor('#666666').text(`${contract.rentalRules.dailyKmLimit} km`, margin + 150, yPos + 15);
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Poplatky za nadlimitné km:', margin + 15, yPos + 35);
  doc.fontSize(12).font('Helvetica').fillColor('#666666').text(`${contract.rentalRules.excessKmFee}€/km`, margin + 200, yPos + 35);
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Spoluúčasť pri poistení:', margin + 15, yPos + 55);
  doc.fontSize(12).font('Helvetica').fillColor('#666666').text(`${contract.rentalRules.insuranceDeductible}€`, margin + 180, yPos + 55);
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Zakázané činnosti:', margin + 15, yPos + 75);
  doc.fontSize(10).font('Helvetica').fillColor('#666666').text(contract.rentalRules.prohibitedActivities.join(', '), margin + 15, yPos + 95, { width: contentWidth - 30 });
  
  yPos += 170;
  
  // CANCELLATION POLICY
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Storno podmienky:', margin, yPos);
  yPos += 15;
  doc.fontSize(10).font('Helvetica').fillColor('#666666').text(contract.rentalRules.cancellationPolicy, margin, yPos, { width: contentWidth });
  
  yPos += 60;
  
  // SIGNATURES
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#1976D2').text('PODPISY', margin, yPos);
  yPos += 40;
  
  // Customer signature
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Podpis zákazníka:', margin, yPos);
  doc.fontSize(10).font('Helvetica').fillColor('#666666').text('Dátum:', margin + 300, yPos);
  addLine(margin, yPos + 40, margin + 250, yPos + 40);
  addLine(margin + 300, yPos + 40, margin + 450, yPos + 40);
  
  yPos += 80;
  
  // Staff signature
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Podpis zástupcu prenajímateľa:', margin, yPos);
  doc.fontSize(10).font('Helvetica').fillColor('#666666').text('Dátum:', margin + 300, yPos);
  addLine(margin, yPos + 40, margin + 250, yPos + 40);
  addLine(margin + 300, yPos + 40, margin + 450, yPos + 40);
  
  // Footer
  yPos += 100;
  doc.fontSize(8).font('Helvetica').fillColor('#999999').text(
    `Zmluva vytvorená systémom CarFlow dňa ${new Date().toLocaleDateString('sk-SK')}`,
    margin,
    yPos,
    { align: 'center', width: contentWidth }
  );
  
  doc.end();
});

// @desc    Get contract statistics
// @route   GET /api/contracts/stats
// @access  Private/Staff
const getContractStats = asyncHandler(async (req, res, next) => {
  const tenantId = req.user.tenantId;
  
  // Get total contracts
  const totalContracts = await Contract.countDocuments({ tenantId });
  
  // Get contracts by status
  const contractsByStatus = await Contract.aggregate([
    { $match: { tenantId } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  // Get contracts created this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const contractsThisMonth = await Contract.countDocuments({
    tenantId,
    createdAt: { $gte: startOfMonth }
  });
  
  // Get signed contracts
  const signedContracts = await Contract.countDocuments({
    tenantId,
    status: 'signed'
  });
  
  res.status(200).json({
    success: true,
    data: {
      totalContracts,
      contractsByStatus,
      contractsThisMonth,
      signedContracts
    }
  });
});

module.exports = {
  getContracts,
  getContract,
  createContract,
  updateContract,
  deleteContract,
  updateContractStatus,
  signContractStaff,
  generateContractPDF,
  getContractStats
}; 