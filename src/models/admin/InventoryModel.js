// import mongoose from 'mongoose';
// import { getAdminDB } from '../../config/db.js';

// const { Schema } = mongoose;

// // Simple tier pricing - just absolute values
// const TierPricingSchema = new Schema(
//   {
//     consumer: { type: Number, default: 0 },
//     retailer: { type: Number, default: 0 },
//     wholesaler: { type: Number, default: 0 },
//     distributor: { type: Number, default: 0 },
//     super_stocker: { type: Number, default: 0 },
//   },
//   { _id: false },
// );

// const VariantInventorySchema = new Schema(
//   {
//     variantKey: { type: String, required: true }, // matches product variant quantity
//     variantIndex: { type: Number, default: 0 },

//     costPrice: { type: Number, required: true },
//     mrp: { type: Number, required: true },
//     tierPricing: TierPricingSchema, // Simple absolute prices

//     initialStock: { type: Number, default: 0 },
//     onHand: { type: Number, default: 0, index: true },
//     reserved: { type: Number, default: 0 },
//     sold: { type: Number, default: 0 },
//     inStock: { type: Boolean, default: true },
//     status: {
//       type: String,
//       enum: ['in_stock', 'low_stock', 'out_of_stock'],
//       default: 'in_stock',
//       index: true,
//     },
//     lowStockThreshold: { type: Number, default: 0 },
//   },
//   { _id: false },
// );

// const AdminInventorySchema = new Schema(
//   {
//     productId: {
//       type: Schema.Types.ObjectId,
//       ref: 'Product',
//       required: true,
//       index: true,
//     },
//     productSlug: { type: String, index: true },
//     name: { type: String, index: true },
//     category: { type: String, index: true },
//     image: { type: String },
//     images: [{ type: String }],

//     variants: { type: [VariantInventorySchema], default: [] },

//     totalInitialStock: { type: Number, default: 0 },
//     totalOnHand: { type: Number, default: 0, index: true },
//     totalReserved: { type: Number, default: 0 },
//     totalSold: { type: Number, default: 0 },

//     status: {
//       type: String,
//       enum: ['in_stock', 'low_stock', 'out_of_stock'],
//       default: 'in_stock',
//       index: true,
//     },
//     isActive: { type: Boolean, default: true, index: true },

//     isDeleted: { type: Boolean, default: false, index: true },
//     deletedAt: { type: Date, default: null },

//     createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
//     updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
//   },
//   { timestamps: true },
// );

// AdminInventorySchema.index({
//   category: 1,
//   status: 1,
//   totalOnHand: -1,
//   createdAt: -1,
// });
// AdminInventorySchema.index({
//   name: 'text',
//   productSlug: 'text',
//   category: 'text',
// });

// AdminInventorySchema.methods.recalculateAggregates = function recalc() {
//   const totals = this.variants.reduce(
//     (acc, v) => {
//       acc.initial += v.initialStock || 0;
//       acc.onHand += v.onHand || 0;
//       acc.reserved += v.reserved || 0;
//       acc.sold += v.sold || 0;
//       return acc;
//     },
//     { initial: 0, onHand: 0, reserved: 0, sold: 0 },
//   );

//   this.totalInitialStock = totals.initial;
//   this.totalOnHand = totals.onHand;
//   this.totalReserved = totals.reserved;
//   this.totalSold = totals.sold;

//   if (this.totalOnHand <= 0) this.status = 'out_of_stock';
//   else {
//     const totalThreshold = this.variants.reduce(
//       (acc, v) => acc + (v.lowStockThreshold || 0),
//       0,
//     );
//     this.status =
//       totalThreshold > 0 && this.totalOnHand <= totalThreshold
//         ? 'low_stock'
//         : 'in_stock';
//   }

//   this.variants = this.variants.map((v) => {
//     const inStock = (v.onHand || 0) > 0;
//     if (v.inStock !== inStock) v.inStock = inStock;
//     return v;
//   });
// };

// AdminInventorySchema.pre('save', function preSave(next) {
//   try {
//     this.recalculateAggregates();
//     next();
//   } catch (e) {
//     next(e);
//   }
// });

// const AdminInventory = getAdminDB().model(
//   'AdminInventory',
//   AdminInventorySchema,
// );
// export default AdminInventory;

import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const { Schema } = mongoose;

// Simple tier pricing - just absolute values
const TierPricingSchema = new Schema(
  {
    consumer: { type: Number, default: 0 },
    retailer: { type: Number, default: 0 },
    wholesaler: { type: Number, default: 0 },
    distributor: { type: Number, default: 0 },
    super_stocker: { type: Number, default: 0 },
  },
  { _id: false },
);

const VariantInventorySchema = new Schema(
  {
    variantKey: { type: String, required: true }, // matches product variant quantity
    variantIndex: { type: Number, default: 0 },

    costPrice: { type: Number, required: true },
    mrp: { type: Number, required: true },
    tierPricing: TierPricingSchema, // Simple absolute prices

    initialStock: { type: Number, default: 0 },
    onHand: { type: Number, default: 0, index: true },
    reserved: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },

    inStock: { type: Boolean, default: true },

    // ADDED: Status field to match InVanInventory logic
    status: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock'],
      default: 'in_stock',
      index: true,
    },
    lowStockThreshold: { type: Number, default: 0 },
  },
  { _id: false },
);

const AdminInventorySchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productSlug: { type: String, index: true },
    name: { type: String, index: true },
    category: { type: String, index: true },
    image: { type: String },
    images: [{ type: String }],

    variants: { type: [VariantInventorySchema], default: [] },

    totalInitialStock: { type: Number, default: 0 },
    totalOnHand: { type: Number, default: 0, index: true },
    totalReserved: { type: Number, default: 0 },
    totalSold: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock'],
      default: 'in_stock',
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true },
);

AdminInventorySchema.index({
  category: 1,
  status: 1,
  totalOnHand: -1,
  createdAt: -1,
});
AdminInventorySchema.index({
  name: 'text',
  productSlug: 'text',
  category: 'text',
});

// UPDATED: Logic now matches InVanInventory exactly
AdminInventorySchema.methods.recalculateAggregates = function recalc() {
  // Step 1: Calculate totals
  const totals = this.variants.reduce(
    (acc, v) => {
      acc.initial += v.initialStock || 0;
      acc.onHand += v.onHand || 0;
      acc.reserved += v.reserved || 0;
      acc.sold += v.sold || 0;
      return acc;
    },
    { initial: 0, onHand: 0, reserved: 0, sold: 0 },
  );

  this.totalInitialStock = totals.initial;
  this.totalOnHand = totals.onHand;
  this.totalReserved = totals.reserved;
  this.totalSold = totals.sold;

  // Step 2: Calculate each variant's status
  this.variants = this.variants.map((v) => {
    // Keep boolean for backward compatibility if needed
    v.inStock = (v.onHand || 0) > 0;

    if (v.onHand <= 0) {
      v.status = 'out_of_stock';
    } else if (v.lowStockThreshold > 0 && v.onHand <= v.lowStockThreshold) {
      v.status = 'low_stock';
    } else {
      v.status = 'in_stock';
    }
    return v;
  });

  // Step 3: Calculate main status based on variant statuses
  const hasInStock = this.variants.some((v) => v.status === 'in_stock');
  const hasLowStock = this.variants.some((v) => v.status === 'low_stock');
  const allOutOfStock = this.variants.every((v) => v.status === 'out_of_stock');

  if (hasInStock) {
    this.status = 'in_stock';
  } else if (hasLowStock) {
    this.status = 'low_stock';
  } else if (allOutOfStock) {
    this.status = 'out_of_stock';
  } else {
    this.status = 'in_stock'; // default fallback
  }
};

AdminInventorySchema.pre('save', function preSave(next) {
  try {
    this.recalculateAggregates();
    next();
  } catch (e) {
    next(e);
  }
});

const AdminInventory = getAdminDB().model(
  'AdminInventory',
  AdminInventorySchema,
);
export default AdminInventory;
