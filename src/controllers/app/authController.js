import bcrypt from 'bcryptjs';
import logger from './../../logs/logger.js';
import { generateToken } from '../../utils/jwtUtils.js';
import { Consumer } from '../../models/app/consumerModel.js';
import { User } from '../../models/app/user.js';
import OtpApp from '../../models/app/otpModel.js';
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import admin from 'firebase-admin';


dotenv.config();


// export const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: 'Email and password are required.',
//       });
//     }

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         type: 'email',
//         message: 'Invalid Email.',
//       });
//     }

//     // 🧩 Roles exempted from verification & document checks
//     const exemptedRoles = ['consumer', 'delivery_officer'];

//     // 🧠 Apply verification & documentation checks only for non-exempted roles
//     if (!exemptedRoles.includes(user.role)) {
//       // 1️⃣ Check if user is verified
//       if (!user.isVerified) {
//         return res.status(403).json({
//           success: false,
//           type: 'verification',
//           message:
//             'Your account is pending approval. Please wait until admin approves it.',
//         });
//       }

//       // 2️⃣ Check documentation status (if applicable)
//       if (user.documentStatus && user.documentStatus !== 'approved') {
//         return res.status(403).json({
//           success: false,
//           type: 'documentation',
//           message:
//             'Your documentation is not approved. Please complete or update it.',
//         });
//       }
//     }

//     // 🛑 Account status checks (apply to all roles)
//     if (!user.isActive) {
//       return res.status(403).json({
//         success: false,
//         type: 'inactive',
//         message: 'Your account is inactive. Please contact support.',
//       });
//     }

//     if (user.isDeleted) {
//       return res.status(403).json({
//         success: false,
//         type: 'deleted',
//         message: 'Your account has been deleted. Please contact support.',
//       });
//     }

//     // 🔐 Password check
//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       return res.status(401).json({
//         success: false,
//         type: 'password',
//         message: 'Invalid Password.',
//       });
//     }

//     // 🎟 Generate tokens
//     const accessPayload = {
//       id: user._id,
//       fullName: user.fullName,
//       email: user.email,
//       mobile: user.mobile,
//       role: user.role,
//       isActive: user.isActive,
//     };

//     const refreshPayload = {
//       id: user._id,
//       role: user.role,
//       tokenType: 'refresh',
//     };

//     const accessToken = generateToken(accessPayload); // 1 day
//     const refreshToken = generateToken(refreshPayload, '7d'); // 7 days

//     // ✅ Successful response
//     return res.status(200).json({
//       success: true,
//       message: 'Login successful.',
//       data: {
//         accessToken,
//         refreshToken,
//         user: {
//           _id: user._id,
//           role: user.role,
//           fullName: user.fullName,
//           email: user.email,
//           mobile: user.mobile,
//           isActive: user.isActive,
//           isVerified: user.isVerified,
//           documentStatus: user.documentStatus,
//           profileImage: user.profileImage || null,
//           addresses: user.addresses || [],
//           createdAt: user.createdAt,
//           updatedAt: user.updatedAt,
//         },
//       },
//     });
//   } catch (error) {
//     logger.error('Error during login:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error during login.',
//     });
//   }
// };


export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        type: 'email',
        message: 'Invalid Email.',
      });
    }

    // 🔒 Check if user signed up with Google
    if (user.authType === 'google') {
      return res.status(400).json({
        success: false,
        type: 'google',
        message:
          'This account uses Google Sign-In. Please use "Sign in with Google" button.',
      });
    }

    // 🧩 Roles exempted from verification & document checks
    const exemptedRoles = ['consumer', 'delivery_officer'];

    if (!exemptedRoles.includes(user.role)) {
      if (!user.isVerified) {
        return res.status(403).json({
          success: false,
          type: 'verification',
          message:
            'Your account is pending approval. Please wait until admin approves it.',
        });
      }

      if (user.documentStatus && user.documentStatus !== 'approved') {
        return res.status(403).json({
          success: false,
          type: 'documentation',
          message:
            'Your documentation is not approved. Please complete or update it.',
        });
      }
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        type: 'inactive',
        message: 'Your account is inactive. Please contact support.',
      });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        type: 'deleted',
        message: 'Your account has been deleted. Please contact support.',
      });
    }

    // 🔐 Password check
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        type: 'password',
        message: 'Invalid Password.',
      });
    }

    // 🎟 Generate tokens (rest of your existing code...)
    const accessPayload = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      isActive: user.isActive,
      authType: user.authType,
    };

    const refreshPayload = {
      id: user._id,
      role: user.role,
      tokenType: 'refresh',
    };

    const accessToken = generateToken(accessPayload);
    const refreshToken = generateToken(refreshPayload, '7d');

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        accessToken,
        refreshToken,
        user: {
          _id: user._id,
          role: user.role,
          fullName: user.fullName,
          email: user.email,
          mobile: user.mobile,
          authType: user.authType,
          isActive: user.isActive,
          isVerified: user.isVerified,
          documentStatus: user.documentStatus,
          profileImage: user.profileImage || null,
          addresses: user.addresses || [],
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Error during login:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login.',
    });
  }
};

export const googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase ID token is required.',
      });
    }

    // ✅ Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      logger.error('Firebase token verification failed:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid Firebase token.',
      });
    }

    const { uid, email, name, picture } = decodedToken;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email not provided by Google.',
      });
    }

    // 🔍 Check if user already exists
    let user = await User.findOne({
      $or: [{ email: email }, { googleProviderId: uid }],
    });

    if (user) {
      // 🔄 EXISTING USER - Update Google info if needed

      if (!user.googleProviderId) {
        // User exists with email/password, link Google account
        user.googleProviderId = uid;
        user.authType = 'google';
        if (picture && !user.profileImage) {
          user.profileImage = picture;
        }
        await user.save();
        logger.info(`Linked Google account for user: ${user.email}`);
      }

      // 🛑 Account status checks
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          type: 'inactive',
          message: 'Your account is inactive. Please contact support.',
        });
      }

      if (user.isDeleted) {
        return res.status(403).json({
          success: false,
          type: 'deleted',
          message: 'Your account has been deleted. Please contact support.',
        });
      }

      // ⚠️ Role check - Only consumers can use Google Sign-In
      if (user.role !== 'consumer') {
        return res.status(403).json({
          success: false,
          message:
            'Google Sign-In is only available for consumers. Please use email/password login.',
        });
      }
    } else {
      // ✨ NEW USER - Auto-register as consumer

      user = await Consumer.create({
        fullName: name || 'Google User',
        email: email,
        mobile: null, // Can be added later by user
        authType: 'google',
        googleProviderId: uid,
        profileImage: picture || null,
        role: 'consumer',
        isVerified: true, // Google users are pre-verified
        password: null, // No password for Google users
      });

      logger.info(`New consumer registered via Google: ${email}`);
    }

    // 🎟 Generate tokens
    const accessPayload = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      isActive: user.isActive,
      authType: user.authType,
    };

    const refreshPayload = {
      id: user._id,
      role: user.role,
      tokenType: 'refresh',
    };

    const accessToken = generateToken(accessPayload);
    const refreshToken = generateToken(refreshPayload, '7d');

    // ✅ Success response
    return res.status(200).json({
      success: true,
      message: user.isNew
        ? 'Account created successfully.'
        : 'Login successful.',
      isNewUser:
        !user.createdAt ||
        Date.now() - new Date(user.createdAt).getTime() < 5000, // Created in last 5 seconds
      data: {
        accessToken,
        refreshToken,
        user: {
          _id: user._id,
          role: user.role,
          fullName: user.fullName,
          email: user.email,
          mobile: user.mobile,
          authType: user.authType,
          isActive: user.isActive,
          isVerified: user.isVerified,
          profileImage: user.profileImage || null,
          addresses: user.addresses || [],
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Error during Google Sign-In:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during Google Sign-In.',
      error: error.message,
    });
  }
};



export const resetPassword = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        type: 'email',
        message: 'User not found.',
      });
    }

    // 🧩 Roles exempted from verification & document checks
    const exemptedRoles = ['consumer', 'delivery_officer'];

    // 🔐 Account status check — applies to all users
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        type: 'inactive',
        message: 'Your account is inactive. Please contact support.',
      });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        type: 'deleted',
        message: 'Your account has been deleted. Please contact support.',
      });
    }

    // 🧠 Verification & document status checks (only for non-exempted roles)
    if (!exemptedRoles.includes(user.role)) {
      if (!user.isVerified) {
        return res.status(403).json({
          success: false,
          type: 'verification',
          message:
            'Your account is pending admin approval. Please wait until it is verified.',
        });
      }

      if (user.docStatus && user.docStatus !== 'approved') {
        return res.status(403).json({
          success: false,
          type: 'documentation',
          message:
            'Your documentation is not approved. Please complete or update it before proceeding.',
        });
      }
    }

    // 🧾 Check OTP verification before allowing password reset
    const otpRecord = await OtpApp.findOne({ email });
    if (!otpRecord || !otpRecord.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'OTP verification required before resetting password.',
      });
    }

    // 🔑 Hash and update password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    // 🧹 Clean up verified OTP record
    await OtpApp.deleteOne({ _id: otpRecord._id });

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully.',
    });
  } catch (error) {
    logger.error('Reset Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset.',
    });
  }
};

/* --------------------------- CHANGE PASSWORD --------------------------- */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'All password fields are required.',
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user || user.role !== 'consumer') {
      return res.status(404).json({
        success: false,
        message: 'Consumer not found.',
      });
    }

    const isCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match.',
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    logger.error('Change Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password change.',
    });
  }
};

/* --------------------------- REFRESH TOKEN --------------------------- */
export const refreshUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || user.role !== 'consumer') {
      return res
        .status(404)
        .json({ success: false, message: 'User not found or deleted.' });
    }

    const payload = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
    };

    const newToken = generateToken(payload);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      accessToken: newToken,
      user,
    });
  } catch (error) {
    logger.error('Refresh Token Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required.',
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired refresh token.',
      });
    }

    // Check if it's actually a refresh token
    if (decoded.tokenType !== 'refresh') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token type.',
      });
    }

    // Get fresh user data from database
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Check if user is still active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive.',
      });
    }

    // Generate new access token with updated user data
    const accessPayload = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      isActive: user.isActive,
    };

    const newAccessToken = generateToken(accessPayload); // 1 day

    // Generate new refresh token (token rotation)
    const refreshPayload = {
      id: user._id,
      role: user.role,
      tokenType: 'refresh',
    };
    const newRefreshToken = generateToken(refreshPayload, '7d');

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          _id: user._id,
          role: user.role,
          fullName: user.fullName,
          email: user.email,
          mobile: user.mobile,
          isActive: user.isActive,
          isVerified: user.isVerified,
          profileImage: user.profileImage || null,
          addresses: user.addresses || [],
        },
      },
    });
  } catch (error) {
    logger.error('Error during token refresh:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token refresh.',
    });
  }
};




// Payment Gateway

