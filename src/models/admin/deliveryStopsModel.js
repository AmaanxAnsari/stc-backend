import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const stopSchema = new mongoose.Schema(
  {
    stopName: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      default: 'Pune',
      index: true,
      trim: true,
    },
    pincode: {
      type: String,
      index: true,
      trim: true,
    },
    // Alternative area names for matching (e.g., "Goregaon East", "Goregaon E")
    areaAliases: {
      type: [String],
      default: [],
    },
    coordinates: {
      latitude: Number,
      longitude: Number,
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

// Compound index for faster searching
stopSchema.index({ area: 1, city: 1, pincode: 1 });

const DeliveryStop = getAdminDB().model('DeliveryStop', stopSchema);
export default DeliveryStop;
