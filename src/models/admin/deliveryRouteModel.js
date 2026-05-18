import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const routeSchema = new mongoose.Schema(
  {
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BasicRoute',
      default: null,
    },
    routeName: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      required: true,
    },
    nextDeliveryDate: {
      type: Date,
      required: true,
    },
    nextDeliveryDateDisplay: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'scheduled','draft'],
      default: 'scheduled',
      index: true,
    },
    totalStops: {
      type: Number,
      default: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    estimatedDuration: {
      type: String,
    },

    deliveryOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    deliveryVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    stops: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },

    // Standard fields
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true },
);

const DeliveryRoute = getAdminDB().model('DeliveryRoute', routeSchema);
export default DeliveryRoute;
