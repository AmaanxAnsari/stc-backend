import express from 'express';
import authMiddleware from '../../middleware/auth.js';
import {
  createSpotOrder,
  getSpotOrdersByDriver,
  getSpotOrderById,
  getSpotOrdersByVehicle,
  getSpotOrdersByRoute,
  getSpotOrdersByCustomerType,
  getSpotOrdersByPaymentMethod,
  getNewCustomersFromSpotOrders,
  getTodaysSpotOrders,
  getSpotOrdersStats,
  deleteSpotOrder,
  getAllSpotOrders,
} from '../../controllers/admin/SpotOrderController.js';
import { hasPermission } from '../../middleware/permission.js';

const router = express.Router();

// Create spot order from cart
// router.post('/', authMiddleware, createSpotOrder);

// Get spot orders by driver (authenticated driver)
router.get('/', hasPermission('Spot Order'), getAllSpotOrders);
router.get('/my-orders',  hasPermission('Spot Order'), getSpotOrdersByDriver);

// Get today's spot orders
router.get('/today',  hasPermission('Spot Order'), getTodaysSpotOrders);

// Get spot orders statistics
router.get('/stats',  hasPermission('Spot Order'), getSpotOrdersStats);

// Get new customers
router.get('/new-customers',  hasPermission('Spot Order'), getNewCustomersFromSpotOrders);

// Get spot order by ID
router.get('/:id',  hasPermission('Spot Order'), getSpotOrderById);

// Get spot orders by vehicle
router.get('/vehicle/:vehicleId',  hasPermission('Spot Order'), getSpotOrdersByVehicle);

// Get spot orders by route
router.get('/route/:routeId',  hasPermission('Spot Order'), getSpotOrdersByRoute);

// Get spot orders by customer type
router.get(
  '/customer-type/:customerType',
   hasPermission('Spot Order'),
  getSpotOrdersByCustomerType,
);

// Get spot orders by payment method
router.get(
  '/payment-method/:paymentMethod',
   hasPermission('Spot Order'),
  getSpotOrdersByPaymentMethod,
);

// Delete spot order (soft delete)
router.delete('/:id',  hasPermission('Spot Order'), deleteSpotOrder);

export default router;
