import express from 'express';
import { hasPermission } from '../../middleware/permission.js';
import { approveReplacementRequest, dispatchReplacement, getAllReplacementOrders, getReplacementOrderById, rejectReplacementRequest } from '../../controllers/admin/ReplacementOrderController.js';
const router = express.Router();

router.put('/:replacementId/approve', hasPermission('Replacement'), approveReplacementRequest);
router.put('/:replacementId/reject', hasPermission('Replacement'), rejectReplacementRequest);
router.put('/:replacementId/dispatch', hasPermission('Replacement'), dispatchReplacement);
router.get('/', hasPermission('Replacement'), getAllReplacementOrders);
router.get('/:id', hasPermission('Replacement'), getReplacementOrderById);
export default router;
