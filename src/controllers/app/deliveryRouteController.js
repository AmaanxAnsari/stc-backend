import AdminUser from "../../models/admin/adminUser.js";
import AppOrder from "../../models/admin/AppOrderModel.js";
import BulkOrder from "../../models/admin/BulkOrderModel.js";
import DeliveryRoute from "../../models/admin/deliveryRouteModel.js";
import DeliveryVehicle from "../../models/admin/deliveryVehicleModel.js";
import AdminInventory from "../../models/admin/InventoryModel.js";
import ReplacementRequest from "../../models/admin/ReplacementOrderModel.js";
import { notifyAdmins, notifyUser, sendDeliveryOTPNotification, sendOutForDeliveryNotification } from "../../utils/notificationService.js";
import { OrderService } from "../../utils/orderService.js";
import { OTPService } from "../../utils/otpService.js";
import { TrackingService } from "../../utils/trackingService.js";
import uploadHelper from "../../utils/uploadHelper.js";
import { User } from './../../models/app/user.js';
import mongoose from 'mongoose';

// Helper to get model from orderType
const getOrderModel = (orderType) => {
  switch (orderType) {
    case 'normal':
      return AppOrder;
    case 'bulk':
      return BulkOrder;
    case 'replacement':
      return ReplacementRequest;
    default:
      throw new Error('Invalid orderType');
  }
};
const formatDisplayTime = (date) => {
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getAllRoutes = async (req, res) => {
  try {
    const { status } = req.query;

    const query = { isDeleted: false };

    if (status) {
      query.status = status;
    }

    const routes = await DeliveryRoute.find(query)
      .populate('deliveryOfficer', 'name phone email avatar')
      .populate('createdBy', 'name email')
      .sort({ nextDeliveryDate: 1 });

    res.status(200).json({
      success: true,
      count: routes.length,
      data: routes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getRouteById = async (req, res) => {
  try {
    const { routeId } = req.params;

    const route = await DeliveryRoute.findOne({ _id: routeId, isDeleted: false })
      .populate('deliveryOfficer', 'name phone email avatar')
      .lean();

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
      });
    }

    res.status(200).json({
      success: true,
      data: route,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};




export const getRouteForDriver = async (req, res) => {
  try {
    const driverId = req.user.id;

    // Fetch all routes for this driver
    const routes = await DeliveryRoute.find({
      deliveryOfficer: driverId,
      isDeleted: false,
    }).sort({createdAt:-1});

    if (!routes || routes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No routes found for this driver',
      });
    }

    // Fetch delivery officer details once
    const officer = await User.findById(driverId).select(
      'fullName mobile email profileImage role',
    );

    const deliveryOfficerData = officer
      ? {
          _id: officer._id,
          name: officer.fullName || 'Unknown',
          phone: officer.mobile || '',
          email: officer.email || '',
          avatar: officer.profileImage || null,
          role: officer.role || 'delivery_officer',
        }
      : null;

    // ✅ NEW: Collect deliveryVehicle ids from routes
    const deliveryVehicleIds = routes
      .map((r) => r.deliveryVehicle)
      .filter(Boolean);

    // ✅ NEW: Fetch delivery vehicles in one query (select only required fields)
    // (This does NOT modify route.deliveryVehicle; it just builds a separate map)
    const deliveryVehicles = await DeliveryVehicle.find({
      _id: { $in: deliveryVehicleIds },
      isDeleted: false,
      isActive: true,
    }).select('vehicleName vehicleNumber');

    // ✅ NEW: Map vehicleId -> vehicle data
    const deliveryVehicleMap = {};
    deliveryVehicles.forEach((v) => {
      deliveryVehicleMap[v._id.toString()] = {
        _id: v._id,
        vehicleName: v.vehicleName,
        vehicleNumber: v.vehicleNumber,
      };
    });

    // Collect all order IDs from all stops
    const normalOrderIds = [];
    const bulkOrderIds = [];
    const replacementOrderIds = [];

    routes.forEach((route) => {
      route.stops?.forEach((stop) => {
        stop.partners?.forEach((partner) => {
          partner.orders?.forEach((orderRef) => {
            if (orderRef.orderType === 'normal')
              normalOrderIds.push(orderRef.id);
            else if (orderRef.orderType === 'bulk')
              bulkOrderIds.push(orderRef.id);
            else if (orderRef.orderType === 'replacement')
              replacementOrderIds.push(orderRef.id);
          });
        });
      });
    });

    // Fetch all orders in parallel
    const [normalOrders, bulkOrders, replacementOrders] = await Promise.all([
      AppOrder.find({ _id: { $in: normalOrderIds } }),
      BulkOrder.find({ _id: { $in: bulkOrderIds } }),
      ReplacementRequest.find({ _id: { $in: replacementOrderIds } }),
    ]);

    // Build order map
    const orderMap = {};
    normalOrders.forEach(
      (o) => (orderMap[o._id.toString()] = { order: o, orderType: 'normal' }),
    );
    bulkOrders.forEach(
      (o) => (orderMap[o._id.toString()] = { order: o, orderType: 'bulk' }),
    );
    replacementOrders.forEach(
      (o) =>
        (orderMap[o._id.toString()] = { order: o, orderType: 'replacement' }),
    );

    // Format routes with fresh order data
    const finalData = routes.map((route) => {
      const routeObj = route.toObject();

      // Attach officer details (existing behavior)
      routeObj.deliveryOfficer = deliveryOfficerData;

      // ✅ NEW: Attach deliveryVehicleData without touching deliveryVehicle id
      const vehicleId = routeObj.deliveryVehicle
        ? routeObj.deliveryVehicle.toString()
        : null;
      routeObj.deliveryVehicleData = vehicleId
        ? deliveryVehicleMap[vehicleId] || null
        : null;

      // Format stops with live order data (existing behavior)
      routeObj.stops = (routeObj.stops || []).map((stop) => ({
        ...stop,
        partners: (stop.partners || []).map((partner) => ({
          ...partner,
          orders: (partner.orders || [])
            .map((orderRef) => {
              const { order, orderType } = orderMap[orderRef.id] || {};
              if (!order) return null;

              if (orderType === 'normal' || orderType === 'bulk') {
                return {
                  id: order._id.toString(),
                  orderId: order.orderId,
                  orderPlacedAt: order.orderPlacedAt,
                  orderPlacedDate: order.orderPlacedDate,
                  status: order.status,
                  statusLabel:
                    order.statusLabel || getStatusLabel(order.status),
                  statusColor:
                    order.statusColor || getStatusColor(order.status),
                  totalAmount: order.totalAmount || 0,
                  originalAmount: order.originalAmount || 0,
                  currency: order.currency || '₹',
                  productCount: order.productCount || 0,
                  products: order.products || [],
                  billSummary: order.billSummary || {},
                  paymentMethod: order.paymentMethod || 'Cash',
                  paymentStatus: order.paymentStatus || 'Pending',
                  deliveryNotes: order.deliveryNotes || '',
                  deliveryProof: order.deliveryProof,
                  cancellationDetails: order.cancellationDetails,
                  orderType,
                };
              } else if (orderType === 'replacement') {
                const mappedProducts = (order.replacementItems || []).map(
                  (item) => ({
                    cartItemId: item.originalItem.cartItemId,
                    inventoryId: item.originalItem.inventoryId,
                    productId: item.originalItem.productId,
                    variantIndex: item.originalItem.variantIndex,
                    name: item.originalItem.name,
                    quantity: item.originalItem.quantity,
                    price: item.originalItem.price,
                    originalPrice: item.originalItem.price,
                    image: item.originalItem.image,
                    orderQuantity: item.replacementQuantity,
                    category: '',
                    reason: item.reason,
                    reasonDescription: item.reasonDescription,
                    images: item.images,
                  }),
                );

                return {
                  id: order._id.toString(),
                  orderId: order.requestId || order._id.toString(),
                  orderPlacedAt: order.requestSubmittedAt
                    ? new Date(order.requestSubmittedAt).toLocaleString('en-IN')
                    : '',
                  orderPlacedDate: order.requestSubmittedAt,
                  status: order.status,
                  statusLabel:
                    order.statusLabel || getStatusLabel(order.status),
                  statusColor:
                    order.statusColor || getStatusColor(order.status),
                  totalAmount: order.totalAmount || 0,
                  originalAmount: order.originalAmount || 0,
                  currency: '₹',
                  productCount: mappedProducts.length,
                  products: mappedProducts,
                  billSummary: {},
                  deliveryNotes: order.notes || '',
                  deliveryProof: order.deliveryProof,
                  cancellationDetails: order.cancellationDetails,
                  orderType: 'replacement',
                };
              }
              return null;
            })
            .filter(Boolean),
        })),
      }));

      return routeObj;
    });

    return res.status(200).json({
      success: true,
      data: finalData,
    });
  } catch (error) {
    console.error('getRouteForDriver error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch route',
      error: error.message,
    });
  }
};


// export const startRoute = async (req, res) => {
//   try {
//     const { routeId } = req.params;
//     const userId = req.user?.id;

//     // Find the route
//     const route = await DeliveryRoute.findOne({
//       _id: routeId,
//       isDeleted: false,
//     });

//     if (!route) {
//       return res.status(404).json({
//         success: false,
//         message: 'Route not found',
//       });
//     }

//     // Verify driver is assigned to this route
//     if (route.deliveryOfficer?.toString() !== userId) {
//       return res.status(403).json({
//         success: false,
//         message: 'You are not assigned to this route',
//       });
//     }

//     // Check if route is scheduled
//     if (route.status !== 'scheduled') {
//       return res.status(400).json({
//         success: false,
//         message: `Route is already ${route.status}. Only scheduled routes can be started.`,
//       });
//     }

//     // ✅ FIX: Compare dates using IST timezone
//     const routeDate = new Date(route.nextDeliveryDate);
//     const today = new Date();

//     // Convert both dates to IST date strings and compare
//     const routeDateIST = routeDate.toLocaleDateString('en-CA', {
//       timeZone: 'Asia/Kolkata',
//     }); // YYYY-MM-DD format

//     const todayIST = today.toLocaleDateString('en-CA', {
//       timeZone: 'Asia/Kolkata',
//     }); // YYYY-MM-DD format

//     if (routeDateIST !== todayIST) {
//       return res.status(400).json({
//         success: false,
//         message: `This route is scheduled for ${route.nextDeliveryDateDisplay}. Cannot start today.`,
//       });
//     }

//     // Get all orders for this route
//     const allOrders = await OrderService.getOrdersByRoute(routeId);

//     if (allOrders.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'No orders found in this route',
//       });
//     }

//     // Update all orders to out_for_delivery
//     const updatePromises = allOrders.map(async (order) => {
//       // Update status
//       await OrderService.updateStatus(
//         order._id,
//         order.orderType,
//         'out_for_delivery',
//       );

//       // Add tracking event
//       const trackingEvent = TrackingService.createEvent(
//         'out_for_delivery',
//         'Order is out for delivery',
//       );
//       await OrderService.addTrackingEvent(
//         order._id,
//         order.orderType,
//         trackingEvent,
//       );

//       // Send notification
//       await sendOutForDeliveryNotification(order, order.orderType);
//     });

//     await Promise.all(updatePromises);

//     // Update route status to active
//     route.status = 'active';
//     route.updatedBy = userId;
//     await route.save();

//     return res.status(200).json({
//       success: true,
//       message: 'Route started successfully',
//       data: {
//         routeId: route._id,
//         routeName: route.routeName,
//         status: route.status,
//         totalOrders: allOrders.length,
//         ordersUpdated: allOrders.length,
//         nextDeliveryDate: route.nextDeliveryDate,
//       },
//     });
//   } catch (error) {
//     console.error('Start route error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to start route',
//       error: error.message,
//     });
//   }
// };

export const startRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const userId = req.user?.id;

    // ... (Existing route validation logic remains exactly the same) ...
    // Find the route
    const route = await DeliveryRoute.findOne({
      _id: routeId,
      isDeleted: false,
    });
    if (!route)
      return res
        .status(404)
        .json({ success: false, message: 'Route not found' });

    // Verify driver
    if (route.deliveryOfficer?.toString() !== userId)
      return res
        .status(403)
        .json({
          success: false,
          message: 'You are not assigned to this route',
        });

    // Check status
    if (route.status !== 'scheduled')
      return res
        .status(400)
        .json({
          success: false,
          message: `Route is already ${route.status}. Only scheduled routes can be started.`,
        });

    // Date check (IST)
    const routeDate = new Date(route.nextDeliveryDate);
    const today = new Date();
    const routeDateIST = routeDate.toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata',
    });
    const todayIST = today.toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata',
    });

    if (routeDateIST !== todayIST) {
      return res
        .status(400)
        .json({
          success: false,
          message: `This route is scheduled for ${route.nextDeliveryDateDisplay}. Cannot start today.`,
        });
    }

    // Get all orders
    const allOrders = await OrderService.getOrdersByRoute(routeId);
    if (allOrders.length === 0)
      return res
        .status(400)
        .json({ success: false, message: 'No orders found in this route' });

    // Update all orders
    const updatePromises = allOrders.map(async (order) => {
      // 1. Update overall status to out_for_delivery
      await OrderService.updateStatus(
        order._id,
        order.orderType,
        'out_for_delivery',
      );

      // 2. Prepare Timestamps for retro-filling stages
      const now = new Date();
      // Assume orderPlacedDate exists, fallback to created timestamp if needed
      const pendingTime = new Date(order.orderPlacedDate || order.createdAt);

      // Logic: Confirmed happens ~30% time after pending, Packed ~60% time after pending
      // Or just random points between OrderPlaced and Now (Out For Delivery)
      const diff = now.getTime() - pendingTime.getTime();

      // Confirmed time (approx 1/3rd way)
      const confirmedTime = new Date(pendingTime.getTime() + diff * 0.3);
      // Packed time (approx 2/3rd way)
      const packedTime = new Date(pendingTime.getTime() + diff * 0.6);

      // 3. Update 'confirmed' and 'packed' stages first
      await OrderService.updateMultipleStages(order._id, order.orderType, [
        {
          id: 'confirmed',
          timestamp: confirmedTime,
          displayTime: formatDisplayTime(confirmedTime),
        },
        {
          id: 'packed',
          timestamp: packedTime,
          displayTime: formatDisplayTime(packedTime),
        },
      ]);

      // 4. Update 'out_for_delivery' stage (Current Action)
      const trackingEvent = TrackingService.createEvent(
        'out_for_delivery',
        'Order is out for delivery',
      );

      // This will now UPDATE the existing 'out_for_delivery' stage instead of pushing a duplicate
      await OrderService.addTrackingEvent(
        order._id,
        order.orderType,
        trackingEvent,
      );

      // Send notification
      await sendOutForDeliveryNotification(order, order.orderType);
    });

    await Promise.all(updatePromises);

    // Update route status to active
    route.status = 'active';
    route.updatedBy = userId;
    await route.save();

    return res.status(200).json({
      success: true,
      message: 'Route started successfully',
      data: {
        routeId: route._id,
        routeName: route.routeName,
        status: route.status,
        totalOrders: allOrders.length,
        ordersUpdated: allOrders.length,
        nextDeliveryDate: route.nextDeliveryDate,
      },
    });
  } catch (error) {
    console.error('Start route error:', error);
    return res
      .status(500)
      .json({
        success: false,
        message: 'Failed to start route',
        error: error.message,
      });
  }
};

export const generateOTP = async (req, res) => {
  try {
    const { orderId, orderType, action } = req.body;

    // Validate input
    if (!orderId || !orderType || !action) {
      return res.status(400).json({
        success: false,
        message: 'orderId, orderType, and action are required',
      });
    }

    if (!['deliver', 'cancel'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'action must be either "deliver" or "cancel"',
      });
    }

    // Get order
    const order = await OrderService.getById(orderId, orderType);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if order is out_for_delivery
    if (order.status !== 'out_for_delivery') {
      return res.status(400).json({
        success: false,
        message: `Order status is ${order.status}. OTP can only be generated for orders that are out for delivery.`,
      });
    }

    // Check if OTP already exists and is still valid
    if (
      order.deliveryOTP?.code &&
      !OTPService.isExpired(order.deliveryOTP.expiresAt)
    ) {
      return res.status(200).json({
        success: true,
        message: 'OTP already exists and is still valid',
        data: {
          orderId: order._id,
          otpExists: true,
          expiresAt: order.deliveryOTP.expiresAt,
          expiryTime: OTPService.formatExpiryTime(order.deliveryOTP.expiresAt),
          action: order.deliveryOTP.action,
        },
      });
    }

    // Generate new OTP
    const otpCode = OTPService.generate();
    const expiresAt = OTPService.getExpiryTime();

    // Calculate regeneration count
    const regeneratedCount = (order.deliveryOTP?.regeneratedCount || 0) + 1;

    const otpData = {
      code: otpCode,
      generatedAt: new Date(),
      expiresAt: expiresAt,
      verified: false,
      verifiedAt: null,
      action: action,
      regeneratedCount: regeneratedCount, // Include it here
    };

    // Store OTP in order
    await OrderService.storeOTP(orderId, orderType, otpData);

    // Send OTP to customer
    await sendDeliveryOTPNotification(order, orderType, otpCode, action);

    // Mask customer phone for response
    const customerPhone = order.deliveryAddress?.raw?.phone || '';
    const maskedPhone = customerPhone
      ? customerPhone.slice(0, 5) + '*****'
      : 'N/A';

    return res.status(200).json({
      success: true,
      message: 'OTP generated and sent to customer',
      data: {
        orderId: order._id,
        orderNumber: order.orderId || order.requestId,
        otpGenerated: true,
        expiresAt: expiresAt,
        expiryTime: OTPService.formatExpiryTime(expiresAt),
        action: action,
        customerPhone: maskedPhone,
        regeneratedCount: regeneratedCount,
      },
    });
  } catch (error) {
    console.error('Generate OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate OTP',
      error: error.message,
    });
  }
};
/**
 * Verify OTP before proceeding to delivery/cancellation
 * NEW CONTROLLER
 */
export const verifyOTP = async (req, res) => {
  try {
    const { orderId, orderType, otp } = req.body;

    // Validate input
    if (!orderId || !orderType || !otp) {
      return res.status(400).json({
        success: false,
        message: 'orderId, orderType, and otp are required',
      });
    }

    // Get order
    const order = await OrderService.getById(orderId, orderType);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if order is out_for_delivery
    if (order.status !== 'out_for_delivery') {
      return res.status(400).json({
        success: false,
        message: `Order status is ${order.status}. OTP verification only available for orders out for delivery.`,
      });
    }

    // Check if OTP exists
    if (!order.deliveryOTP || !order.deliveryOTP.code) {
      return res.status(400).json({
        success: false,
        message: 'No OTP has been generated for this order. Please generate OTP first.',
      });
    }

    // Check if OTP is already verified
    if (order.deliveryOTP.verified) {
      return res.status(400).json({
        success: false,
        message: 'OTP already verified. Please proceed with delivery or cancellation.',
        data: {
          verified: true,
          verifiedAt: order.deliveryOTP.verifiedAt,
          action: order.deliveryOTP.action,
        },
      });
    }

    // Verify OTP
    const otpVerification = OTPService.verify(
      otp,
      order.deliveryOTP.code,
      order.deliveryOTP.expiresAt
    );

    if (!otpVerification.valid) {
      return res.status(400).json({
        success: false,
        message: otpVerification.error,
        verified: false,
      });
    }

    // Mark OTP as verified (but don't change order status yet)
    await OrderService.verifyOTP(orderId, orderType);

    // Get updated order
    const updatedOrder = await OrderService.getById(orderId, orderType);

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You can now proceed.',
      data: {
        orderId: updatedOrder._id,
        orderNumber: updatedOrder.orderId || updatedOrder.requestId,
        verified: true,
        verifiedAt: updatedOrder.deliveryOTP.verifiedAt,
        action: updatedOrder.deliveryOTP.action,
        proceedTo: updatedOrder.deliveryOTP.action === 'deliver' 
          ? 'delivery_proof_screen' 
          : 'cancellation_screen',
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: error.message,
    });
  }
};

/**
 * Complete Route - Manually mark route as completed
 */
export const completeRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const userId = req.user?.id;

    // Find the route
    const route = await DeliveryRoute.findOne({
      _id: routeId,
      isDeleted: false,
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
      });
    }

    // Verify driver is assigned to this route
    if (route.deliveryOfficer?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this route',
      });
    }

    // Check if route is active
    if (route.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Route status is ${route.status}. Only active routes can be completed.`,
      });
    }

    // Check route completion status
    const routeCompletion = await OrderService.checkRouteCompletion(routeId);

    if (routeCompletion.pendingOrders > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot complete route. ${routeCompletion.pendingOrders} order(s) are still pending or out for delivery.`,
        data: routeCompletion,
      });
    }

    // Update route status to completed
    route.status = 'completed';
    route.updatedBy = userId;
    await route.save();

    return res.status(200).json({
      success: true,
      message: 'Route completed successfully',
      data: {
        routeId: route._id,
        routeName: route.routeName,
        status: route.status,
        ...routeCompletion,
      },
    });
  } catch (error) {
    console.error('Complete route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete route',
      error: error.message,
    });
  }
};


export const markOrderDelivered = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User info missing.',
      });
    }

    const { orderId, orderType, signature } = req.body;
    console.log('Body', req.body);
    console.log('Files', req.files);

    if (!orderId || !orderType) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and type are required.',
      });
    }

    const OrderModel = getOrderModel(orderType);
    const order = await OrderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // ============================================================
    // 1. INVENTORY UPDATES (Reserved -> Sold)
    // ============================================================
    // Only perform this if the order wasn't already delivered/cancelled
    if (order.status !== 'delivered' && order.status !== 'cancelled') {
      // ✅ FIX: Determine correct items array based on order type
      const itemsToProcess =
        orderType === 'replacement' ? order.replacementItems : order.products;

      // Ensure array exists before iterating
      if (itemsToProcess && itemsToProcess.length > 0) {
        // Loop through all products/items in the order
        for (const item of itemsToProcess) {
          // Handle replacement item structure vs normal product structure
          let inventoryId, variantIndex, quantity;

          if (orderType === 'replacement') {
            inventoryId = item.originalItem?.inventoryId;
            variantIndex = item.originalItem?.variantIndex;
            quantity = item.replacementQuantity;
          } else {
            inventoryId = item.inventoryId;
            variantIndex = item.variantIndex;
            // Fallback logic for quantity
            quantity =
              item.orderQuantity ||
              (typeof item.quantity === 'number' ? item.quantity : 1);
          }

          if (!inventoryId) continue; // Skip if no inventory link

          const inventory = await AdminInventory.findById(inventoryId);
          if (inventory) {
            const variant = inventory.variants[variantIndex];

            if (variant) {
              // Logic: Move from Reserved to Sold
              if (variant.reserved >= quantity) {
                variant.reserved -= quantity;
              } else {
                variant.reserved = 0; // Safety fix
              }

              variant.sold = (variant.sold || 0) + quantity;

              // Recalculate totals
              inventory.totalReserved = inventory.variants.reduce(
                (sum, v) => sum + v.reserved,
                0,
              );
              inventory.totalSold = inventory.variants.reduce(
                (sum, v) => sum + v.sold,
                0,
              );

              await inventory.save();
            }
          }
        }
      }
    }
    // ============================================================
    // END INVENTORY UPDATES
    // ============================================================
    const outputDir = `delivery-proofs/${orderId}`;
    let deliveryPhotoData = null;
    let signatureData = null;

    // Extract uploaded files info from req.files using your helper
    const filePaths = uploadHelper.extractFilePaths(req.files);
    const deliveryPhotoFiles = filePaths.deliveryPhoto || [];

    // Handle delivery photo upload
    let optimizedPhotoUrl = null;
    if (deliveryPhotoFiles.length > 0) {
      // extractFilePaths returns paths as strings in an array, pass to optimizeImage
      optimizedPhotoUrl = await uploadHelper.optimizeImage(deliveryPhotoFiles, {
        outputDir,
      });

      // Get the file object for metadata
      const deliveryPhotoFile = req.files.find(
        (f) => f.fieldname === 'deliveryPhoto',
      );

      deliveryPhotoData = {
        uri: Array.isArray(optimizedPhotoUrl)
          ? optimizedPhotoUrl[0]
          : optimizedPhotoUrl,
        fileName: deliveryPhotoFile.originalname,
        fileSize: deliveryPhotoFile.size,
        type: deliveryPhotoFile.mimetype,
      };
    }

    // Handle signature base64 to file conversion using your helper
    if (signature && signature.startsWith('data:image')) {
      const signatureUri = await uploadHelper.saveBase64Image(
        signature,
        `${outputDir}/signatures`,
        `signature_${Date.now()}`,
      );

      signatureData = {
        uri: signatureUri,
        base64: signature,
      };
    }

    // Update deliveryProof subdocument
    order.deliveryProof = {
      deliveredAt: new Date(),
      deliveredDate: new Date().toISOString(),
      deliveryPhoto: deliveryPhotoData,
      signature: signatureData,
      deliveredBy: {
        id: userId,
        name: req.user.fullName || '',
        role: req.user.role || '',
        avatar: req.user.avatar || '',
      },
    };

    order.status = 'delivered';
    order.statusLabel = 'Delivered';
    order.statusColor = '#4CAF50';
    order.updatedBy = userId;
    order.updatedAt = new Date();

    // ============================================================
    // ✅ NEW: Update Delivery Stage (Delivered)
    // ============================================================
    // We create the event and update the 'delivered' stage in the array
    const deliveredEvent = TrackingService.createEvent(
      'delivered',
      'Order has been delivered successfully',
    );

    // If order has deliveryStatus.stages (Normal/Bulk), update the specific stage
    if (order.deliveryStatus && Array.isArray(order.deliveryStatus.stages)) {
      const stageIndex = order.deliveryStatus.stages.findIndex(
        (s) => s.id === 'delivered',
      );

      if (stageIndex !== -1) {
        // Update existing stage
        order.deliveryStatus.stages[stageIndex].status = 'completed';
        order.deliveryStatus.stages[stageIndex].timestamp =
          deliveredEvent.timestamp;
        order.deliveryStatus.stages[stageIndex].displayTime =
          deliveredEvent.displayTime;
        // Optional: Add notes/icon if your schema supports it here, but keeping it minimal as requested
      } else {
        // Fallback: If 'delivered' stage somehow missing, push it
        order.deliveryStatus.stages.push(deliveredEvent);
      }
    }
    // Replacement Request might use different field, handle if needed or rely on generic save
    else if (orderType === 'replacement' && order.replacementTracking) {
      // If replacement uses distinct tracking array, push there
      order.replacementTracking.push(deliveredEvent);
    }

    await order.save();
    // ✅ Get customer and driver details
    const customer = await User.findById(order.createdBy).select(
      'fullName email mobile role',
    );

    const orderTypeLabels = {
      regular: 'Regular Order',
      bulk: 'Bulk Order',
      replacement: 'Replacement Order',
      spot: 'Spot Order',
    };

    const roleNameMap = {
      retailer: 'Retailer',
      wholesaler: 'Wholesaler',
      super_stocker: 'Super Stocker',
      distributor: 'Distributor',
      consumer: 'Consumer',
      driver: 'Driver',
      admin: 'Admin',
    };

    const notificationData = {
      orderId: order.orderId,
      orderMongoId: order._id.toString(),
      orderType: orderType,
      orderTypeLabel: orderTypeLabels[orderType] || orderType,
      orderPlacedAt: order.orderPlacedAt || order.createdAt,
      driverId: userId,
      driverName: req.user.fullName || req.user.name || 'Driver',
      driverRole: roleNameMap[req.user.role] || req.user.role || 'Driver',
      driverPhone: req.user.mobile || req.user.phone || null,
      driverEmail: req.user.email || null,
      vehicleInfo: order.vehicleId || null,
      customerName:
        customer?.fullName ||
        order.customerDetails?.name ||
        order.customerInfo?.name ||
        'Customer',
      customerPhone:
        customer?.mobile ||
        order.customerDetails?.phone ||
        order.customerInfo?.phone ||
        null,
      customerRole:
        roleNameMap[customer?.role] ||
        order.customerDetails?.customerType ||
        null,
      deliveryAddress:
        order.deliveryAddress || order.customerDetails?.address || {},
      productCount: order.productCount || order.products?.length || 0,
      products: order.products || [],
      totalAmount: order.totalAmount || 0,
      paymentMethod:
        order.paymentMethod || order.paymentDetails?.method || 'N/A',
      paymentStatus:
        order.paymentStatus || order.paymentDetails?.status || 'Pending',
      hasDeliveryPhoto: !!deliveryPhotoData,
      deliveryPhotoUrl: deliveryPhotoData?.uri || null,
      hasSignature: !!signatureData,
      signatureUrl: signatureData?.uri || null,
      viewOrderUrl: `${process.env.APP_URL || 'https://gavran.com'}/orders/${order._id}`,
      rateOrderUrl: `${process.env.APP_URL || 'https://gavran.com'}/orders/${order._id}/rate`,
      shopMoreUrl: `${process.env.APP_URL || 'https://gavran.com'}/shop`,
      adminOrderUrl: `${process.env.ADMIN_URL || 'https://gavran-admin.demohub.tech'}/orders/${order._id}`,
    };

    // ✅ 1. Notify DRIVER (Email + FCM + DB)
    if (req.user?.email) {
      notifyUser({
        userId: userId,
        userEmail: req.user.email,
        userName: req.user.fullName || req.user.name,
        templateKey: 'orderDeliveryConfirmation',
        data: notificationData,
        isDriver: true, // Use driver templates
      }).catch((err) => {
        console.error(
          '❌ Driver delivery confirmation notification failed:',
          err,
        );
      });
    }

    // ✅ 2. Notify CUSTOMER (Email + FCM + DB)
    if (customer?.email) {
      notifyUser({
        userId: customer._id.toString(),
        userEmail: customer.email,
        userName: customer.fullName,
        templateKey: 'orderDelivered',
        data: notificationData,
      }).catch((err) => {
        console.error('❌ Customer delivery notification failed:', err);
      });
    }

    // ✅ 3. Notify ADMINS (Email + DB)
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
        templateKey: 'orderDelivered',
        data: notificationData,
      }).catch((err) => {
        console.error('❌ Admin delivery notification failed:', err);
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Order marked as delivered',
      data: order,
    });
  } catch (error) {
    console.error('Mark order delivered error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark order as delivered',
      error: error.message,
    });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const user = req.user; // user object from auth middleware
    const { orderId, orderType, reason, notes } = req.body;
    console.log('Body', req.body);

    if (!orderId || !orderType || !reason) {
      return res.status(400).json({
        success: false,
        message:
          'Missing required fields: orderId, orderType, and reason are required.',
      });
    }

    const OrderModel = getOrderModel(orderType);

    // Find order by ID (ObjectId or string)
    let order = await OrderModel.findById(orderId);
    if (!order) {
      // fallback: try find by requestId if replacement order
      if (orderType === 'replacement') {
        order = await OrderModel.findOne({ requestId: orderId });
      }
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }
    }

    // Prevent cancel if already cancelled or delivered
    if (['cancelled', 'delivered'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order is already ${order.status}`,
      });
    }

    const now = new Date();

    // Build cancellationDetails object using req.user
    const cancellationDetails = {
      cancelledAt: now,
      cancelledDate: now.toISOString(),
      cancelledBy: {
        id: new mongoose.Types.ObjectId(user.id),
        name: user.fullName,
        role: user.role,
      },
      cancelledByModel: 'User',
      reason,
      notes,
    };

    // Update order status and cancellationDetails
    order.status = 'cancelled';
    order.statusLabel = 'Cancelled';
    order.statusColor = '#F44336';
    order.cancellationDetails = cancellationDetails;
    order.updatedBy = new mongoose.Types.ObjectId(user.id);
    order.updatedAt = now;

    // ============================================================
    // ✅ NEW: Update Delivery Stage (Cancelled)
    // ============================================================
    // Create the event
    const cancelledEvent = TrackingService.createEvent(
      'cancelled',
      notes || reason, // Use notes or reason as the 'notes' for the tracking event
      reason, // Reason specific field
    );

    // Update the specific stage in the array
    if (order.deliveryStatus && Array.isArray(order.deliveryStatus.stages)) {
      const stageIndex = order.deliveryStatus.stages.findIndex(
        (s) => s.id === 'cancelled',
      );

      if (stageIndex !== -1) {
        // Update existing stage
        order.deliveryStatus.stages[stageIndex].status = 'completed'; // or 'cancelled' if you prefer, but 'completed' usually means "this stage happened"
        order.deliveryStatus.stages[stageIndex].timestamp =
          cancelledEvent.timestamp;
        order.deliveryStatus.stages[stageIndex].displayTime =
          cancelledEvent.displayTime;
        order.deliveryStatus.stages[stageIndex].reason = reason;
      } else {
        // Fallback: If 'cancelled' stage somehow missing, push it
        order.deliveryStatus.stages.push(cancelledEvent);
      }
    }
    // Replacement Request might use different field
    else if (orderType === 'replacement' && order.replacementTracking) {
      order.replacementTracking.push(cancelledEvent);
    }

    await order.save();
    // ✅ Get customer details
    const customer = await User.findById(order.createdBy).select(
      'fullName email mobile role',
    );

    const orderTypeLabels = {
      regular: 'Regular Order',
      bulk: 'Bulk Order',
      replacement: 'Replacement Order',
      spot: 'Spot Order',
    };

    const roleNameMap = {
      retailer: 'Retailer',
      wholesaler: 'Wholesaler',
      super_stocker: 'Super Stocker',
      distributor: 'Distributor',
      consumer: 'Consumer',
      driver: 'Driver',
      admin: 'Admin',
    };

    const notificationData = {
      orderId: order.orderId,
      orderMongoId: order._id.toString(),
      orderType: orderType,
      orderTypeLabel: orderTypeLabels[orderType] || orderType,
      orderPlacedAt: order.orderPlacedAt || order.createdAt,
      cancelledByName: user.fullName,
      cancelledByRole: roleNameMap[user.role] || user.role,
      reason: reason,
      notes: notes || '',
      customerName:
        customer?.fullName ||
        order.customerDetails?.name ||
        order.customerInfo?.name ||
        'Customer',
      customerPhone:
        customer?.mobile ||
        order.customerDetails?.phone ||
        order.customerInfo?.phone ||
        null,
      customerRole: roleNameMap[customer?.role] || null,
      productCount: order.productCount || order.products?.length || 0,
      products: order.products || [],
      totalAmount: order.totalAmount || 0,
      paymentMethod:
        order.paymentMethod || order.paymentDetails?.method || 'N/A',
      paymentStatus:
        order.paymentStatus || order.paymentDetails?.status || 'Pending',
      driverName: order.deliveryOfficer?.name || null,
      driverPhone: order.deliveryOfficer?.phone || null,
      shopMoreUrl: `${process.env.APP_URL || 'https://gavran.com'}/shop`,
      viewOrderUrl: `${process.env.APP_URL || 'https://gavran.com'}/orders/${order._id}`,
      adminOrderUrl: `${process.env.ADMIN_URL || 'https://gavran-admin.demohub.tech'}/orders/${order._id}`,
    };

    // ✅ 1. Notify PERSON WHO CANCELLED (Driver/Customer) (Email + FCM + DB)
    const cancellerEmail = user.email;
    const isDriver = user.role === 'driver';

    if (cancellerEmail) {
      notifyUser({
        userId: user.id,
        userEmail: cancellerEmail,
        userName: user.fullName,
        templateKey: isDriver
          ? 'orderCancellationConfirmation'
          : 'orderCancelled',
        data: {
          ...notificationData,
          driverName: user.fullName, // For driver template
        },
        isDriver: isDriver,
      }).catch((err) => {
        console.error('❌ Canceller notification failed:', err);
      });
    }

    // ✅ 2. Notify CUSTOMER (if cancelled by driver) (Email + FCM + DB)
    if (isDriver && customer?.email && customer._id.toString() !== user.id) {
      notifyUser({
        userId: customer._id.toString(),
        userEmail: customer.email,
        userName: customer.fullName,
        templateKey: 'orderCancelled',
        data: notificationData,
      }).catch((err) => {
        console.error('❌ Customer cancellation notification failed:', err);
      });
    }

    // ✅ 3. Notify ADMINS (Email + DB)
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
        templateKey: 'orderCancelled',
        data: notificationData,
      }).catch((err) => {
        console.error('❌ Admin cancellation notification failed:', err);
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order,
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message,
    });
  }
};


// Helper functions
function getStatusLabel(status) {
  const labels = {
    pending: 'Order Pending',
    confirmed: 'Confirmed',
    packed: 'Packed',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return labels[status] || 'Pending';
}

function getStatusColor(status) {
  const colors = {
    pending: '#FFC107',
    confirmed: '#2196F3',
    packed: '#9C27B0',
    out_for_delivery: '#FF9800',
    delivered: '#4CAF50',
    cancelled: '#F44336',
  };
  return colors[status] || '#FFC107';
}
// minor check



// export const markOrderDelivered = async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     if (!userId) {
//       return res
//         .status(401)
//         .json({ success: false, message: 'Unauthorized: User info missing.' });
//     }

//     const { orderId, orderType } = req.body;
//     console.log("Body", req.body)
//     console.log("Files",req.file)

//     if (!orderId || !orderType) {
//       return res
//         .status(400)
//         .json({ success: false, message: 'Order ID and type are required.' });
//     }

//     const OrderModel = getOrderModel(orderType);
//     const order = await OrderModel.findById(orderId);
//     if (!order) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'Order not found.' });
//     }

//     // Extract uploaded files info from req.files
//     const filePaths = uploadHelper.extractFilePaths(req.file);
//     // Assuming deliveryPhoto as single file in deliveryPhoto field
//     const deliveryPhotoFiles = filePaths.deliveryPhoto || [];

//     let optimizedPhotoUrl = null;
//     if (deliveryPhotoFiles.length > 0) {
//       const outputDir = `delivery-proofs/${orderId}`;
//       optimizedPhotoUrl = await uploadHelper.optimizeImage(deliveryPhotoFiles, {
//         outputDir,
//       });
//     }

//     const signatureBase64 = req.body.signature; // e.g. base64 string from form

//     // Update deliveryProof subdocument
//     order.deliveryProof = {
//       deliveredAt: new Date(),
//       deliveredDate: new Date().toISOString(),
//       deliveryPhoto: optimizedPhotoUrl
//         ? {
//             uri: optimizedPhotoUrl,
//             fileName: deliveryPhotoFiles[0].originalname,
//             fileSize: deliveryPhotoFiles[0].size,
//             type: deliveryPhotoFiles[0].mimetype,
//           }
//         : null,
//       signature: signatureBase64,
//       deliveredBy: {
//         id: userId,
//         name: req.user.fullName || '',
//         role: req.user.role || '',
//         avatar: req.user.avatar || '',
//       },
//     };

//     order.status = 'delivered';
//     order.statusLabel = 'Delivered';
//     order.statusColor = '#4CAF50';
//     order.updatedBy = userId;
//     order.updatedAt = new Date();

//     await order.save();

//     return res
//       .status(200)
//       .json({
//         success: true,
//         message: 'Order marked as delivered',
//         data: order,
//       });
//   } catch (error) {
//     console.error('Mark order delivered error:', error);
//     return res
//       .status(500)
//       .json({
//         success: false,
//         message: 'Failed to mark order as delivered',
//         error: error.message,
//       });
//   }
// };
// export const getRouteForDriver = async (req, res) => {
//   try {
//     const driverId = req.user.id;

//     // Fetch all routes for this driver
//     const routes = await DeliveryRoute.find({
//       deliveryOfficer: driverId,
//       isDeleted: false,
//     });

//     if (!routes || routes.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'No routes found for this driver',
//       });
//     }

//     // Fetch delivery officer details once (since same driver for all routes)
//     const officer = await User.findById(driverId).select(
//       'fullName mobile email profileImage role',
//     );

//     const deliveryOfficerData = officer
//       ? {
//           _id: officer._id,
//           name: officer.fullName || 'Unknown',
//           phone: officer.mobile || '',
//           email: officer.email || '',
//           avatar: officer.profileImage || null,
//           role: officer.role || 'delivery_officer',
//         }
//       : null;

//     // Attach officer details to each route
//     const finalData = routes.map((route) => ({
//       ...route.toObject(),
//       deliveryOfficer: deliveryOfficerData,
//     }));

//     return res.status(200).json({
//       success: true,
//       data: finalData,
//     });
//   } catch (error) {
//     console.error('getRouteForDriver error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch route',
//       error: error.message,
//     });
//   }
// };