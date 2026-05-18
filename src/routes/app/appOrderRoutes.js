import express from 'express';
import authMiddleware from '../../middleware/auth.js';
import { cancelOrder, createOrder, getOrderByUserId } from '../../controllers/app/AppOrderController.js';
const router = express.Router();
router.post('/', authMiddleware, createOrder);
router.get('/', authMiddleware, getOrderByUserId);
router.put('/:id/cancel', authMiddleware, cancelOrder);

// router.get('/', hasPermission('Products'), getAllProducts);
// router.delete('/:id', hasPermission('Products'), deleteProduct);
// router.put('/status/:id', hasPermission('Products'), updateProductStatus);


export default router;
