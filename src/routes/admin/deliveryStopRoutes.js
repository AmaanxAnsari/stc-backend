import express from 'express';
import { hasPermission } from './../../middleware/permission.js';
import {
  createStop,
  getAllStops,
  getStopById,
  updateStop,
  deleteStop,
  getOrdersByStop,
  manuallyAssignOrderToStop,
  getUnassignedOrders,
  batchAssignOrdersToStop,
} from '../../controllers/admin/deliveryStopsController.js';

const router = express.Router();

// Stop CRUD
router.post('/create', hasPermission('Stops'), createStop);
router.get('/all', hasPermission('Stops'), getAllStops);
router.get('/:stopId', hasPermission('Stops'), getStopById);
router.put('/:stopId', hasPermission('Stops'), updateStop);
router.delete('/:stopId', hasPermission('Stops'), deleteStop);

// Stop orders management
router.get('/:stopId/orders', hasPermission('Stops'), getOrdersByStop);
router.post('/assign-order', hasPermission('Stops'), manuallyAssignOrderToStop);
router.post(
  '/batch-assign-orders',
  hasPermission('Stops'),
  batchAssignOrdersToStop,
);


// Unassigned orders
router.get('/orders/unassigned', hasPermission('Stops'), getUnassignedOrders);

export default router;
