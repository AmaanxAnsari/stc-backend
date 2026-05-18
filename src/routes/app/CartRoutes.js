import express from 'express';
import authMiddleware from '../../middleware/auth.js';
import {
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
  getCart,
} from '../../controllers/app/CartController.js';

const router = express.Router();

router.post('/add', authMiddleware, addToCart);
router.put('/update', authMiddleware, updateCartItemQuantity);
router.delete('/remove/:cartItemId', authMiddleware, removeFromCart);
router.delete('/clear', authMiddleware, clearCart);
router.get('/', authMiddleware, getCart);

export default router;
