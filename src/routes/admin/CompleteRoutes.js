import express from 'express';

import {
  getAllCompletedOrders,
  getCompletedOrderById,
  updateCompletedItemWeight,
  finishAndArchiveOrder,
  viewDeliveryChallan,
} from '../../controllers/admin/CompletedController.js';

const router = express.Router();

// ======================================================
// GET
// ======================================================
router.get('/', getAllCompletedOrders);

router.get('/:id', getCompletedOrderById);

// ======================================================
// UPDATE WEIGHT
// ======================================================
router.put('/update-weight/:orderId/:itemId', updateCompletedItemWeight);

// ======================================================
// FINISH & ARCHIVE
// ======================================================
router.put('/finish-archive/:orderId', finishAndArchiveOrder);

// ======================================================
// VIEW DELIVERY CHALLAN
// ======================================================
router.get('/view-delivery-challan/:orderId', viewDeliveryChallan);

export default router;
