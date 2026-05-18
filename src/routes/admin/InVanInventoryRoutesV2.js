import express from 'express';
import { hasPermission } from '../../middleware/permission.js';
import {
  addProductToVan,
  bulkAddProductsToVan,
  createVanInventory,
  getAllVanInventory,
  getVanInventoryByVehicle,
  removeProductFromVan,
  updateVanInventory,
} from '../../controllers/admin/InVanInventoryV2.js'; 

const router = express.Router();

// Create empty van inventory for vehicle
router.post('/', hasPermission('InVanInventory'), createVanInventory);

// Add single product to van (Centralized V2 Logic)
router.post(
  '/:vehicleId/product',
  hasPermission('InVanInventory'),
  addProductToVan,
);

// Bulk add products to van (Centralized V2 Logic)
router.post('/bulk-add', hasPermission('InVanInventory'), bulkAddProductsToVan);

// Update van inventory
router.put(
  '/:inventoryId',
  hasPermission('InVanInventory'),
  updateVanInventory,
);

// Get all van inventories
router.get('/', hasPermission('InVanInventory'), getAllVanInventory);

// Get van inventory by vehicle
router.get(
  '/vehicle/:vehicleId',
  hasPermission('InVanInventory'),
  getVanInventoryByVehicle,
);

// Remove product from van (Returns stock to Admin)
router.delete(
  '/:inventoryId/product',
  hasPermission('InVanInventory'),
  removeProductFromVan,
);

export default router;
