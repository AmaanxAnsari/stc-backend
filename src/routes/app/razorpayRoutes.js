import express from 'express';
import authMiddleware from '../../middleware/auth.js';
import { createPaymentLink, createRazorpayOrder, createUpiQrCode, getPaymentLinkStatus, getQrCodeStatus, simulateQrPayment, verifyRazorpayPayment } from '../../controllers/app/razorpayController.js';

const router = express.Router();

// Create Razorpay order
router.post('/create-order', authMiddleware, createRazorpayOrder);

// Verify payment after success
router.post('/verify-payment', authMiddleware, verifyRazorpayPayment);
router.post('/create-payment-link', authMiddleware, createPaymentLink);
router.post('/create-qr-code', authMiddleware, createUpiQrCode);
router.get('/payment-link/:paymentLinkId', authMiddleware, getPaymentLinkStatus);
router.post('/simulate-qr-payment/:qrCodeId', authMiddleware, simulateQrPayment);
router.get('/qr-code/:qrCodeId', authMiddleware, getQrCodeStatus);

export default router;
