import authRoute from '../routes/app/authRoutes.js';
import userRoute from '../routes/app/userRoutes.js';
import categoryRoute from '../routes/app/categoryRoutes.js';
import appOrderRoute from '../routes/app/appOrderRoutes.js';
import replacementOrderRoutes from '../routes/app/ReplacementOrderRoute.js';
import WishlistRoutes from '../routes/app/WishlistRoutes.js';
import CartRoutes from '../routes/app/CartRoutes.js';
import SpotOrderCartRoute from '../routes/app/SpotOrderCartRoute.js';
import InventoryRoutes from '../routes/app/InventoryRoutes.js';
import couponsRoutes from '../routes/app/couponsRoutes.js';
import bulkOrderRoutes from '../routes/app/BulkOrderRoutes.js';
import deliveryRouteRoutes from '../routes/app/deliveryRouteRoutes.js';
import InVanInventoryRoutes from '../routes/app/InVanInventoryRoutes.js';
import SpotOrderRoutes from '../routes/app/SpotOrderRoutes.js';
import razorpayRoutes from '../routes/app/razorpayRoutes.js';
import AssignOrderToPartnerRoutes from '../routes/app/AssignOrderToPartnerRoutes.js';

export default function appRouteInitializer(app) {
  app.use('/api/v1/auth', authRoute);
  app.use('/api/v1/users', userRoute);
  app.use('/api/v1/category', categoryRoute);
  app.use('/api/v1/orders', appOrderRoute);
  app.use('/api/v1/replacement', replacementOrderRoutes);
  app.use('/api/v1/delivery', deliveryRouteRoutes);
  app.use('/api/v1/bulk-order', bulkOrderRoutes);
  app.use('/api/v1/wishlist', WishlistRoutes);
  app.use('/api/v1/cart', CartRoutes);
  app.use('/api/v1/spot-cart', SpotOrderCartRoute);
  app.use('/api/v1/spot-order', SpotOrderRoutes);
  app.use('/api/v1/inventory', InventoryRoutes);
  app.use('/api/v1/van-inventory', InVanInventoryRoutes);
  app.use('/api/v1/coupon', couponsRoutes);
  app.use('/api/v1/payment', razorpayRoutes);
  app.use('/api/v1/partner', AssignOrderToPartnerRoutes);
}
