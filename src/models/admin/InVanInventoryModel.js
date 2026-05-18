// import mongoose from 'mongoose';
// import { getAdminDB } from '../../config/db.js';

// const { Schema } = mongoose;

// // ONLY In-Van price
// const TierPricingSchema = new Schema(
//   {
//     inVanPrice: { type: Number, default: 0 },
//   },
//   { _id: false },
// );

// // Variant schema
// const VariantInventorySchema = new Schema(
//   {
//     variantKey: { type: String, required: true },
//     variantIndex: { type: Number, default: 0 },

//     costPrice: { type: Number, required: true },
//     mrp: { type: Number, required: true },

//     tierPricing: TierPricingSchema,

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

// // In-Van Inventory schema
// const InVanInventorySchema = new Schema(
//   {
//     vehicleId: {
//       type: Schema.Types.ObjectId,
//       ref: 'Vehicle',
//       required: true,
//       index: true,
//     },

//     routeId: {
//       type: Schema.Types.ObjectId,
//       ref: 'DeliveryRoute',
//       default: null,
//       index: true,
//     },

//     inventoryType: { type: String, default: 'in_van', index: true },

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

// // Aggregation logic (unchanged)
// InVanInventorySchema.methods.recalculateAggregates = function () {
//   const totals = this.variants.reduce(
//     (acc, v) => ({
//       initial: acc.initial + (v.initialStock || 0),
//       onHand: acc.onHand + (v.onHand || 0),
//       reserved: acc.reserved + (v.reserved || 0),
//       sold: acc.sold + (v.sold || 0),
//     }),
//     { initial: 0, onHand: 0, reserved: 0, sold: 0 },
//   );

//   this.totalInitialStock = totals.initial;
//   this.totalOnHand = totals.onHand;
//   this.totalReserved = totals.reserved;
//   this.totalSold = totals.sold;

//   if (this.totalOnHand <= 0) {
//     this.status = 'out_of_stock';
//   } else {
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
//     v.inStock = (v.onHand || 0) > 0;
//     return v;
//   });
// };

// // Pre-save hook
// InVanInventorySchema.pre('save', function (next) {
//   try {
//     this.recalculateAggregates();
//     next();
//   } catch (e) {
//     next(e);
//   }
// });

// const InVanInventory = getAdminDB().model(
//   'InVanInventory',
//   InVanInventorySchema,
// );

// export default InVanInventory;
import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const { Schema } = mongoose;

const TierPricingSchema = new Schema(
  {
    inVanPrice: { type: Number, default: 0 },
  },
  { _id: false },
);

const VariantInventorySchema = new Schema(
  {
    variantKey: { type: String, required: true },
    variantIndex: { type: Number, default: 0 },

    costPrice: { type: Number, required: true },
    mrp: { type: Number, required: true },

    tierPricing: TierPricingSchema,

    initialStock: { type: Number, default: 0 },
    onHand: { type: Number, default: 0, index: true },
    reserved: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },

    inStock: { type: Boolean, default: true },
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

const InVanInventorySchema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryVehicle',
      required: true,
      index: true,
    },

    routeId: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryRoute',
      default: null,
      index: true,
    },

    inventoryType: { type: String, default: 'in_van', index: true },

    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
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

// CORRECTED: Recalculate aggregates with proper status logic
InVanInventorySchema.methods.recalculateAggregates = function () {
  const totals = this.variants.reduce(
    (acc, v) => ({
      initial: acc.initial + (v.initialStock || 0),
      onHand: acc.onHand + (v.onHand || 0),
      reserved: acc.reserved + (v.reserved || 0),
      sold: acc.sold + (v.sold || 0),
    }),
    { initial: 0, onHand: 0, reserved: 0, sold: 0 },
  );

  this.totalInitialStock = totals.initial;
  this.totalOnHand = totals.onHand;
  this.totalReserved = totals.reserved;
  this.totalSold = totals.sold;

  // Step 1: Calculate each variant's status
  this.variants = this.variants.map((v) => {
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

  // Step 2: Calculate main status based on variant statuses
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
    this.status = 'in_stock'; // default
  }
};

// Pre-save hook
InVanInventorySchema.pre('save', function (next) {
  try {
    this.recalculateAggregates();
    next();
  } catch (e) {
    next(e);
  }
});

const InVanInventory = getAdminDB().model(
  'InVanInventory',
  InVanInventorySchema,
);

export default InVanInventory;
