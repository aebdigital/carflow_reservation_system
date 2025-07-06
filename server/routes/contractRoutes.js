const express = require('express');
const {
  getContracts,
  getContract,
  createContract,
  updateContract,
  deleteContract,
  updateContractStatus,
  signContractStaff,
  generateContractPDF,
  getContractStats
} = require('../controllers/contractController');

const { protect, requireStaff, addTenantFilter } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply authentication and tenant filtering to all routes
router.use(protect);
router.use(requireStaff);
router.use(addTenantFilter);

// Statistics route (must be before :id routes)
router.get('/stats', getContractStats);

// CRUD routes
router.route('/')
  .get(getContracts)
  .post(createContract);

router.route('/:id')
  .get(getContract)
  .put(updateContract)
  .delete(deleteContract);

// Special routes
router.put('/:id/status', updateContractStatus);
router.put('/:id/sign-staff', signContractStaff);
router.get('/:id/pdf', generateContractPDF);

module.exports = router; 