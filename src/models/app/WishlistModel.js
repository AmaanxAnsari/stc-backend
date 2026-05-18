import mongoose from 'mongoose';
import { getAppDB } from '../../config/db.js';

// const wishlistItemSchema = new mongoose.Schema({
//   productId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Product',
//     required: true,
//   },
//   name: {
//     type: String,
//     required: true,
//   },
//   image: {
//     type: String,
//   },
//   price: {
//     type: Number,
//     required: true,
//   },
//   originalPrice: {
//     type: Number,
//   },
//   quantity: {
//     type: String,
//     default: '',
//   },
//   category: {
//     type: String,
//   },
//   inStock: {
//     type: Boolean,
//     default: true,
//   },
//   rating: {
//     type: Number,
//     default: 0,
//   },
//   addedAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

const wishlistItemSchema = new mongoose.Schema(
  {
    inventoryId: { type: mongoose.Schema.Types.ObjectId, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    variantIndex: { type: Number, required: true, default: 0 },
    name: String,
    image: String,
    price: Number,
    originalPrice: Number,
    quantity: String, // variantKey label like "1 kg"
    category: String,
    inStock: { type: Boolean, default: true },
    rating: { type: Number, default: 0 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userRole: {
      type: String,
      required: true,
      // enum: ['consumer', 'distributor', 'admin'], // Adjust based on your roles
    },
    items: [wishlistItemSchema],
  },
  { timestamps: true },
);

// Ensure one wishlist per user-role pair
wishlistSchema.index({ userId: 1, userRole: 1 }, { unique: true });

const Wishlist = getAppDB().model('Wishlist', wishlistSchema);

export default Wishlist;
