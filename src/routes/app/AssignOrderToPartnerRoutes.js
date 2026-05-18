import express from 'express';
import { acceptAssignedOrder, getAssignedOrdersForPartner, rejectAssignedOrder } from '../../controllers/app/AssignOrderToPartnerController.js';
import authMiddleware from '../../middleware/auth.js';

const router = express.Router();



/**
 * PARTNER: Get assigned orders for logged-in partner
 * GET /partner/assigned-orders?status=assigned|accepted|rejected
 *
 * NOTE: Put this in partner routes if you have separate partner router.
 * Keeping here only because you asked "controller and routes".
 */
router.get(
  '/assigned-orders',
  authMiddleware, // change permission key to whatever you use for partner
 getAssignedOrdersForPartner,
);

/**
 * PARTNER: Accept assigned order
 * POST /partner/accept-assigned-order
 * Body: { orderId, orderType }
 */
router.post(
  '/accept-assigned-order',
  authMiddleware,
  acceptAssignedOrder,
);

/**
 * PARTNER: Reject assigned order
 * POST /partner/reject-assigned-order
 * Body: { orderId, orderType, rejectionReason }
 */
router.post(
  '/reject-assigned-order',
  authMiddleware,
 rejectAssignedOrder,
);

export default router;
