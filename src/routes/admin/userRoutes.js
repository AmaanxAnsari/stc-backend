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
import {
  getAllUsers as getAppUsers,
  getUserById as getAppUserById,
  deleteUser as deleteAppUser,
  updateStatus as updateAppStatus,
  registerDeliveryOfficer,
} from './../../controllers/app/userController.js';
import { uploadDisk } from '../../middleware/multer.js';

const router = express.Router();
// Admin Users
router.post('/', hasPermission('Users'), createUser);
router.get('/', hasPermission('Users'), getAllUsers);
router.get('/:id', hasPermission('Users'), getUserById);
router.put(
  '/:id',
  hasPermission('Users'),
  uploadDisk.single('profile_image'),
  updateUser,
);
router.delete('/:id', hasPermission('Users'), deleteUser);
router.put('/status/:id', hasPermission('Users'), updateStatus);

router.post('/delivery', hasPermission('Users'),uploadDisk.any(), registerDeliveryOfficer);

// App Users

// router.get('/app-user', hasPermission('Users'), getAppUsers);
// router.get('/app/:id', hasPermission('Users'), getAppUserById);
// router.delete('/app/:id', hasPermission('Users'), deleteAppUser);
router.put('/app/status/:id', hasPermission('Users'), updateAppStatus);

export default router;
