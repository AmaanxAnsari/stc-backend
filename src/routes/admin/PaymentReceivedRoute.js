import express from 'express';
import {

  markCODPaymentCompleted,
} from '../../controllers/admin/SpotOrderController.js';
import { hasPermission } from '../../middleware/permission.js';

const router = express.Router();


router.post('/mark-payment-completed',  hasPermission('Spot Order'), markCODPaymentCompleted);

export default router;
