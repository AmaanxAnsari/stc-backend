import { getAdminDB } from '../../config/db.js';
import { generateUniqueOrderId } from '../../helper/orderIdHelper.js';
import AdminUser from '../../models/admin/adminUser.js';
import DeliveryVehicle from '../../models/admin/deliveryVehicleModel.js';
import InVanInventory from '../../models/admin/InVanInventoryModel.js';
import AdminInventory from '../../models/admin/InventoryModel.js';
import SpotOrder from '../../models/admin/SpotOrderModel.js';
import SpotOrderCart from '../../models/app/SpotOrderCartModel.js';
import { notifyAdmins, notifyUser, sendSpotOrderCustomerEmail } from '../../utils/notificationService.js';
import { createRepository } from '../../utils/repository.js';

const spotOrderRepo = createRepository(SpotOrder, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});

// Create spot order from cart
// export const createSpotOrder = async (req, res) => {
//   try {
//     const driverId = req.user?.id;
//     const driverName = req.user?.fullName || req.user?.name;
//     const driverPhone =
//       req.user?.mobile || req.user?.mobileNumber || req.user?.phone;

//     if (!driverId) {
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     const {
//       vehicleId,
//       customerDetails,
//       paymentDetails,
//       orderLocation,
//       orderNotes,
//       inventorySource = 'van_stock',
//     } = req.body;

//     // Validate required fields
//     if (!vehicleId) {
//       return res.status(400).json({
//         success: false,
//         message: 'vehicleId is required',
//       });
//     }

//     if (
//       !customerDetails ||
//       !customerDetails.name ||
//       !customerDetails.phone ||
//       !customerDetails.address
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: 'Customer details (name, phone, address) are required',
//       });
//     }

//     if (!paymentDetails || !paymentDetails.method) {
//       return res.status(400).json({
//         success: false,
//         message: 'Payment method is required',
//       });
//     }

//     // Fetch cart
//     const cart = await SpotOrderCart.findOne({
//       driverId,
//       vehicleId,
//       isActive: true,
//     });

//     if (!cart || !cart.items || cart.items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Cart is empty',
//       });
//     }

//     const orderProducts = [];
//     let itemTotal = 0;
//     let productCount = 0;

//     // Validate stock and prepare order products
//     for (const item of cart.items) {
//       const inventory = await InVanInventory.findById(item.inventoryId);

//       if (!inventory) {
//         return res.status(404).json({
//           success: false,
//           message: `Inventory not found for ${item.name}`,
//         });
//       }

//       const variant = inventory.variants[item.variantIndex];
//       if (!variant) {
//         return res.status(404).json({
//           success: false,
//           message: `Variant not found for ${item.name}`,
//         });
//       }

//       // Check if reserved stock matches cart quantity
//       if (variant.reserved < item.cartQuantity) {
//         return res.status(400).json({
//           success: false,
//           message: `Stock reservation mismatch for ${item.name}`,
//         });
//       }

//       itemTotal += item.price * item.cartQuantity;
//       productCount += item.cartQuantity;

//       orderProducts.push({
//         cartItemId: item.cartItemId,
//         inventoryId: inventory._id,
//         productId: item.productId,
//         variantIndex: item.variantIndex,
//         name: item.name,
//         quantity: item.quantity,
//         price: item.price,
//         originalPrice: item.originalPrice,
//         image: item.image,
//         orderQuantity: item.cartQuantity,
//         category: item.category,
//       });
//     }

//     const totalAmount = itemTotal;

//     // Generate order ID
//     const orderId = await generateUniqueOrderId(SpotOrder, 'SPOT');

//     // Current timestamp
//     const now = new Date();
//     const formattedDateTime = now.toLocaleString('en-IN', {
//       day: '2-digit',
//       month: 'short',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//       hour12: true,
//       timeZone: 'Asia/Kolkata',
//     });

//     // Create spot order
//     const newOrder = new SpotOrder({
//       orderId,
//       orderType: 'on_spot',
//       status: 'delivered',
//       statusLabel: 'Order Delivered',
//       statusColor: '#4CAF50',
//       orderPlacedAt: formattedDateTime,
//       orderPlacedDate: now,
//       deliveredAt: formattedDateTime,
//       deliveredDate: now,
//       totalAmount,
//       currency: '₹',
//       productCount,
//       products: orderProducts,
//       customerDetails: {
//         name: customerDetails.name,
//         phone: customerDetails.phone,
//         address: customerDetails.address,
//         customerType: customerDetails.customerType || 'Retailer',
//         newCustomer: customerDetails.newCustomer !== false,
//       },
//       paymentDetails: {
//         method: paymentDetails.method,
//         status: paymentDetails.status || 'Paid',
//         amount: totalAmount,
//         transactionId: paymentDetails.transactionId || null,
//         chequeNumber: paymentDetails.chequeNumber || null,
//         paidAt: now,
//       },
//       billSummary: {
//         itemTotal: totalAmount,
//         totalAmount,
//       },
//       deliveryOfficer: {
//         id: driverId,
//         name: driverName,
//         phone: driverPhone || '',
//       },
//       orderLocation: orderLocation || {},
//       inventorySource,
//       vehicleId,
//       driverId,
//       orderNotes: orderNotes || '',
//     });

//     // Update inventory: move reserved to sold, decrement onHand
//     for (const item of cart.items) {
//       const inventory = await InVanInventory.findById(item.inventoryId);
//       if (inventory) {
//         const variant = inventory.variants[item.variantIndex];
//         if (variant) {
//           variant.reserved -= item.cartQuantity;
//           variant.sold += item.cartQuantity;
//           await inventory.save();
//         }
//       }
//     }

//     await newOrder.save();

//     // // Clear cart and mark as inactive
//     // cart.items = [];
//     // cart.isActive = false;
//     // await cart.save();
//     // Remove the cart entirely after order creation
//     await SpotOrderCart.findByIdAndDelete(cart._id);

//     return res.status(201).json({
//       success: true,
//       message: 'Spot order created successfully',
//       order: newOrder,
//     });
//   } catch (error) {
//     console.error('Create spot order error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to create spot order',
//       error: error.message,
//     });
//   }
// };


// Working One
// export const createSpotOrder = async (req, res) => {
//   try {
//     const driverId = req.user?.id;
//     const driverName = req.user?.fullName || req.user?.name;
//     const driverPhone =
//       req.user?.mobile || req.user?.mobileNumber || req.user?.phone;

//     if (!driverId) {
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     const {
//       vehicleId,
//       customerDetails,
//       paymentDetails,
//       orderLocation,
//       orderNotes,
//       inventorySource = 'van_stock',
//     } = req.body;

//     // Validate required fields
//     if (!vehicleId) {
//       return res.status(400).json({
//         success: false,
//         message: 'vehicleId is required',
//       });
//     }

//     if (
//       !customerDetails ||
//       !customerDetails.name ||
//       !customerDetails.phone ||
//       !customerDetails.address
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: 'Customer details (name, phone, address) are required',
//       });
//     }

//     if (!paymentDetails || !paymentDetails.method) {
//       return res.status(400).json({
//         success: false,
//         message: 'Payment method is required',
//       });
//     }

//     // Fetch cart
//     const cart = await SpotOrderCart.findOne({
//       driverId,
//       vehicleId,
//       isActive: true,
//     });

//     if (!cart || !cart.items || cart.items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Cart is empty',
//       });
//     }

//     const orderProducts = [];
//     let itemTotal = 0;
//     let productCount = 0;

//     // Validate stock and prepare order products
//     for (const item of cart.items) {
//       const inventory = await InVanInventory.findById(item.inventoryId);

//       if (!inventory) {
//         return res.status(404).json({
//           success: false,
//           message: `Inventory not found for ${item.name}`,
//         });
//       }

//       const variant = inventory.variants[item.variantIndex];
//       if (!variant) {
//         return res.status(404).json({
//           success: false,
//           message: `Variant not found for ${item.name}`,
//         });
//       }

//       // Check if reserved stock matches cart quantity
//       if (variant.reserved < item.cartQuantity) {
//         return res.status(400).json({
//           success: false,
//           message: `Stock reservation mismatch for ${item.name}`,
//         });
//       }

//       itemTotal += item.price * item.cartQuantity;
//       productCount += item.cartQuantity;

//       orderProducts.push({
//         cartItemId: item.cartItemId,
//         inventoryId: inventory._id,
//         productId: item.productId,
//         variantIndex: item.variantIndex,
//         name: item.name,
//         quantity: item.quantity,
//         price: item.price,
//         originalPrice: item.originalPrice,
//         image: item.image,
//         orderQuantity: item.cartQuantity,
//         category: item.category,
//       });
//     }

//     const totalAmount = itemTotal;

//     // Generate order ID
//     const orderId = await generateUniqueOrderId(SpotOrder, 'SPOT');

//     // Current timestamp
//     const now = new Date();
//     const formattedDateTime = now.toLocaleString('en-IN', {
//       day: '2-digit',
//       month: 'short',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//       hour12: true,
//       timeZone: 'Asia/Kolkata',
//     });

//     // Create spot order
//     const newOrder = new SpotOrder({
//       orderId,
//       orderType: 'on_spot',
//       status: 'delivered',
//       statusLabel: 'Order Delivered',
//       statusColor: '#4CAF50',
//       orderPlacedAt: formattedDateTime,
//       orderPlacedDate: now,
//       deliveredAt: formattedDateTime,
//       deliveredDate: now,
//       totalAmount,
//       currency: '₹',
//       productCount,
//       products: orderProducts,
//       customerDetails: {
//         name: customerDetails.name,
//         phone: customerDetails.phone,
//         address: customerDetails.address,
//         customerType: customerDetails.customerType || 'Retailer',
//         newCustomer: customerDetails.newCustomer !== false,
//       },
//       paymentDetails: {
//         method: paymentDetails.method,
//         status: paymentDetails.status || 'Paid',
//         amount: totalAmount,
//         paymentDetails: paymentDetails.paymentDetails,
//         transactionId: paymentDetails.transactionId || null,
//         chequeNumber: paymentDetails.chequeNumber || null,
//         paidAt: now,
//       },
//       billSummary: {
//         itemTotal: totalAmount,
//         totalAmount,
//       },
//       deliveryOfficer: {
//         id: driverId,
//         name: driverName,
//         phone: driverPhone || '',
//       },
//       orderLocation: orderLocation || {},
//       inventorySource,
//       vehicleId,
//       driverId,
//       orderNotes: orderNotes || '',
//     });

//     // ✅ FIX: Update inventory properly
//     for (const item of cart.items) {
//       const inventory = await InVanInventory.findById(item.inventoryId);
//       if (inventory) {
//         const variant = inventory.variants[item.variantIndex];
//         if (variant) {
//           // ✅ Move reserved to sold AND decrement onHand
//           variant.reserved -= item.cartQuantity;
//           variant.sold += item.cartQuantity;
//           variant.onHand -= item.cartQuantity; // ✅ THIS WAS MISSING

//           // ✅ Update stock status
//           if (variant.onHand <= 0) {
//             variant.inStock = false;
//             variant.status = 'out_of_stock';
//           } else if (variant.onHand <= variant.lowStockThreshold) {
//             variant.status = 'low_stock';
//           }
//         }

//         // ✅ Recalculate totals at inventory level
//         inventory.totalReserved = inventory.variants.reduce(
//           (sum, v) => sum + (v.reserved || 0),
//           0,
//         );
//         inventory.totalSold = inventory.variants.reduce(
//           (sum, v) => sum + (v.sold || 0),
//           0,
//         );
//         inventory.totalOnHand = inventory.variants.reduce(
//           (sum, v) => sum + (v.onHand || 0),
//           0,
//         );

//         // ✅ Update overall inventory status
//         if (inventory.totalOnHand <= 0) {
//           inventory.status = 'out_of_stock';
//         } else if (inventory.variants.some((v) => v.status === 'low_stock')) {
//           inventory.status = 'low_stock';
//         } else {
//           inventory.status = 'in_stock';
//         }

//         await inventory.save();
//       }
//     }

//     await newOrder.save();
//     // ✅ Get vehicle details for better notification
//     const vehicle =
//       await DeliveryVehicle.findById(vehicleId).select('vehicleNumber vehicleName');

//     const notificationData = {
//       orderId: newOrder.orderId,
//       orderMongoId: newOrder._id.toString(),
//       deliveredAt: formattedDateTime,
//       driverId: driverId,
//       driverName: driverName,
//       driverPhone: driverPhone || 'N/A',
//       driverEmail: req.user?.email || null,
//       vehicleId: vehicleId,
//       vehicleName: vehicle?.vehicleNumber || vehicle?.vehicleName || vehicleId,
//       inventorySource: inventorySource,
//       customerName: customerDetails.name,
//       customerPhone: customerDetails.phone,
//       customerAddress: customerDetails.address,
//       customerType: customerDetails.customerType || 'Retailer',
//       customerIsNew: customerDetails.newCustomer !== false,
//       productCount: productCount,
//       products: orderProducts,
//       totalAmount: totalAmount,
//       paymentMethod: paymentDetails.method,
//       paymentStatus: paymentDetails.status || 'Paid',
//       transactionId: paymentDetails.transactionId || null,
//       chequeNumber: paymentDetails.chequeNumber || null,
//       orderLocation: orderLocation || null,
//       orderNotes: orderNotes || '',
//       viewOrderUrl: `${process.env.DRIVER_APP_URL || 'https://driver.gavran.com'}/orders/${newOrder._id}`,
//       adminOrderUrl: `${process.env.ADMIN_URL || 'https://gavran-admin.demohub.tech'}/orders/${newOrder._id}`,
//     };

//     // ✅ 1. Notify DRIVER (Email + FCM + DB)
//     if (req.user?.email) {
//       notifyUser({
//         userId: driverId,
//         userEmail: req.user.email,
//         userName: driverName,
//         templateKey: 'spotOrderCreated',
//         data: notificationData,
//       }).catch((err) => {
//         console.error('❌ Driver spot order notification failed:', err);
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
//         templateKey: 'spotOrderCreated',
//         data: notificationData,
//       }).catch((err) => {
//         console.error('❌ Admin spot order notification failed:', err);
//       });
//     }

//     // Remove the cart entirely after order creation
//     await SpotOrderCart.findByIdAndDelete(cart._id);

//     return res.status(201).json({
//       success: true,
//       message: 'Spot order created successfully',
//       order: newOrder,
//     });
//   } catch (error) {
//     console.error('Create spot order error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to create spot order',
//       error: error.message,
//     });
//   }
// };
// Working One

export const createSpotOrder = async (req, res) => {
  const session = await getAdminDB().startSession();
  session.startTransaction();

  try {
    const driverId = req.user?.id;
    const driverName = req.user?.fullName || req.user?.name;
    const driverPhone =
      req.user?.mobile || req.user?.mobileNumber || req.user?.phone;

    if (!driverId) {
      await session.abortTransaction();
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      vehicleId,
      customerDetails,
      paymentDetails,
      orderLocation,
      orderNotes,
      inventorySource = 'van_stock',
      // ✅ Extract new fields
      isGst = false,
      companyName = null,
      taxAmount = 0,
    } = req.body;

    // Validate required fields
    if (!vehicleId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'vehicleId is required',
      });
    }

    if (
      !customerDetails ||
      !customerDetails.name ||
      !customerDetails.phone ||
      !customerDetails.address ||
      !customerDetails.email // ✅ Validate Email
    ) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Customer details (name, phone,email, address) are required',
      });
    }

    if (!paymentDetails || !paymentDetails.method) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Payment method is required',
      });
    }

    // Fetch cart
    const cart = await SpotOrderCart.findOne({
      driverId,
      vehicleId,
      isActive: true,
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty',
      });
    }

    const orderProducts = [];
    let itemTotal = 0;
    let productCount = 0;

    // Validate stock and prepare order products
    for (const item of cart.items) {
      const inventory = await InVanInventory.findById(item.inventoryId).session(
        session,
      );

      if (!inventory) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Inventory not found for ${item.name}`,
        });
      }

      const variant = inventory.variants[item.variantIndex];
      if (!variant) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Variant not found for ${item.name}`,
        });
      }

      // Check if reserved stock matches cart quantity (Van logic: cart reserves stock temporarily)
      if (variant.reserved < item.cartQuantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Stock reservation mismatch for ${item.name}`,
        });
      }

      itemTotal += item.price * item.cartQuantity;
      productCount += item.cartQuantity;

      orderProducts.push({
        cartItemId: item.cartItemId,
        inventoryId: inventory._id,
        productId: item.productId,
        variantIndex: item.variantIndex,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        originalPrice: item.originalPrice,
        image: item.image,
        orderQuantity: item.cartQuantity,
        category: item.category,
      });
    }

    // const totalAmount = itemTotal;
    const totalAmount = Math.ceil(itemTotal + (isGst ? Number(taxAmount) : 0));

    // Generate order ID
    const orderId = await generateUniqueOrderId(SpotOrder, 'SPOT');

    // Current timestamp
    const now = new Date();
    const formattedDateTime = now.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });

    // Create spot order
    const newOrder = new SpotOrder({
      orderId,
      orderType: 'on_spot',
      status: 'delivered',
      statusLabel: 'Order Delivered',
      statusColor: '#4CAF50',
      orderPlacedAt: formattedDateTime,
      orderPlacedDate: now,
      deliveredAt: formattedDateTime,
      deliveredDate: now,
      totalAmount,
      currency: '₹',
      productCount,
      products: orderProducts,
      // ✅ GST Fields
      isGst,
      companyName,
      customerDetails: {
        name: customerDetails.name,
        phone: customerDetails.phone,
        email: customerDetails.email,
        address: customerDetails.address,
        customerType: customerDetails.customerType || 'Retailer',
        newCustomer: customerDetails.newCustomer !== false,
      },
      paymentDetails: {
        method: paymentDetails.method,
        status: paymentDetails.status || 'Paid',
        amount: totalAmount,
        paymentDetails: paymentDetails.paymentDetails,
        transactionId: paymentDetails.transactionId || null,
        chequeNumber: paymentDetails.chequeNumber || null,
        paidAt: now,
      },
      billSummary: {
        itemTotal: itemTotal,
        tax: Number(taxAmount),
        taxPercentage: isGst ? 18 : 0, // Assuming 18 based on previous logic, or pass dynamically
        totalAmount,
      },
      // billSummary: {
      //   itemTotal: totalAmount,
      //   totalAmount,
      // },
      deliveryOfficer: {
        id: driverId,
        name: driverName,
        phone: driverPhone || '',
      },
      orderLocation: orderLocation || {},
      inventorySource,
      vehicleId,
      driverId,
      orderNotes: orderNotes || '',
    });

    // =================================================================
    // CRITICAL UPDATE: Sync Inventory (Van + Admin)
    // =================================================================
    for (const item of cart.items) {
      // 1. Update In-Van Inventory
      const inventory = await InVanInventory.findById(item.inventoryId).session(
        session,
      );
      if (inventory) {
        const variant = inventory.variants[item.variantIndex];
        if (variant) {
          // Van Logic: Reserved -> Sold, OnHand Decreases
          variant.reserved -= item.cartQuantity;
          variant.sold += item.cartQuantity;
          variant.onHand -= item.cartQuantity;

          // Update stock status
          if (variant.onHand <= 0) {
            variant.inStock = false;
            variant.status = 'out_of_stock';
          } else if (variant.onHand <= variant.lowStockThreshold) {
            variant.status = 'low_stock';
          }
        }
        inventory.recalculateAggregates(); // Ensure aggregate fields update
        await inventory.save({ session });
      }

      // 2. Update Admin Inventory (Centralized Sync)
      // Find the master admin inventory item using productId
      const adminInventory = await AdminInventory.findOne({
        productId: item.productId,
        isDeleted: false,
      }).session(session);

      if (adminInventory) {
        const adminVariant = adminInventory.variants.find(
          (v) => v.variantIndex === item.variantIndex,
        );

        if (adminVariant) {
          // Admin Logic: Stock was 'Reserved' when moved to van.
          // Now it is 'Sold'.
          // So: Reserved -> Sold.
          // Note: We do NOT touch Admin 'onHand' here because it was already deducted when stock moved to Van.

          // Safety check to ensure we don't go below zero reserved
          // (Though technically logic guarantees it, defensive coding is good)
          const qty = item.cartQuantity;
          if (adminVariant.reserved >= qty) {
            adminVariant.reserved -= qty;
            adminVariant.sold += qty;
          } else {
            // Edge case: Maybe stock was returned or logic drift?
            // Fallback: Just mark sold, clear remaining reserved
            adminVariant.sold += qty;
            adminVariant.reserved = 0;
          }
        }
        // Save Admin Inventory (Triggers its own recalc hooks)
        await adminInventory.save({ session });
      }
    }

    await newOrder.save({ session });
    await SpotOrderCart.findByIdAndDelete(cart._id);

    await session.commitTransaction();
    session.endSession();

    // =================================================================
    // Notifications (Outside Transaction)
    // =================================================================

    const vehicle = await DeliveryVehicle.findById(vehicleId).select(
      'vehicleNumber vehicleName',
    );

    const notificationData = {
      orderId: newOrder.orderId,
      orderMongoId: newOrder._id.toString(),
      deliveredAt: formattedDateTime,
      driverId: driverId,
      driverName: driverName,
      driverPhone: driverPhone || 'N/A',
      driverEmail: req.user?.email || null,
      vehicleId: vehicleId,
      vehicleName: vehicle?.vehicleNumber || vehicle?.vehicleName || vehicleId,
      inventorySource: inventorySource,
      customerName: customerDetails.name,
      customerPhone: customerDetails.phone,
      customerAddress: customerDetails.address,
      customerType: customerDetails.customerType || 'Retailer',
      customerIsNew: customerDetails.newCustomer !== false,
      productCount: productCount,
      products: orderProducts,
      totalAmount: totalAmount,
      itemTotal: itemTotal, // For email breakdown
      taxAmount: Number(taxAmount), // For email breakdown
      isGst: isGst,
      paymentMethod: paymentDetails.method,
      paymentStatus: paymentDetails.status || 'Paid',
      transactionId: paymentDetails.transactionId || null,
      chequeNumber: paymentDetails.chequeNumber || null,
      orderLocation: orderLocation || null,
      orderNotes: orderNotes || '',
      viewOrderUrl: `${process.env.HOST_URL || 'https://gavran-admin.demohub.tech'}/order-management/spot-orders/details/${newOrder._id}`,
      adminOrderUrl: `${process.env.HOST_URL || 'https://gavran-admin.demohub.tech'}/order-management/spot-orders/details/${newOrder._id}`,
    };

    // Notify DRIVER
    if (req.user?.email) {
      notifyUser({
        userId: driverId,
        userEmail: req.user.email,
        userName: driverName,
        templateKey: 'spotOrderCreated',
        data: notificationData,
      }).catch((err) => {
        console.error('❌ Driver spot order notification failed:', err);
      });
    }

    // 3. ✅ Notify CUSTOMER (Using new service function)
    if (customerDetails.email) {
      // Prepare specific data for the receipt
      const receiptData = {
        orderId: newOrder.orderId,
        customerName: customerDetails.name,
        deliveredAt: formattedDateTime,
        paymentStatus: paymentDetails.status || 'Paid',
        paymentMethod: paymentDetails.method,
        transactionId: paymentDetails.transactionId,
        products: orderProducts,
        itemTotal: itemTotal,
        taxAmount: Number(taxAmount),
        totalAmount: totalAmount,
        isGst: isGst,
      };

      // Fire and forget (don't await if you want faster response, or await if critical)
      sendSpotOrderCustomerEmail(customerDetails.email, receiptData);
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
        templateKey: 'spotOrderCreated',
        data: notificationData,
      }).catch((err) => {
        console.error('❌ Admin spot order notification failed:', err);
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Spot order created successfully',
      order: newOrder,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Create spot order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create spot order',
      error: error.message,
    });
  }
};

// Get all spot orders by driver
export const getSpotOrdersByDriver = async (req, res) => {
  try {
    const driverId = req.user?.id;

    if (!driverId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { page, limit, sort, startDate, endDate } = req.query;

    const filter = { 'deliveryOfficer.id': driverId, isDeleted: false };

    // Date range filter
    if (startDate || endDate) {
      filter.orderPlacedDate = {};
      if (startDate) {
        filter.orderPlacedDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.orderPlacedDate.$lte = end;
      }
    }

    const result = await spotOrderRepo.getAll({
      filter,
      sort: sort ? JSON.parse(sort) : { orderPlacedDate: -1 },
      page,
      limit,
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error('Get spot orders by driver error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch spot orders',
      error: error.message,
    });
  }
};

// Get spot order by ID
export const getSpotOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await spotOrderRepo.getById(id, {});

    return res.status(result.status).json(result);
  } catch (error) {
    console.error('Get spot order by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch spot order',
      error: error.message,
    });
  }
};
