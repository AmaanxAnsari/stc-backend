import express from 'express';
import authMiddleware from '../../middleware/auth.js';
import {
  checkFaceStatus,
  enrollFace,
  verifyFace,
} from '../../controllers/admin/faceTecController.js';

const router = express.Router();

router.get('/status', authMiddleware, checkFaceStatus); // Run this after login
router.post('/enroll', authMiddleware, enrollFace); // Run when action is ENROLL_FACE
router.post('/verify', authMiddleware, verifyFace); // Run when action is VERIFY_FACE

export default router;
