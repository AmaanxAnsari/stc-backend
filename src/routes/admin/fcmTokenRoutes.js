import express from 'express';
import authMiddleware from '../../middleware/auth.js';
import { hasPermission } from '../../middleware/permission.js';
import {
  registerFCMToken,
  getUserFCMTokens,
  getAllFCMTokens,
  markTokenInvalid,
  deleteFCMToken,
  getTokensByUserId,
} from '../../controllers/admin/fcmTokenController.js';

const router = express.Router();

// 📱 User routes (authenticated users)
router.post('/register', authMiddleware, registerFCMToken);
router.get('/my-tokens', authMiddleware, getUserFCMTokens);
router.delete('/device/:deviceId', authMiddleware, deleteFCMToken);

// 🔧 Admin routes (requires admin permission)
router.get(
  '/all',
  hasPermission('Notifications'),
  getAllFCMTokens,
);
router.get(
  '/user/:userId',
  hasPermission('Notifications'),
  getTokensByUserId,
);
router.put(
  '/invalid/:tokenId',
  hasPermission('Notifications'),
  markTokenInvalid,
);

export default router;
