import express from 'express';
import { generateInvoice } from '../../controllers/admin/InvoiceController.js';

const router = express.Router();

// Generate Invoice
// Using POST because we are sending a body payload (orderId, orderType, isGst)
// 'Orders' permission assumes the user has access to view/print orders
router.post('/generate', generateInvoice);

export default router;
