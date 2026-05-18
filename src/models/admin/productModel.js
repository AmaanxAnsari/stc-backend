import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const { Schema } = mongoose;

const VariantSchema = new Schema(
  {
    quantity: { type: String }, // e.g., "100g", "500ml"
    costPrice: { type: Number },
    mrp: { type: Number },
    images: [{ type: String }],
  },
  { _id: true },
);

const FeatureTagSchema = new Schema(
  {
    title: { type: String },
    icon: { type: String },
  },
  { _id: false },
);

const SpecificationsSchema = new Schema(
  {
    brandType: { type: String },
    productType: { type: String },
    modelName: { type: String },
    fragrance: { type: String },
    suitableFor: { type: String },
    concentration: { type: String },
    usage: { type: String },
    form: { type: String },
    effectiveness: { type: String },
    suitable: { type: String },
    skinType: { type: String },
    ingredients: { type: String },
    pH: { type: String },
    benefits: { type: String },
    stickCount: { type: String },
    burnTime: { type: String },
  },
  { _id: false },
);

const ProductSchema = new Schema(
  {
    category: { type: String },
    name: { type: String },
    image: { type: String },
    // images: [{ type: String }],

    variants: [VariantSchema],

    specifications: SpecificationsSchema,
    description: { type: String },

    featureTags: [FeatureTagSchema],

    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },

    slug: {
      type: String,
      required: true,
      unique: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true },
);

ProductSchema.index({ isActive: 1, isDeleted: 1, category: 1, createdAt: -1 });
ProductSchema.index({ name: 1 });

const Product = getAdminDB().model('Product', ProductSchema);
export default Product;

// import mongoose from 'mongoose';
// import { getAdminDB } from '../../config/db.js';

// const { Schema } = mongoose;

// const VariantSchema = new Schema(
//   {
//     quantity: { type: String },
//     costPrice: { type: Number },
//     mrp: { type: Number },
//   },
//   { _id: false },
// );

// const FeatureTagSchema = new Schema(
//   {
//     title: { type: String },
//     icon: { type: String },
//   },
//   { _id: false },
// );

// const SpecificationsSchema = new Schema(
//   {
//     brandType: { type: String },
//     productType: { type: String },
//     modelName: { type: String },
//     fragrance: { type: String },
//     suitableFor: { type: String },
//     concentration: { type: String },
//     usage: { type: String },
//     form: { type: String },
//     effectiveness: { type: String },
//     suitable: { type: String },
//     skinType: { type: String },
//     ingredients: { type: String },
//     pH: { type: String },
//     benefits: { type: String },
//     stickCount: { type: String },
//     burnTime: { type: String },
//   },
//   { _id: false },
// );

// const ProductSchema = new Schema(
//   {
//     category: { type: String },
//     name: { type: String },
//     image: { type: String },
//     images: [{ type: String }],

//     variants: [VariantSchema],

//     specifications: SpecificationsSchema,
//     description: { type: String },

//     featureTags: [FeatureTagSchema],

//     rating: { type: Number, default: 0 },
//     reviewCount: { type: Number, default: 0 },

//     slug: {
//       type: String,
//       required: true,
//       unique: true,
//     },
//     isActive: { type: Boolean, default: true, index: true },
//     isDeleted: { type: Boolean, default: false, index: true },
//     deletedAt: { type: Date, default: null },

//     createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
//     updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
//   },
//   { timestamps: true },
// );

// // Helpful indexes for app queries
// ProductSchema.index({ isActive: 1, isDeleted: 1, category: 1, createdAt: -1 });
// ProductSchema.index({ name: 1 });

// const Product = getAdminDB().model('Product', ProductSchema);
// export default Product;

// import mongoose from 'mongoose';
// import { getAdminDB } from '../../config/db.js';

// const { Schema } = mongoose;

// const PackagingLevelSchema = new Schema(
//   {
//     levelName: { type: String, required: true }, // e.g., huge_box, small_box, pack, unit
//     displayName: { type: String }, // UI label
//     multiplierToChild: { type: Number, default: 1 }, // count of childLevel inside this level
//     childLevel: { type: String, default: null }, // next level name or null if bottom
//     sku: { type: String },
//     barcode: { type: String },
//   },
//   { _id: false },
// );

// const ConversionTreeSchema = new Schema(
//   {
//     rootLevel: { type: String, required: true }, // top-most level
//     bottomLevel: { type: String, required: true }, // typically 'unit'
//     levels: { type: [PackagingLevelSchema], default: [] },
//   },
//   { _id: false },
// );

// const VariantSchema = new Schema(
//   {
//     quantity: { type: String }, // "500 ml", "1 L", "200 g"
//     costPrice: { type: Number },
//     mrp: { type: Number },
//     inStock: { type: Boolean, default: true },

//     // Optional media per variant (if you already store images per variant)
//     images: [{ type: String }],

//     // New: conversions owned by product
//     conversion: ConversionTreeSchema,

//     // Optional variant identity
//     sku: { type: String },
//     barcode: { type: String },
//   },
//   { _id: true },
// );

// const FeatureTagSchema = new Schema(
//   { title: { type: String }, icon: { type: String } },
//   { _id: false },
// );

// const SpecificationsSchema = new Schema(
//   {
//     brandType: { type: String },
//     productType: { type: String },
//     modelName: { type: String },
//     fragrance: { type: String },
//     suitableFor: { type: String },
//     concentration: { type: String },
//     usage: { type: String },
//     form: { type: String },
//     effectiveness: { type: String },
//     suitable: { type: String },
//     skinType: { type: String },
//     ingredients: { type: String },
//     pH: { type: String },
//     benefits: { type: String },
//     stickCount: { type: String },
//     burnTime: { type: String },
//   },
//   { _id: false },
// );

// const ProductSchema = new Schema(
//   {
//     category: { type: String },
//     name: { type: String, index: true },
//     image: { type: String },
//     images: [{ type: String }],

//     variants: [VariantSchema],

//     specifications: SpecificationsSchema,
//     description: { type: String },

//     featureTags: [FeatureTagSchema],

//     rating: { type: Number, default: 0 },
//     reviewCount: { type: Number, default: 0 },

//     slug: { type: String, required: true, unique: true },
//     isActive: { type: Boolean, default: true, index: true },
//     isDeleted: { type: Boolean, default: false, index: true },
//     deletedAt: { type: Date, default: null },

//     createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
//     updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
//   },
//   { timestamps: true },
// );

// ProductSchema.index({ isActive: 1, isDeleted: 1, category: 1, createdAt: -1 });

// const Product = getAdminDB().model('Product', ProductSchema);
// export default Product;
