import express from 'express';
import { addAddress, deleteAddress, deleteUser, getAllUsers, getUserById, registerConsumer, registerPartner, updateAddress, updateConsumer, updatePartner, updateStatus, updateUser } from '../../controllers/app/userController.js';
import { handleMulterError, uploadDisk,  } from '../../middleware/multer.js';
import authMiddleware from '../../middleware/auth.js';

const router = express.Router();
// User Routes
router.get('/', authMiddleware, getAllUsers);
router.get('/:id', authMiddleware, getUserById);
router.delete('/:id',authMiddleware, deleteUser);
router.put('/status/:id', authMiddleware, updateStatus);
router.post('/:id/address',authMiddleware, addAddress);
router.put('/:id/address/:addressId', authMiddleware, updateAddress);
router.delete('/:id/address/:addressId',authMiddleware, deleteAddress);
router.put('/user',authMiddleware,uploadDisk.any(), updateUser);



// Consumer Routes
router.post('/consumer', registerConsumer);
router.put('/consumer', updateConsumer);



// Partner Routes
router.post(
  '/partner',
  uploadDisk.any(), 
  handleMulterError,
  registerPartner,
);
router.put(
  '/partner',
  uploadDisk.any(), 
  handleMulterError,
  updatePartner,
);


export default router;
