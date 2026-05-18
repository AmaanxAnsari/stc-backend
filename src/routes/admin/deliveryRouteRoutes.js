import express from 'express';
import {
  createRoute,
  getAllRoutes,
  getRouteById,
  addStopToRoute,
  removeStopFromRoute,
  assignDriverToRoute,
  getRouteForDriver,
  updateRoute,
  deleteRoute,
  assignVehicleToRoute,
} from '../../controllers/admin/deliveryRouteController.js';
import { hasPermission } from '../../middleware/permission.js';

const router = express.Router();

// Route CRUD
router.post('/create', hasPermission('Routes'), createRoute);
router.get('/all', hasPermission('Routes'), getAllRoutes);
router.get('/:routeId', hasPermission('Routes'), getRouteById);
router.put('/:routeId', hasPermission('Routes'), updateRoute);
router.delete('/:routeId', hasPermission('Routes'), deleteRoute);

// Route stops management
router.post('/:routeId/add-stop', hasPermission('Routes'), addStopToRoute);
router.delete(
  '/:routeId/remove-stop/:stopNumber',
  hasPermission('Routes'),
  removeStopFromRoute,
);

// Driver assignment
router.put(
  '/:routeId/assign-driver',
  hasPermission('Routes'),
  assignDriverToRoute,
);
// Vehicle assignment
router.put(
  '/:routeId/assign-vehicle',
  hasPermission('Routes'),
  assignVehicleToRoute,
);

// Driver routes
router.get('/:routeId/driver', hasPermission('Routes'), getRouteForDriver);

export default router;
