import express from 'express';
import {
  cancelOrder,
  completeRoute,
  generateOTP,
  getAllRoutes,
  getRouteById,
  getRouteForDriver,
  markOrderDelivered,
  startRoute,
  verifyOTP,
} from '../../controllers/app/deliveryRouteController.js';
import authMiddleware from '../../middleware/auth.js';
import { uploadDisk } from './../../middleware/multer.js';

const router = express.Router();

// Driver routes

router.get('/all', authMiddleware, getAllRoutes);
router.get('/:routeId', authMiddleware, getRouteById);
router.get('/', authMiddleware, getRouteForDriver);

// Route Management
router.post('/routes/:routeId/start', authMiddleware, startRoute);
router.post('/routes/:routeId/complete', authMiddleware, completeRoute);

// OTP Management
router.post('/orders/generate-otp', authMiddleware, generateOTP);
router.post('/orders/verify-otp', authMiddleware, verifyOTP);

router.put('/cancel', authMiddleware, cancelOrder);
router.put('/delivered', authMiddleware, uploadDisk.any(), markOrderDelivered);

export default router;
