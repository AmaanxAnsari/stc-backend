import express from 'express';
import { hasPermission } from '../../middleware/permission.js';
import { uploadDisk } from '../../middleware/multer.js';
import {
  createCompanyConfig,
  updateCompanyConfig,
  getCompanyConfig,
} from '../../controllers/admin/CompanyConfigController.js';

const router = express.Router();

// Get the current configuration
router.get('/', hasPermission('Dashboard'), getCompanyConfig);

// Create initial configuration (only needed once)
// Field names expected in FormData: 'companyOneLogo', 'companyTwoLogo'
router.post(
  '/',
  hasPermission('Settings'),
  uploadDisk.any(),
  createCompanyConfig,
);

// Update configuration
router.put(
  '/:id',
  hasPermission('Settings'),
  uploadDisk.any(),
  updateCompanyConfig,
);

export default router;
