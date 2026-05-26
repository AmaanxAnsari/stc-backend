import express from 'express';
import { hasPermission } from '../../middleware/permission.js';

import {
  createEnquiry,
  updateEnquiry,
  getAllEnquiries,
  getSingleEnquiry,
  deleteEnquiry,
  updateEnquiryStatus,
} from '../../controllers/admin/enquiryController.js';

const router = express.Router();

// CREATE
router.post('/', createEnquiry);

// UPDATE
router.put('/:id', updateEnquiry);

// GET ALL
router.get('/', getAllEnquiries);

// GET SINGLE
router.get('/:id', getSingleEnquiry);

// DELETE
router.delete('/:id', deleteEnquiry);

// UPDATE STATUS
router.put('/status/:id', updateEnquiryStatus);

export default router;
