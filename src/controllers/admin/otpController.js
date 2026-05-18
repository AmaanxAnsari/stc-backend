import { generate4DigitOTP, generateOTP, getOtpExpirationTime } from "../../helper/otp.js";
import AdminUser from "../../models/admin/adminUser.js";
import Otp from "../../models/admin/otpModel.js";
import { sendOtpEmail } from './../../utils/nodemailer.js';




export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    console.log(req.body)

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required to send OTP.',
      });
    }

    const existingUser = await AdminUser.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User with this email not found.',
      });
    }

    // Prevent spamming (check for unexpired OTP)
    const recentOtp = await Otp.findOne({
      email,
      expiresAt: { $gt: Date.now() }
    });

    if (recentOtp) {
      return res.status(429).json({
        success: false,
        message: 'An OTP has already been sent. Please wait before requesting another.',
      });
    }

    const otpCode = generate4DigitOTP();
    const expiresAt = getOtpExpirationTime();

    // Cleanup old unverified OTPs
    await Otp.deleteMany({ email, isVerified: false });

    const newOtp = new Otp({
      email,
      otp: otpCode,
      expiresAt,
    });

    await newOtp.save();
    await sendOtpEmail(email, otpCode);

    return res.status(200).json({
      success: true,
      message: `OTP sent successfully to ${email}.`,
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


// export const verifyOtp = async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     if (!email || !otp) {
//       return res.status(400).json({
//         success: false,
//         message: 'Email and OTP are required for verification.',
//       });
//     }

//     const storedOtp = await Otp.findOne({ email });

//     if (!storedOtp) {
//       return res.status(404).json({
//         success: false,
//         message: 'No OTP found for this email.',
//       });
//     }

//     if (storedOtp.expiresAt < Date.now()) {
//       await Otp.deleteOne({ _id: storedOtp._id });
//       return res.status(400).json({
//         success: false,
//         message: 'OTP has expired. Please request a new one.',
//       });
//     }

//     if (storedOtp.isVerified) {
//       return res.status(400).json({
//         success: false,
//         message: 'This OTP has already been used.',
//       });
//     }

//     if (otp !== storedOtp.otp) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid OTP.',
//       });
//     }

//     // Optionally mark verified or just delete
//     await Otp.deleteOne({ _id: storedOtp._id });

//     return res.status(200).json({
//       success: true,
//       message: 'OTP verified successfully.',
//     });

//   } catch (error) {
//     console.error('Error verifying OTP:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error while verifying OTP.',
//       error: error.message,
//     });
//   }
// };



export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required for verification.',
      });
    }

    const storedOtp = await Otp.findOne({ email });

    if (!storedOtp) {
      return res.status(404).json({
        success: false,
        message: 'No OTP found for this email.',
      });
    }

    if (storedOtp.expiresAt < Date.now()) {
      await Otp.deleteOne({ _id: storedOtp._id });
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
