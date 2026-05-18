import bcrypt from 'bcryptjs';
import AdminUser  from './../../models/admin/adminUser.js';
import { generateToken } from '../../utils/jwtUtils.js';
import Otp from '../../models/admin/otpModel.js';
import logger from './../../logs/logger';


export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // const  image  = req.file.filename;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Check if user exists
    const existingUser = await AdminUser.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        type: 'email',
        message: 'Invalid Email',
      });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password,
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        type: 'password',
        message: 'Invalid Password',
      });
    }

    const payload = {
      id: existingUser._id,
      name: existingUser.name,
      email: existingUser.email,
      phone: existingUser?.phone || '',
      address: existingUser?.address || '',
      permissions: existingUser.permissions,
      profile_image: existingUser.profile_image,
      role: existingUser.role,
      is_active: existingUser.is_active,
    };

    // Generate JWT token
    const token = generateToken(payload);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: token,
        existingUser,
      },
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    res
      .status(500)
      .json({ success: false, message: 'Server error', error: error.message });
  }
};

export const resetPassword = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and new password are required.',
      });
    }

    // 2. Find the user
    const user = await AdminUser.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // 3. Check if the OTP is verified
    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord || !otpRecord.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'OTP verification required before resetting password.',
      });
    }

    // 4. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;

    // 5. Save user and delete OTP record
    await user.save();
    await Otp.deleteOne({ _id: otpRecord._id });

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully.',
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during password reset.',
    });
  }
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  try {
    // 1. Validate input
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'All password fields are required.',
      });
    }

    // 2. Get user with password field
    const user = await AdminUser.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // 3. Check if current password is correct
    const isCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    // 4. Check if new password matches confirmation
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match.',
      });
    }

    // 5. Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // 6. Optionally: re-login user
    // If you use JWT, call your createSendToken utility here
    // createSendToken(user, 200, res);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during password change.',
    });
  }
};

export const refreshUser = async (req, res) => {
  try {
    // req.user is set by JWT auth middleware
    const userId = req.user.id;

    const user = await AdminUser.findById(userId);

    if (!user || user.is_deleted) {
      return res.status(404).json({
        success: false,
        message: 'User not found or deleted',
      });
    }

    // Create fresh payload for token
    const payload = {
      id: user._id,
      name: user.name,
      email: user.email,
      profile_image: user.profile_image,
      phone: user?.phone || '',
      address: user?.address || '',
      role: user.role,
      permissions: user.permissions,
      is_active: user.is_active,
    };

    const newToken = generateToken(payload);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken: newToken,
      // data: payload,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};


