import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const { Schema } = mongoose;

// Product schema for spot orders
const SpotOrderProductSchema = new Schema(
  {
    cartItemId: { type: String, required: true },
    inventoryId: {
      type: Schema.Types.ObjectId,
      ref: 'InVanInventory',
      required: true,
    },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantIndex: { type: Number, default: 0 },
    name: { type: String, required: true },
    quantity: { type: String }, // "100g", "500ml"
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    image: { type: String },
    orderQuantity: { type: Number, default: 1 },
    category: { type: String },
  },
  { _id: false },
);

// Customer details schema
const CustomerDetailsSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    customerType: {
      type: String,
      enum: ['Distributor', 'Wholesaler', 'Retailer', 'Super Stocker'],
      default: 'Retailer',
    },
    newCustomer: { type: Boolean, default: true },
  },
  { _id: false },
);

// Payment details schema
const PaymentDetailsSchema = new Schema(
  {
    method: {
      type: String,
      enum: ['Cash', 'UPI', 'Cheque', 'Card', 'COD', 'Online','Credit'],
      default: 'Cash',
    },
    status: {
      type: String,
      enum: ['Paid', 'Pending', 'Completed', 'Failed'],
      default: 'Pending',
    },
    paymentDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    amount: { type: Number, required: true },
    transactionId: { type: String, default: null },
    chequeNumber: { type: String, default: null },
    paidAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// Delivery officer schema
const DeliveryOfficerSchema = new Schema(
  {
    id: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    role: { type: String, default: 'delivery_officer' },
    phone: { type: String },
  },
  { _id: false },
);

// Order location schema
const OrderLocationSchema = new Schema(
  {
    routeId: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryRoute',
      default: null,
    },
    routeName: { type: String, default: null },
    stopNumber: { type: Number, default: null },
    stopLocation: { type: String, default: null },
    coordinates: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
  },
  { _id: false },
);

// Bill summary schema

const BillSummarySchema = new Schema(
  {
    itemTotal: { type: Number, required: true },
    // ✅ Added Tax Percentage for Invoice calculation clarity
    taxPercentage: { type: Number, default: 0 }, 
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
  },
  { _id: false },
);

// Main spot order schema
const SpotOrderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    orderType: { type: String, default: 'on_spot', index: true },
    status: { type: String, default: 'delivered' }, // Always delivered
    statusLabel: { type: String, default: 'Order Delivered' },
    statusColor: { type: String, default: '#4CAF50' },

    orderPlacedAt: { type: String, required: true },
    orderPlacedDate: { type: Date, required: true, index: true },
    deliveredAt: { type: String, required: true },
    deliveredDate: { type: Date, required: true },

    totalAmount: { type: Number, required: true },
    currency: { type: String, default: '₹' },
    productCount: { type: Number, required: true },
    // ✅ GST Fields
    isGst: { type: Boolean, default: false },
    companyName: { type: String, default: null },
    // Products from van inventory
    products: [SpotOrderProductSchema],

    // Customer info collected on spot
    customerDetails: { type: CustomerDetailsSchema, required: true },

    // Payment collected immediately
    paymentDetails: { type: PaymentDetailsSchema, required: true },

    // Simplified bill (no delivery fees or coupons)
    billSummary: { type: BillSummarySchema, required: true },

    // Delivery officer who created the order
    deliveryOfficer: { type: DeliveryOfficerSchema, required: true },

    // Location where order was placed
    orderLocation: OrderLocationSchema,

    // Inventory tracking
    inventorySource: {
      type: String,
      enum: ['van_stock', 'extra_stock'],
      default: 'van_stock',
    },

    // Vehicle used for delivery
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryVehicle',
      required: true,
      index: true,
    },
    // Vehicle used for delivery
    driverId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // Notes by delivery officer
    orderNotes: { type: String, default: '' },

    // Soft delete support
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Indexes for performance
SpotOrderSchema.index({ orderId: 1, createdAt: -1 });
SpotOrderSchema.index({ 'deliveryOfficer.id': 1, createdAt: -1 });
SpotOrderSchema.index({ vehicleId: 1, createdAt: -1 });
SpotOrderSchema.index({ 'orderLocation.routeId': 1, createdAt: -1 });
SpotOrderSchema.index({ 'customerDetails.customerType': 1 });
SpotOrderSchema.index({ orderPlacedDate: -1 });

const SpotOrder = getAdminDB().model('SpotOrder', SpotOrderSchema);
export default SpotOrder;
