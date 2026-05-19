// routes/admin/qualityCheckRoutes.js

import express from 'express';

import {
    generateDeliveryChallan,
  getAllQCOrders,
  getQCOrderById,
  moveAllToCompleted,
  updateItemWeight,
} from '../../controllers/admin/qualityCheckController.js';

const router = express.Router();

// ======================================================
// GET ALL QC ORDERS
// ======================================================
router.get('/', getAllQCOrders);
// ======================================================
// UPDATE ITEM WEIGHT
// ======================================================
router.put(
  '/update-weight/:orderId/:itemId',
  updateItemWeight,
);
// ======================================================
// GET QC ORDER BY ID
// ======================================================
router.get('/:id', getQCOrderById);

router.put('/move-all-to-completed/:orderId', moveAllToCompleted);

// ======================================================
// GENERATE DELIVERY CHALLAN
// ======================================================
router.post('/generate-delivery-challan/:orderId', generateDeliveryChallan);

export default router;
