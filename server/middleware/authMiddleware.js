const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
      
      // Get user from token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token is not valid. User not found.'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account has been deactivated.'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid.'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication.'
    });
  }
};

// Check if user has admin role
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Not authenticated.'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

// Check if user has staff or admin role
const requireStaff = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Not authenticated.'
    });
  }

  if (!['admin', 'staff'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Staff privileges required.'
    });
  }

  next();
};

// Add tenant filter to query for complete data separation
const addTenantFilter = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Not authenticated.'
    });
  }

  // Add tenant filter to all database queries
  req.tenantFilter = { tenantId: req.user.tenantId };
  
  // Store original query methods if not already done
  if (!req.originalQuery) {
    req.originalQuery = req.query;
  }

  next();
};

// Check if user owns the resource or is admin/staff within the same tenant
const requireOwnershipOrStaff = (resourceUserField = 'user') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Not authenticated.'
      });
    }

    // Admin and staff can access any resource within their tenant
    if (['admin', 'staff'].includes(req.user.role)) {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.body[resourceUserField] || req.params.userId || req.user._id;
    
    if (req.user._id.toString() !== resourceUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

// Tenant-aware rate limiting
const tenantRateLimit = (maxRequests = 100, windowMinutes = 15) => {
  const tenantRequests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const tenantId = req.user.tenantId.toString();
    const now = Date.now();
    const windowStart = now - (windowMinutes * 60 * 1000);

    if (tenantRequests.has(tenantId)) {
      const requests = tenantRequests.get(tenantId).filter(time => time > windowStart);
      tenantRequests.set(tenantId, requests);
    } else {
      tenantRequests.set(tenantId, []);
    }

    const tenantRequestCount = tenantRequests.get(tenantId).length;

    if (tenantRequestCount >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMinutes} minutes per tenant.`,
        retryAfter: windowMinutes * 60
      });
    }

    tenantRequests.get(tenantId).push(now);
    next();
  };
};

// Ensure resource belongs to user's tenant
const validateTenantAccess = (Model) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Not authenticated.'
      });
    }

    try {
      const resourceId = req.params.id;
      if (resourceId) {
        const resource = await Model.findById(resourceId);
        
        if (resource && resource.tenantId && resource.tenantId.toString() !== req.user.tenantId.toString()) {
          return res.status(404).json({
            success: false,
            message: 'Resource not found.'
          });
        }
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Server error validating tenant access.'
      });
    }
  };
};

module.exports = {
  protect,
  requireAdmin,
  requireStaff,
  requireOwnershipOrStaff,
  addTenantFilter,
  tenantRateLimit,
  validateTenantAccess
}; 