import express from 'express';
import { hasPermission } from '../../middleware/permission.js';
import { addProductToVan, adjustVanStock, bulkAddProductsToVan, createVanInventory, deleteVanInventory, getAllVanInventory, getVanInventoryById, getVanInventoryByVehicle, removeProductFromVan, updateVanInventory, updateVanInventoryVariant, updateVehicleAssignment } from '../../controllers/admin/InVanInventoryController.js';


const router = express.Router();

// Create empty van inventory for vehicle
router.post('/', hasPermission('InVanInventory'), createVanInventory);

// Update vehicle assignment
router.put(
  '/:inventoryId/vehicle',
  hasPermission('InVanInventory'),
  updateVehicleAssignment,
);

// Add single product to van
router.post(
  '/:vehicleId/product',
  hasPermission('InVanInventory'),
  addProductToVan,
);

// Bulk add products to van
router.post('/bulk-add', hasPermission('InVanInventory'), bulkAddProductsToVan);

// Update van inventory
router.put(
  '/:inventoryId',
  hasPermission('InVanInventory'),
  updateVanInventory,
);

// Update specific variant
router.put(
  '/:inventoryId/variant/:variantIndex',
  hasPermission('InVanInventory'),
  updateVanInventoryVariant,
);

// Adjust stock
router.put(
  '/:inventoryId/adjust-stock',
  hasPermission('InVanInventory'),
  adjustVanStock,
);

// Get all van inventories
router.get('/', hasPermission('InVanInventory'), getAllVanInventory);

// Get van inventory by ID
router.get(
  '/:inventoryId',
  hasPermission('InVanInventory'),
  getVanInventoryById,
);

// Get van inventory by vehicle
router.get(
  '/vehicle/:vehicleId',
  hasPermission('InVanInventory'),
  getVanInventoryByVehicle,
);

// Remove product from van
router.delete(
  '/:inventoryId/product',
  hasPermission('InVanInventory'),
  removeProductFromVan,
);

// Delete van inventory (soft delete)
router.delete(
  '/:vehicleId',
  hasPermission('InVanInventory'),
  deleteVanInventory,
);

export default router;
