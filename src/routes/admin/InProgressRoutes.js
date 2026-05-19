
import express from 'express';

import {
  getAllOrders,
  getOrderById,
  getAllInProcessOrders,
  updateItemUnit,
  updateItemMachine,
  updateItemOperator,
  markItemDone,
  moveSelectedItemsToQC,
  moveAllItemsToQC,
} from '../../controllers/admin/InProgressController.js';

const router = express.Router();

// ======================================================
// GET
// ======================================================
router.get('/all-orders', getAllOrders);

router.get('/inprocess-orders', getAllInProcessOrders);

router.get('/:id', getOrderById);

// ======================================================
// LIVE UPDATE APIs
// ======================================================
router.put('/update-unit/:orderId/:itemId', updateItemUnit);

router.put('/update-machine/:orderId/:itemId', updateItemMachine);

router.put('/update-operator/:orderId/:itemId', updateItemOperator);

router.put('/mark-done/:orderId/:itemId', markItemDone);

// ======================================================
// MOVE TO QC
// ======================================================
router.put('/move-selected-to-qc/:orderId', moveSelectedItemsToQC);

router.put('/move-all-to-qc/:orderId', moveAllItemsToQC);

export default router;
