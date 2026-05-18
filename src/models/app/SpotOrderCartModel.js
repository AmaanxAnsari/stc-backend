import mongoose from 'mongoose';
import { getAppDB } from '../../config/db.js';

const { Schema } = mongoose;

const cartItemSchema = new Schema({
  cartItemId: { type: String, required: true }, // ${productId}_variant_${variantIndex}
  id: { type: Schema.Types.ObjectId, required: true }, // productId (for context compatibility)
  inventoryId: {
    type: Schema.Types.ObjectId,
    ref: 'InVanInventory',
    required: true,
  },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variantIndex: { type: Number, default: 0 },
  name: { type: String, required: true },
  image: { type: String },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  quantity: { type: String }, // "500ml", "1L"
  category: { type: String },
  cartQuantity: { type: Number, default: 1 },
  addedAt: { type: Date, default: Date.now },
});

const customerDetailsSchema = new Schema(
  {
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    customerType: { type: String, default: 'Retailer' },
    isNewCustomer: { type: Boolean, default: true },
  },
  { _id: false },
);

const paymentDetailsSchema = new Schema(
  {
    method: { type: String, default: 'Cash' },
    transactionId: { type: String, default: null },
    chequeNumber: { type: String, default: null },
  },
  { _id: false },
);

const orderLocationSchema = new Schema(
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

const spotOrderCartSchema = new Schema(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryVehicle',
      required: true,
      index: true,
    },
    items: [cartItemSchema],
    // customerDetails: customerDetailsSchema,
    // paymentDetails: paymentDetailsSchema,
    // orderLocation: orderLocationSchema,
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

// Compound index for quick driver+vehicle lookup
spotOrderCartSchema.index({ driverId: 1, vehicleId: 1 });

const SpotOrderCart = getAppDB().model('SpotOrderCart', spotOrderCartSchema);
export default SpotOrderCart;
