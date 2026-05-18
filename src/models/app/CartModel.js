import mongoose from 'mongoose';
import { getAppDB } from '../../config/db.js';
const { Schema } = mongoose;

const cartItemSchema = new mongoose.Schema({
  cartItemId: { type: String, required: true },
  inventoryId: { type: Schema.Types.ObjectId, required: true }, // NEW
  productId: { type: Schema.Types.ObjectId, required: true },
  variantIndex: { type: Number, default: 0 },
  name: { type: String, required: true },
  image: { type: String },
  price: { type: Number, required: true }, // role-based price
  originalPrice: { type: Number }, // mrp
  quantity: { type: String }, // "500ml", "100g"
  category: { type: String },
  inStock: { type: Boolean, default: true },
  cartQuantity: { type: Number, default: 1 },
  availableStock: { type: Number, default: 0 }, // NEW - for validation
  addedAt: { type: Date, default: Date.now },
});

const cartSchema = new mongoose.Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userRole: { type: String, required: true, index: true },
    items: [cartItemSchema],
  },
  { timestamps: true },
);

const Cart = getAppDB().model('Cart', cartSchema);
export default Cart;

