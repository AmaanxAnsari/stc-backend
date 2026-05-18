import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const { Schema } = mongoose;

const SystemLogSchema = new Schema(
  {
    // WHO did it?
    actionBy: {
      id: { type: Schema.Types.ObjectId, required: true }, // AdminId or DriverId
      name: { type: String, required: true },
      role: { type: String, default: 'admin' }, // 'admin', 'driver', 'system'
    },

    // WHAT happened? (The headline)
    actionType: {
      type: String,
      required: true,
      enum: [
        'INVENTORY_ADD',
        'INVENTORY_UPDATE',
        'INVENTORY_DELETE',
        'STOCK_ADJUSTMENT',
        'VAN_LOAD',
        'VAN_UNLOAD',
        'ORDER_CREATED',
        'ORDER_DELIVERED',
        'LOGIN',
      ],
      index: true,
    },

    // Detailed Description (Human readable)
    description: { type: String, required: true },

    // Technical Details (Optional: for debugging or detailed view)
    // metadata: {
    //   productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    //   inventoryId: { type: Schema.Types.ObjectId },
    //   vehicleId: { type: Schema.Types.ObjectId, ref: 'DeliveryVehicle' },
    //   orderId: { type: String },
    //   oldValue: { type: Schema.Types.Mixed }, // e.g., Stock was 10
    //   newValue: { type: Schema.Types.Mixed }, // e.g., Stock is now 50
    // },

    // Technical Details (Flexible structure)
    metadata: {
      type: Schema.Types.Mixed, // ✅ Allows ANY object structure (arrays, nested fields, etc.)
      default: {},
    },
    // Categorization
    module: {
      type: String,
      enum: ['AdminInventory', 'VanInventory', 'AppOrders', 'Auth'],
      default: 'AdminInventory',
      index: true,
    },
  },
  { timestamps: true }, // Adds createdAt automatically
);

// Indexes for fast searching by admin
SystemLogSchema.index({ createdAt: -1 });
SystemLogSchema.index({ 'actionBy.id': 1 });

const SystemLog = getAdminDB().model('SystemLog', SystemLogSchema);
export default SystemLog;
