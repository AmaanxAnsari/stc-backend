import express from 'express';
import authMiddleware from '../../middleware/auth.js';
import {
  getDriverCart,
  updateCartItem,
  batchUpdateVariants,
  clearDriverCart,
  updateCustomerDetails,
  updatePaymentDetails,
  updateOrderLocation,
  completeSpotOrder,
} from '../../controllers/app/SpotOrderCartController.js';

const router = express.Router();

// Get cart (pass vehicleId in body)
router.post('/', authMiddleware, getDriverCart);

// Update single item (matches updateCartItemQuantity in context)
router.post('/add', authMiddleware, updateCartItem);

// Batch update variants
router.post('/batch-update', authMiddleware, batchUpdateVariants);

// Clear cart
router.post('/clear', authMiddleware, clearDriverCart);

// Update customer details
router.post('/customer', authMiddleware, updateCustomerDetails);

// Update payment details
router.post('/payment', authMiddleware, updatePaymentDetails);

// Update order location
router.post('/location', authMiddleware, updateOrderLocation);

// Complete spot order
router.post('/complete-order', authMiddleware, completeSpotOrder);

export default router;
