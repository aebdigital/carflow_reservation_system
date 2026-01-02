const Contract = require('../models/Contract');
const Reservation = require('../models/Reservation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const pdfService = require('../services/pdfService');
const nitracarContractPdfService = require('../services/nitracarContractPdfService');

// NitraCar tenant email for feature detection
const NITRACAR_EMAIL = 'nitra-car@nitra-car.sk';

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
      select: 'reservationNumber status startDate endDate pricing customer car paymentType selectedServices'
    },
    {
      path: 'createdBy',
      select: 'firstName lastName'
    }
  ]);

  if (!contract) {
    return next(new AppError(`Contract not found with id of ${req.params.id}`, 404));
  }

  try {
    console.log('🔄 [CONTRACT PDF] Generating rental agreement for contract:', req.params.id);

    // Get tenant user to determine which template to use
    const User = require('../models/User');
    const tenantAdmin = await User.findOne({
      tenantId: req.user.tenantId,
      role: 'admin'
    });

    const tenantEmail = tenantAdmin?.email || req.user.email;
    const isNitraCar = tenantEmail?.toLowerCase() === NITRACAR_EMAIL.toLowerCase();

    let pdfBuffer;

    if (isNitraCar) {
      // Use NitraCar dynamic PDF generator
      console.log('📄 [CONTRACT PDF] Using NitraCar dynamic PDF generator');

      // Prepare contract data for NitraCar PDF
      const contractData = {
        contractNumber: contract.contractNumber,
        customer: {
          firstName: contract.customer?.firstName,
          lastName: contract.customer?.lastName,
          phone: contract.customer?.phone,
          email: contract.customer?.email,
          address: contract.customer?.address,
          idNumber: contract.customer?.idNumber || contract.customerIdentification?.idCardNumber,
          licenseNumber: contract.customer?.licenseNumber || contract.customerIdentification?.driverLicenseNumber
        },
        vehicle: {
          brand: contract.vehicle?.brand,
          model: contract.vehicle?.model,
          year: contract.vehicle?.year,
          registrationNumber: contract.vehicle?.registrationNumber,
          vin: contract.vehicle?.vin,
          color: contract.vehicle?.color
        },
        rental: {
          startDate: contract.rental?.startDate,
          endDate: contract.rental?.endDate,
          pickupLocation: contract.rental?.pickupLocation,
          returnLocation: contract.rental?.returnLocation,
          totalDays: contract.rental?.totalDays,
          dailyRate: contract.rental?.dailyRate,
          totalAmount: contract.rental?.totalAmount
        },
        additionalServices: contract.additionalServices || [],
        rentalRules: contract.rentalRules || {},
        paymentMethod: contract.paymentMethod,
        deposit: contract.deposit,
        handover: contract.handover || {},
        return: contract.return || {}
      };

      pdfBuffer = await nitracarContractPdfService.generateContract(contractData);

    } else {
      // Use original template-based PDF service for other tenants
      console.log('📄 [CONTRACT PDF] Using template-based PDF generator');

      // Get the reservation data with populated customer and car
      const reservation = await Reservation.findById(contract.reservation._id)
        .populate('customer', 'firstName lastName email phone address licenseNumber idNumber')
        .populate('car', 'brand model year registrationNumber vin color category mileageLimit idCardNumber technicalInspection');

      if (!reservation) {
        return next(new AppError('Reservation not found for this contract', 404));
      }

      pdfBuffer = await pdfService.generateRentalAgreement(
        reservation,
        reservation.car,
        reservation.customer,
        tenantEmail
      );
    }

    // Set response headers for PDF
    const isPreviewing = req.query.preview === 'true';
    const filename = `zmluva-${contract.contractNumber}.pdf`;

    if (isPreviewing) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    res.setHeader('Content-Length', pdfBuffer.length);

    // Send the PDF
    res.send(pdfBuffer);

    console.log('✅ [CONTRACT PDF] Rental agreement sent successfully');

  } catch (error) {
    console.error('❌ [CONTRACT PDF] Error generating contract PDF:', error);
    return next(new AppError(`Chyba pri generovaní PDF: ${error.message}`, 500));
  }
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