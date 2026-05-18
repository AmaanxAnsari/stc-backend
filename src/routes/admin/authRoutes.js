import express from 'express';

import {
  changePassword,
  login,
  refreshUser,
  resetPassword,
} from './../../controllers/admin/authController.js';
import { sendOtp, verifyOtp } from '../../controllers/admin/otpController.js';
import authMiddleware from '../../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/reset-password', resetPassword);
router.post('/change-password', authMiddleware, changePassword);
router.get('/refresh', authMiddleware, refreshUser);

////OTP Related Routes/////
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

export default router;
