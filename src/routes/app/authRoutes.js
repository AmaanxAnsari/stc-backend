import express from 'express';
import {
  login,
  resetPassword,
  changePassword,
  refreshUser,
  refreshToken,
  googleSignIn,
} from '../../controllers/app/authController.js';
import authMiddleware from '../../middleware/auth.js';
import { sendOtp, verifyOtp } from '../../controllers/app/otpController.js';

const router = express.Router();

router.post('/login', login);
router.post('/google-signin', googleSignIn); 
router.post('/reset-password', resetPassword);
router.post('/change-password', authMiddleware, changePassword);
router.post('/refresh',  refreshToken);
// router.get('/refresh', authMiddleware, refreshUser);






// OTP Routes
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

export default router;
