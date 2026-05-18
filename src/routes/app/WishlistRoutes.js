import express from 'express';
import authMiddleware from '../../middleware/auth.js';
import { addToWishlist, clearWishlist, getWishlist, removeFromWishlist } from '../../controllers/app/WishlistController.js';
const router = express.Router();
router.post('/add', authMiddleware, addToWishlist);
router.delete('/remove/:itemId', authMiddleware, removeFromWishlist);
// router.delete('/remove/:productId', authMiddleware, removeFromWishlist);
router.delete('/clear', authMiddleware, clearWishlist);
router.get('/', authMiddleware, getWishlist);


export default router;
