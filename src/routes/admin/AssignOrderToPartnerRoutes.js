import express from 'express';
import { assignOrderToPartner, getPartnersForOrderLocation } from '../../controllers/admin/AssignOrderToPartnerController.js';
import { hasPermission } from '../../middleware/permission.js';

const router = express.Router();

/**
 * ADMIN: Assign order to partner
 * POST /assign-order-to-partner
 * Body: { orderId, orderType, partnerId }
 */
router.post(
  '/assign-order-to-partner',
  hasPermission('Delivery Routes'),
  assignOrderToPartner,
);

router.get(
  '/for-order/:orderId',
  hasPermission('Delivery Routes'),
  getPartnersForOrderLocation,
);


export default router;
