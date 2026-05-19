import express from 'express';
import { generateQuotation, moveAllToInProcess } from '../../controllers/admin/QuotationController.js';
import authMiddleware from '../../middleware/auth.js';



const router = express.Router();

router.post('/generate-quotation',  generateQuotation);

router.post('/move-to-process',authMiddleware, moveAllToInProcess);

export default router;