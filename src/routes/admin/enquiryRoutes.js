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
router.post('/', hasPermission('Enquiry'), createEnquiry);

// UPDATE
router.put('/:id', hasPermission('Enquiry'), updateEnquiry);

// GET ALL
router.get('/', hasPermission('Enquiry'), getAllEnquiries);

// GET SINGLE
router.get('/:id', hasPermission('Enquiry'), getSingleEnquiry);

// DELETE
router.delete('/:id', hasPermission('Enquiry'), deleteEnquiry);

// UPDATE STATUS
router.put('/status/:id', hasPermission('Enquiry'), updateEnquiryStatus);

export default router;
