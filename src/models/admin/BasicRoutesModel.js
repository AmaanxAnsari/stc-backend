import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';


const basicRouteSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      required: true,
    },
    stops: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryStop',
      },
    ],
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true },
);

// Add compound index for efficient querying
basicRouteSchema.index({ routeName: 1, area: 1, isDeleted: 1 });

// Add index for stops array for faster lookups
basicRouteSchema.index({ stops: 1 });

const BasicRoute = getAdminDB().model('BasicRoute', basicRouteSchema);
export default BasicRoute;
