import express from 'express';
import authMiddleware from '../../middleware/auth.js';
import { getAllInventory, getInventoryById } from '../../controllers/app/InventoryController.js';


const router = express.Router();

// Get all inventory (with filters, pagination)
router.get('/', authMiddleware, getAllInventory);

// Get single inventory by ID
router.get('/:inventoryId', authMiddleware, getInventoryById);

export default router;
