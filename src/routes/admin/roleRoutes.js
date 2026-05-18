import express from 'express';
import {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
} from '../../controllers/admin/roleController.js';
import { hasPermission } from '../../middleware/permission.js';

const router = express.Router();

router.post('/', hasPermission('Role'), createRole);
router.get('/', hasPermission('Role'), getAllRoles);
router.get('/:id', hasPermission('Role'), getRoleById);
router.put('/:id', hasPermission('Role'), updateRole);
router.delete('/:id', hasPermission('Role'), deleteRole);

export default router;
