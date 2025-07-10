const EmailSubscription = require('../models/EmailSubscription');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

// Get all email subscriptions for admin
exports.getEmailSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 20, source, isActive, tags } = req.query;
    const tenantId = req.user.tenantId;

    // Build query
    let query = { tenantId };
    
    if (source) query.source = source;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (tags) query.tags = { $in: tags.split(',') };

    // Execute query with pagination
    const subscriptions = await EmailSubscription.find(query)
      .sort({ subscribedDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await EmailSubscription.countDocuments(query);

    res.json({
      subscriptions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching email subscriptions:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get email subscription statistics
exports.getEmailSubscriptionStats = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const [generalStats, sourceStats] = await Promise.all([
      EmailSubscription.getStats(tenantId),
      EmailSubscription.getSourceStats(tenantId)
    ]);

    res.json({
      general: generalStats[0] || { total: 0, active: 0, inactive: 0 },
      sources: sourceStats
    });
  } catch (error) {
    console.error('Error fetching email subscription stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get single email subscription
exports.getEmailSubscription = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const subscription = await EmailSubscription.findOne({ 
      _id: req.params.id, 
      tenantId 
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Email subscription not found' });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Error fetching email subscription:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create email subscription (admin)
exports.createEmailSubscription = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tenantId = req.user.tenantId;
    const {
      email,
      firstName,
      lastName,
      phone,
      source,
      tags,
      isActive,
      notes,
      preferences
    } = req.body;

    // Check if email already exists for this tenant
    const existingSubscription = await EmailSubscription.findOne({ 
      tenantId, 
      email 
    });

    if (existingSubscription) {
      return res.status(400).json({ error: 'Email already exists in database' });
    }

    const subscription = new EmailSubscription({
      tenantId,
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      phone: phone || '',
      source: source || 'manual',
      tags: tags || [],
      isActive: isActive !== undefined ? isActive : true,
      notes: notes || '',
      preferences: preferences || {},
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || ''
    });

    await subscription.save();

    res.status(201).json(subscription);
  } catch (error) {
    console.error('Error creating email subscription:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update email subscription
exports.updateEmailSubscription = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tenantId = req.user.tenantId;
    const subscription = await EmailSubscription.findOne({ 
      _id: req.params.id, 
      tenantId 
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Email subscription not found' });
    }

    const {
      email,
      firstName,
      lastName,
      phone,
      source,
      tags,
      isActive,
      notes,
      preferences
    } = req.body;

    // Check if email change conflicts with existing subscription
    if (email && email !== subscription.email) {
      const existingSubscription = await EmailSubscription.findOne({ 
        tenantId, 
        email,
        _id: { $ne: req.params.id }
      });

      if (existingSubscription) {
        return res.status(400).json({ error: 'Email already exists in database' });
      }
    }

    // Update fields
    if (email !== undefined) subscription.email = email;
    if (firstName !== undefined) subscription.firstName = firstName;
    if (lastName !== undefined) subscription.lastName = lastName;
    if (phone !== undefined) subscription.phone = phone;
    if (source !== undefined) subscription.source = source;
    if (tags !== undefined) subscription.tags = tags;
    if (isActive !== undefined) subscription.isActive = isActive;
    if (notes !== undefined) subscription.notes = notes;
    if (preferences !== undefined) subscription.preferences = preferences;

    await subscription.save();

    res.json(subscription);
  } catch (error) {
    console.error('Error updating email subscription:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete email subscription
exports.deleteEmailSubscription = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const subscription = await EmailSubscription.findOne({ 
      _id: req.params.id, 
      tenantId 
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Email subscription not found' });
    }

    await EmailSubscription.deleteOne({ _id: req.params.id });

    res.json({ message: 'Email subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting email subscription:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Activate/Deactivate email subscription
exports.toggleEmailSubscription = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const subscription = await EmailSubscription.findOne({ 
      _id: req.params.id, 
      tenantId 
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Email subscription not found' });
    }

    if (subscription.isActive) {
      await subscription.unsubscribe();
    } else {
      await subscription.resubscribe();
    }

    res.json(subscription);
  } catch (error) {
    console.error('Error toggling email subscription:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Export email subscriptions to CSV
exports.exportEmailSubscriptions = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { isActive, source, tags } = req.query;

    let query = { tenantId };
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (source) query.source = source;
    if (tags) query.tags = { $in: tags.split(',') };

    const subscriptions = await EmailSubscription.find(query)
      .sort({ subscribedDate: -1 });

    // Generate CSV
    const csvHeader = 'Email,First Name,Last Name,Phone,Source,Tags,Active,Subscribed Date,Notes\n';
    const csvData = subscriptions.map(sub => {
      return `"${sub.email}","${sub.firstName}","${sub.lastName}","${sub.phone}","${sub.source}","${sub.tags.join(';')}","${sub.isActive}","${sub.subscribedDate.toISOString()}","${sub.notes}"`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="email_subscriptions.csv"');
    res.send(csvHeader + csvData);
  } catch (error) {
    console.error('Error exporting email subscriptions:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// === PUBLIC API ENDPOINTS ===

// Public endpoint to subscribe to newsletter
exports.publicSubscribe = async (req, res) => {
  try {
    const { email, firstName, lastName, phone, source, consent } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!consent) {
      return res.status(400).json({ error: 'Consent is required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // For public API, we need to find the tenant (business owner)
    // You might want to determine this from subdomain, domain, or API key
    // For now, we'll use a default tenant or implement proper tenant resolution
    const tenantId = req.tenantId || req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant not specified' });
    }

    // Check if email already exists
    let subscription = await EmailSubscription.findOne({ 
      tenantId, 
      email 
    });

    if (subscription) {
      // If exists but inactive, reactivate
      if (!subscription.isActive) {
        await subscription.resubscribe();
        return res.json({ 
          message: 'Successfully resubscribed to newsletter',
          subscription 
        });
      } else {
        return res.status(400).json({ error: 'Email already subscribed' });
      }
    }

    // Create new subscription
    subscription = new EmailSubscription({
      tenantId,
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      phone: phone || '',
      source: source || 'website',
      tags: ['newsletter'],
      isActive: true,
      consentGiven: consent,
      consentDate: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || ''
    });

    await subscription.save();

    res.status(201).json({ 
      message: 'Successfully subscribed to newsletter',
      subscription: {
        id: subscription._id,
        email: subscription.email,
        firstName: subscription.firstName,
        lastName: subscription.lastName
      }
    });
  } catch (error) {
    console.error('Error in public subscribe:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Public endpoint to unsubscribe
exports.publicUnsubscribe = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Unsubscribe token is required' });
    }

    const subscription = await EmailSubscription.findOne({ 
      unsubscribeToken: token 
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Invalid unsubscribe token' });
    }

    await subscription.unsubscribe();

    res.json({ message: 'Successfully unsubscribed from newsletter' });
  } catch (error) {
    console.error('Error in public unsubscribe:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Public endpoint to update preferences
exports.publicUpdatePreferences = async (req, res) => {
  try {
    const { token } = req.params;
    const { preferences } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const subscription = await EmailSubscription.findOne({ 
      unsubscribeToken: token 
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    if (preferences) {
      subscription.preferences = { ...subscription.preferences, ...preferences };
      await subscription.save();
    }

    res.json({ 
      message: 'Preferences updated successfully',
      preferences: subscription.preferences 
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Bulk import emails from CSV
exports.bulkImportEmails = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { emails } = req.body; // Array of email objects

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'No emails provided' });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    for (const emailData of emails) {
      try {
        // Validate email
        if (!emailData.email) {
          results.errors.push({ email: emailData.email, error: 'Email is required' });
          continue;
        }

        // Check if already exists
        const existingSubscription = await EmailSubscription.findOne({ 
          tenantId, 
          email: emailData.email 
        });

        if (existingSubscription) {
          results.skipped++;
          continue;
        }

        // Create subscription
        const subscription = new EmailSubscription({
          tenantId,
          email: emailData.email,
          firstName: emailData.firstName || '',
          lastName: emailData.lastName || '',
          phone: emailData.phone || '',
          source: 'import',
          tags: emailData.tags || [],
          isActive: true,
          notes: emailData.notes || '',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || ''
        });

        await subscription.save();
        results.imported++;
      } catch (error) {
        results.errors.push({ email: emailData.email, error: error.message });
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error bulk importing emails:', error);
    res.status(500).json({ error: 'Server error' });
  }
}; 