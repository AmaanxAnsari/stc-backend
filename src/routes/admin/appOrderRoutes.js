import express from 'express';
import { getAllAppOrder, getOrderById } from '../../controllers/admin/AppOrderController.js';
import { hasPermission } from './../../middleware/permission.js';
const router = express.Router();
// Admin Users
router.get('/', hasPermission('Orders'), getAllAppOrder);
router.get('/:id', hasPermission('Orders'), getOrderById);
// router.delete('/:id', hasPermission('Products'), deleteProduct);
// router.put('/status/:id', hasPermission('Products'), updateProductStatus);


export default router;
