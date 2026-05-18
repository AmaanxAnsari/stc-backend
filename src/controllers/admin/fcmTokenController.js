import FCMToken from '../../models/admin/fcmTokenModel.js';
import { createRepository } from '../../utils/repository.js';

const fcmTokenRepo = createRepository(FCMToken, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});

// ✅ Register or Update FCM Token
export const registerFCMToken = async (req, res) => {
  try {
    const { fcmToken, deviceId, platform, deviceInfo } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User info missing.',
      });
    }

    // Validation
    if (!fcmToken || typeof fcmToken !== 'string' || !fcmToken.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: fcmToken is required.',
      });
    }

    if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: deviceId is required.',
      });
    }

    if (!platform || !['ios', 'android'].includes(platform.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message:
          'Validation error: platform must be either "ios" or "android".',
      });
    }

    const userId = req.user.id;

    // Check if token already exists for this user + device
    let existingToken = await FCMToken.findOne({
      userId,
      deviceId: deviceId.trim(),
    });

    if (existingToken) {
      // Update existing token
      existingToken.fcmToken = fcmToken.trim();
      existingToken.platform = platform.toLowerCase();
      existingToken.isValid = true;
      existingToken.isActive = true;
      existingToken.failedAttempts = 0;
      existingToken.lastFailedAt = null;

      if (deviceInfo) {
        existingToken.deviceInfo = {
          brand: deviceInfo.brand || existingToken.deviceInfo?.brand,
          model: deviceInfo.model || existingToken.deviceInfo?.model,
          systemVersion:
            deviceInfo.systemVersion || existingToken.deviceInfo?.systemVersion,
          appVersion:
            deviceInfo.appVersion || existingToken.deviceInfo?.appVersion,
        };
      }

      await existingToken.save();

      console.log(
        `✅ FCM Token updated for user ${userId}, device ${deviceId}`,
      );

      return res.status(200).json({
        success: true,
        message: 'FCM token updated successfully.',
        data: existingToken,
      });
    }

    // Create new token entry
    const newToken = new FCMToken({
      userId,
      fcmToken: fcmToken.trim(),
      deviceId: deviceId.trim(),
      platform: platform.toLowerCase(),
      deviceInfo: deviceInfo || {},
      isValid: true,
      isActive: true,
    });

    await newToken.save();

    console.log(
      `✅ FCM Token registered for user ${userId}, device ${deviceId}`,
    );

    return res.status(201).json({
      success: true,
      message: 'FCM token registered successfully.',
      data: newToken,
    });
  } catch (error) {
    if (error && (error.code === 11000 || error.code === 11001)) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate token entry. This should not happen.',
      });
    }
    console.error('Register FCM token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. ' + error.message,
    });
  }
};

// ✅ Get all FCM tokens for a user
export const getUserFCMTokens = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User info missing.',
      });
    }

    const tokens = await FCMToken.find({
      userId: req.user.id,
      isDeleted: false,
    })
      .sort({ updatedAt: -1 })
      .select('-__v');

    return res.status(200).json({
      success: true,
      message: 'FCM tokens fetched successfully.',
      total: tokens.length,
      data: tokens,
    });
  } catch (error) {
    console.error('Get user FCM tokens error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. ' + error.message,
    });
  }
};

// ✅ Get all FCM tokens (Admin only)
export const getAllFCMTokens = async (req, res) => {
  try {
    let { page = 1, limit = 10, q, platform, isValid } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    // 🔍 Filters
    const filter = {};

    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { deviceId: regex },
        { 'deviceInfo.brand': regex },
        { 'deviceInfo.model': regex },
      ];
    }

    if (platform) {
      filter.platform = platform.toLowerCase();
    }

    if (isValid !== undefined) {
      filter.isValid = isValid === 'true';
    }

    const sortObj = { createdAt: -1 };

    const result = await fcmTokenRepo.getAll({
      filter,
      sort: sortObj,
      page,
      limit,
      projection: {},
      populate: [{ path: 'userId', select: 'name email phone role' }],
    });

    return res.status(200).json({
      success: true,
      status: 200,
      message: 'FCM tokens fetched successfully',
      page,
      limit,
      total: result.total || 0,
      data: result.data || [],
    });
  } catch (err) {
    console.error('GetAllFCMTokens error:', err);
    return res.status(500).json({
      success: false,
      status: 500,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};

// ✅ Mark token as invalid (when notification fails)
export const markTokenInvalid = async (req, res) => {
  try {
    const { tokenId } = req.params;

    const token = await FCMToken.findById(tokenId);
    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found.',
      });
    }

    token.isValid = false;
    token.failedAttempts += 1;
    token.lastFailedAt = new Date();

    await token.save();

    console.log(`⚠️ FCM Token marked invalid: ${tokenId}`);

    return res.status(200).json({
      success: true,
      message: 'Token marked as invalid.',
      data: token,
    });
  } catch (error) {
    console.error('Mark token invalid error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. ' + error.message,
    });
  }
};

// ✅ Hard Delete FCM token (logout or device removal)
export const deleteFCMToken = async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User info missing.',
      });
    }

    const deleted = await FCMToken.findOneAndDelete({
      userId: req.user.id,
      deviceId,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Token not found for this device.',
      });
    }

    console.log(`🗑️ FCM Token HARD DELETED for user ${req.user.id}, device ${deviceId}`);

    return res.status(200).json({
      success: true,
      message: 'FCM token deleted successfully.',
    });
  } catch (error) {
    console.error('Delete FCM token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. ' + error.message,
    });
  }
};


// ✅ Get FCM tokens by User ID (for sending targeted notifications)
export const getTokensByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const tokens = await FCMToken.find({
      userId,
      isValid: true,
      isActive: true,
      isDeleted: false,
    }).select('fcmToken platform deviceInfo');

    return res.status(200).json({
      success: true,
      message: 'Active FCM tokens fetched successfully.',
      total: tokens.length,
      data: tokens,
    });
  } catch (error) {
    console.error('Get tokens by userId error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. ' + error.message,
    });
  }
};
