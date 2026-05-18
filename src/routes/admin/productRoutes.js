import express from 'express';
import {
  createUser,
  getUserById,
  deleteUser,
  updateUser,
  getAllUsers,
  updateStatus,
} from '../../controllers/admin/userController.js';
import { hasPermission } from '../../middleware/permission.js';

import { addVariantToProduct, createProduct, deleteProduct, deleteProductVariant, getAllProducts, getProductById, updateProduct, updateProductStatus, updateProductVariant } from '../../controllers/admin/productController.js';
import { uploadDisk } from '../../middleware/multer.js';

const router = express.Router();
// Admin Users
router.post('/', hasPermission('Products'),uploadDisk.any(), createProduct);
router.put('/:id', hasPermission('Products'), uploadDisk.any(), updateProduct);
router.get('/', hasPermission('Products'), getAllProducts);
router.get('/:id', hasPermission('Products'), getProductById);
router.delete('/:id', hasPermission('Products'), deleteProduct);
router.put('/status/:id', hasPermission('Products'), updateProductStatus);

// Variant management
router.post('/:id/variants', hasPermission('Products'), uploadDisk.any(), addVariantToProduct);
router.put('/:id/variants/:variantIndex', hasPermission('Products'), uploadDisk.any(), updateProductVariant);
router.delete('/:id/variants/:variantIndex', hasPermission('Products'), deleteProductVariant);

export default router;
