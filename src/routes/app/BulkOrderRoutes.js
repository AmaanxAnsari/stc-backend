import express from 'express';
import authMiddleware from '../../middleware/auth.js';
import { cancelBulkOrder, createBulkOrder, getBulkOrderById, getBulkOrdersByUserId } from '../../controllers/app/BulkOrderController.js';
import { uploadDisk } from './../../middleware/multer.js';


const router = express.Router();

// Create bulk order
router.post('/', authMiddleware,uploadDisk.any(), createBulkOrder);

// Get all bulk orders for logged-in user
router.get('/', authMiddleware, getBulkOrdersByUserId);

// Get single bulk order by ID
router.get('/:id', authMiddleware, getBulkOrderById);

// Cancel bulk order
router.put('/:id/cancel', authMiddleware, cancelBulkOrder);

export default router;
