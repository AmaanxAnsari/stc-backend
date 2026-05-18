import express from 'express';

import {
  createCustomer,
  getAllCustomers,
  getSingleCustomer,
  updateCustomer,
  deleteCustomer,
} from '../../controllers/admin/customerController.js';

import { hasPermission } from '../../middleware/permission.js';

const router = express.Router();

router.post('/', hasPermission('Customer'), createCustomer);

router.get('/', hasPermission('Customer'), getAllCustomers);

router.get('/:id', hasPermission('Customer'), getSingleCustomer);

router.put('/:id', hasPermission('Customer'), updateCustomer);

router.delete('/:id', hasPermission('Customer'), deleteCustomer);

export default router;
