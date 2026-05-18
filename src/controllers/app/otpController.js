import OtpApp from '../../models/app/otpModel.js';
import { User } from "../../models/app/user.js";
import { sendOtpEmail } from '../../utils/nodemailer.js';
import { generate4DigitOTP, getOtpExpirationTime } from './../../helper/otp.js';




// export const sendOtp = async (req, res) => {
//   try {
//     const { email } = req.body;
//     console.log(req.body)

//     if (!email) {
//       return res.status(400).json({
//         success: false,
//         message: 'Email is required to send OTP.',
//       });
//     }

//     const existingUser = await User.findOne({ email });
//     if (!existingUser) {
//       return res.status(404).json({
//         success: false,
//         message: 'User with this email not found.',
//       });
//     }

//     // Prevent spamming (check for unexpired OTP)
//     const recentOtp = await OtpApp.findOne({
//       email,
//       expiresAt: { $gt: Date.now() },
//     });

//     if (recentOtp) {
//       return res.status(429).json({
//         success: false,
//         message: 'An OTP has already been sent. Please wait before requesting another.',
//       });
//     }

//     const otpCode = generate4DigitOTP();
//     const expiresAt = getOtpExpirationTime();

//     // Cleanup old unverified OTPs
//     await OtpApp.deleteMany({ email, isVerified: false });

//     const newOtp = new OtpApp({
//       email,
//       otp: otpCode,
//       expiresAt,
//     });

//     await newOtp.save();
//     await sendOtpEmail(email, otpCode);

//     return res.status(200).json({
//       success: true,
//       message: `OTP sent successfully !.`,
//     });

//   } catch (error) {
//     console.error('Error sending OTP:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error while sending OTP.',
//       error: error.message,
//     });
//   }
// };



// export const sendOtp = async (req, res) => {
//   try {
//     const { email } = req.body;
//     console.log(req.body);

//     if (!email) {
//       return res.status(400).json({
//         success: false,
//         message: 'Email is required to send OTP.',
//       });
//     }

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         type: 'email',
//         message: 'User with this email not found.',
//       });
//     }

//     // 1️⃣ Check if role is NOT consumer and isVerified is false (pending approval)
//     if (user.role !== 'consumer' && !user.isVerified) {
//       return res.status(403).json({
//         success: false,
//         type: 'verification',
//         message:
//           'Your account is pending admin approval. Please wait until it is verified.',
//       });
//     }

//     // 2️⃣ Check if account is inactive or deleted
//     if (!user.isActive || user.isDeleted) {
//       return res.status(403).json({
//         success: false,
//         type: 'inactive',
//         message: 'Your account is inactive or deleted. Please contact support.',
//       });
//     }

//     // Prevent OTP spamming
//     const recentOtp = await OtpApp.findOne({
//       email,
//       expiresAt: { $gt: Date.now() },
//     });

//     if (recentOtp) {
//       return res.status(429).json({
//         success: false,
//         message:
//           'An OTP has already been sent. Please wait before requesting another.',
//       });
//     }

//     const otpCode = generate4DigitOTP();
//     const expiresAt = getOtpExpirationTime();

//     // Cleanup old unverified OTPs
//     await OtpApp.deleteMany({ email, isVerified: false });

//     const newOtp = new OtpApp({
//       email,
//       otp: otpCode,
//       expiresAt,
//     });

//     await newOtp.save();
//     await sendOtpEmail(email, otpCode);

//     return res.status(200).json({
//       success: true,
//       message: 'OTP sent successfully!',
//     });
//   } catch (error) {
//     console.error('Error sending OTP:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error while sending OTP.',
//       error: error.message,
//     });
//   }
// };

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required to send OTP.',
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        type: 'email',
        message: 'User with this email not found.',
      });
    }

    // 🧩 Roles exempted from verification & document checks
    const exemptedRoles = ['consumer', 'delivery_officer'];

    // 🛑 Account status checks (apply to all)
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

    // 🧠 Verification & document checks (only for non-exempted roles)
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

    // ⏳ Prevent OTP spamming (still valid OTP not expired)
    const recentOtp = await OtpApp.findOne({
      email,
      expiresAt: { $gt: Date.now() },
    });

    if (recentOtp) {
      return res.status(429).json({
        success: false,
        message:
          'An OTP has already been sent. Please wait before requesting another.',
      });
    }

    // 🔢 Generate new OTP
    const otpCode = generate4DigitOTP();
    const expiresAt = getOtpExpirationTime();

    // 🧹 Cleanup old unverified OTPs
    await OtpApp.deleteMany({ email, isVerified: false });

    // 💾 Save new OTP record
    const newOtp = new OtpApp({
      email,
      otp: otpCode,
      expiresAt,
    });

    await newOtp.save();
    await sendOtpEmail(email, otpCode);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully!',
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending OTP.',
      error: error.message,
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required for verification.',
      });
    }

    const storedOtp = await OtpApp.findOne({ email });

    if (!storedOtp) {
      return res.status(404).json({
        success: false,
        message: 'No OTP found for this email.',
      });
    }

    if (storedOtp.expiresAt < Date.now()) {
      await OtpApp.deleteOne({ _id: storedOtp._id });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    if (storedOtp.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'This OTP has already been used.',
      });
    }

    if (otp !== storedOtp.otp) {
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP.',
      });
    }

    // ✅ Mark OTP as verified instead of deleting it
    storedOtp.isVerified = true;
    await storedOtp.save();

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while verifying OTP.',
      error: error.message,
    });
  }
};
