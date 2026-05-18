import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const deliveryVehicleSchema = new mongoose.Schema(
  {
    vehicleName: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    // Activation and soft-delete flags
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },

    // Auditing
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true },
);

const DeliveryVehicle = getAdminDB().model(
  'DeliveryVehicle',
  deliveryVehicleSchema,
);
export default DeliveryVehicle;
