import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const { Schema } = mongoose;

const OrderProductSchema = new Schema(
  {
    cartItemId: { type: String, required: true },
    inventoryId: { type: Schema.Types.ObjectId, required: true }, // NEW
    productId: { type: Schema.Types.ObjectId, required: true },
    variantIndex: { type: Number, default: 0 },
    name: { type: String, required: true },
    quantity: { type: String },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    image: { type: String },
    orderQuantity: { type: Number, default: 1 },
    category: { type: String },
  },
  { _id: false },
);

const DeliveryAddressSchema = new Schema(
  {
    label: { type: String },
    receiverDetails: { type: String },
    fullAddress: { type: String },
    raw: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

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

const DeliveryOfficerSchema = new Schema(
  {
    id: { type: String },
    name: { type: String },
    role: { type: String },
    avatar: { type: String },
  },
  { _id: false },
);

const BillSummarySchema = new Schema(
  {
    itemTotal: { type: Number },
    originalItemTotal: { type: Number },
    deliveryFee: { type: Number },
    originalDeliveryFee: { type: Number },
    handlingFee: { type: Number },
    discount: { type: Number },
    tax: { type: Number },
    totalAmount: { type: Number },
  },
  { _id: false },
);

const CouponSchema = new Schema(
  {
    code: { type: String },
    discount: { type: Number },
    type: { type: String },
  },
  { _id: false },
);

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

const AppOrderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['pending', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'pending',
    },
    orderPlacedAt: { type: String },
    orderPlacedDate: { type: Date, required: true },

    totalAmount: { type: Number, required: true },
    originalAmount: { type: Number },
    currency: { type: String, default: '₹' },
    productCount: { type: Number },

    products: [OrderProductSchema],
    deliveryAddress: DeliveryAddressSchema,
    billSummary: BillSummarySchema,

    deliveryStatus: {
      stages: [DeliveryStageSchema],
      deliveryOfficer: DeliveryOfficerSchema,
    },
    orderType: { type: String, default: 'normal' },

    paymentMethod: {
      type: String,
      enum: ['Cash', 'Credit', 'COD', 'Online'],
      default: 'COD',
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
    deliveryNotes: { type: String },

    couponApplied: CouponSchema,
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
      regeneratedCount: { type: Number, default: 0 }, // Track how many times OTP was regenerated
    },

    viewOrderLink: { type: Boolean, default: true },
    downloadInvoice: { type: Boolean, default: false },
    isGst: { type: Boolean, default: false },
    companyName: { type: String, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByRole: { type: String }, // NEW
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

AppOrderSchema.index({ orderId: 1, createdAt: -1 });
AppOrderSchema.index({ status: 1, createdAt: -1 });
AppOrderSchema.index({ createdBy: 1, createdAt: -1 });
AppOrderSchema.index({
  fulfillmentMode: 1,
  'partnerAssignment.partnerId': 1,
  'partnerAssignment.status': 1,
  createdAt: -1,
});
const AppOrder = getAdminDB().model('AppOrder', AppOrderSchema);
export default AppOrder;

