import express from 'express';

// V2 Controllers
import * as deliveryRouteControllerV2 from '../../controllers/admin/deliveryRouteControllerV2.js';
import * as basicRouteControllerV2 from '../../controllers/admin/basicRouteControllerV2.js';
import { hasPermission } from '../../middleware/permission.js';

const router = express.Router();

// ============ BASIC ROUTE MANAGEMENT ============
router.post(
  '/basic-routes',
  hasPermission("Delivery Routes"),
  basicRouteControllerV2.createBasicRoute,
);
router.get(
  '/basic-routes',
  hasPermission("Delivery Routes"),
  basicRouteControllerV2.getAllBasicRoutes,
);
router.get(
  '/basic-routes/:routeId',
  hasPermission("Delivery Routes"),
  basicRouteControllerV2.getBasicRouteById,
);
router.put(
  '/basic-routes/:routeId',
  hasPermission("Delivery Routes"),
  basicRouteControllerV2.updateBasicRoute,
);
router.delete(
  '/basic-routes/:routeId',
  hasPermission("Delivery Routes"),
  basicRouteControllerV2.deleteBasicRoute,
);

// Stop management in basic routes
router.post(
  '/basic-routes/:routeId/stops',
  hasPermission("Delivery Routes"),
  basicRouteControllerV2.addStopToBasicRoute,
);
router.delete(
  '/basic-routes/:routeId/stops/:stopId',
  hasPermission("Delivery Routes"),
  basicRouteControllerV2.removeStopFromBasicRoute,
);
router.put(
  '/basic-routes/:routeId/reorder-stops',
  hasPermission("Delivery Routes"),
  basicRouteControllerV2.reorderStops,
);

// ============ ROUTE INSTANCE MANAGEMENT (V2) ============
// Step 1: Create route instance from basic route
router.post(
  '/routes-v2/from-basic-route',
  hasPermission("Delivery Routes"),
  deliveryRouteControllerV2.createRouteFromBasicRoute,
);

// Step 2: Get available orders for specific stop in route (date-range based)
router.get(
  '/routes-v2/:routeId/stops/:stopId/available-orders',
  hasPermission("Delivery Routes"),
  deliveryRouteControllerV2.getAvailableOrdersForStop,
);

// Step 3: Assign selected orders to route stop
router.post(
  '/routes-v2/:routeId/stops/:stopId/assign-orders',
  hasPermission("Delivery Routes"),
  deliveryRouteControllerV2.assignOrdersToRouteStop,
);

// Step 4: Remove orders from route stop (before finalization)
router.delete(
  '/routes-v2/:routeId/stops/:stopId/remove-orders',
  hasPermission("Delivery Routes"),
  deliveryRouteControllerV2.removeOrdersFromRouteStop,
);

// Get complete route details with orders
router.get(
  '/routes-v2/:routeId',
  hasPermission("Delivery Routes"),
  deliveryRouteControllerV2.getRouteWithOrders,
);

// Driver/Vehicle assignment (reuse existing endpoints from your original controller)

export default router;
