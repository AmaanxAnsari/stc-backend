import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const { Schema } = mongoose;

// Attached Images Schema
const AttachedImageSchema = new Schema(
  {
    id: { type: String, required: true },
    uri: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// Delivery Address Schema
const DeliveryAddressSchema = new Schema(
  {
    label: { type: String },
    receiverDetails: { type: String },
    fullAddress: { type: String },
    raw: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

// Delivery Stage Schema
const DeliveryStageSchema = new Schema(
  {
    id: { type: String },
    label: { type: String },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'delivered',
        'out_for_delivery',
        'active',
        'completed',
        'cancelled',
      ],
      default: 'pending',
    },
    timestamp: { type: Date, default: null },
    displayTime: { type: String },
    reason: { type: String },
  },
  { _id: false },
);

// Delivery Officer Schema
const DeliveryOfficerSchema = new Schema(
  {
    id: { type: String },
    name: { type: String },
    role: { type: String },
    avatar: { type: String },
  },
  { _id: false },
);

// Cancellation Details Schema
const CancellationDetailsSchema = new Schema(
  {
    cancelledAt: { type: Date },
    cancelledDate: { type: String },
    cancelledBy: {
      id: {
        type: Schema.Types.ObjectId,
        refPath: 'cancellationDetails.cancelledByModel',
      },
      name: { type: String },
      role: { type: String },
    },
    cancelledByModel: {
      type: String,
      enum: ['AdminUser', 'User'],
    },
    reason: { type: String },
    notes: { type: String },
  },
  { _id: false },
);

// Delivery Proof Schema
const DeliveryProofSchema = new Schema(
  {
    deliveredAt: { type: Date },
    deliveredDate: { type: String },
    deliveryPhoto: {
      uri: { type: String },
      fileName: { type: String },
      fileSize: { type: Number },
      type: { type: String },
    },
    signature: {
      uri: { type: String },
      base64: { type: String },
    },
    deliveredBy: DeliveryOfficerSchema,
  },
  { _id: false },
);

// Main Bulk Order Schema
const BulkOrderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'packed',
        'out_for_delivery',
        'delivered',
        'cancelled',
      ],
      default: 'pending',
    },
    statusLabel: { type: String },
    statusColor: { type: String },

    orderType: { type: String, default: 'bulk' },
    orderPlacedAt: { type: String },
    orderPlacedDate: { type: Date, required: true },

    totalAmount: { type: Number, default: 0 },
    originalAmount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    handlingfee: { type: Number, default: 0 },
    deliveryfee: { type: Number, default: 0 },
    currency: { type: String, default: '₹' },
    productCount: { type: Number, default: 0 },
    // ✅ Add this field
    billSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    specialInstructions: { type: String, required: true },
    attachedImages: [AttachedImageSchema],

    // These will be populated by admin after reviewing the bulk order
    products: { type: Array, default: [] },
    deliveryAddress: DeliveryAddressSchema,

    deliveryStatus: {
      stages: [DeliveryStageSchema],
      deliveryOfficer: DeliveryOfficerSchema,
    },

    paymentMethod: {
      type: String,
      enum: ['Cash', 'Credit', 'UPI', 'Wallet', 'COD', 'Online'],
      default: 'Credit',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Refunded', 'Failed'],
      default: 'Pending',
    },
    paymentDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    deliveryProof: DeliveryProofSchema,
    cancellationDetails: CancellationDetailsSchema,
    deliveryOTP: {
      code: { type: String, default: null },
      generatedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date, default: null },
      action: {
        type: String,
        enum: ['deliver', 'cancel'],
        default: null,
      },
      regeneratedCount: { type: Number, default: 0 },
    },

    viewOrderLink: { type: Boolean, default: true },
    downloadInvoice: { type: Boolean, default: false },
    isGst: { type: Boolean, default: false },
    companyName: { type: String, default: null },

    createdBy: { type: Schema.Types.ObjectId, required: true },
    createdByRole: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },

    assignedStop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryStop',
      default: null,
    },
    stopAssignmentStatus: {
      type: String,
      enum: ['pending', 'assigned', 'auto_assigned', 'manually_assigned'],
      default: 'pending',
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryRoute',
      default: null,
    },
    stopNumber: {
      type: Number,
      default: null,
    },
    fulfillmentMode: {
      type: String,
      enum: ['none', 'partner', 'route'],
      default: 'none',
      index: true,
    },
    routeLocked: { type: Boolean, default: false, index: true },

    partnerAssignment: {
      partnerId: {
        type: Schema.Types.ObjectId,
        default: null,
        index: true,
      },
      status: {
        type: String,
        enum: ['assigned', 'accepted', 'rejected'],
        default: null,
        index: true,
      },
      assignedBy: {
        type: Schema.Types.ObjectId,
        ref: 'AdminUser',
        default: null,
      },
      assignedAt: { type: Date, default: null },
      acceptedAt: { type: Date, default: null },
      rejectedAt: { type: Date, default: null },
      rejectionReason: { type: String, default: '' },
    },
  },
  { timestamps: true },
);

// Indexes
BulkOrderSchema.index({ orderId: 1, createdAt: -1 });
BulkOrderSchema.index({ status: 1, createdAt: -1 });
BulkOrderSchema.index({ createdBy: 1, createdAt: -1 });
BulkOrderSchema.index({
  fulfillmentMode: 1,
  'partnerAssignment.partnerId': 1,
  'partnerAssignment.status': 1,
  createdAt: -1,
});

const BulkOrder = getAdminDB().model('BulkOrder', BulkOrderSchema);
export default BulkOrder;
