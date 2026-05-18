import express from 'express';
import authMiddleware from '../../middleware/auth.js';
import { getDriverVanInventory, getVanInventory } from '../../controllers/app/InVanInventoryController.js';


const router = express.Router();

// Driver gets their van inventory
router.get('/', authMiddleware, getDriverVanInventory);
router.post('/', authMiddleware, getVanInventory);

export default router;
