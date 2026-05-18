import express from 'express';
import { hasPermission } from '../../middleware/permission.js';
import {
  createDeliveryVehicle,
  deleteDeliveryVehicle,
  getAllDeliveryVehicle,
  updateDeliveryVehicle,
  updateDeliveryVehicleStatus,
} from '../../controllers/admin/deliveryVehicleController.js';

const router = express.Router();

router.post('/', hasPermission('DeliveryVehicle'), createDeliveryVehicle);
router.put('/:id', hasPermission('DeliveryVehicle'), updateDeliveryVehicle);
router.get('/', hasPermission('DeliveryVehicle'), getAllDeliveryVehicle);
router.delete('/:id', hasPermission('DeliveryVehicle'), deleteDeliveryVehicle);
router.put(
  '/status/:id',
  hasPermission('DeliveryVehicle'),
  updateDeliveryVehicleStatus,
);

export default router;
