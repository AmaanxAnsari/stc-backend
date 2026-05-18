import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const { Schema } = mongoose;

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
// Replacement item schema
const ReplacementItemSchema = new Schema(
  {
    originalItem: {
      cartItemId: { type: String, required: true },
      inventoryId: { type: Schema.Types.ObjectId, required: true }, // NEW
      productId: { type: Schema.Types.ObjectId, required: true },
      variantIndex: { type: Number, default: 0 }, // NEW
      name: { type: String, required: true },
      quantity: { type: String }, // "100g", "500ml"
      image: { type: String },
      price: { type: Number },
    },
    replacementQuantity: { type: Number, required: true, default: 1 },
    reason: {
      type: String,
      required: true,
    },
    reasonDescription: { type: String },
    images: [
      {
        uri: { type: String },
        fileName: { type: String },
      },
    ],
  },
  { _id: false },
);

// Timeline event schema
const TimelineEventSchema = new Schema(
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
    timestamp: { type: Date },
    displayTime: { type: String },
    icon: { type: String },
    color: { type: String },
    notes: { type: String },
    rejectionReason: { type: String },
  },
  { _id: false },
);

// Replacement tracking schema
const ReplacementTrackingSchema = new Schema(
  {
    id: { type: String },
    label: { type: String },
    status: {
      type: String,
      enum: ['pending','confirmed','delivered','out_for_delivery', 'active', 'completed', 'cancelled'],
      default: 'pending',
    },
    timestamp: { type: Date },
    displayTime: { type: String },
    icon: { type: String },
    color: { type: String },
  },
  { _id: false },
);

// Rejection details schema
const RejectionDetailsSchema = new Schema(
  {
    reason: { type: String },
    adminNotes: { type: String },
    policy: { type: String },
  },
  { _id: false },
);

// Main replacement request schema
const ReplacementRequestSchema = new Schema(
  {
    requestId: { type: String, required: true, unique: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'AppOrder', required: true },
    orderType: { type: String, default: 'replacement' },

    customerInfo: {
      id: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
      phone: { type: String },
      email: { type: String },
    },
    deliveryAddress: { type: mongoose.Schema.Types.Mixed, default: {} },

    replacementItems: [ReplacementItemSchema],
    notes: { type: String },

    status: {
      type: String,
      enum: [
        'pending',
        'approved',
        'rejected',
        'out_for_delivery',
        'delivered',
        'cancelled',
      ],
      default: 'pending',
      index: true,
    },

    requestSubmittedAt: { type: Date, default: Date.now },
    slug: { type: String },
    timeline: [TimelineEventSchema],
    replacementTracking: [ReplacementTrackingSchema],
    rejectionDetails: RejectionDetailsSchema,
    isGst: { type: Boolean, default: false },
    companyName: { type: String, default: null },
    deliveryProof: DeliveryProofSchema,
    cancellationDetails: CancellationDetailsSchema,
    // ADD deliveryOTP field (after cancellationDetails):
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

    // NEW: Track inventory reservation
    inventoryReserved: { type: Boolean, default: false },
    inventoryReservedAt: { type: Date },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },

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

ReplacementRequestSchema.index({ requestId: 1, createdAt: -1 });
ReplacementRequestSchema.index({ orderId: 1 });
ReplacementRequestSchema.index({ status: 1, createdAt: -1 });
ReplacementRequestSchema.index({
  fulfillmentMode: 1,
  'partnerAssignment.partnerId': 1,
  'partnerAssignment.status': 1,
  createdAt: -1,
});

const ReplacementRequest = getAdminDB().model(
  'ReplacementRequest',
  ReplacementRequestSchema,
);
export default ReplacementRequest;
