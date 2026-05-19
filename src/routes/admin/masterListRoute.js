import express from 'express';

import {
  getAllMasterOrders,
  getMasterOrderById,
} from '../../controllers/admin/MasterListController.js'

const router = express.Router();

// ======================================================
// GET ALL MASTER ORDERS
// ======================================================
router.get('/', getAllMasterOrders);

// ======================================================
// GET MASTER ORDER BY ID
// ======================================================
router.get('/:id', getMasterOrderById);

export default router;
