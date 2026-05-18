import express from 'express';
import { hasPermission } from '../../middleware/permission.js';
import { getSystemLogs } from '../../controllers/admin/LogsController.js';

const router = express.Router();

// Get Logs (Only for Super Admin or specific permission)
router.get('/', hasPermission('Dashboard'), getSystemLogs);

export default router;
