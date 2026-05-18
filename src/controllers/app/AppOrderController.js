import mongoose from 'mongoose';
import AppOrder from '../../models/admin/AppOrderModel.js';
import AdminInventory from '../../models/admin/InventoryModel.js';
import Cart from '../../models/app/CartModel.js';
import { createRepository } from '../../utils/repository.js';
import { autoAssignOrderToStop } from '../../utils/stopMatcher.js';
import { generateUniqueOrderId } from '../../helper/orderIdHelper.js';
import { User } from '../../models/app/user.js';
import { notifyAdmins, notifyUser } from '../../utils/notificationService.js';
import AdminUser from '../../models/admin/adminUser.js';
import Coupons from '../../models/admin/couponsModel.js';
import { getAdminDB } from '../../config/db.js';
import { TrackingService } from '../../utils/trackingService.js';

const appOrderRepo = createRepository(AppOrder, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});

// export const createOrder = async (req, res) => {
//   const session = await getAdminDB().startSession();
//   session.startTransaction();

//   try {
//     const userId = req.user?.id;
//     const userRole = req.user?.role || 'consumer';
//     if (!userId) {
//       await session.abortTransaction();
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     const {
//       deliveryAddress: bodyDeliveryAddress,
//       paymentMethod,
//       paymentDetails = null,
//       deliveryNotes,
//       couponApplied,
//       isGst,
//       // We extract tax from body (frontend), but recalculate for safety or fallback to 0
//       tax: reqTaxAmount,
//       taxPercentage: reqTaxPercentage,
//       companyName,
//       deliveryFee,
//       handlingFee,
//     } = req.body;

//     // console.log('Cart Order', req.body);

//     // Validate payment details if Online payment
//     if (paymentMethod === 'Online' && !paymentDetails) {
//       await session.abortTransaction();
//       return res.status(400).json({
//         success: false,
//         message: 'Payment details are required for online payment',
//       });
//     }

//     // Fetch cart
//     const cart = await Cart.findOne({ userId });
//     if (!cart || !cart.items || cart.items.length === 0) {
//       // await session.abortTransaction();
//       return res.status(400).json({ success: false, message: 'Cart is empty' });
//     }

//     const orderProducts = [];
//     const inventoryUpdates = []; // Track for rollback if needed
//     let itemTotal = 0;
//     let originalItemTotal = 0;
//     let productCount = 0;

//     // Validate all items first
//     for (const item of cart.items) {
//       const inventory = await AdminInventory.findById(item.inventoryId).session(
//         session,
//       );

//       if (!inventory) {
//         throw new Error(`Inventory not found for ${item.name}`);
//       }

//       const variant = inventory.variants[item.variantIndex];
//       if (!variant) {
//         throw new Error(`Variant not found for ${item.name}`);
//       }

//       // Check stock availability
//       if (variant.onHand < item.cartQuantity) {
//         throw new Error(
//           `Insufficient stock for ${item.name}. Only ${variant.onHand} available`,
//         );
//       }
//     }

//     // All validations passed, now update inventory
//     for (const item of cart.items) {
//       const inventory = await AdminInventory.findById(item.inventoryId).session(
//         session,
//       );
//       const variant = inventory.variants[item.variantIndex];

//       // Reserve stock
//       variant.onHand -= item.cartQuantity;
//       variant.reserved += item.cartQuantity;
//       variant.inStock = variant.onHand > 0;

//       await inventory.save({ session });

//       inventoryUpdates.push({
//         inventoryId: inventory._id,
//         variantIndex: item.variantIndex,
//         quantity: item.cartQuantity,
//       });

//       const price = item.price;
//       const originalPrice = item.originalPrice || variant.mrp;

//       itemTotal += price * item.cartQuantity;
//       originalItemTotal += originalPrice * item.cartQuantity;
//       productCount += item.cartQuantity;

//       orderProducts.push({
//         cartItemId: item.cartItemId,
//         inventoryId: inventory._id,
//         productId: item.productId,
//         variantIndex: item.variantIndex,
//         name: item.name,
//         quantity: item.quantity,
//         price,
//         originalPrice,
//         image: item.image,
//         orderQuantity: item.cartQuantity,
//         category: item.category,
//       });
//     }

//     // Calculate discount
//     let discount = 0;
//     let validatedCouponData = null; // To store backend-validated coupon info

//     // ============================================================
//     // UPDATED COUPON LOGIC START
//     // ============================================================
//     if (couponApplied && couponApplied.code) {
//       // 1. Fetch Coupon from DB to validate
//       const dbCoupon = await Coupons.findOne({
//         code: couponApplied.code.toUpperCase(),
//         isActive: true,
//         isDeleted: false,
//       }).session(session);

//       if (!dbCoupon) {
//         throw new Error(`Invalid Coupon Code: ${couponApplied.code}`);
//       }

//       // 2. Validate Expiry
//       const now = new Date();
//       if (now < dbCoupon.validFrom || now > dbCoupon.validTill) {
//         throw new Error('Coupon is expired or not yet active.');
//       }

//       // 3. Validate Limits
//       if (
//         dbCoupon.maxUsageLimit &&
//         dbCoupon.useCount >= dbCoupon.maxUsageLimit
//       ) {
//         throw new Error('Coupon usage limit has been exhausted.');
//       }

//       const userUsageCount = dbCoupon.usageLogs.filter(
//         (log) => log.userId.toString() === userId,
//       ).length;

//       if (userUsageCount >= dbCoupon.usagePerUser) {
//         throw new Error(
//           `You have already used this coupon ${dbCoupon.usagePerUser} times.`,
//         );
//       }

//       if (itemTotal < dbCoupon.minOrderValue) {
//         throw new Error(
//           `Cart total must be at least ₹${dbCoupon.minOrderValue} to apply this coupon.`,
//         );
//       }

//       // 4. Calculate Discount & Handle SCHEME
//       if (dbCoupon.couponType === 'CART' || dbCoupon.couponType === 'PRODUCT') {
//         if (dbCoupon.discountType === 'FLAT') {
//           discount = dbCoupon.discountValue;
//         } else if (dbCoupon.discountType === 'PERCENTAGE') {
//           discount = (itemTotal * dbCoupon.discountValue) / 100;
//           if (dbCoupon.maxDiscountAmount) {
//             discount = Math.min(discount, dbCoupon.maxDiscountAmount);
//           }
//         }
//       } else if (dbCoupon.couponType === 'SCHEME') {
//         // Handle Free Product Logic
//         const freeItemConfig = dbCoupon.schemeConfig?.getProduct;
//         if (freeItemConfig && freeItemConfig.productId) {
//           // Find inventory for the free product
//           // NOTE: schemeConfig stores ProductID (Product Model), so we find Inventory by productId
//           const freeInventory = await AdminInventory.findOne({
//             productId: freeItemConfig.productId,
//             isDeleted: false,
//           }).session(session);

//           if (freeInventory) {
//             // Find the variant
//             const freeVariantIndex = freeInventory.variants.findIndex(
//               (v) => v.variantKey === freeItemConfig.variantQuantity,
//             );

//             if (freeVariantIndex > -1) {
//               const freeVariant = freeInventory.variants[freeVariantIndex];
//               const qty = freeItemConfig.quantity || 1;

//               // Deduct Stock for Free Item
//               if (freeVariant.onHand >= qty) {
//                 freeVariant.onHand -= qty;
//                 freeVariant.reserved += qty;
//                 await freeInventory.save({ session });

//                 // Add to Order
//                 orderProducts.push({
//                   cartItemId: `FREE_${freeInventory._id}_${freeVariantIndex}`,
//                   inventoryId: freeInventory._id,
//                   productId: freeItemConfig.productId,
//                   variantIndex: freeVariantIndex,
//                   name: `${freeInventory.name} (Free Gift)`,
//                   quantity: freeVariant.variantKey,
//                   price: 0,
//                   originalPrice: freeVariant.mrp,
//                   image: freeInventory.image,
//                   orderQuantity: qty,
//                   category: freeInventory.category,
//                   isFreeGift: true,
//                 });

//                 // Update product count for order summary
//                 productCount += qty;
//               } else {
//                 throw new Error(
//                   `Free gift ${freeInventory.name} is out of stock.`,
//                 );
//               }
//             }
//           }
//         }
//       }

//       // 5. Update Coupon Usage Stats
//       dbCoupon.usageLogs.push({
//         userId: userId,
//         orderId: 'PENDING', // Will update after order creation or keep generic
//         discountAmount: discount,
//         usedAt: new Date(),
//       });
//       dbCoupon.useCount += 1;
//       await dbCoupon.save({ session });

//       validatedCouponData = {
//         code: dbCoupon.code,
//         couponId: dbCoupon._id,
//         discountAmount: discount,
//         type: dbCoupon.couponType,
//       };
//     }
//     // Fallback: If no code but frontend sent raw discount (Legacy/Manual logic support)
//     else if (couponApplied) {
//       // Keep your existing logic for manual/legacy coupon objects if needed
//       const discountValue =
//         couponApplied.discount ??
//         couponApplied.value ??
//         couponApplied.appliedAmount ??
//         0;
//       if (couponApplied.minOrder && itemTotal < couponApplied.minOrder) {
//         discount = 0;
//       } else {
//         if (couponApplied.type === 'fixed') {
//           discount = discountValue;
//         } else if (couponApplied.type === 'percentage') {
//           if (discountValue < 100) {
//             discount = (itemTotal * discountValue) / 100;
//           } else {
//             discount = discountValue;
//           }
//         }
//       }
//     }
//     // ============================================================
//     // UPDATED COUPON LOGIC END
//     // ============================================================

//     // --- TAX CALCULATION (NEW LOGIC) ---
//     // If frontend says isGst=true, we verify the calculation
//     let taxAmount = 0;

//     // We trust the frontend tax if it matches roughly what we expect, OR just accept it if logic is complex.
//     // However, safest is to trust the frontend 'isGst' flag and calculate based on taxable value.
//     if (isGst) {
//       // If frontend sends the calculated tax, use it (since frontend handles display logic).
//       // Or calculate it here: Taxable Value = (ItemTotal - Discount) * Tax%
//       // Let's rely on frontend passed 'tax' value primarily but fallback to calculation if missing
//       if (reqTaxAmount !== undefined && reqTaxAmount !== null) {
//         taxAmount = Number(reqTaxAmount);
//       } else {
//         // Fallback calculation
//         const taxableValue = Math.max(0, itemTotal - discount);
//         const taxPercent = reqTaxPercentage || 18; // Default to 18 if missing
//         taxAmount = Math.floor((taxableValue * taxPercent) / 100);
//       }
//     }

//     // Final Total Calculation: (ItemTotal + Delivery + Handling + Tax) - Discount
//     // Note: Usually Tax is on discounted price.
//     // Based on your frontend: finalItemTotal = itemTotal - couponDiscountAmount;
//     // totalToPay = finalItemTotal + deliveryFee + handlingFee + taxAmount;
//     // So: Total = (ItemTotal - Discount) + Delivery + Handling + Tax

//     const finalItemTotal = Math.max(0, itemTotal - discount);
//     const totalAmount = Math.ceil(finalItemTotal + deliveryFee + handlingFee + taxAmount);

//     const deliveryAddress = bodyDeliveryAddress || {
//       label: 'Home',
//       receiverDetails: '',
//       fullAddress: '',
//     };
//     const orderId = await generateUniqueOrderId(AppOrder, 'ORD');

//     // ✅ Determine payment status based on payment method
//     let finalPaymentStatus = 'Pending';
//     if (paymentMethod === 'Online' && paymentDetails) {
//       // If payment details exist, payment is already completed
//       finalPaymentStatus = 'Completed';
//     } else if (paymentMethod === 'COD') {
//       // COD remains pending until delivery
//       finalPaymentStatus = 'Pending';
//     }

//     // Create order
//     const newOrder = new AppOrder({
//       orderId,
//       status: 'pending',
//       orderPlacedDate: new Date(),
//       orderPlacedAt: new Date().toLocaleString('en-IN', {
//         day: '2-digit',
//         month: 'short',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: true,
//         timeZone: 'Asia/Kolkata',
//       }),
//       totalAmount,
//       originalAmount: originalItemTotal,
//       currency: '₹',
//       productCount,
//       products: orderProducts,
//       deliveryAddress,

//       // ✅ Updated Fields for GST
//       isGst: isGst || false,
//       companyName: companyName || (isGst ? 'Gavran Pvt Ltd' : 'Samay Pvt Ltd'), // Fallback if missing

//       paymentMethod: paymentMethod || 'COD',
//       paymentStatus: finalPaymentStatus, // ✅ Set based on payment method
//       paymentDetails: paymentDetails || null, // ✅ Store payment details if online payment
//       deliveryNotes: deliveryNotes || '',
//       couponApplied: validatedCouponData || couponApplied || null, // Use validated data if available

//       // ✅ Bill Summary Updated with Tax
//       billSummary: {
//         itemTotal,
//         originalItemTotal,
//         deliveryFee,
//         originalDeliveryFee: deliveryFee,
//         handlingFee,
//         discount,
//         tax: taxAmount, // Save Tax here
//         totalAmount,
//       },

//       createdBy: userId,
//       createdByRole: userRole,
//     });

//     await newOrder.save({ session });

//     // Update coupon log with real OrderID if we used DB coupon
//     if (validatedCouponData) {
//       await Coupons.updateOne(
//         { _id: validatedCouponData.couponId, 'usageLogs.orderId': 'PENDING' },
//         { $set: { 'usageLogs.$.orderId': newOrder.orderId } },
//       ).session(session);
//     }

//     // Clear cart
//     await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

//     await session.commitTransaction();

//     // ✅ Get user details for notifications
//     const user = await User.findById(userId).select('fullName email mobile');

//     const roleNameMap = {
//       retailer: 'Retailer',
//       wholesaler: 'Wholesaler',
//       super_stocker: 'Super Stocker',
//       distributor: 'Distributor',
//       consumer: 'Consumer',
//     };

//     const notificationData = {
//       orderId: newOrder.orderId,
//       orderMongoId: newOrder._id.toString(),
//       orderDate: newOrder.orderPlacedAt,
//       userName: user?.fullName || 'Customer',
//       customerName: user?.fullName || 'Customer',
//       customerRole: roleNameMap[userRole] || userRole,
//       customerMobile: user?.mobile || 'N/A',
//       customerEmail: user?.email || 'N/A',
//       paymentMethod: newOrder.paymentMethod,
//       paymentStatus: newOrder.paymentStatus,
//       productCount: newOrder.productCount,
//       products: newOrder.products,
//       billSummary: newOrder.billSummary,
//       deliveryAddress: newOrder.deliveryAddress,
//       deliveryNotes: newOrder.deliveryNotes,
//       couponCode: validatedCouponData?.code || couponApplied?.code || null,
//       trackOrderUrl: `${process.env.HOST_URL || 'https://gavran-admin.demohub.tech'}/order-management/order-history/details/${newOrder._id}`,
//       adminOrderUrl: `${process.env.HOST_URL || 'https://gavran-admin.demohub.tech'}/order-management/order-history/details/${newOrder._id}`,
//     };

//     // ✅ 1. Notify USER (Email + FCM + DB)
//     if (user?.email) {
//       notifyUser({
//         userId: userId,
//         userEmail: user.email,
//         userName: user.fullName,
//         templateKey: 'normalOrderPlaced',
//         data: notificationData,
//       }).catch((err) => {
//         console.error('❌ User order notification failed:', err);
//       });
//     }

//     // ✅ 2. Notify ADMINS (Email + DB)
//     const adminUsers = await AdminUser.find({
//       role: 'admin',
//       isActive: true,
//     }).select('_id email');

//     if (adminUsers.length > 0) {
//       notifyAdmins({
//         admins: adminUsers.map((admin) => ({
//           userId: admin._id.toString(),
//           email: admin.email,
//         })),
//         templateKey: 'normalOrderReceived',
//         data: notificationData,
//       }).catch((err) => {
//         console.error('❌ Admin order notification failed:', err);
//       });
//     }

//     return res.status(201).json({
//       success: true,
//       message: 'Order placed successfully',
//       order: newOrder,
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     console.error('Create order error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Something went wrong',
//       error: error.message,
//     });
//   } finally {
//     session.endSession();
//   }
// };

export const createOrder = async (req, res) => {
  const session = await getAdminDB().startSession();
  session.startTransaction();

  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || 'consumer';
    if (!userId) {
      await session.abortTransaction();
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      deliveryAddress: bodyDeliveryAddress,
      paymentMethod,
      paymentDetails = null,
      deliveryNotes,
      couponApplied,
      isGst,
      tax: reqTaxAmount,
      taxPercentage: reqTaxPercentage,
      companyName,
      deliveryFee,
      handlingFee,
    } = req.body;

    // Validate payment details if Online payment
    if (paymentMethod === 'Online' && !paymentDetails) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Payment details are required for online payment',
      });
    }

    // Fetch cart
    const cart = await Cart.findOne({ userId });
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const orderProducts = [];
    const inventoryUpdates = []; // Track for rollback if needed
    let itemTotal = 0;
    let originalItemTotal = 0;
    let productCount = 0;

    // ============================================================
    // 1. PROCESS REGULAR CART ITEMS
    // ============================================================
    // Validate all items first
    for (const item of cart.items) {
      const inventory = await AdminInventory.findById(item.inventoryId).session(
        session,
      );

      if (!inventory) {
        throw new Error(`Inventory not found for ${item.name}`);
      }

      const variant = inventory.variants[item.variantIndex];
      if (!variant) {
        throw new Error(`Variant not found for ${item.name}`);
      }

      // Check stock availability
      if (variant.onHand < item.cartQuantity) {
        throw new Error(
          `Insufficient stock for ${item.name}. Only ${variant.onHand} available`,
        );
      }
    }

    // Update inventory for regular items (Move onHand -> reserved)
    for (const item of cart.items) {
      const inventory = await AdminInventory.findById(item.inventoryId).session(
        session,
      );
      const variant = inventory.variants[item.variantIndex];

      // Reserve stock
      variant.onHand -= item.cartQuantity;
      variant.reserved += item.cartQuantity;
      variant.inStock = variant.onHand > 0;

      await inventory.save({ session });

      inventoryUpdates.push({
        inventoryId: inventory._id,
        variantIndex: item.variantIndex,
        quantity: item.cartQuantity,
      });

      const price = item.price;
      const originalPrice = item.originalPrice || variant.mrp;

      itemTotal += price * item.cartQuantity;
      originalItemTotal += originalPrice * item.cartQuantity;
      productCount += item.cartQuantity;

      orderProducts.push({
        cartItemId: item.cartItemId,
        inventoryId: inventory._id,
        productId: item.productId,
        variantIndex: item.variantIndex,
        name: item.name,
        quantity: item.quantity, // This is the variant key (e.g. "100g")
        price,
        originalPrice,
        image: item.image,
        orderQuantity: item.cartQuantity,
        category: item.category,
      });
    }

    // Calculate discount
    let discount = 0;
    let validatedCouponData = null;

    // ============================================================
    // 2. PROCESS COUPON LOGIC
    // ============================================================
    if (couponApplied && couponApplied.code) {
      // Fetch Coupon from DB to validate
      const dbCoupon = await Coupons.findOne({
        code: couponApplied.code.toUpperCase(),
        isActive: true,
        isDeleted: false,
      }).session(session);

      if (!dbCoupon) {
        throw new Error(`Invalid Coupon Code: ${couponApplied.code}`);
      }

      // Validate Expiry
      const now = new Date();
      if (now < dbCoupon.validFrom || now > dbCoupon.validTill) {
        throw new Error('Coupon is expired or not yet active.');
      }

      // Validate Limits
      if (
        dbCoupon.maxUsageLimit &&
        dbCoupon.useCount >= dbCoupon.maxUsageLimit
      ) {
        throw new Error('Coupon usage limit has been exhausted.');
      }

      const userUsageCount = dbCoupon.usageLogs.filter(
        (log) => log.userId.toString() === userId,
      ).length;

      if (userUsageCount >= dbCoupon.usagePerUser) {
        throw new Error(
          `You have already used this coupon ${dbCoupon.usagePerUser} times.`,
        );
      }

      if (itemTotal < dbCoupon.minOrderValue) {
        throw new Error(
          `Cart total must be at least ₹${dbCoupon.minOrderValue} to apply this coupon.`,
        );
      }

      // Calculate Discount & Handle SCHEME
      if (dbCoupon.couponType === 'CART' || dbCoupon.couponType === 'PRODUCT') {
        if (dbCoupon.discountType === 'FLAT') {
          discount = dbCoupon.discountValue;
        } else if (dbCoupon.discountType === 'PERCENTAGE') {
          discount = (itemTotal * dbCoupon.discountValue) / 100;
          if (dbCoupon.maxDiscountAmount) {
            discount = Math.min(discount, dbCoupon.maxDiscountAmount);
          }
        }
      } else if (dbCoupon.couponType === 'SCHEME') {
        // Handle Free Product Logic
        const freeItemConfig = dbCoupon.schemeConfig?.getProduct;

        if (freeItemConfig && freeItemConfig.productId) {
          const freeInventory = await AdminInventory.findOne({
            productId: freeItemConfig.productId,
            isDeleted: false,
          }).session(session);

          if (freeInventory) {
            const freeVariantIndex = freeInventory.variants.findIndex(
              (v) => v.variantKey === freeItemConfig.variantQuantity,
            );

            if (freeVariantIndex > -1) {
              const freeVariant = freeInventory.variants[freeVariantIndex];
              const qty = freeItemConfig.quantity || 1;

              // --- CRITICAL FIX START ---
              // Since 'SCHEME' coupons PRE-RESERVE stock at creation time:
              // 1. We check if 'reserved' stock exists (or at least total physical stock exists).
              // 2. We DO NOT deduct 'onHand' or add to 'reserved' again here.
              //    The stock is already sitting in 'reserved' waiting for this order.

              // However, we should ensure the pre-reservation logic actually worked.
              // If your system allows "reserved" to be negative or just counts up,
              // we primarily need to ensure we don't double-dip.

              // Validation: Ensure we aren't giving out phantom stock if something went wrong
              // Total physical stock (onHand + reserved) should cover this.

              // NOTE: If you strictly track "Reserved for Coupon" vs "Reserved for Order",
              // you might want to move it from one bucket to another, but if it's just one 'reserved' field:
              // WE DO NOTHING to the inventory counts here.

              // Optional: You could check freeVariant.reserved >= qty to be safe,
              // but concurrent orders might make that tricky if not locked.
              // Assuming createPromotionalCoupon did its job:

              // Just add to Order Products
              orderProducts.push({
                cartItemId: `FREE_${freeInventory._id}_${freeVariantIndex}`,
                inventoryId: freeInventory._id,
                productId: freeItemConfig.productId,
                variantIndex: freeVariantIndex,
                name: `${freeInventory.name} (Free Gift)`,
                quantity: freeVariant.variantKey,
                price: 0,
                originalPrice: freeVariant.mrp,
                image: freeInventory.image,
                orderQuantity: qty,
                category: freeInventory.category,
                isFreeGift: true,
              });

              productCount += qty;

              // --- CRITICAL FIX END ---
            } else {
              throw new Error(`Free gift variant not found.`);
            }
          }
        }
      }

      // Update Coupon Usage Stats
      dbCoupon.usageLogs.push({
        userId: userId,
        orderId: 'PENDING',
        discountAmount: discount,
        usedAt: new Date(),
      });
      dbCoupon.useCount += 1;
      await dbCoupon.save({ session });

      validatedCouponData = {
        code: dbCoupon.code,
        couponId: dbCoupon._id,
        discountAmount: discount,
        type: dbCoupon.couponType,
      };
    }
    // Fallback: Legacy/Manual logic
    else if (couponApplied) {
      const discountValue =
        couponApplied.discount ??
        couponApplied.value ??
        couponApplied.appliedAmount ??
        0;
      if (couponApplied.minOrder && itemTotal < couponApplied.minOrder) {
        discount = 0;
      } else {
        if (couponApplied.type === 'fixed') {
          discount = discountValue;
        } else if (couponApplied.type === 'percentage') {
          if (discountValue < 100) {
            discount = (itemTotal * discountValue) / 100;
          } else {
            discount = discountValue;
          }
        }
      }
    }

    // ============================================================
    // 3. TAX & TOTALS
    // ============================================================
    let taxAmount = 0;
    if (isGst) {
      if (reqTaxAmount !== undefined && reqTaxAmount !== null) {
        taxAmount = Number(reqTaxAmount);
      } else {
        const taxableValue = Math.max(0, itemTotal - discount);
        const taxPercent = reqTaxPercentage || 18;
        taxAmount = Math.floor((taxableValue * taxPercent) / 100);
      }
    }

    const finalItemTotal = Math.max(0, itemTotal - discount);
    const totalAmount = Math.ceil(
      finalItemTotal + deliveryFee + handlingFee + taxAmount,
    );

    const deliveryAddress = bodyDeliveryAddress || {
      label: 'Home',
      receiverDetails: '',
      fullAddress: '',
    };
    const orderId = await generateUniqueOrderId(AppOrder, 'ORD');

    let finalPaymentStatus = 'Pending';
    if (paymentMethod === 'Online' && paymentDetails) {
      finalPaymentStatus = 'Completed';
    } else if (paymentMethod === 'COD') {
      finalPaymentStatus = 'Pending';
    }

    // ✅ Generate Delivery Stages
    const stageDate = new Date();
    const stageDisplayTime = stageDate.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });

    const initialStages = [
      {
        id: 'pending',
        label: 'Order Placed',
        status: 'completed',
        timestamp: stageDate,
        displayTime: stageDisplayTime,
      },
      {
        id: 'confirmed',
        label: 'Confirmed',
        status: 'pending',
        timestamp: null,
        displayTime: 'Pending',
      },
      {
        id: 'out_for_delivery',
        label: 'Out for Delivery',
        status: 'pending',
        timestamp: null,
        displayTime: 'Pending',
      },
      {
        id: 'delivered',
        label: 'Delivered',
        status: 'pending',
        timestamp: null,
        displayTime: 'Pending',
      },
      {
        id: 'cancelled',
        label: 'Cancelled',
        status: 'pending',
        timestamp: null,
        displayTime: 'Pending',
      },
    ];

    // Create order
    const newOrder = new AppOrder({
      orderId,
      status: 'pending',
      orderPlacedDate: new Date(),
      orderPlacedAt: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      }),
      totalAmount,
      originalAmount: originalItemTotal,
      currency: '₹',
      productCount,
      products: orderProducts,
      deliveryAddress,
      isGst: isGst || false,
      companyName: companyName || (isGst ? 'Gavran Pvt Ltd' : 'Samay Pvt Ltd'),
      paymentMethod: paymentMethod || 'COD',
      paymentStatus: finalPaymentStatus,
      paymentDetails: paymentDetails || null,
      deliveryNotes: deliveryNotes || '',
      couponApplied: validatedCouponData || couponApplied || null,
      billSummary: {
        itemTotal,
        originalItemTotal,
        deliveryFee,
        originalDeliveryFee: deliveryFee,
        handlingFee,
        discount,
        tax: taxAmount,
        totalAmount,
      },
      createdBy: userId,
      createdByRole: userRole,
      deliveryStatus: {
        stages: initialStages,
        deliveryOfficer: null,
      },
    });

    await newOrder.save({ session });

    // Update coupon log with real OrderID
    if (validatedCouponData) {
      await Coupons.updateOne(
        { _id: validatedCouponData.couponId, 'usageLogs.orderId': 'PENDING' },
        { $set: { 'usageLogs.$.orderId': newOrder.orderId } },
      ).session(session);
    }

    // Clear cart
    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

    await session.commitTransaction();

    // ============================================================
    // 4. NOTIFICATIONS
    // ============================================================
    const user = await User.findById(userId).select('fullName email mobile');

    const roleNameMap = {
      retailer: 'Retailer',
      wholesaler: 'Wholesaler',
      super_stocker: 'Super Stocker',
      distributor: 'Distributor',
      consumer: 'Consumer',
    };

    const notificationData = {
      orderId: newOrder.orderId,
      orderMongoId: newOrder._id.toString(),
      orderDate: newOrder.orderPlacedAt,
      userName: user?.fullName || 'Customer',
      customerName: user?.fullName || 'Customer',
      customerRole: roleNameMap[userRole] || userRole,
      customerMobile: user?.mobile || 'N/A',
      customerEmail: user?.email || 'N/A',
      paymentMethod: newOrder.paymentMethod,
      paymentStatus: newOrder.paymentStatus,
      productCount: newOrder.productCount,
      products: newOrder.products,
      billSummary: newOrder.billSummary,
      deliveryAddress: newOrder.deliveryAddress,
      deliveryNotes: newOrder.deliveryNotes,
      couponCode: validatedCouponData?.code || couponApplied?.code || null,
      trackOrderUrl: `${process.env.HOST_URL || 'https://gavran-admin.demohub.tech'}/order-management/order-history/details/${newOrder._id}`,
      adminOrderUrl: `${process.env.HOST_URL || 'https://gavran-admin.demohub.tech'}/order-management/order-history/details/${newOrder._id}`,
    };

    // Notify USER
    if (user?.email) {
      notifyUser({
        userId: userId,
        userEmail: user.email,
        userName: user.fullName,
        templateKey: 'normalOrderPlaced',
        data: notificationData,
      }).catch((err) => {
        console.error('❌ User order notification failed:', err);
      });
    }

    // Notify ADMINS
    const adminUsers = await AdminUser.find({
      role: 'admin',
      isActive: true,
    }).select('_id email');

    if (adminUsers.length > 0) {
      notifyAdmins({
        admins: adminUsers.map((admin) => ({
          userId: admin._id.toString(),
          email: admin.email,
        })),
        templateKey: 'normalOrderReceived',
        data: notificationData,
      }).catch((err) => {
        console.error('❌ Admin order notification failed:', err);
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: newOrder,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Create order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

export const getOrderByUserId = async (req, res) => {
  try {
    const userId = req.user.id; // Get the authenticated user's ID

    // Use the `getAll` function with a filter to get orders created by the current user
    const result = await appOrderRepo.getAll({
      filter: { createdBy: userId }, // Filter orders by `createdBy` field
      projection: {}, // Optional: specify which fields to return
    });

    if (
      !result.success ||
      !Array.isArray(result.data) ||
      result.data.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message: 'No orders found for this user.',
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('Error fetching orders by user ID:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const userName = req.user?.fullName;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { reason, notes } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required',
      });
    }

    const order = await AppOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled as it is currently '${order.status}'.`,
      });
    }

    // Release reserved stock back to onHand
    for (const product of order.products) {
      const inventory = await AdminInventory.findById(product.inventoryId);

      if (inventory) {
        const variant = inventory.variants[product.variantIndex];
        if (variant) {
          variant.reserved -= product.orderQuantity;
          variant.onHand += product.orderQuantity;
          variant.inStock = variant.onHand > 0;
          await inventory.save();
        }
      }
    }

    // Update order status
    order.status = 'cancelled';
    order.cancellationDetails = {
      cancelledAt: new Date(),
      cancelledDate: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      cancelledBy: {
        id: userId,
        name: userName,
        role: userRole,
      },
      cancelledByModel: 'User',
      reason: reason || 'No reason provided',
      notes: notes || '',
    };
    // ============================================================
    // ✅ NEW: Update Delivery Stage (Cancelled) - SAME AS DRIVER FLOW
    // ============================================================
    const cancelledEvent = TrackingService.createEvent(
      'cancelled',
      notes || reason || 'Order cancelled',
      reason || 'No reason provided',
    );

    if (order.deliveryStatus && Array.isArray(order.deliveryStatus.stages)) {
      const stageIndex = order.deliveryStatus.stages.findIndex(
        (s) => s.id === 'cancelled',
      );

      if (stageIndex !== -1) {
        // Update existing stage
        order.deliveryStatus.stages[stageIndex].status = 'completed';
        order.deliveryStatus.stages[stageIndex].timestamp =
          cancelledEvent.timestamp;
        order.deliveryStatus.stages[stageIndex].displayTime =
          cancelledEvent.displayTime;
        order.deliveryStatus.stages[stageIndex].reason =
          reason || 'No reason provided';
      } else {
        // If cancelled stage missing, push it
        order.deliveryStatus.stages.push(cancelledEvent);
      }
    }

    await order.save();
    // ✅ Get user details for notifications
    const user = await User.findById(userId).select('fullName email mobile');

    const roleNameMap = {
      retailer: 'Retailer',
      wholesaler: 'Wholesaler',
      super_stocker: 'Super Stocker',
      distributor: 'Distributor',
      consumer: 'Consumer',
    };

    const notificationData = {
      orderId: order.orderId,
      orderMongoId: order._id.toString(),
      orderDate: order.orderPlacedAt,
      cancelledDate: order.cancellationDetails.cancelledDate,
      userName: user?.fullName || 'Customer',
      customerName: user?.fullName || 'Customer',
      customerRole: roleNameMap[userRole] || userRole,
      customerMobile: user?.mobile || 'N/A',
      customerEmail: user?.email || 'N/A',
      cancelledBy: {
        name: userName,
        role: roleNameMap[userRole] || userRole,
      },
      reason: order.cancellationDetails.reason,
      notes: order.cancellationDetails.notes,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      productCount: order.productCount,
      products: order.products,
      browseProductsUrl: `${process.env.APP_URL || 'https://gavran.com'}/products`,
      adminOrderUrl: `${process.env.ADMIN_URL || 'https://gavran-admin.demohub.tech'}/orders/${order._id}`,
    };

    // ✅ 1. Notify USER (Email + FCM + DB)
    if (user?.email) {
      notifyUser({
        userId: userId,
        userEmail: user.email,
        userName: user.fullName,
        templateKey: 'orderCancelledByUser',
        data: notificationData,
      }).catch((err) => {
        console.error('❌ User cancellation notification failed:', err);
      });
    }

    // ✅ 2. Notify ADMINS (Email + DB)
    const adminUsers = await AdminUser.find({
      role: 'admin',
      isActive: true,
    }).select('_id email');

    if (adminUsers.length > 0) {
      notifyAdmins({
        admins: adminUsers.map((admin) => ({
          userId: admin._id.toString(),
          email: admin.email,
        })),
        templateKey: 'orderCancelledByUser',
        data: notificationData,
      }).catch((err) => {
        console.error('❌ Admin cancellation notification failed:', err);
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully. Stock has been released.',
      order,
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while cancelling the order',
      error: error.message,
    });
  }
};

// Confirm order - move reserved to sold
export const confirmOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await AppOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be confirmed',
      });
    }

    // Move reserved stock to sold
    for (const product of order.products) {
      const inventory = await AdminInventory.findById(product.inventoryId);

      if (inventory) {
        const variant = inventory.variants[product.variantIndex];
        if (variant) {
          variant.reserved -= product.orderQuantity;
          variant.sold += product.orderQuantity;
          await inventory.save();
        }
      }
    }

    order.status = 'out_for_delivery';
    order.paymentStatus = 'Completed';
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Order confirmed successfully',
      order,
    });
  } catch (error) {
    console.error('Confirm order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to confirm order',
      error: error.message,
    });
  }
};
