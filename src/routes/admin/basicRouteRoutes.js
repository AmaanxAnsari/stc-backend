import express from 'express';
import {
  createBasicRoute,
  updateBasicRoute,
  getAllBasicRoutes,
  getBasicRouteById,
  deleteBasicRoute,
  updateBasicRouteStatus,
} from '../../controllers/admin/basicRouteController.js';
import { hasPermission } from '../../middleware/permission.js';


const router = express.Router();

// Create basic route
router.post('/', hasPermission('Basic Route'), createBasicRoute);

// Get all basic routes
router.get('/', hasPermission('Basic Route'), getAllBasicRoutes);

// Get basic route by ID
router.get('/:id', hasPermission('Basic Route'), getBasicRouteById);

// Update basic route
router.put('/:id', hasPermission('Basic Route'), updateBasicRoute);

// Delete basic route (soft delete)
router.delete('/:id', hasPermission('Basic Route'), deleteBasicRoute);

// Update basic route status
router.patch('/:id/status', hasPermission('Basic Route'), updateBasicRouteStatus);

export default router;
