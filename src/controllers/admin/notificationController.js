// import Notification from '../../models/admin/notificationModel.js';
// import { User } from '../../models/app/user.js';
// import {
//   sendPushToUser,
//   sendBroadcastPush,
//   sendCompleteNotification,
// } from '../../utils/notificationService.js';

// // ✅ Send notification to specific user
// export const sendNotificationToUser = async (req, res) => {
//   try {
//     const {
//       userId,
//       type,
//       title,
//       body,
//       imageUrl,
//       orderId,
//       productId,
//       data,
//       sendEmail,
//     } = req.body;

//     if (!userId || !type || !title || !body) {
//       return res.status(400).json({
//         success: false,
//         message: 'userId, type, title, and body are required',
//       });
//     }

//     const result = await sendCompleteNotification({
//       userId,
//       type,
//       title,
//       body,
//       imageUrl,
//       orderId,
//       productId,
//       data,
//       sendEmail,
//     });

//     return res.status(200).json({
//       success: true,
//       message: 'Notification sent successfully',
//       data: result,
//     });
//   } catch (error) {
//     console.error('❌ Send notification error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Server error: ' + error.message,
//     });
//   }
// };

// // ✅ Send broadcast notification to all users
// export const sendBroadcastNotification = async (req, res) => {
//   try {
//     const { type, title, body, imageUrl, userRole, data } = req.body;

//     if (!type || !title || !body) {
//       return res.status(400).json({
//         success: false,
//         message: 'type, title, and body are required',
//       });
//     }

//     // Get users based on role filter
//     const filter = { isActive: true, isDeleted: false };
//     if (userRole) {
//       filter.role = userRole;
//     }

//     const users = await User.find(filter).select('_id');
//     const userIds = users.map((u) => u._id);

//     console.log(`📢 Broadcasting to ${userIds.length} users`);

//     // Create notifications in DB
//     const notifications = userIds.map((userId) => ({
//       userId,
//       type,
//       title,
//       body,
//       imageUrl,
//       data,
//     }));

//     await Notification.insertMany(notifications);

//     // Send push notifications
//     const pushResult = await sendBroadcastPush(userIds, {
//       type,
//       title,
//       body,
//       imageUrl,
//       data,
//     });

//     return res.status(200).json({
//       success: true,
//       message: `Broadcast sent to ${pushResult.sent}/${pushResult.total} users`,
//       data: pushResult,
//     });
//   } catch (error) {
//     console.error('❌ Broadcast notification error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Server error: ' + error.message,
//     });
//   }
// };

// // ✅ Send order notification (automated)
// export const sendOrderNotification = async (orderId, status) => {
//   try {
//     const Order = require('../../models/app/orderModel.js').default;
//     const order = await Order.findById(orderId).populate('userId');

//     if (!order) {
//       throw new Error('Order not found');
//     }

//     const notificationMap = {
//       pending: {
//         title: '🛒 Order Placed!',
//         body: `Your order #${order.orderNumber} has been placed successfully`,
//         type: 'order_placed',
//       },
//       confirmed: {
//         title: '✅ Order Confirmed!',
//         body: `Your order #${order.orderNumber} has been confirmed`,
//         type: 'order_confirmed',
//       },
//       shipped: {
//         title: '📦 Order Shipped!',
//         body: `Your order #${order.orderNumber} is on its way`,
//         type: 'order_shipped',
//       },
//       out_for_delivery: {
//         title: '🚚 Out for Delivery!',
//         body: `Your order #${order.orderNumber} will arrive soon`,
//         type: 'order_out_for_delivery',
//       },
//       delivered: {
//         title: '🎉 Order Delivered!',
//         body: `Your order #${order.orderNumber} has been delivered`,
//         type: 'order_delivered',
//       },
//       cancelled: {
//         title: '❌ Order Cancelled',
//         body: `Your order #${order.orderNumber} has been cancelled`,
//         type: 'order_cancelled',
//       },
//     };

//     const notifData = notificationMap[status];

//     if (!notifData) {
//       throw new Error(`Invalid status: ${status}`);
//     }

//     await sendCompleteNotification({
//       userId: order.userId._id,
//       type: notifData.type,
//       title: notifData.title,
//       body: notifData.body,
//       orderId: order._id,
//       data: {
//         screen: 'OrderDetails',
//         orderId: order._id.toString(),
//       },
//       sendEmail: true,
//     });

//     console.log(`✅ Order notification sent for ${orderId}, status: ${status}`);
//   } catch (error) {
//     console.error('❌ Order notification error:', error);
//   }
// };

// // ✅ Get user notifications (for notification tab)
// export const getUserNotifications = async (req, res) => {
//   try {
//     const { page = 1, limit = 20, unreadOnly = false } = req.query;
//     const userId = req.user.id;

//     const filter = {
//       userId,
//       isActive: true,
//       isDeleted: false,
//     };

//     if (unreadOnly === 'true') {
//       filter['channels.inApp.read'] = false;
//     }

//     const notifications = await Notification.find(filter)
//       .sort({ createdAt: -1 })
//       .limit(parseInt(limit))
//       .skip((parseInt(page) - 1) * parseInt(limit))
//       .select('-__v');

//     const total = await Notification.countDocuments(filter);
//     const unreadCount = await Notification.countDocuments({
//       userId,
//       'channels.inApp.read': false,
//       isActive: true,
//       isDeleted: false,
//     });

//     return res.status(200).json({
//       success: true,
//       page: parseInt(page),
//       limit: parseInt(limit),
//       total,
//       unreadCount,
//       data: notifications,
//     });
//   } catch (error) {
//     console.error('❌ Get notifications error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Server error: ' + error.message,
//     });
//   }
// };

// // ✅ Mark notification as read
// export const markNotificationAsRead = async (req, res) => {
//   try {
//     const { notificationId } = req.params;
//     const userId = req.user.id;

//     const notification = await Notification.findOneAndUpdate(
//       { _id: notificationId, userId },
//       {
//         'channels.inApp.read': true,
//         'channels.inApp.readAt': new Date(),
//       },
//       { new: true },
//     );

//     if (!notification) {
//       return res.status(404).json({
//         success: false,
//         message: 'Notification not found',
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: 'Notification marked as read',
//       data: notification,
//     });
//   } catch (error) {
//     console.error('❌ Mark read error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Server error: ' + error.message,
//     });
//   }
// };

// // ✅ Mark all notifications as read
// export const markAllAsRead = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     await Notification.updateMany(
//       { userId, 'channels.inApp.read': false },
//       {
//         'channels.inApp.read': true,
//         'channels.inApp.readAt': new Date(),
//       },
//     );

//     return res.status(200).json({
//       success: true,
//       message: 'All notifications marked as read',
//     });
//   } catch (error) {
//     console.error('❌ Mark all read error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Server error: ' + error.message,
//     });
//   }
// };
import Notification from '../../models/admin/notificationModel.js';
import { User } from '../../models/app/user.js';
import {
  sendPushToUser,
  sendBroadcastPush,
  sendCompleteNotification,
  notifyUser,
  notifyAdmin,
} from '../../utils/notificationService.js';

// ==================== EXISTING CONTROLLERS ====================

// ✅ Send notification to specific user (basic - no templates)
export const sendNotificationToUser = async (req, res) => {
  try {
    const {
      userId,
      type,
      title,
      body,
      imageUrl,
      orderId,
      productId,
      data,
      sendEmail,
      userEmail,
    } = req.body;

    if (!userId || !type || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'userId, type, title, and body are required',
      });
    }

    const result = await sendCompleteNotification({
      userId,
      type,
      title,
      body,
      imageUrl,
      orderId,
      productId,
      data,
      sendEmail,
      userEmail,
    });

    return res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
      data: result,
    });
  } catch (error) {
    console.error('❌ Send notification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
    });
  }
};

// ✅ Send broadcast notification to all users
export const sendBroadcastNotification = async (req, res) => {
  try {
    const { type, title, body, imageUrl, userRole, data } = req.body;

    if (!type || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'type, title, and body are required',
      });
    }

    const filter = { isActive: true, isDeleted: false };
    if (userRole) {
      filter.role = userRole;
    }

    const users = await User.find(filter).select('_id');
    const userIds = users.map((u) => u._id);

    console.log(`📢 Broadcasting to ${userIds.length} users`);

    const notifications = userIds.map((userId) => ({
      userId,
      type,
      title,
      body,
      imageUrl,
      data,
    }));

    await Notification.insertMany(notifications);

    const pushResult = await sendBroadcastPush(userIds, {
      type,
      title,
      body,
      imageUrl,
      data,
    });

    return res.status(200).json({
      success: true,
      message: `Broadcast sent to ${pushResult.sent}/${pushResult.total} users`,
      data: pushResult,
    });
  } catch (error) {
    console.error('❌ Broadcast notification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
    });
  }
};

// // ✅ Get user notifications (for notification tab)
// export const getUserNotifications = async (req, res) => {
//   try {
//     const { page = 1, limit = 20, unreadOnly = false } = req.query;
//     const userId = req.user.id;

//     const filter = {
//       userId,
//       isActive: true,
//       isDeleted: false,
//     };

//     if (unreadOnly === 'true') {
//       filter['channels.inApp.read'] = false;
//     }

//     const notifications = await Notification.find(filter)
//       .sort({ createdAt: -1 })
//       .limit(parseInt(limit))
//       .skip((parseInt(page) - 1) * parseInt(limit))
//       .select('-__v');

//     const total = await Notification.countDocuments(filter);
//     const unreadCount = await Notification.countDocuments({
//       userId,
//       'channels.inApp.read': false,
//       isActive: true,
//       isDeleted: false,
//     });

//     return res.status(200).json({
//       success: true,
//       page: parseInt(page),
//       limit: parseInt(limit),
//       total,
//       unreadCount,
//       data: notifications,
//     });
//   } catch (error) {
//     console.error('❌ Get notifications error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Server error: ' + error.message,
//     });
//   }
// };

/**
 * Get notifications for current user (works for both admin and regular users)
 */
export const getUserNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const userId = req.user.id;

    const filter = {
      userId,
      isActive: true,
      isDeleted: false,
    };

    if (unreadOnly === 'true') {
      filter['channels.inApp.read'] = false;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-__v');

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      userId,
      'channels.inApp.read': false,
      isActive: true,
      isDeleted: false,
    });

    return res.status(200).json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
    });
  }
};

// ✅ Mark notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      {
        'channels.inApp.read': true,
        'channels.inApp.readAt': new Date(),
      },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    console.error('❌ Mark read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
    });
  }
};

// ✅ Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { userId, 'channels.inApp.read': false },
      {
        'channels.inApp.read': true,
        'channels.inApp.readAt': new Date(),
      },
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('❌ Mark all read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
    });
  }
};

// ==================== NEW TEMPLATE-BASED CONTROLLERS ====================

// ✅ Send templated notification to user
export const sendTemplatedUserNotification = async (req, res) => {
  try {
    const { userId, userEmail, userName, templateKey, data } = req.body;

    if (!userId || !templateKey || !data) {
      return res.status(400).json({
        success: false,
        message: 'userId, templateKey, and data are required',
      });
    }

    const result = await notifyUser({
      userId,
      userEmail,
      userName,
      templateKey,
      data,
    });

    return res.status(200).json({
      success: true,
      message: 'Templated notification sent successfully',
      data: result,
    });
  } catch (error) {
    console.error('❌ Send templated notification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
    });
  }
};

// ✅ Send templated notification to admin
export const sendTemplatedAdminNotification = async (req, res) => {
  try {
    const { adminEmails, templateKey, data, withPush, adminUserIds } = req.body;

    if (!adminEmails || !templateKey || !data) {
      return res.status(400).json({
        success: false,
        message: 'adminEmails, templateKey, and data are required',
      });
    }

    let result;

    if (withPush && adminUserIds && adminUserIds.length > 0) {
      // Send with FCM push notifications
      // result = await notifyAdminWithPush({
      //   adminUserIds,
      //   adminEmails,
      //   templateKey,
      //   data,
      // });
    } else {
      // Email only
      result = await notifyAdmin({
        adminEmails,
        templateKey,
        data,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Admin notification sent successfully',
      data: result,
    });
  } catch (error) {
    console.error('❌ Send admin notification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
    });
  }
};

// ==================== AUTOMATED ORDER NOTIFICATIONS ====================

/**
 * Send order notification (automated) - UPDATED with templates
 */
export const sendOrderNotification = async (orderId, status, Order) => {
  try {
    const order = await Order.findById(orderId).populate('userId');

    if (!order) {
      throw new Error('Order not found');
    }

    // Map status to template keys
    const statusTemplateMap = {
      pending: 'orderPlaced',
      confirmed: 'orderConfirmed',
      shipped: 'orderShipped',
      out_for_delivery: 'orderOutForDelivery',
      delivered: 'orderDelivered',
      cancelled: 'orderCancelled',
    };

    const templateKey = statusTemplateMap[status];

    if (!templateKey) {
      throw new Error(`Invalid status: ${status}`);
    }

    // Prepare notification data
    const notificationData = {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      itemCount: order.items?.length || 0,
      orderDate: order.createdAt.toLocaleDateString('en-IN'),
      trackOrderUrl: `${process.env.APP_URL}/orders/${order._id}`,
      productImage: order.items?.[0]?.image || null,
      expectedDelivery: order.expectedDelivery
        ? new Date(order.expectedDelivery).toLocaleDateString('en-IN')
        : 'TBD',
      trackingNumber: order.trackingNumber || 'N/A',
      carrier: order.carrier || 'Gavran Logistics',
      trackingUrl:
        order.trackingUrl || `${process.env.APP_URL}/track/${order._id}`,
      refundAmount: order.refundAmount || order.totalAmount,
      cancellationReason: order.cancellationReason || 'Customer request',
      reviewUrl: `${process.env.APP_URL}/orders/${order._id}/review`,
    };

    // Send notification to user
    await notifyUser({
      userId: order.userId._id,
      userEmail: order.userId.email,
      userName: order.userId.fullName || order.userId.name,
      templateKey,
      data: notificationData,
    });

    // If it's a new order, notify admin
    if (status === 'pending') {
      const adminNotificationData = {
        orderNumber: order.orderNumber,
        customerName: order.userId.fullName || order.userId.name,
        customerPhone: order.userId.mobile || order.userId.phone,
        customerEmail: order.userId.email,
        totalAmount: order.totalAmount,
        itemCount: order.items?.length || 0,
        paymentStatus: order.paymentStatus,
        deliveryAddress: order.deliveryAddress?.fullAddress || 'N/A',
        items: order.items || [],
        adminOrderUrl: `${process.env.ADMIN_URL}/orders/${order._id}`,
      };

      await notifyAdmin({
        adminEmails: [process.env.ADMIN_EMAIL || 'admin@gavran.com'],
        templateKey: 'newOrder',
        data: adminNotificationData,
      });
    }

    console.log(`✅ Order notification sent for ${orderId}, status: ${status}`);
  } catch (error) {
    console.error('❌ Order notification error:', error);
  }
};
