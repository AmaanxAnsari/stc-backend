// // import mongoose from 'mongoose';
// // import { getAdminDB } from '../../config/db.js';

// // const couponsSchema = new mongoose.Schema(
// //   {
// //     title: {
// //       type: String,
// //       required: true,
// //       trim: true,
// //     },

// //     type: {
// //       type: String,
// //       required: true,
// //       trim: true,
// //     },
// //     value: {
// //       type: String,
// //       required: true,
// //       trim: true,
// //     },
// //     description: {
// //       type: String,
// //       required: true,
// //       trim: true,
// //     },
// //     minOrder: {
// //       type: String,
// //       required: true,
// //       trim: true,
// //     },
// //     validFrom: {
// //       type: String,
// //       required: true,
// //       trim: true,
// //     },
// //     validTill: {
// //       type: String,
// //       required: true,
// //       trim: true,
// //     },
// //     isDealOfTheDay: {
// //       type: Boolean,
// //       default: false,
// //     },
// //  termsAndConditions: {
// //       type: [String],
// //       required: true,
// //       validate: {
// //         validator: function (arr) {
// //           return arr.length > 0;
// //         },
// //         message: 'At least one term is required.',
// //       },
// //     },
// //     status: {
// //      type: Boolean, 
// //      default: true
// //     },
// //     use_count: {
// //       type: Number,
// //       default: 0,
// //     },

// //     // Activation and soft-delete flags consistent with your adminUser
// //     isActive: { type: Boolean, default: true, index: true },
// //     isDeleted: { type: Boolean, default: false, index: true },
// //     deletedAt: { type: Date, default: null },

// //     // Auditing
// //     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
// //     updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
// //   },
// //   { timestamps: true },
// // );

// // const Coupons = getAdminDB().model('Coupons', couponsSchema);
// // export default Coupons;
// import mongoose from 'mongoose';
// import { getAdminDB } from '../../config/db.js';

// const couponsSchema = new mongoose.Schema(
//   {
//     title: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     code: {
//       type: String,
//       required: true,
//       unique: true,
//       uppercase: true,
//       trim: true,
//     },

//     // Coupon Type: 'CART', 'PRODUCT', 'SCHEME'
//     couponType: {
//       type: String,
//       required: true,
//       enum: ['CART', 'PRODUCT', 'SCHEME'],
//       default: 'CART',
//     },

//     // Discount Configuration
//     discountType: {
//       type: String,
//       required: true,
//       enum: ['PERCENTAGE', 'FLAT', 'FREE_SHIPPING'],
//     },
//     discountValue: {
//       type: Number,
//       required: function () {
//         return this.discountType !== 'FREE_SHIPPING';
//       },
//     },

//     // Product-Specific Configuration
//     applicableProducts: [
//       {
//         productId: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: 'Product',
//         },
//         variantQuantity: String, // e.g., "100g", "200g"
//       },
//     ],

//     applicableCategories: [
//       {
//         type: String,
//       },
//     ],

//     // Scheme Configuration (BOGO, Buy X Get Y, etc.)
//     schemeConfig: {
//       schemeType: {
//         type: String,
//         enum: [
//           'BUY_X_GET_Y',
//           'BOGO',
//           'BUY_X_GET_Y_FREE',
//           'BUY_X_GET_DISCOUNT_ON_Y',
//         ],
//       },
//       buyProduct: {
//         productId: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: 'Product',
//         },
//         variantQuantity: String,
//         quantity: Number, // How many to buy
//       },
//       getProduct: {
//         productId: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: 'Product',
//         },
//         variantQuantity: String,
//         quantity: Number, // How many free/discounted
//         discountPercent: Number, // If partial discount (e.g., 50% off on Y)
//       },
//     },

//     description: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     minOrderValue: {
//       type: Number,
//       default: 0,
//     },

//     maxDiscountAmount: {
//       type: Number, // Cap for percentage discounts
//     },

//     validFrom: {
//       type: Date,
//       required: true,
//     },
//     validTill: {
//       type: Date,
//       required: true,
//     },

//     isDealOfTheDay: {
//       type: Boolean,
//       default: false,
//     },

//     termsAndConditions: {
//       type: [String],
//       required: true,
//       validate: {
//         validator: function (arr) {
//           return arr.length > 0;
//         },
//         message: 'At least one term is required.',
//       },
//     },

//     // Usage Restrictions
//     maxUsageLimit: {
//       type: Number, // Total times coupon can be used
//     },
//     usagePerUser: {
//       type: Number,
//       default: 1,
//     },
//     useCount: {
//       type: Number,
//       default: 0,
//     },

//     status: {
//       type: Boolean,
//       default: true,
//     },

//     // Activation and soft-delete flags
//     isActive: { type: Boolean, default: true, index: true },
//     isDeleted: { type: Boolean, default: false, index: true },
//     deletedAt: { type: Date, default: null },

//     // Auditing
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
//     updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
//   },
//   { timestamps: true },
// );

// // Indexes for performance
// couponsSchema.index({ code: 1, isActive: 1, isDeleted: 1 });
// couponsSchema.index({ couponType: 1 });
// couponsSchema.index({ validFrom: 1, validTill: 1 });
// couponsSchema.index({ 'applicableProducts.productId': 1 });
// couponsSchema.index({ applicableCategories: 1 });

// const Coupons = getAdminDB().model('Coupons', couponsSchema);
// export default Coupons;
import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const couponsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    // 1. Coupon Types: CART (Amount based), PRODUCT (Specific items), SCHEME (Buy X Get Y)
    couponType: {
      type: String,
      required: true,
      enum: ['CART', 'PRODUCT', 'SCHEME'],
    },

    // 2. Discount Config (For CART and PRODUCT)
    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'FLAT'],
      // Required if NOT Scheme
      required: function () {
        return this.couponType !== 'SCHEME';
      },
    },
    discountValue: {
      type: Number,
      required: function () {
        return this.couponType !== 'SCHEME';
      },
    },

    // 3. Product Specifics (For PRODUCT type)
    applicableProducts: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        variantQuantity: String,
      },
    ],
    applicableCategories: [{ type: String }],

    // 4. Scheme Config (For SCHEME type)
    schemeConfig: {
      buyProduct: {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        variantQuantity: String,
        quantity: { type: Number, default: 1 },
      },
      getProduct: {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        variantQuantity: String,
        quantity: { type: Number, default: 1 },
        discountPercent: { type: Number, default: 100 }, // 100% = Free
      },
    },

    description: { type: String, required: true },
    minOrderValue: { type: Number, default: 0 },
    maxDiscountAmount: { type: Number }, // Max cap for percentage

    validFrom: { type: Date, required: true },
    validTill: { type: Date, required: true },
    isDealOfTheDay: { type: Boolean, default: false },
    termsAndConditions: { type: [String], required: true },

    // 5. Limits & Usage
    maxUsageLimit: { type: Number }, // Global limit (e.g., first 100 users)
    usagePerUser: { type: Number, default: 1 }, // Per person limit
    useCount: { type: Number, default: 0 }, // Current global usage count

    // 6. Usage Logs (Stored directly in coupon)
    // We store userId as ObjectId but CANNOT use 'ref' because User is in a different DB.
    usageLogs: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, required: true }, // From AppDB
        orderId: { type: String },
        discountAmount: { type: Number },
        usedAt: { type: Date, default: Date.now },
      },
      
    ],

    // 7. Inventory Tracking
    isInventoryReserved: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true },
);

const Coupons = getAdminDB().model('Coupons', couponsSchema);
export default Coupons;
