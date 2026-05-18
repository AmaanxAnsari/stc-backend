import mongoose from 'mongoose';
import AppOrder from '../../models/admin/AppOrderModel.js';
import uploadHelper from '../../utils/uploadHelper.js';
import ReplacementRequest from '../../models/admin/ReplacementOrderModel.js';
import { createRepository } from '../../utils/repository.js';
import { autoAssignOrderToStop } from '../../utils/stopMatcher.js';
import { generateUniqueOrderId } from '../../helper/orderIdHelper.js';
import { User } from '../../models/app/user.js';
import AdminUser from '../../models/admin/adminUser.js';
import { notifyAdmins, notifyUser } from '../../utils/notificationService.js';
import BulkOrder from '../../models/admin/BulkOrderModel.js';

const replacementOrderRepo = createRepository(ReplacementRequest, {
  idField: 'createdBy',
});



export const createReplacementRequest = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { orderId } = req.params;
    let { replacementItems, notes } = req.body;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid orderId' });
    }

    // Parse replacementItems robustly
    if (!replacementItems) {
      return res.status(400).json({
        success: false,
        message: 'Replacement items required',
      });
    }
    if (typeof replacementItems === 'string') {
      try {
        const parsed = JSON.parse(replacementItems);
        replacementItems = Array.isArray(parsed) ? parsed : [parsed];
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Invalid replacementItems format',
        });
      }
    }
    if (!Array.isArray(replacementItems) || replacementItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Replacement items required',
      });
    }

    // Fetch order
    const order = await AppOrder.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: 'Order not found' });
    }
    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Only delivered orders can be replaced',
      });
    }

    // Validate and enrich replacement items from order
    const enrichedItems = [];
    for (const item of replacementItems) {
      const orderProduct = order.products.find(
        (p) => p.cartItemId === item.cartItemId,
      );

      if (!orderProduct) {
        return res.status(400).json({
          success: false,
          message: `Product with cartItemId ${item.cartItemId} not found in order`,
        });
      }

      // Validate replacement quantity doesn't exceed ordered quantity
      if ((item.replacementQuantity || 0) > (orderProduct.orderQuantity || 0)) {
        return res.status(400).json({
          success: false,
          message: `Replacement quantity for ${orderProduct.name} cannot exceed ordered quantity (${orderProduct.orderQuantity})`,
        });
      }

      enrichedItems.push({
        originalItem: {
          cartItemId: orderProduct.cartItemId,
          inventoryId: orderProduct.inventoryId,
          productId: orderProduct.productId,
          variantIndex: orderProduct.variantIndex,
          name: orderProduct.name,
          quantity: orderProduct.quantity,
          image: orderProduct.image,
          price: orderProduct.price,
        },
        replacementQuantity: item.replacementQuantity || 1,
        reason: item.reason || 'other',
        reasonDescription: item.reasonDescription || '',
        images: [], // Will be populated with uploaded images
      });
    }

    const requestId = await generateUniqueOrderId(ReplacementRequest, 'REPL');

    // Handle uploaded images (Images/images keys + indexed)
    const filesByField = uploadHelper.extractFilePaths(req.files);
    const fileLocation = `replacements/${requestId}`;
    const optimizedFiles = await uploadHelper.processFiles(
      filesByField,
      fileLocation,
    );

    enrichedItems.forEach((item, idx) => {
      const keys = [
        `replacementItems[${idx}][images]`,
        `replacementItems[${idx}][Images]`,
        `replacementItems[${idx}][images][0]`,
        `replacementItems[${idx}][Images][0]`,
      ];

      const bucket = keys.reduce((acc, k) => acc ?? optimizedFiles[k], null);

      if (bucket) {
        const imagesArray = Array.isArray(bucket) ? bucket : [bucket];
        item.images = imagesArray.map((img) => ({
          uri: img,
          fileName: String(img).split('/').pop(),
        }));
      }
    });

    // Generate replacement request
    const now = new Date();
    const timeline = [
      {
        id: 'request_submitted',
        label: 'Request Submitted',
        status: 'completed',
        timestamp: now,
        displayTime: now.toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata',
        }),
        icon: '✓',
        color: '#4CAF50',
      },
      {
        id: 'under_review',
        label: 'Under Review',
        status: 'active',
        timestamp: null,
        displayTime: 'Pending review',
        icon: '👀',
        color: '#2196F3',
      },
    ];

    const newReplacement = new ReplacementRequest({
      requestId,
      orderId: order._id,
      customerInfo: {
        id: userId,
        name: req.user?.fullName || '',
        phone: req.user?.mobile || '',
        email: req.user?.email || '',
      },
      deliveryAddress: order.deliveryAddress || {},
      replacementItems: enrichedItems,
      notes: notes || '',
      status: 'pending',
      requestSubmittedAt: now,
      slug: fileLocation,
      isGst: order.isGst || false,
      companyName:
        order.companyName || (order.isGst ? 'Gavran Pvt Ltd' : 'Samay Pvt Ltd'),
      timeline,
      inventoryReserved: false,
      createdBy: userId,
    });

    await newReplacement.save();

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
      requestId: newReplacement.requestId,
      replacementMongoId: newReplacement._id.toString(),
      orderMongoId: newReplacement._id.toString(),
      originalOrderId: order.orderId || orderId,
      submittedDate: timeline[0].displayTime,
      userName: user?.fullName || 'Customer',
      customerName: user?.fullName || 'Customer',
      customerRole: roleNameMap[req.user?.role] || req.user?.role || 'Consumer',
      customerMobile: user?.mobile || 'N/A',
      customerEmail: user?.email || 'N/A',
      itemCount: enrichedItems.length,
      replacementItems: enrichedItems,
      notes: newReplacement.notes,
      deliveryAddress: newReplacement.deliveryAddress,
      trackReplacementUrl: `${process.env.HOST_URL || 'https://gavran-admin.demohub.tech'}/order-management/replacement-orders/details/${newReplacement._id}`,
      adminReplacementUrl: `${process.env.HOST_URL || 'https://gavran-admin.demohub.tech'}/order-management/replacement-orders/details/${newReplacement._id}`,
    };

    // ✅ 1. Notify USER (Email + FCM + DB)
    if (user?.email) {
      notifyUser({
        userId: userId,
        userEmail: user.email,
        userName: user.fullName,
        templateKey: 'replacementRequestSubmitted',
        data: notificationData,
      }).catch((err) => {
        console.error('❌ User replacement request notification failed:', err);
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
        templateKey: 'replacementRequestReceived',
        data: notificationData,
      }).catch((err) => {
        console.error('❌ Admin replacement request notification failed:', err);
      });
    }

    // Auto-assign to stop
    // const assignmentResult = await autoAssignOrderToStop(
    //   newOrder._id,
    //   'replacement',
    //   newReplacement.deliveryAddress,
    // );

    // let assignment_message = 'Order created successfully';
    // if (assignmentResult) {
    //   assignment_message += ` and auto-assigned to stop: ${assignmentResult.stop.stopName}`;
    // } else {
    //   assignment_message +=
    //     '. No matching stop found - pending manual assignment.';
    // }

    return res.status(201).json({
      success: true,
      message: 'Replacement request submitted successfully',
      // assignment_message,
      replacement: newReplacement,
    });
  } catch (error) {
    console.error('Create replacement error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: error.message,
    });
  }
};


export const createReplacementRequestV2 = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { orderId } = req.params;
    let { replacementItems, notes, orderType } = req.body; // orderType optional

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid orderId' });
    }

    // Parse replacementItems robustly (same as your existing)
    if (!replacementItems) {
      return res.status(400).json({
        success: false,
        message: 'Replacement items required',
      });
    }

    if (typeof replacementItems === 'string') {
      try {
        const parsed = JSON.parse(replacementItems);
        replacementItems = Array.isArray(parsed) ? parsed : [parsed];
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Invalid replacementItems format',
        });
      }
    }

    if (!Array.isArray(replacementItems) || replacementItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Replacement items required',
      });
    }

    // ---------- NEW: Resolve order from correct model ----------
    // normalize orderType
    const normalizedOrderType =
      typeof orderType === 'string'
        ? orderType.trim().toLowerCase()
        : undefined;

    let order = null;
    let orderModelUsed = 'normal'; // 'normal' | 'bulk'

    // If frontend passes orderType, query only one collection (fast + avoids ambiguity)
    if (normalizedOrderType === 'bulk') {
      order = await BulkOrder.findById(orderId);
      orderModelUsed = 'bulk';
    } else if (normalizedOrderType === 'normal') {
      order = await AppOrder.findById(orderId);
      orderModelUsed = 'normal';
    } else {
      // Backward compatible: old clients send only orderId → try normal first then bulk
      order = await AppOrder.findById(orderId);
      orderModelUsed = 'normal';

      if (!order) {
        order = await BulkOrder.findById(orderId);
        orderModelUsed = 'bulk';
      }
    }

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Only delivered orders can be replaced',
      });
    }

    // Validate and enrich replacement items from order (same logic)
    const enrichedItems = [];
    for (const item of replacementItems) {
      const orderProduct = (order.products || []).find(
        (p) => p.cartItemId === item.cartItemId,
      );

      if (!orderProduct) {
        return res.status(400).json({
          success: false,
          message: `Product with cartItemId ${item.cartItemId} not found in order`,
        });
      }

      if ((item.replacementQuantity || 0) > (orderProduct.orderQuantity || 0)) {
        return res.status(400).json({
          success: false,
          message: `Replacement quantity for ${orderProduct.name} cannot exceed ordered quantity (${orderProduct.orderQuantity})`,
        });
      }

      enrichedItems.push({
        originalItem: {
          cartItemId: orderProduct.cartItemId,
          inventoryId: orderProduct.inventoryId,
          productId: orderProduct.productId,
          variantIndex: orderProduct.variantIndex,
          name: orderProduct.name,
          quantity: orderProduct.quantity,
          image: orderProduct.image,
          price: orderProduct.price,
        },
        replacementQuantity: item.replacementQuantity || 1,
        reason: item.reason || 'other',
        reasonDescription: item.reasonDescription || '',
        images: [],
      });
    }

    const requestId = await generateUniqueOrderId(ReplacementRequest, 'REPL');

    // Handle uploaded images (same as your existing)
    const filesByField = uploadHelper.extractFilePaths(req.files);
    const fileLocation = `replacements/${requestId}`;
    const optimizedFiles = await uploadHelper.processFiles(
      filesByField,
      fileLocation,
    );

    enrichedItems.forEach((item, idx) => {
      const keys = [
        `replacementItems[${idx}][images]`,
        `replacementItems[${idx}][Images]`,
        `replacementItems[${idx}][images][0]`,
        `replacementItems[${idx}][Images][0]`,
      ];

      const bucket = keys.reduce((acc, k) => acc ?? optimizedFiles[k], null);

      if (bucket) {
        const imagesArray = Array.isArray(bucket) ? bucket : [bucket];
        item.images = imagesArray.map((img) => ({
          uri: img,
          fileName: String(img).split('/').pop(),
        }));
      }
    });

    // Timeline (same as your existing)
    const now = new Date();
    const timeline = [
      {
        id: 'request_submitted',
        label: 'Request Submitted',
        status: 'completed',
        timestamp: now,
        displayTime: now.toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata',
        }),
        icon: '✓',
        color: '#4CAF50',
      },
      // {
      //   id: 'under_review',
      //   label: 'Under Review',
      //   status: 'active',
      //   timestamp: null,
      //   displayTime: 'Pending review',
      //   icon: '👀',
      //   color: '#2196F3',
      // },
    ];

    // Create replacement request (keep same fields + ADD orderType/orderModelUsed safely)
    const newReplacement = new ReplacementRequest({
      requestId,

      orderId: order._id,

      // NEW: store what we used (non-breaking: extra fields are fine if schema allows; if not, remove these two)
      orderType: orderModelUsed, // "normal" | "bulk"

      customerInfo: {
        id: userId,
        name: req.user?.fullName || '',
        phone: req.user?.mobile || '',
        email: req.user?.email || '',
      },
      deliveryAddress: order.deliveryAddress || {},
      replacementItems: enrichedItems,
      notes: notes || '',
      status: 'pending',
      requestSubmittedAt: now,
      slug: fileLocation,
      isGst: order.isGst || false,
      companyName:
        order.companyName || (order.isGst ? 'Gavran Pvt Ltd' : 'Samay Pvt Ltd'),
      timeline,
      inventoryReserved: false,
      createdBy: userId,
    });

    await newReplacement.save();

    // Notifications (same as your existing)
    const user = await User.findById(userId).select('fullName email mobile');

    const roleNameMap = {
      retailer: 'Retailer',
      wholesaler: 'Wholesaler',
      super_stocker: 'Super Stocker',
      distributor: 'Distributor',
      consumer: 'Consumer',
    };

    const notificationData = {
      requestId: newReplacement.requestId,
      replacementMongoId: newReplacement._id.toString(),
      orderMongoId: newReplacement._id.toString(), // (kept as-is to not change behavior)
      originalOrderId: order.orderId || orderId,
      submittedDate: timeline[0].displayTime,
      userName: user?.fullName || 'Customer',
      customerName: user?.fullName || 'Customer',
      customerRole: roleNameMap[req.user?.role] || req.user?.role || 'Consumer',
      customerMobile: user?.mobile || 'N/A',
      customerEmail: user?.email || 'N/A',
      itemCount: enrichedItems.length,
      replacementItems: enrichedItems,
      notes: newReplacement.notes,
      deliveryAddress: newReplacement.deliveryAddress,
      trackReplacementUrl: `${
        process.env.HOST_URL || 'https://gavran-admin.demohub.tech'
      }/order-management/replacement-orders/details/${newReplacement._id}`,
      adminReplacementUrl: `${
        process.env.HOST_URL || 'https://gavran-admin.demohub.tech'
      }/order-management/replacement-orders/details/${newReplacement._id}`,

      // NEW: include info for admin UI if needed
      originalOrderType: orderModelUsed,
    };

    // 1) Notify USER
    if (user?.email) {
      notifyUser({
        userId: userId,
        userEmail: user.email,
        userName: user.fullName,
        templateKey: 'replacementRequestSubmitted',
        data: notificationData,
      }).catch((err) => {
        console.error('❌ User replacement request notification failed:', err);
      });
    }

    // 2) Notify ADMINS
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
        templateKey: 'replacementRequestReceived',
        data: notificationData,
      }).catch((err) => {
        console.error('❌ Admin replacement request notification failed:', err);
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Replacement request submitted successfully',
      replacement: newReplacement,
    });
  } catch (error) {
    console.error('Create replacement error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: error.message,
    });
  }
};

export const getReplacementOrderByUserId = async (req, res) => {
  try {
    const userId = req.user.id; // Get the authenticated user's ID

    // Use the repository to fetch all replacement orders created by this user
    const result = await replacementOrderRepo.getAll({
      filter: { createdBy: userId }, // Filter by user ID
      projection: {}, // Optional: specify which fields to return
    });

    if (
      !result.success ||
      !Array.isArray(result.data) ||
      result.data.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message: 'No replacement orders found for this user.',
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('Error fetching replacement orders by user ID:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};



