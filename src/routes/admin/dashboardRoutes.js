// routes/admin.routes.js
import express from 'express';
import authMiddleware from './../../middleware/auth.js';
import { getDashboardData } from '../../controllers/admin/dashboardController.js';
const router = express.Router();

// ONE API endpoint for the whole dashboard
router.get('/', authMiddleware,getDashboardData);

export default router;
