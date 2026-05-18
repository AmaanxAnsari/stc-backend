import mongoose from 'mongoose';
import BulkOrder from '../../models/admin/BulkOrderModel.js';
import { createRepository } from '../../utils/repository.js';
import AdminInventory from '../../models/admin/InventoryModel.js';
import Product from './../../models/admin/productModel.js';
import { User } from '../../models/app/user.js';
import { notifyAdmins, notifyUser } from '../../utils/notificationService.js';
import AdminUser from '../../models/admin/adminUser.js';
import CompanyConfig from '../../models/admin/CompanyConfigModel.js';


const bulkOrderRepo = createRepository(BulkOrder, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});

// Get All Bulk Orders (Admin)
export const getAllBulkOrders = async (req, res) => {
  try {
    const { page, limit, sort, q, status } = req.query;

    const filter = {};

    // Search by order ID or special instructions
    if (q) {
      filter.$or = [
        { orderId: { $regex: q, $options: 'i' } },
        { specialInstructions: { $regex: q, $options: 'i' } },
      ];
    }

    // Filter by status
    if (status) {
      filter.status = status;
    }

    const result = await bulkOrderRepo.getAll({
      filter,
      sort: sort ? JSON.parse(sort) : { createdAt: -1 },
      page,
      limit,
      paginate:false,
      projection: {},
      populate: [
        { path: 'createdBy', select: 'fullName email mobile' },
        { path: 'updatedBy', select: 'fullName email' },
      ],
      collation: { locale: 'en', strength: 2 },
    });

    return res.status(result.status).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 500,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};

// Get Single Bulk Order by ID (Admin)
export const getBulkOrderById = async (req, res) => {
  try {
    const result = await bulkOrderRepo.getById(req.params.id, {
      projection: { __v: 0 },
      populate: [
        { path: 'createdBy', select: 'fullName email mobile' },
        { path: 'updatedBy', select: 'fullName email' },
      ],
    });

    return res.status(result.status).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 500,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};


// export const addProductsToBulkOrder = async (req, res) => {
//   try {
//     const adminUserId = req.user?.id;
//     if (!adminUserId) {
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     const { id } = req.params;
//     const { products: productItems } = req.body;

//     if (
//       !productItems ||
//       !Array.isArray(productItems) ||
//       productItems.length === 0
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: 'Products array is required',
//       });
//     }

//     const bulkOrder = await BulkOrder.findById(id);
//     if (!bulkOrder) {
//       return res.status(404).json({
//         success: false,
//         message: 'Bulk order not found',
//       });
//     }

//     if (bulkOrder.status !== 'pending') {
//       return res.status(400).json({
//         success: false,
//         message: 'Products can only be added to pending orders',
//       });
//     }

//     // Get user role from bulk order
//     const userRole = bulkOrder.createdByRole || 'consumer';

//     const orderProducts = [];
//     const inventoryUpdates = [];
//     let itemTotal = 0;
//     let originalItemTotal = 0;
//     let productCount = 0;

//     // Validate all items first
//     for (const item of productItems) {
//       if (!mongoose.Types.ObjectId.isValid(item.inventoryId)) {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid inventoryId',
//         });
//       }

//       const inventory = await AdminInventory.findById(item.inventoryId);
//       if (!inventory) {
//         return res.status(404).json({
//           success: false,
//           message: `Inventory not found for ID: ${item.inventoryId}`,
//         });
//       }

//       const variant = inventory.variants[item.variantIndex || 0];
//       if (!variant) {
//         return res.status(404).json({
//           success: false,
//           message: `Variant not found at index ${item.variantIndex}`,
//         });
//       }

//       const orderQuantity = item.quantity || 1;

//       // Check stock availability
//       if (variant.onHand < orderQuantity) {
//         return res.status(400).json({
//           success: false,
//           message: `Insufficient stock for ${inventory.name || 'product'}. Only ${variant.onHand} available`,
//         });
//       }
//     }

//     // All validations passed, now update inventory and prepare order products
//     for (const item of productItems) {
//       const inventory = await AdminInventory.findById(item.inventoryId);
//       const inventoryVariant = inventory.variants[item.variantIndex || 0];
//       const orderQuantity = item.quantity || 1;

//       // Get product details for variant images
//       const product = await Product.findById(inventory.productId);
//       const productVariant = product?.variants?.[item.variantIndex || 0];

//       // Reserve stock
//       inventoryVariant.onHand -= orderQuantity;
//       inventoryVariant.reserved += orderQuantity;
//       inventoryVariant.inStock = inventoryVariant.onHand > 0;

//       await inventory.save();

//       inventoryUpdates.push({
//         inventoryId: inventory._id,
//         variantIndex: item.variantIndex || 0,
//         quantity: orderQuantity,
//       });

//       // Get price based on user role from tier pricing
//       const tierPrice = inventoryVariant.tierPricing?.[userRole];
//       const price = tierPrice || inventoryVariant.costPrice || 0;
//       const originalPrice = inventoryVariant.mrp || price;

//       itemTotal += price * orderQuantity;
//       originalItemTotal += originalPrice * orderQuantity;
//       productCount += orderQuantity;

//       // Get variant image from product variants (first image)
//       const variantImage =
//         productVariant?.images?.[0] || product?.image || inventory.image || '';

//       orderProducts.push({
//         cartItemId: `bulk_${Date.now()}_${Math.random()}`,
//         inventoryId: inventory._id,
//         productId: inventory.productId || product?._id,
//         variantIndex: item.variantIndex || 0,
//         name: inventory.name || product?.name || 'Product',
//         quantity: inventoryVariant.variantKey || productVariant?.quantity || '',
//         price,
//         originalPrice,
//         image: variantImage,
//         orderQuantity,
//         category: inventory.category || product?.category || '',
//       });
//     }

//     const deliveryFee = 30;
//     const handlingFee = 10;
//     const discount = 0;
//     const totalAmount = itemTotal + deliveryFee + handlingFee - discount;

//     // Update bulk order with products and pricing
//     bulkOrder.products = orderProducts;
//     bulkOrder.totalAmount = totalAmount;
//     bulkOrder.originalAmount = originalItemTotal;
//     bulkOrder.productCount = productCount;
//     bulkOrder.billSummary = {
//       itemTotal,
//       originalItemTotal,
//       deliveryFee,
//       originalDeliveryFee: deliveryFee,
//       handlingFee,
//       discount,
//       totalAmount,
//     };
//     bulkOrder.updatedBy = adminUserId;

//     await bulkOrder.save();

//     return res.status(200).json({
//       success: true,
//       message: 'Products added to bulk order successfully',
//       order: bulkOrder,
//     });
//   } catch (error) {
//     console.error('Add products to bulk order error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Something went wrong',
//       error: error.message,
//     });
//   }
// };

// // Confirm Bulk Order (Move to Confirmed)
// export const confirmBulkOrder = async (req, res) => {
//   try {
//     const adminUserId = req.user?.id;
//     if (!adminUserId) {
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     const { id } = req.params;

//     const bulkOrder = await BulkOrder.findById(id);
//     if (!bulkOrder) {
//       return res.status(404).json({
//         success: false,
//         message: 'Bulk order not found',
//       });
//     }

//     if (bulkOrder.status !== 'pending') {
//       return res.status(400).json({
//         success: false,
//         message: 'Only pending orders can be confirmed',
//       });
//     }

//     if (!bulkOrder.products || bulkOrder.products.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please add products before confirming the order',
//       });
//     }

//     // Move reserved stock to sold
//     for (const product of bulkOrder.products) {
//       const inventory = await AdminInventory.findById(product.inventoryId);
//       if (inventory) {
//         const variant = inventory.variants[product.variantIndex];
//         if (variant) {
//           variant.reserved -= product.orderQuantity;
//           variant.sold += product.orderQuantity;
//           await inventory.save();
//         }
//       }
//     }

//     bulkOrder.status = 'confirmed';
//     bulkOrder.statusLabel = 'Order Confirmed';
//     bulkOrder.statusColor = '#2196F3';
//     bulkOrder.paymentStatus = 'Completed';
//     bulkOrder.deliveryStatus.stages[0].status = 'completed';
//     bulkOrder.deliveryStatus.stages[0].timestamp = new Date();
//     bulkOrder.deliveryStatus.stages[0].displayTime = new Date().toLocaleString(
//       'en-IN',
//       {
//         day: '2-digit',
//         month: 'short',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: true,
//       },
//     );
//     bulkOrder.updatedBy = adminUserId;

//     await bulkOrder.save();

//     return res.status(200).json({
//       success: true,
//       message: 'Bulk order confirmed successfully',
//       order: bulkOrder,
//     });
//   } catch (error) {
//     console.error('Confirm bulk order error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to confirm bulk order',
//       error: error.message,
//     });
//   }
// };


// 2. Dispatch Order - Pack & Assign Delivery Officer (Merged)
// export const addProductsToBulkOrder = async (req, res) => {
//   try {
//     const adminUserId = req.user?.id;
//     if (!adminUserId) {
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     const { id } = req.params;
//     const { products: productItems } = req.body;

//     if (
//       !productItems ||
//       !Array.isArray(productItems) ||
//       productItems.length === 0
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: 'Products array is required',
//       });
//     }

//     const bulkOrder = await BulkOrder.findById(id);
//     if (!bulkOrder) {
//       return res.status(404).json({
//         success: false,
//         message: 'Bulk order not found',
//       });
//     }

//     if (bulkOrder.status !== 'pending' && bulkOrder.status !== 'confirmed') {
//       return res.status(400).json({
//         success: false,
//         message:
//           'Products can only be modified for pending or confirmed orders',
//       });
//     }

//     // Get user role from bulk order
//     const userRole = bulkOrder.createdByRole || 'consumer';

//     // Create a map of existing products for easy lookup
//     const existingProductsMap = new Map();
//     if (bulkOrder.products && bulkOrder.products.length > 0) {
//       bulkOrder.products.forEach((product) => {
//         const key = `${product.inventoryId}_${product.variantIndex}`;
//         existingProductsMap.set(key, product);
//       });
//     }

//     // Create a map of new products
//     const newProductsMap = new Map();
//     productItems.forEach((item) => {
//       const key = `${item.inventoryId}_${item.variantIndex || 0}`;
//       newProductsMap.set(key, item);
//     });

//     // Step 1: Handle removed products (exist in old but not in new)
//     for (const [key, existingProduct] of existingProductsMap) {
//       if (!newProductsMap.has(key)) {
//         // Product was removed, release reserved stock back to onHand
//         const inventory = await AdminInventory.findById(
//           existingProduct.inventoryId,
//         );
//         if (inventory) {
//           const variant = inventory.variants[existingProduct.variantIndex];
//           if (variant) {
//             variant.reserved -= existingProduct.orderQuantity;
//             variant.onHand += existingProduct.orderQuantity;
//             variant.inStock = variant.onHand > 0;
//             await inventory.save();
//             console.log(
//               `Released ${existingProduct.orderQuantity} units back to onHand for removed product`,
//             );
//           }
//         }
//       }
//     }

//     // Step 2: Validate all new/updated items
//     for (const item of productItems) {
//       if (!mongoose.Types.ObjectId.isValid(item.inventoryId)) {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid inventoryId',
//         });
//       }

//       const inventory = await AdminInventory.findById(item.inventoryId);
//       if (!inventory) {
//         return res.status(404).json({
//           success: false,
//           message: `Inventory not found for ID: ${item.inventoryId}`,
//         });
//       }

//       const variant = inventory.variants[item.variantIndex || 0];
//       if (!variant) {
//         return res.status(404).json({
//           success: false,
//           message: `Variant not found at index ${item.variantIndex}`,
//         });
//       }

//       const orderQuantity = item.quantity || 1;
//       const key = `${item.inventoryId}_${item.variantIndex || 0}`;
//       const existingProduct = existingProductsMap.get(key);

//       // Calculate the difference
//       let quantityDifference = orderQuantity;
//       if (existingProduct) {
//         quantityDifference = orderQuantity - existingProduct.orderQuantity;
//       }

//       // Check if we have enough stock for the change
//       if (quantityDifference > 0 && variant.onHand < quantityDifference) {
//         return res.status(400).json({
//           success: false,
//           message: `Insufficient stock for ${inventory.name || 'product'}. Need ${quantityDifference} more but only ${variant.onHand} available`,
//         });
//       }
//     }

//     const orderProducts = [];
//     let itemTotal = 0;
//     let originalItemTotal = 0;
//     let productCount = 0;

//     // Step 3: Process all new/updated products
//     for (const item of productItems) {
//       const inventory = await AdminInventory.findById(item.inventoryId);
//       const inventoryVariant = inventory.variants[item.variantIndex || 0];
//       const orderQuantity = item.quantity || 1;
//       const key = `${item.inventoryId}_${item.variantIndex || 0}`;
//       const existingProduct = existingProductsMap.get(key);

//       // Get product details for variant images
//       const product = await Product.findById(inventory.productId);
//       const productVariant = product?.variants?.[item.variantIndex || 0];

//       // Calculate quantity difference
//       let quantityDifference = orderQuantity;
//       if (existingProduct) {
//         quantityDifference = orderQuantity - existingProduct.orderQuantity;
//       }

//       // Update stock based on difference
//       if (quantityDifference !== 0) {
//         inventoryVariant.onHand -= quantityDifference;
//         inventoryVariant.reserved += quantityDifference;
//         inventoryVariant.inStock = inventoryVariant.onHand > 0;
//         await inventory.save();

//         if (quantityDifference > 0) {
//           console.log(`Added ${quantityDifference} more units to reserved`);
//         } else {
//           console.log(
//             `Released ${Math.abs(quantityDifference)} units back to onHand`,
//           );
//         }
//       }

//       // Get price based on user role from tier pricing
//       const tierPrice = inventoryVariant.tierPricing?.[userRole];
//       const price = tierPrice || inventoryVariant.costPrice || 0;
//       const originalPrice = inventoryVariant.mrp || price;

//       itemTotal += price * orderQuantity;
//       originalItemTotal += originalPrice * orderQuantity;
//       productCount += orderQuantity;

//       // Get variant image from product variants (first image)
//       const variantImage =
//         productVariant?.images?.[0] || product?.image || inventory.image || '';

//       orderProducts.push({
//         cartItemId:
//           existingProduct?.cartItemId || `bulk_${Date.now()}_${Math.random()}`,
//         inventoryId: inventory._id,
//         productId: inventory.productId || product?._id,
//         variantIndex: item.variantIndex || 0,
//         name: inventory.name || product?.name || 'Product',
//         quantity: inventoryVariant.variantKey || productVariant?.quantity || '',
//         price,
//         originalPrice,
//         image: variantImage,
//         orderQuantity,
//         category: inventory.category || product?.category || '',
//       });
//     }

//     const deliveryFee = 30;
//     const handlingFee = 10;
//     const discount = 0;
//     const totalAmount = itemTotal + deliveryFee + handlingFee - discount;

//     // Update bulk order with products and pricing
//     bulkOrder.products = orderProducts;
//     bulkOrder.totalAmount = totalAmount;
//     bulkOrder.originalAmount = originalItemTotal;
//     bulkOrder.productCount = productCount;
//     bulkOrder.billSummary = {
//       itemTotal,
//       originalItemTotal,
//       deliveryFee,
//       originalDeliveryFee: deliveryFee,
//       handlingFee,
//       discount,
//       totalAmount,
//     };
//     // bulkOrder.status = 'confirmed';
//     // bulkOrder.statusLabel = 'Order Confirmed';
//     // bulkOrder.statusColor = '#2196F3';
//     // bulkOrder.paymentStatus = 'Completed';
//     bulkOrder.deliveryStatus.stages[0].status = 'completed';
//     bulkOrder.deliveryStatus.stages[0].timestamp = new Date();
//     bulkOrder.deliveryStatus.stages[0].displayTime = new Date().toLocaleString(
//       'en-IN',
//       {
//         day: '2-digit',
//         month: 'short',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: true,
//         timeZone: 'Asia/Kolkata',
//       },
//     );
//     bulkOrder.updatedBy = adminUserId;

//     await bulkOrder.save();

//     // ✅ Get user details for notifications
//     const user = await User.findById(bulkOrder.createdBy).select(
//       'fullName email mobile',
//     );

//     const roleNameMap = {
//       retailer: 'Retailer',
//       wholesaler: 'Wholesaler',
//       super_stocker: 'Super Stocker',
//       distributor: 'Distributor',
//       consumer: 'Consumer',
//     };

//     const notificationData = {
//       orderId: bulkOrder.orderId,
//       orderMongoId: bulkOrder._id.toString(),
//       orderDate: bulkOrder.orderPlacedAt,
//       userName: user?.fullName || 'Customer',
//       customerName: user?.fullName || 'Customer',
//       customerRole:
//         roleNameMap[bulkOrder.createdByRole] || bulkOrder.createdByRole,
//       customerMobile: user?.mobile || 'N/A',
//       customerEmail: user?.email || 'N/A',
//       productCount: bulkOrder.productCount,
//       products: bulkOrder.products,
//       billSummary: bulkOrder.billSummary,
//       deliveryAddress: bulkOrder.deliveryAddress,
//       trackOrderUrl: `${process.env.APP_URL || 'https://gavran.com'}/orders/${bulkOrder._id}`,
//       adminOrderUrl: `${process.env.ADMIN_URL || 'https://gavran-admin.demohub.tech'}/order-management/bulk-orders/details/${bulkOrder._id}`,
//     };

//     // ✅ 1. Notify USER (Email + FCM + DB)
//     if (user?.email) {
//       notifyUser({
//         userId: bulkOrder.createdBy.toString(),
//         userEmail: user.email,
//         userName: user.fullName,
//         templateKey: 'bulkOrderConfirmed',
//         data: notificationData,
//       }).catch((err) => {
//         console.error(
//           '❌ User bulk order confirmation notification failed:',
//           err,
//         );
//       });
//     }

//     // ✅ 2. Notify ADMINS (Email + DB) - Confirmation
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
//         templateKey: 'bulkOrderProductsAdded',
//         data: notificationData,
//       }).catch((err) => {
//         console.error(
//           '❌ Admin bulk order confirmation notification failed:',
//           err,
//         );
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: 'Products updated and order confirmed successfully',
//       order: bulkOrder,
//     });
//   } catch (error) {
//     console.error('Add products to bulk order error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Something went wrong',
//       error: error.message,
//     });
//   }
// };


// 1. Add Products to Bulk Order (No Confirmation, Just Add)
export const addProductsToBulkOrder = async (req, res) => {
  try {
    const adminUserId = req.user?.id;
    const { id } = req.params;
    const { products: productItems } = req.body;

    if (
      !productItems ||
      !Array.isArray(productItems) ||
      productItems.length === 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Products array is required' });
    }

    const bulkOrder = await BulkOrder.findById(id);
    if (!bulkOrder)
      return res
        .status(404)
        .json({ success: false, message: 'Bulk order not found' });

    if (bulkOrder.status !== 'pending') {
      return res
        .status(400)
        .json({
          success: false,
          message: 'Products can only be added to pending orders',
        });
    }

    const userRole = bulkOrder.createdByRole || 'consumer';
    const inventoryUpdates = [];
    const newOrderProducts = [];

    // --- Validation & Stock Check Loop ---
    for (const item of productItems) {
      if (!mongoose.Types.ObjectId.isValid(item.inventoryId)) continue;

      const inventory = await AdminInventory.findById(item.inventoryId);
      if (!inventory)
        return res
          .status(404)
          .json({
            success: false,
            message: `Inventory not found: ${item.inventoryId}`,
          });

      const variantIndex = item.variantIndex || 0;
      const variant = inventory.variants[variantIndex];
      const orderQuantity = parseInt(item.quantity) || 1;

      if (variant.onHand < orderQuantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${inventory.name}. Available: ${variant.onHand}`,
        });
      }

      // Check if product already exists in order to prevent duplicates (Optional logic, assumes append for now)
      const exists = bulkOrder.products.find(
        (p) =>
          p.inventoryId.toString() === item.inventoryId &&
          p.variantIndex === variantIndex,
      );
      if (exists) {
        return res.status(400).json({
          success: false,
          message: `Product ${inventory.name} already in order. Use the update endpoint to change quantity.`,
        });
      }
    }

    // --- Execution Loop ---
    for (const item of productItems) {
      const inventory = await AdminInventory.findById(item.inventoryId);
      const variantIndex = item.variantIndex || 0;
      const inventoryVariant = inventory.variants[variantIndex];
      const orderQuantity = parseInt(item.quantity) || 1;

      // 1. Reserve Stock
      inventoryVariant.onHand -= orderQuantity;
      inventoryVariant.reserved += orderQuantity;
      inventoryVariant.inStock = inventoryVariant.onHand > 0;
      await inventory.save();

      // 2. Prepare Product Object
      const product = await Product.findById(inventory.productId);
      const productVariant = product?.variants?.[variantIndex];

      const tierPrice = inventoryVariant.tierPricing?.[userRole];
      const price = tierPrice || inventoryVariant.costPrice || 0;
      const originalPrice = inventoryVariant.mrp || price;

      const variantImage =
        productVariant?.images?.[0] || product?.image || inventory.image || '';

      newOrderProducts.push({
        cartItemId: `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        inventoryId: inventory._id,
        productId: inventory.productId || product?._id,
        variantIndex: variantIndex,
        name: inventory.name || product?.name || 'Product',
        quantity: inventoryVariant.variantKey || productVariant?.quantity || '',
        price,
        originalPrice,
        image: variantImage,
        orderQuantity,
        category: inventory.category || product?.category || '',
      });
    }

    // Append new products
    bulkOrder.products.push(...newOrderProducts);

    // Recalculate Totals
    // ✅ Fetch Config & Recalculate
    const config = await CompanyConfig.findOne({ isDeleted: false });
    recalculateOrderTotals(bulkOrder, config);

    bulkOrder.updatedBy = adminUserId;
    await bulkOrder.save();

    return res.status(200).json({
      success: true,
      message: 'Products added successfully',
      order: bulkOrder,
    });
  } catch (error) {
    console.error('Add products error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const updateBulkOrderProductQty = async (req, res) => {
  try {
    const { id } = req.params;
    const { inventoryId, variantIndex, quantity } = req.body;
    const newQuantity = parseInt(quantity);

    if (isNaN(newQuantity) || newQuantity < 0) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid quantity' });
    }

    // 1. Fetch the Order
    const bulkOrder = await BulkOrder.findById(id);
    if (!bulkOrder)
      return res
        .status(404)
        .json({ success: false, message: 'Order not found' });
    if (bulkOrder.status !== 'pending')
      return res
        .status(400)
        .json({ success: false, message: 'Can only update pending orders' });

    // 2. Find the specific product in the array
    const productItem = bulkOrder.products.find(
      (p) =>
        p.inventoryId.toString() === inventoryId &&
        p.variantIndex === parseInt(variantIndex),
    );

    if (!productItem)
      return res
        .status(404)
        .json({ success: false, message: 'Product not found in this order' });

    // 3. Calculate Difference
    const oldQuantity = productItem.orderQuantity;

    // CRITICAL FIX: If quantities are same, STOP here.
    // This prevents the "double send" issue where stock keeps changing but order doesn't need to.
    if (newQuantity === oldQuantity) {
      return res.status(200).json({
        success: true,
        message: 'No change in quantity',
        order: bulkOrder,
      });
    }

    const diff = newQuantity - oldQuantity; // +ve (add stock needed), -ve (release stock)

    // 4. Update Inventory
    const inventory = await AdminInventory.findById(inventoryId);
    if (!inventory)
      return res
        .status(404)
        .json({ success: false, message: 'Inventory item not found' });

    const variant = inventory.variants[parseInt(variantIndex)];
    if (!variant)
      return res
        .status(404)
        .json({ success: false, message: 'Variant not found' });

    if (diff > 0) {
      // Need MORE stock (e.g., 5 -> 8, diff is 3)
      if (variant.onHand < diff) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock. Need ${diff} more, but only ${variant.onHand} available.`,
        });
      }
      variant.onHand -= diff;
      variant.reserved += diff;
    } else {
      // Need LESS stock (e.g., 5 -> 4, diff is -1)
      // Release the absolute difference back to onHand
      const releaseAmount = Math.abs(diff);
      variant.onHand += releaseAmount;
      variant.reserved -= releaseAmount;
    }

    variant.inStock = variant.onHand > 0;
    await inventory.save();

    // 5. Update Order
    productItem.orderQuantity = newQuantity;

    // CRITICAL FIX: Explicitly tell Mongoose the products array changed
    bulkOrder.markModified('products');

    // 6. Recalculate Totals
    // ✅ Fetch Config & Recalculate
    const config = await CompanyConfig.findOne({ isDeleted: false });
    recalculateOrderTotals(bulkOrder, config);

    // 7. Save Order
    await bulkOrder.save();

    return res.status(200).json({
      success: true,
      message: 'Quantity updated successfully',
      order: bulkOrder,
    });
  } catch (error) {
    console.error('Update Qty Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Ensure this helper function is defined in your file or imported
// const recalculateOrderTotals = (bulkOrder) => {
//   let itemTotal = 0;
//   let originalItemTotal = 0;
//   let productCount = 0;

//   bulkOrder.products.forEach((p) => {
//     itemTotal += p.price * p.orderQuantity;
//     originalItemTotal += p.originalPrice * p.orderQuantity;
//     productCount += p.orderQuantity;
//   });

//   // Ensure these defaults match your business logic
//   const deliveryFee = bulkOrder.billSummary?.deliveryFee || 30;
//   const handlingFee = bulkOrder.billSummary?.handlingFee || 10;
//   const discount = bulkOrder.billSummary?.discount || 0;

//   bulkOrder.billSummary = {
//     itemTotal,
//     originalItemTotal,
//     deliveryFee,
//     originalDeliveryFee: deliveryFee,
//     handlingFee,
//     discount,
//     totalAmount: itemTotal + deliveryFee + handlingFee - discount,
//   };

//   bulkOrder.totalAmount = bulkOrder.billSummary.totalAmount;
//   bulkOrder.originalAmount = originalItemTotal;
//   bulkOrder.productCount = productCount;
// };


// 3. Remove Product from Bulk Order
export const removeProductFromBulkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { inventoryId, variantIndex } = req.body;

    const bulkOrder = await BulkOrder.findById(id);
    if (!bulkOrder)
      return res
        .status(404)
        .json({ success: false, message: 'Order not found' });
    if (bulkOrder.status !== 'pending')
      return res
        .status(400)
        .json({ success: false, message: 'Can only modify pending orders' });

    // Find index
    const productIndex = bulkOrder.products.findIndex(
      (p) =>
        p.inventoryId.toString() === inventoryId &&
        p.variantIndex === parseInt(variantIndex),
    );

    if (productIndex === -1)
      return res
        .status(404)
        .json({ success: false, message: 'Product not found in order' });

    const productItem = bulkOrder.products[productIndex];

    // Release Stock Back to Inventory
    const inventory = await AdminInventory.findById(inventoryId);
    if (inventory) {
      const variant = inventory.variants[productItem.variantIndex];
      if (variant) {
        variant.onHand += productItem.orderQuantity;
        variant.reserved -= productItem.orderQuantity;
        variant.inStock = variant.onHand > 0;
        await inventory.save();
      }
    }

    // Remove from array
    bulkOrder.products.splice(productIndex, 1);

    // Recalculate Totals
    // ✅ Fetch Config & Recalculate
    const config = await CompanyConfig.findOne({ isDeleted: false });
    recalculateOrderTotals(bulkOrder, config);
    await bulkOrder.save();

    return res
      .status(200)
      .json({
        success: true,
        message: 'Product removed successfully',
        order: bulkOrder,
      });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Confirm Bulk Order (Status Change + Notifications + Move Reserved to Sold)
// export const confirmBulkOrder = async (req, res) => {
//   try {
//     const adminUserId = req.user?.id;
//     const { id } = req.params;

//     const bulkOrder = await BulkOrder.findById(id);
//     if (!bulkOrder) return res.status(404).json({ success: false, message: 'Order not found' });

//     if (bulkOrder.status !== 'pending') {
//       return res.status(400).json({ success: false, message: 'Order is already processed or cancelled' });
//     }

//     if (!bulkOrder.products || bulkOrder.products.length === 0) {
//       return res.status(400).json({ success: false, message: 'Cannot confirm an empty order' });
//     }

//     // Move Reserved Stock to Sold
//     for (const product of bulkOrder.products) {
//       const inventory = await AdminInventory.findById(product.inventoryId);
//       if (inventory) {
//         const variant = inventory.variants[product.variantIndex];
//         if (variant) {
//            // We already reserved it in "add/update", now we finalize the sale
//            // Usually "Sold" increments when order is confirmed/paid
//            variant.reserved -= product.orderQuantity;
//            variant.sold += product.orderQuantity;
//            await inventory.save();
//         }
//       }
//     }

//     // Update Status
//     bulkOrder.status = 'confirmed';
//     bulkOrder.statusLabel = 'Order Confirmed';
//     bulkOrder.statusColor = '#2196F3';
    
//     // Add Delivery Stage
//     if(bulkOrder.deliveryStatus && bulkOrder.deliveryStatus.stages) {
//         bulkOrder.deliveryStatus.stages[0].status = 'completed';
//         bulkOrder.deliveryStatus.stages[0].timestamp = new Date();
//         bulkOrder.deliveryStatus.stages[0].displayTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
//     }
    
//     bulkOrder.updatedBy = adminUserId;
//     await bulkOrder.save();

//     // --- Notifications Logic (Copied from your snippet) ---
//     const user = await User.findById(bulkOrder.createdBy).select('fullName email mobile');
//     const roleNameMap = { retailer: 'Retailer', wholesaler: 'Wholesaler', super_stocker: 'Super Stocker', distributor: 'Distributor', consumer: 'Consumer' };

//     const notificationData = {
//       orderId: bulkOrder.orderId,
//       orderMongoId: bulkOrder._id.toString(),
//       orderDate: bulkOrder.orderPlacedAt,
//       userName: user?.fullName || 'Customer',
//       customerName: user?.fullName || 'Customer',
//       customerRole: roleNameMap[bulkOrder.createdByRole] || bulkOrder.createdByRole,
//       customerMobile: user?.mobile || 'N/A',
//       customerEmail: user?.email || 'N/A',
//       productCount: bulkOrder.productCount,
//       totalAmount: bulkOrder.totalAmount,
//       deliveryAddress: bulkOrder.deliveryAddress,
//        // Add other necessary fields for email template
//     };

//     // Notify User
//     if (user?.email) {
//       notifyUser({
//         userId: bulkOrder.createdBy.toString(),
//         userEmail: user.email,
//         userName: user.fullName,
//         templateKey: 'bulkOrderConfirmed',
//         data: notificationData,
//       }).catch(err => console.error('User Notification Error:', err));
//     }

//     // Notify Admins
//     const adminUsers = await AdminUser.find({ role: 'admin', isActive: true }).select('_id email');
//     if (adminUsers.length > 0) {
//       notifyAdmins({
//         admins: adminUsers.map(a => ({ userId: a._id.toString(), email: a.email })),
//         templateKey: 'bulkOrderProductsAdded', // Or create a new template 'bulkOrderConfirmedAdmin'
//         data: notificationData,
//       }).catch(err => console.error('Admin Notification Error:', err));
//     }

//     return res.status(200).json({ success: true, message: 'Order confirmed and notifications sent', order: bulkOrder });

//   } catch (error) {
//     console.error('Confirm error:', error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

export const confirmBulkOrder = async (req, res) => {
  try {
    const adminUserId = req.user?.id;
    const { id } = req.params;

    const bulkOrder = await BulkOrder.findById(id);
    if (!bulkOrder)
      return res
        .status(404)
        .json({ success: false, message: 'Order not found' });

    if (bulkOrder.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Order is already processed or cancelled',
      });
    }

    if (!bulkOrder.products || bulkOrder.products.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'Cannot confirm an empty order' });
    }

    // Move Reserved Stock to Sold
    for (const product of bulkOrder.products) {
      const inventory = await AdminInventory.findById(product.inventoryId);
      if (inventory) {
        const variant = inventory.variants[product.variantIndex];
        if (variant) {
          // We already reserved it in "add/update", now we finalize the sale
          variant.reserved -= product.orderQuantity;
          variant.sold += product.orderQuantity;
          await inventory.save();
        }
      }
    }

    // Update Status
    bulkOrder.status = 'confirmed';
    bulkOrder.statusLabel = 'Order Confirmed';
    bulkOrder.statusColor = '#2196F3';
    // bulkOrder.paymentStatus = 'Completed'; // Added from your snippet

    // Add Delivery Stage
    if (bulkOrder.deliveryStatus && bulkOrder.deliveryStatus.stages) {
      bulkOrder.deliveryStatus.stages[0].status = 'completed';
      bulkOrder.deliveryStatus.stages[0].timestamp = new Date();
      bulkOrder.deliveryStatus.stages[0].displayTime =
        new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata',
        });
    }

    bulkOrder.updatedBy = adminUserId;
    await bulkOrder.save();

    // ---------------- NOTIFICATION LOGIC (Replicated Exactly) ----------------

    // ✅ Get user details for notifications
    const user = await User.findById(bulkOrder.createdBy).select(
      'fullName email mobile',
    );

    const roleNameMap = {
      retailer: 'Retailer',
      wholesaler: 'Wholesaler',
      super_stocker: 'Super Stocker',
      distributor: 'Distributor',
      consumer: 'Consumer',
    };

    // ✅ FIX: Create a fallback billSummary to prevent 'undefined' errors
    // If bulkOrder.billSummary is missing, we construct it from the root fields
    const safeBillSummary = bulkOrder.billSummary || {
      itemTotal: bulkOrder.totalAmount || 0,
      originalItemTotal: bulkOrder.originalAmount || 0,
      deliveryFee: 0,
      handlingFee: 0,
      discount: 0,
      totalAmount: bulkOrder.totalAmount || 0, // This prevents "reading 'totalAmount' of undefined"
    };

    const notificationData = {
      orderId: bulkOrder.orderId,
      orderMongoId: bulkOrder._id.toString(),
      orderDate: bulkOrder.orderPlacedAt,
      userName: user?.fullName || 'Customer',
      customerName: user?.fullName || 'Customer',
      customerRole:
        roleNameMap[bulkOrder.createdByRole] || bulkOrder.createdByRole,
      customerMobile: user?.mobile || 'N/A',
      customerEmail: user?.email || 'N/A',
      productCount: bulkOrder.productCount,
      products: bulkOrder.products, // Added back
      billSummary: safeBillSummary, // Added back
      totalAmount: bulkOrder.totalAmount || 0,
      deliveryAddress: bulkOrder.deliveryAddress,
      trackOrderUrl: `${process.env.APP_URL || 'https://gavran.com'}/orders/${bulkOrder._id}`, // Added back
      adminOrderUrl: `${process.env.ADMIN_URL || 'https://gavran-admin.demohub.tech'}/order-management/bulk-orders/details/${bulkOrder._id}`, // Added back
    };

    // ✅ 1. Notify USER (Email + FCM + DB)
    if (user?.email) {
      notifyUser({
        userId: bulkOrder.createdBy.toString(),
        userEmail: user.email,
        userName: user.fullName,
        templateKey: 'bulkOrderConfirmed',
        data: notificationData,
      }).catch((err) => {
        console.error(
          '❌ User bulk order confirmation notification failed:',
          err,
        );
      });
    }

    // ✅ 2. Notify ADMINS (Email + DB) - Confirmation
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
        templateKey: 'bulkOrderProductsAdded',
        data: notificationData,
      }).catch((err) => {
        console.error(
          '❌ Admin bulk order confirmation notification failed:',
          err,
        );
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Order confirmed and notifications sent',
      order: bulkOrder,
    });
  } catch (error) {
    console.error('Confirm error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Helper Function for Totals
// const recalculateOrderTotals = (bulkOrder) => {
//     let itemTotal = 0;
//     let originalItemTotal = 0;
//     let productCount = 0;

//     bulkOrder.products.forEach(p => {
//         itemTotal += p.price * p.orderQuantity;
//         originalItemTotal += p.originalPrice * p.orderQuantity;
//         productCount += p.orderQuantity;
//     });

//     const deliveryFee = 30; // Or fetch from settings
//     const handlingFee = 10;
//     const discount = 0;
    
//     bulkOrder.billSummary = {
//         itemTotal,
//         originalItemTotal,
//         deliveryFee,
//         originalDeliveryFee: deliveryFee,
//         handlingFee,
//         discount,
//         totalAmount: itemTotal + deliveryFee + handlingFee - discount
//     };
    
//     bulkOrder.totalAmount = bulkOrder.billSummary.totalAmount;
//     bulkOrder.originalAmount = originalItemTotal;
//     bulkOrder.productCount = productCount;
// };
// =======================================================
// 4. SHARED RECALCULATE HELPER (Syncs with Config)
// =======================================================
const recalculateOrderTotals = (bulkOrder, config) => {
    let itemTotal = 0;
    let originalItemTotal = 0;
    let productCount = 0;

    // 1. Sum up item totals
    if (bulkOrder.products && Array.isArray(bulkOrder.products)) {
        bulkOrder.products.forEach(p => {
            const price = parseFloat(p.price) || 0;
            const originalPrice = parseFloat(p.originalPrice) || price;
            const qty = parseInt(p.orderQuantity) || 0;

            itemTotal += price * qty;
            originalItemTotal += originalPrice * qty;
            productCount += qty;
        });
    }

    // 2. Define Fees from Config
    const baseDeliveryFee = config?.deliveryFee || 0; 
    const handlingFee = config?.handlingFee || 0;     
    const freeDeliveryLimit = config?.minOrderValueForFreeDelivery || 0;
    const discount = 0;

    // Logic: Free delivery if itemTotal >= limit
    let finalDeliveryFee = baseDeliveryFee;
    if (freeDeliveryLimit > 0 && itemTotal >= freeDeliveryLimit) {
        finalDeliveryFee = 0;
    }

    // 3. GST Calculation Logic
    let taxAmount = 0;
    let taxPercentage = 0;
    let appliedCompany = '';

    // Extract companies from config (with defaults)
    const companyOne = config?.companyOne || { name: 'Gavran Pvt Ltd', gstPercentage: 18 };
    const companyTwo = config?.companyTwo || { name: 'Samay Pvt Ltd', gstPercentage: 0 };

    if (bulkOrder.isGst) {
        // GST Enabled: Determine tax based on stored company name
        if (bulkOrder.companyName === companyOne.name) {
            taxPercentage = companyOne.gstPercentage;
            appliedCompany = companyOne.name;
        } else if (bulkOrder.companyName === companyTwo.name) {
            taxPercentage = companyTwo.gstPercentage;
            appliedCompany = companyTwo.name;
        } else {
             // Fallback: If isGst is true but name is mismatched, default to the GST-enabled company (Company One)
             taxPercentage = companyOne.gstPercentage;
             appliedCompany = companyOne.name;
             bulkOrder.companyName = companyOne.name; // Auto-correct the order record
        }

        // Tax Calculation (on Item Total)
        const rawTax = (itemTotal * taxPercentage) / 100;
        taxAmount = Number(rawTax.toFixed(2));
    } else {
        // GST Disabled: No Tax, default to non-GST company
        taxPercentage = 0;
        taxAmount = 0;
        appliedCompany = companyTwo.name;
        bulkOrder.companyName = companyTwo.name; // Auto-correct the order record
    }

    // 4. Final Total Calculation
    const totalAmount = Math.ceil(itemTotal + finalDeliveryFee + handlingFee + taxAmount - discount);

    // 5. Construct Bill Summary
    bulkOrder.billSummary = {
        itemTotal,
        originalItemTotal,
        deliveryFee: finalDeliveryFee,
        originalDeliveryFee: baseDeliveryFee,
        handlingFee,
        discount,
        tax: taxAmount,
        taxPercentage,
        companyName: appliedCompany,
        isGst: bulkOrder.isGst,
        totalAmount
    };
    
    // 6. Update Root Level Fields
    bulkOrder.totalAmount = totalAmount;
    bulkOrder.originalAmount = originalItemTotal;
    bulkOrder.tax = taxAmount;
    bulkOrder.deliveryfee = finalDeliveryFee;
    bulkOrder.handlingfee = handlingFee;
    bulkOrder.productCount = productCount;
};

export const dispatchBulkOrder = async (req, res) => {
  try {
    const adminUserId = req.user?.id;
    if (!adminUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { deliveryOfficerId } = req.body;

    if (!deliveryOfficerId) {
      return res.status(400).json({
        success: false,
        message: 'Delivery officer ID is required',
      });
    }

    const bulkOrder = await BulkOrder.findById(id);
    if (!bulkOrder) {
      return res.status(404).json({
        success: false,
        message: 'Bulk order not found',
      });
    }

    if (bulkOrder.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Only confirmed orders can be dispatched',
      });
    }

    // Get delivery officer details
    const deliveryOfficer = await User.findById(deliveryOfficerId);
    if (!deliveryOfficer) {
      return res.status(404).json({
        success: false,
        message: 'Delivery officer not found',
      });
    }

    // Update to packed first
    bulkOrder.deliveryStatus.stages[1].status = 'completed';
    bulkOrder.deliveryStatus.stages[1].timestamp = new Date();
    bulkOrder.deliveryStatus.stages[1].displayTime = new Date().toLocaleString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      },
    );

    // Then update to out for delivery
    bulkOrder.status = 'out_for_delivery';
    bulkOrder.statusLabel = 'Out for Delivery';
    bulkOrder.statusColor = '#FF9800';
    bulkOrder.deliveryStatus.stages[2].status = 'active';
    bulkOrder.deliveryStatus.stages[2].timestamp = new Date();
    bulkOrder.deliveryStatus.stages[2].displayTime = new Date().toLocaleString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      },
    );
    bulkOrder.deliveryStatus.deliveryOfficer = {
      id: deliveryOfficer._id.toString(),
      name: deliveryOfficer.fullName,
      role: 'Delivery Officer',
      avatar: deliveryOfficer.avatar || '',
    };
    bulkOrder.updatedBy = adminUserId;

    await bulkOrder.save();

    return res.status(200).json({
      success: true,
      message: 'Order packed and dispatched successfully',
      order: bulkOrder,
    });
  } catch (error) {
    console.error('Dispatch bulk order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to dispatch bulk order',
      error: error.message,
    });
  }
};

// 3. Mark as Delivered
// export const markAsDelivered = async (req, res) => {
//   try {
//     const adminUserId = req.user?.id;
//     if (!adminUserId) {
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     const { id } = req.params;

//     const bulkOrder = await BulkOrder.findById(id);
//     if (!bulkOrder) {
//       return res.status(404).json({
//         success: false,
//         message: 'Bulk order not found',
//       });
//     }

//     if (bulkOrder.status !== 'out_for_delivery') {
//       return res.status(400).json({
//         success: false,
//         message: 'Only out for delivery orders can be marked as delivered',
//       });
//     }

//     bulkOrder.status = 'delivered';
//     bulkOrder.statusLabel = 'Order Delivered';
//     bulkOrder.statusColor = '#4CAF50';
//     bulkOrder.deliveryStatus.stages[2].status = 'completed';
//     bulkOrder.deliveryStatus.stages[3].status = 'completed';
//     bulkOrder.deliveryStatus.stages[3].timestamp = new Date();
//     bulkOrder.deliveryStatus.stages[3].displayTime = new Date().toLocaleString(
//       'en-IN',
//       {
//         day: '2-digit',
//         month: 'short',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: true,
//       },
//     );
//     bulkOrder.downloadInvoice = true;
//     bulkOrder.updatedBy = adminUserId;

//     await bulkOrder.save();

//     return res.status(200).json({
//       success: true,
//       message: 'Bulk order marked as delivered successfully',
//       order: bulkOrder,
//     });
//   } catch (error) {
//     console.error('Mark as delivered error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to mark order as delivered',
//       error: error.message,
//     });
//   }
// };
export const markAsDelivered = async (req, res) => {
  try {
    const adminUserId = req.user?.id;
    if (!adminUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;

    const bulkOrder = await BulkOrder.findById(id);
    if (!bulkOrder) {
      return res.status(404).json({
        success: false,
        message: 'Bulk order not found',
      });
    }

    if (bulkOrder.status !== 'out_for_delivery') {
      return res.status(400).json({
        success: false,
        message: 'Only out for delivery orders can be marked as delivered',
      });
    }

    // Move reserved stock to sold
    for (const product of bulkOrder.products) {
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

    bulkOrder.status = 'delivered';
    bulkOrder.statusLabel = 'Order Delivered';
    bulkOrder.statusColor = '#4CAF50';
    bulkOrder.deliveryStatus.stages[2].status = 'completed';
    bulkOrder.deliveryStatus.stages[3].status = 'completed';
    bulkOrder.deliveryStatus.stages[3].timestamp = new Date();
    bulkOrder.deliveryStatus.stages[3].displayTime = new Date().toLocaleString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      },
    );
    bulkOrder.downloadInvoice = true;
    bulkOrder.updatedBy = adminUserId;

    await bulkOrder.save();

    return res.status(200).json({
      success: true,
      message: 'Bulk order marked as delivered successfully',
      order: bulkOrder,
    });
  } catch (error) {
    console.error('Mark as delivered error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark order as delivered',
      error: error.message,
    });
  }
};

// 4. Cancel Bulk Order (Admin)
export const cancelBulkOrderAdmin = async (req, res) => {
  try {
    const adminUserId = req.user?.id;
    const adminName = req.user?.fullName;
    if (!adminUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { reason, notes } = req.body;

    const bulkOrder = await BulkOrder.findById(id);
    if (!bulkOrder) {
      return res.status(404).json({
        success: false,
        message: 'Bulk order not found',
      });
    }

    if (bulkOrder.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled',
      });
    }

    if (bulkOrder.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Delivered orders cannot be cancelled',
      });
    }

    // Release stock - move from sold back to onHand
    if (bulkOrder.products && bulkOrder.products.length > 0) {
      for (const product of bulkOrder.products) {
        const inventory = await AdminInventory.findById(product.inventoryId);
        if (inventory) {
          const variant = inventory.variants[product.variantIndex];
          if (variant) {
            // Move from sold back to onHand
            variant.sold -= product.orderQuantity;
            variant.onHand += product.orderQuantity;
            variant.inStock = variant.onHand > 0;
            await inventory.save();
          }
        }
      }
    }

    bulkOrder.status = 'cancelled';
    bulkOrder.statusLabel = 'Order Cancelled';
    bulkOrder.statusColor = '#F44336';
    bulkOrder.cancellationDetails = {
      cancelledAt: new Date(),
      cancelledDate: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      cancelledBy: {
        id: adminUserId,
        name: adminName,
        role: 'Admin',
      },
      cancelledByModel: 'AdminUser',
      reason: reason || 'Cancelled by admin',
      notes: notes || '',
    };
    bulkOrder.updatedBy = adminUserId;

    await bulkOrder.save();

    return res.status(200).json({
      success: true,
      message: 'Bulk order cancelled successfully. Stock has been released.',
      order: bulkOrder,
    });
  } catch (error) {
    console.error('Cancel bulk order (admin) error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel bulk order',
      error: error.message,
    });
  }
};