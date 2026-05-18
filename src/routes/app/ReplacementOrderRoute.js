import express from 'express';
import authMiddleware from '../../middleware/auth.js';

import {
  createReplacementRequest,
  createReplacementRequestV2,
  getReplacementOrderByUserId,
} from '../../controllers/app/ReplacementOrderController.js';
import { uploadDisk } from '../../middleware/multer.js';
const router = express.Router();
router.post(
  '/:orderId',
  authMiddleware,
  uploadDisk.any(),
  createReplacementRequest,
);
router.post(
  '/partner/:orderId',
  authMiddleware,
  uploadDisk.any(),
  createReplacementRequestV2,
);
router.get('/', authMiddleware, getReplacementOrderByUserId);

// router.delete('/:id', hasPermission('Products'), deleteProduct);
// router.put('/status/:id', hasPermission('Products'), updateProductStatus);

export default router;
