import express from 'express';
import { hasPermission } from '../../middleware/permission.js';
import { createCategory, deleteCategory, getAllCategory, updateCategory, updateCategoryStatus } from '../../controllers/admin/categoryController.js';
import { uploadDisk } from '../../middleware/multer.js';


const router = express.Router();
router.post('/', hasPermission('Category'),uploadDisk.any(), createCategory);
router.put('/:id', hasPermission('Category'), uploadDisk.any(), updateCategory);
router.get('/', hasPermission('Category'), getAllCategory);
router.delete('/:id', hasPermission('Category'), deleteCategory);
router.put('/status/:id', hasPermission('Category'), updateCategoryStatus);


export default router;
