// import express from 'express';
// import authMiddleware from '../../middleware/auth.js';
// import { hasPermission } from '../../middleware/permission.js';
// import {
//   sendNotificationToUser,
//   sendBroadcastNotification,
//   getUserNotifications,
//   markNotificationAsRead,
//   markAllAsRead,
// } from '../../controllers/admin/notificationController.js';

// const router = express.Router();

// // User routes
// router.get('/my-notifications', authMiddleware, getUserNotifications);
// router.put('/read/:notificationId', authMiddleware, markNotificationAsRead);
// router.put('/read-all', authMiddleware, markAllAsRead);

// // Admin routes
// router.post(
//   '/send',
//   hasPermission('Notifications'),
//   sendNotificationToUser,
// );
// router.post(
//   '/broadcast',
//   hasPermission('Notifications'),
//   sendBroadcastNotification,
// );

// export default router;
import express from 'express';
import authMiddleware from '../../middleware/auth.js';
import { hasPermission } from '../../middleware/permission.js';
import {
  sendNotificationToUser,
  sendBroadcastNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllAsRead,
  sendTemplatedUserNotification,
  sendTemplatedAdminNotification,
} from '../../controllers/admin/notificationController.js';

const router = express.Router();

// ==================== USER ROUTES ====================
router.get('/my-notifications', authMiddleware, getUserNotifications);
router.put('/read/:notificationId', authMiddleware, markNotificationAsRead);
router.put('/read-all', authMiddleware, markAllAsRead);

// ==================== ADMIN ROUTES ====================

// Basic notifications (no templates)
router.post(
  '/send',
  authMiddleware,
  sendNotificationToUser,
);

router.post(
  '/broadcast',
  hasPermission('Notifications'),
  sendBroadcastNotification,
);

// Template-based notifications (NEW)
router.post(
  '/send-templated-user',
  authMiddleware,
  sendTemplatedUserNotification,
);

router.post(
  '/send-templated-admin',
  hasPermission('Notifications'),
  sendTemplatedAdminNotification,
);

export default router;
