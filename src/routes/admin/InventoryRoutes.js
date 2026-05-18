import express from 'express';
import { addToInventory, addVariantToInventory, adjustStock, bulkUpdateInventoryVariants, deleteInventoryVariant, getAllInventory, getInventoryById, removeFromInventory, updateInventory, updateInventoryVariant, updateInventoryVariantByIndex } from '../../controllers/admin/InventoryController.js';
import { hasPermission } from './../../middleware/permission.js';


const router = express.Router();

// Add product to inventory
router.post('/', hasPermission('Inventory'), addToInventory);

// Unified update - handles all variant operations
router.put('/:inventoryId', hasPermission('Inventory'), updateInventory);

// Update inventory variant (stock, pricing, thresholds)
router.put(
  '/:inventoryId/variant',
  hasPermission('Inventory'),
  updateInventoryVariant,
);

// Adjust stock (restock or correction)
router.put('/:inventoryId/adjust', hasPermission('Inventory'), adjustStock);

// Remove product from inventory (soft delete)
router.delete('/:inventoryId', hasPermission('Inventory'), removeFromInventory);

// Get all inventory (with filters, pagination)
router.get('/', hasPermission('Inventory'), getAllInventory);

// Get single inventory by ID
router.get('/:inventoryId', hasPermission('Inventory'), getInventoryById);




// Variant management
router.post('/:inventoryId/variants', hasPermission('Inventory'), addVariantToInventory);
router.put('/:inventoryId/variants/bulk', hasPermission('Inventory'), bulkUpdateInventoryVariants);
router.put('/:inventoryId/variants/:variantIndex', hasPermission('Inventory'), updateInventoryVariantByIndex);
router.delete('/:inventoryId/variants/:variantIndex', hasPermission('Inventory'), deleteInventoryVariant);

export default router;
