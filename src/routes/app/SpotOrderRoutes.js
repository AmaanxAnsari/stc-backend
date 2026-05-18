import express from 'express';
import authMiddleware from '../../middleware/auth.js';
import {
  createSpotOrder,
  getSpotOrdersByDriver,
  getSpotOrderById,
} from '../../controllers/app/SpotOrderController.js';

const router = express.Router();

// Create spot order from cart
router.post('/', authMiddleware, createSpotOrder);

// Get spot orders by driver (authenticated driver)
router.get('/my-orders', authMiddleware, getSpotOrdersByDriver);

// Get spot order by ID
router.get('/:id', authMiddleware, getSpotOrderById);

export default router;
