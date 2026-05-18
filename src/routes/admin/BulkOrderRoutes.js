import express from 'express';
import { hasPermission } from '../../middleware/permission.js';
import { addProductsToBulkOrder, cancelBulkOrderAdmin, confirmBulkOrder, dispatchBulkOrder, getAllBulkOrders, getBulkOrderById, markAsDelivered, removeProductFromBulkOrder, updateBulkOrderProductQty } from '../../controllers/admin/BulkOrderController.js';

const router = express.Router();

// Get all bulk orders
router.get('/', hasPermission('Orders'), getAllBulkOrders);

// Get single bulk order by ID
router.get('/:id',hasPermission('Orders'), getBulkOrderById);

// Add products to bulk order
router.post(
  '/:id/products',
  hasPermission('Orders'),
  addProductsToBulkOrder,
);

// Confirm bulk order (move reserved to sold)
router.put(
  '/:id/confirm',
  hasPermission('Orders'),
  confirmBulkOrder,
);

// 2. Update product quantity
router.put('/:id/products/update', hasPermission('Orders'), updateBulkOrderProductQty);

// 3. Remove product
router.put('/:id/products/remove', hasPermission('Orders'), removeProductFromBulkOrder);

// Mark as packed
// router.put('/:id/pack',hasPermission('Orders'), markAsPacked);

// Dispatch order (assign delivery officer and mark out for delivery)
router.put(
  '/:id/dispatch',
  hasPermission('Orders'),
  dispatchBulkOrder,
);

// Mark as delivered
router.put(
  '/:id/deliver',
  hasPermission('Orders'),
  markAsDelivered,
);

// Cancel bulk order
router.put(
  '/:id/cancel',
  hasPermission('Orders'),
  cancelBulkOrderAdmin,
);

export default router;
