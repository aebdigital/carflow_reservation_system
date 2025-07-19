const EmailSubscription = require('../models/EmailSubscription');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Send mass email campaign to customers
// @route   POST /api/campaigns/send
// @access  Private/Admin
const sendMassEmail = asyncHandler(async (req, res, next) => {
  const { subject, content, targetCustomers } = req.body;
  const tenantId = req.user.tenantId;

  // Validate required fields
  if (!subject || !content) {
    return next(new AppError('Subject and content are required', 400));
  }

  console.log('🚀 [CAMPAIGN] Starting mass email campaign for tenant:', tenantId);

  let recipients = [];

  try {
    // Get recipients based on target selection
    if (targetCustomers === 'all') {
      // Get all customers from Users and EmailSubscriptions (excluding opt-out users)
      const [users, emailSubscriptions] = await Promise.all([
        User.find({ 
          tenantId, 
          role: 'customer',
          email: { $exists: true, $ne: '' },
          emailOptOut: { $ne: true }
        }).select('email firstName lastName emailOptOut'),
        EmailSubscription.find({ 
          tenantId,
          isActive: true,
          email: { $exists: true, $ne: '' },
          emailOptOut: { $ne: true }
        }).select('email firstName lastName emailOptOut')
      ]);

      // Combine and deduplicate emails
      const emailMap = new Map();
      
      users.forEach(user => {
        emailMap.set(user.email, {
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          source: 'customer'
        });
      });

      emailSubscriptions.forEach(sub => {
        if (!emailMap.has(sub.email)) {
          emailMap.set(sub.email, {
            email: sub.email,
            firstName: sub.firstName || '',
            lastName: sub.lastName || '',
            source: 'subscription'
          });
        }
      });

      recipients = Array.from(emailMap.values());
    } else if (targetCustomers === 'active') {
      // Get only active email subscriptions (excluding opt-out users)
      const emailSubscriptions = await EmailSubscription.find({ 
        tenantId,
        isActive: true,
        email: { $exists: true, $ne: '' },
        emailOptOut: { $ne: true }
      }).select('email firstName lastName emailOptOut');

      recipients = emailSubscriptions.map(sub => ({
        email: sub.email,
        firstName: sub.firstName || '',
        lastName: sub.lastName || '',
        source: 'subscription'
      }));
    } else {
      return next(new AppError('Invalid target customer selection', 400));
    }

    console.log(`📊 [CAMPAIGN] Found ${recipients.length} recipients`);

    if (recipients.length === 0) {
      return next(new AppError('No recipients found for the selected criteria', 400));
    }

    // Send emails
    const emailService = require('../services/emailService');
    
    if (!emailService.isConfigured) {
      return next(new AppError('Email service is not configured. Please check your SMTP settings.', 500));
    }

    const results = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    console.log('📧 [CAMPAIGN] Starting to send emails...');

    // Send emails in batches to avoid overwhelming the SMTP service
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (recipient) => {
        try {
          const personalizedContent = content.replace(
            /\{firstName\}/g, 
            recipient.firstName || 'Vážený zákazník'
          ).replace(
            /\{lastName\}/g,
            recipient.lastName || ''
          ).replace(
            /\{name\}/g,
            `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim() || 'Vážený zákazník'
          );

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #1976d2; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">CarFlow</h1>
              </div>
              
              <div style="padding: 30px;">
                ${personalizedContent.replace(/\n/g, '<br>')}
              </div>
              
              <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666;">
                <p>Tento email ste dostali, pretože ste zákazníkom služby CarFlow.</p>
                <p>Ak sa chcete odhlásiť z odberu, <a href="#" style="color: #1976d2;">kliknite sem</a>.</p>
              </div>
            </div>
          `;

          await emailService.sendEmail(recipient.email, subject, emailHtml);
          console.log(`✅ [CAMPAIGN] Email sent to: ${recipient.email}`);
          return { success: true, email: recipient.email };
        } catch (error) {
          console.error(`❌ [CAMPAIGN] Failed to send email to ${recipient.email}:`, error.message);
          return { success: false, email: recipient.email, error: error.message };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push({
              email: result.value.email,
              error: result.value.error
            });
          }
        } else {
          results.failed++;
          results.errors.push({
            email: 'unknown',
            error: result.reason.message
          });
        }
      });

      // Small delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('🎉 [CAMPAIGN] Mass email campaign completed:', results);

    res.status(200).json({
      success: true,
      message: 'Mass email campaign completed',
      results
    });

  } catch (error) {
    console.error('❌ [CAMPAIGN] Error in mass email campaign:', error);
    return next(new AppError(`Failed to send mass email: ${error.message}`, 500));
  }
});

// @desc    Get campaign statistics
// @route   GET /api/campaigns/stats
// @access  Private/Admin
const getCampaignStats = asyncHandler(async (req, res, next) => {
  const tenantId = req.user.tenantId;

  try {
    const [userCount, subscriptionCount] = await Promise.all([
      User.countDocuments({ 
        tenantId, 
        role: 'customer',
        email: { $exists: true, $ne: '' }
      }),
      EmailSubscription.countDocuments({ 
        tenantId,
        isActive: true,
        email: { $exists: true, $ne: '' }
      })
    ]);

    // Count unique emails
    const [users, emailSubscriptions] = await Promise.all([
      User.find({ 
        tenantId, 
        role: 'customer',
        email: { $exists: true, $ne: '' }
      }).select('email'),
      EmailSubscription.find({ 
        tenantId,
        isActive: true,
        email: { $exists: true, $ne: '' }
      }).select('email')
    ]);

    const emailSet = new Set();
    users.forEach(user => emailSet.add(user.email));
    emailSubscriptions.forEach(sub => emailSet.add(sub.email));

    res.status(200).json({
      success: true,
      stats: {
        totalCustomers: userCount,
        totalSubscriptions: subscriptionCount,
        uniqueEmails: emailSet.size,
        activeSubscriptions: subscriptionCount
      }
    });

  } catch (error) {
    console.error('Error getting campaign stats:', error);
    return next(new AppError('Failed to get campaign statistics', 500));
  }
});

module.exports = {
  sendMassEmail,
  getCampaignStats
};