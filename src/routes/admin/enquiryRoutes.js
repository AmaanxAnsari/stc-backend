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
router.post('/',hasPermission('Enquiry Orders'), createEnquiry);

// UPDATE
router.put('/:id', hasPermission('Enquiry Orders'), updateEnquiry);

// GET ALL
router.get('/', hasPermission('Enquiry Orders'), getAllEnquiries);

// GET SINGLE
router.get('/:id', hasPermission('Enquiry Orders'), getSingleEnquiry);

// DELETE
router.delete('/:id', hasPermission('Enquiry Orders'),   deleteEnquiry);

// UPDATE STATUS
router.put('/status/:id', hasPermission('Enquiry Orders'), updateEnquiryStatus);

export default router;
