/**
 * All FCM and DB notification templates
 * Each template returns { title, body, imageUrl, data }
 */

export const notificationTemplates = {
  // ==================== USER NOTIFICATIONS ====================

  user: {
    // ✅ Account Deactivated (DB notification only)
    accountDeactivated: (data) => ({
      type: 'account',
      title: '⚠️ Account Deactivated',
      body: 'Your account has been deactivated. Please contact support.',
      imageUrl: null,
      data: {
        screen: 'Support',
      },
    }),

    // ✅ Account Reactivated (DB notification)
    accountReactivated: (data) => ({
      type: 'account',
      title: '✅ Account Reactivated',
      body: 'Welcome back! Your account has been reactivated. You can now login and continue.',
      imageUrl: null,
      data: {
        screen: 'Login',
      },
    }),

    // ✅ Documents Approved (DB notification only)
    documentsApproved: (data) => ({
      type: 'account',
      title: '✅ Account Verified',
      body: `Your ${data.roleName} account is verified! You can now login and start ordering.`,
      imageUrl: null,
      data: {
        screen: 'Login',
      },
    }),

    // ✅ Documents Rejected (DB notification only)
    documentsRejected: (data) => ({
      type: 'account',
      title: '❌ Documents Rejected',
      body: 'Your documents were rejected. Please re-upload valid documents.',
      imageUrl: null,
      data: {
        screen: 'DocumentUpload',
      },
    }),

    // ✅ Normal Order Placed (FCM for user)
    normalOrderPlaced: (data) => ({
      type: 'order_placed',
      title: '🎉 Order Placed Successfully',
      body: `Order #${data.orderId} placed! Total: ₹${data.billSummary.totalAmount.toFixed(2)}`,
      imageUrl: data.products[0]?.image || null,
      data: {
        screen: 'OrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
      },
    }),
    // ✅ Order Cancelled (FCM for user)
    orderCancelledByUser: (data) => ({
      type: 'order_cancelled',
      title: '❌ Order Cancelled',
      body: `Order #${data.orderId} has been cancelled. ${data.paymentStatus === 'Paid' ? 'Refund will be processed soon.' : ''}`,
      imageUrl: null,
      data: {
        screen: 'OrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
      },
    }),
    // ✅ Bulk Order Placed (FCM for user)
    bulkOrderPlaced: (data) => ({
      type: 'bulk_order_placed',
      title: '📦 Bulk Order Request Received',
      body: `Order #${data.orderId} received! Admin will review and add products soon.`,
      imageUrl: data.attachedImages?.[0]?.uri || null,
      data: {
        screen: 'OrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
        orderType: 'bulk',
      },
    }),

    // ✅ Bulk Order Confirmed (FCM for user)
    bulkOrderConfirmed: (data) => ({
      type: 'bulk_order_confirmed',
      title: '✅ Bulk Order Confirmed!',
      body: `Order #${data.orderId} confirmed with ${data.productCount} items. Total: ₹${data.billSummary.totalAmount.toFixed(2)}`,
      imageUrl: data.products[0]?.image || null,
      data: {
        screen: 'OrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
        orderType: 'bulk',
      },
    }),
    // ✅ Bulk Order Cancelled (FCM for user)
    bulkOrderCancelledByUser: (data) => ({
      type: 'bulk_order_cancelled',
      title: '❌ Bulk Order Cancelled',
      body: `Order #${data.orderId} cancelled. ${data.paymentStatus === 'Completed' || data.paymentStatus === 'Paid' ? 'Refund will be processed soon.' : ''}`,
      imageUrl: null,
      data: {
        screen: 'OrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
        orderType: 'bulk',
      },
    }),

    // ✅ Replacement Request Submitted (FCM for user)
    replacementRequestSubmitted: (data) => ({
      type: 'replacement_submitted',
      title: '🔄 Replacement Request Submitted',
      body: `Request #${data.requestId} submitted. We'll review within 24-48 hours.`,
      imageUrl: data.replacementItems[0]?.originalItem?.image || null,
      data: {
        screen: 'ReplacementDetails',
        replacementId: data.replacementMongoId,
        requestNumber: data.requestId,
      },
    }),

    // ✅ Replacement Request Approved (FCM for user)
    replacementRequestApproved: (data) => ({
      type: 'replacement_approved',
      title: '✅ Replacement Approved!',
      body: `Your replacement request #${data.requestId} is approved! Preparing shipment.`,
      imageUrl: data.replacementItems[0]?.originalItem?.image || null,
      data: {
        screen: 'ReplacementDetails',
        replacementId: data.replacementMongoId,
        requestNumber: data.requestId,
      },
    }),

    // ✅ Replacement Request Rejected (FCM for user)
    replacementRequestRejected: (data) => ({
      type: 'replacement_rejected',
      title: '❌ Replacement Request Update',
      body: `Request #${data.requestId} ${data.wasApproved ? 'cancelled' : 'declined'}. Tap for details.`,
      imageUrl: null,
      data: {
        screen: 'ReplacementDetails',
        replacementId: data.replacementMongoId,
        requestNumber: data.requestId,
      },
    }),
    // ✅ Spot Order Created (FCM for driver)
    spotOrderCreated: (data) => ({
      type: 'spot_order_created',
      title: '✅ Spot Order Delivered',
      body: `Order #${data.orderId} completed! ₹${data.totalAmount.toFixed(2)} collected from ${data.customerName}.`,
      imageUrl: data.products[0]?.image || null,
      data: {
        screen: 'SpotOrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
        orderType: 'spot',
      },
    }),
    // ✅ Order Delivered (FCM for customer)
    orderDelivered: (data) => ({
      type: 'order_delivered',
      title: '✅ Order Delivered!',
      body: `Your order #${data.orderId} has been delivered. Rate your experience!`,
      imageUrl: data.products[0]?.image || null,
      data: {
        screen: 'OrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
        orderType: data.orderType,
        action: 'rate_order',
      },
    }),
    // ✅ Order Cancelled (FCM for customer)
    orderCancelled: (data) => ({
      type: 'order_cancelled',
      title: '❌ Order Cancelled',
      body: `Your order #${data.orderId} has been cancelled. ${data.paymentStatus === 'Completed' || data.paymentStatus === 'Paid' ? 'Refund will be processed soon.' : ''}`,
      imageUrl: null,
      data: {
        screen: 'OrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
        orderType: data.orderType,
      },
    }),

    // Order notifications
    orderPlaced: (data) => ({
      type: 'order_placed',
      title: '🛒 Order Placed Successfully',
      body: `Your order #${data.orderNumber} has been placed. Total: ₹${data.totalAmount}`,
      imageUrl:
        data.productImage || 'https://i.ibb.co/fG4SwGmh/order-placed.png',
      data: {
        screen: 'OrderDetails',
        orderId: data.orderId,
        orderNumber: data.orderNumber,
      },
    }),

    orderConfirmed: (data) => ({
      type: 'order_confirmed',
      title: '✅ Order Confirmed',
      body: `Your order #${data.orderNumber} is confirmed and being prepared for shipment`,
      imageUrl: 'https://i.ibb.co/fG4SwGmh/order-confirmed.png',
      data: {
        screen: 'OrderDetails',
        orderId: data.orderId,
        orderNumber: data.orderNumber,
      },
    }),

    orderShipped: (data) => ({
      type: 'order_shipped',
      title: '📦 Order Shipped',
      body: `Your order #${data.orderNumber} is on its way! Track: ${data.trackingNumber}`,
      imageUrl: 'https://i.ibb.co/fG4SwGmh/order-shipped.png',
      data: {
        screen: 'TrackOrder',
        orderId: data.orderId,
        trackingNumber: data.trackingNumber,
      },
    }),

    // Order out for delivery
    orderOutForDelivery: (data) => ({
      type: 'order_status',
      title: '🚚 Order Out for Delivery',
      body: `Your order #${data.orderId} is on the way! Estimated delivery: ${data.estimatedDelivery}`,
      imageUrl: data.products[0]?.image || null,
      data: {
        screen: 'OrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
      },
    }),

    // OTP for delivery/cancellation
    deliveryOTP: (data) => ({
      type: 'delivery_otp',
      title: `🔐 OTP for Order ${data.action}`,
      body: `Your OTP is: ${data.otp}. Valid for ${data.expiryMinutes} minutes. Share this with delivery partner.`,
      imageUrl: null,
      data: {
        screen: 'OrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
        otp: data.otp,
        action: data.action,
      },
    }),

    // orderDelivered: (data) => ({
    //   type: 'order_delivered',
    //   title: '🎉 Order Delivered',
    //   body: `Your order #${data.orderNumber} has been delivered. Enjoy your purchase!`,
    //   imageUrl: 'https://i.ibb.co/fG4SwGmh/order-delivered.png',
    //   data: {
    //     screen: 'RateOrder',
    //     orderId: data.orderId,
    //     orderNumber: data.orderNumber,
    //   },
    // }),

    // orderCancelled: (data) => ({
    //   type: 'order_cancelled',
    //   title: '❌ Order Cancelled',
    //   body: `Your order #${data.orderNumber} has been cancelled. Refund: ₹${data.refundAmount}`,
    //   imageUrl: null,
    //   data: {
    //     screen: 'OrderDetails',
    //     orderId: data.orderId,
    //     orderNumber: data.orderNumber,
    //   },
    // }),

    // Payment notifications
    paymentSuccess: (data) => ({
      type: 'payment_success',
      title: '✅ Payment Successful',
      body: `Payment of ₹${data.amount} received for order #${data.orderNumber}`,
      imageUrl: null,
      data: {
        screen: 'OrderDetails',
        orderId: data.orderId,
        transactionId: data.transactionId,
      },
    }),

    paymentFailed: (data) => ({
      type: 'payment_failed',
      title: '❌ Payment Failed',
      body: `Payment of ₹${data.amount} failed. Please try again.`,
      imageUrl: null,
      data: {
        screen: 'Checkout',
        orderId: data.orderId,
      },
    }),

    // Promotional notifications
    flashSale: (data) => ({
      type: 'promotional',
      title: '🔥 Flash Sale Alert!',
      body: `${data.discountPercent}% off on ${data.category}. Limited time offer!`,
      imageUrl: data.bannerImage,
      data: {
        screen: 'ProductListing',
        category: data.category,
        saleId: data.saleId,
      },
    }),

    newArrival: (data) => ({
      type: 'promotional',
      title: '🆕 New Arrivals',
      body: `Check out our latest ${data.category} collection`,
      imageUrl: data.productImage,
      data: {
        screen: 'ProductListing',
        category: data.category,
      },
    }),
  },

  // ==================== DRIVER NOTIFICATIONS ====================
  driver: {
    // ✅ Delivery Confirmation (FCM for driver)
    orderDeliveryConfirmation: (data) => ({
      type: 'delivery_confirmed',
      title: '✅ Delivery Confirmed',
      body: `Order #${data.orderId} delivered successfully. Great job!`,
      imageUrl: null,
      data: {
        screen: 'OrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
        orderType: data.orderType,
      },
    }),
    // ✅ Order Cancellation Confirmed (FCM for driver)
    orderCancellationConfirmation: (data) => ({
      type: 'order_cancellation_confirmed',
      title: '✓ Cancellation Confirmed',
      body: `Order #${data.orderId} cancelled successfully. Customer notified.`,
      imageUrl: null,
      data: {
        screen: 'OrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
        orderType: data.orderType,
      },
    }),
    // Route assigned
    routeAssigned: (data) => ({
      type: 'route_assigned',
      title: '📋 New Route Assigned',
      body: `Route: ${data.routeName} | ${data.totalOrders} orders | Delivery: ${data.deliveryDate}`,
      imageUrl: null,
      data: {
        screen: 'RouteDetails',
        routeId: data.routeId,
        routeName: data.routeName,
      },
    }),

    // Route started
    routeStarted: (data) => ({
      type: 'route_started',
      title: '🚀 Route Started',
      body: `${data.routeName} started at ${data.startedAt}. ${data.totalOrders} orders to deliver.`,
      imageUrl: null,
      data: {
        screen: 'ActiveRoute',
        routeId: data.routeId,
      },
    }),
  },
  // ==================== ADMIN NOTIFICATIONS ====================

  admin: {
    // ✅ Normal Order Received (DB for admin)
    normalOrderReceived: (data) => ({
      type: 'new_order',
      title: '🔔 New Order Received',
      body: `Order #${data.orderId} from ${data.customerName} (${data.customerRole}) - ₹${data.billSummary.totalAmount.toFixed(2)}`,
      imageUrl: null,
      data: {
        screen: 'AdminOrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
      },
    }),
    // ✅ Order Cancelled (DB for admin)
    orderCancelledByUser: (data) => ({
      type: 'order_cancelled',
      title: '⚠️ Order Cancelled',
      body: `Order #${data.orderId} cancelled by ${data.customerName}. Reason: ${data.reason}`,
      imageUrl: null,
      data: {
        screen: 'AdminOrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
      },
    }),

    // ✅ Bulk Order Received (DB for admin)
    bulkOrderReceived: (data) => ({
      type: 'bulk_order_received',
      title: '🚨 URGENT: New Bulk Order',
      body: `Bulk order #${data.orderId} from ${data.customerName}. Add products immediately!`,
      imageUrl: null,
      data: {
        screen: 'AdminOrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
        orderType: 'bulk',
        priority: 'urgent',
      },
    }),

    // ✅ Bulk Order Products Added (DB for admin)
    bulkOrderProductsAdded: (data) => ({
      type: 'bulk_order_updated',
      title: '✅ Bulk Order Products Added',
      body: `Products added to bulk order #${data.orderId}. ${data.productCount} items, ₹${data.billSummary.totalAmount.toFixed(2)}`,
      imageUrl: null,
      data: {
        screen: 'AdminOrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
        orderType: 'bulk',
      },
    }),
    // ✅ Bulk Order Cancelled (DB for admin)
    bulkOrderCancelledByUser: (data) => ({
      type: 'bulk_order_cancelled',
      title: '⚠️ Bulk Order Cancelled',
      body: `Bulk order #${data.orderId} cancelled by ${data.customerName}. Reason: ${data.reason}`,
      imageUrl: null,
      data: {
        screen: 'AdminOrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
        orderType: 'bulk',
      },
    }),
    // ✅ Replacement Request Received (DB for admin)
    replacementRequestReceived: (data) => ({
      type: 'replacement_received',
      title: '🔄 New Replacement Request',
      body: `Request #${data.requestId} from ${data.customerName}. ${data.itemCount} items. Review now.`,
      imageUrl: null,
      data: {
        screen: 'AdminReplacementDetails',
        replacementId: data.replacementMongoId,
        requestNumber: data.requestId,
        priority: 'high',
      },
    }),

    // ✅ Replacement Approved (DB for admin)
    replacementApprovedConfirmation: (data) => ({
      type: 'replacement_approved_admin',
      title: '✅ Replacement Approved',
      body: `Request #${data.requestId} approved. ${data.itemCount} items reserved for ${data.customerName}.`,
      imageUrl: null,
      data: {
        screen: 'AdminReplacementDetails',
        replacementId: data.replacementMongoId,
        requestNumber: data.requestId,
      },
    }),

    // ✅ Replacement Rejected (DB for admin)
    replacementRejectedConfirmation: (data) => ({
      type: 'replacement_rejected_admin',
      title: `❌ Replacement ${data.wasApproved ? 'Cancelled' : 'Rejected'}`,
      body: `Request #${data.requestId} ${data.wasApproved ? 'cancelled' : 'rejected'}. Customer: ${data.customerName}.`,
      imageUrl: null,
      data: {
        screen: 'AdminReplacementDetails',
        replacementId: data.replacementMongoId,
        requestNumber: data.requestId,
      },
    }),
    // ✅ Spot Order Created (DB for admin)
    spotOrderCreated: (data) => ({
      type: 'spot_order_created',
      title: '🚚 New Spot Order',
      body: `Driver ${data.driverName} completed spot order #${data.orderId}. ₹${data.totalAmount.toFixed(2)} from ${data.customerName}.`,
      imageUrl: null,
      data: {
        screen: 'AdminOrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
        orderType: 'spot',
        driverId: data.driverId,
      },
    }),
    // ✅ Order Delivered (DB for admin)
    orderDelivered: (data) => ({
      type: 'order_delivered',
      title: '✅ Order Delivered',
      body: `Order #${data.orderId} delivered by ${data.driverName}. Customer: ${data.customerName}`,
      imageUrl: null,
      data: {
        screen: 'AdminOrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
        orderType: data.orderType,
        driverId: data.driverId,
      },
    }),
    // ✅ Order Cancelled (DB for admin)
    orderCancelled: (data) => ({
      type: 'order_cancelled',
      title: '⚠️ Order Cancelled',
      body: `Order #${data.orderId} cancelled by ${data.cancelledByName}. Reason: ${data.reason}`,
      imageUrl: null,
      data: {
        screen: 'AdminOrderDetails',
        orderId: data.orderMongoId,
        orderNumber: data.orderId,
        orderType: data.orderType,
        priority:
          data.paymentStatus === 'Completed' || data.paymentStatus === 'Paid'
            ? 'high'
            : 'normal',
      },
    }),

    newOrder: (data) => ({
      type: 'new_order',
      title: '🔔 New Order Received',
      body: `Order #${data.orderNumber} from ${data.customerName}. Total: ₹${data.totalAmount}`,
      imageUrl: null,
      data: {
        screen: 'AdminOrderDetails',
        orderId: data.orderId,
        orderNumber: data.orderNumber,
      },
    }),

    lowStock: (data) => ({
      type: 'low_stock',
      title: '⚠️ Low Stock Alert',
      body: `${data.productName} has only ${data.currentStock} units left`,
      imageUrl: data.productImage,
      data: {
        screen: 'AdminProductDetails',
        productId: data.productId,
      },
    }),

    orderCancellationRequest: (data) => ({
      type: 'cancellation_request',
      title: '🔔 Cancellation Request',
      body: `${data.customerName} requested to cancel order #${data.orderNumber}`,
      imageUrl: null,
      data: {
        screen: 'AdminOrderDetails',
        orderId: data.orderId,
        action: 'approve_cancellation',
      },
    }),

    returnRequest: (data) => ({
      type: 'return_request',
      title: '🔄 Return Request',
      body: `Return request for order #${data.orderNumber}. Reason: ${data.reason}`,
      imageUrl: null,
      data: {
        screen: 'AdminReturnDetails',
        returnId: data.returnId,
        orderId: data.orderId,
      },
    }),

    paymentReceived: (data) => ({
      type: 'payment_received',
      title: '💰 Payment Received',
      body: `₹${data.amount} received for order #${data.orderNumber}`,
      imageUrl: null,
      data: {
        screen: 'AdminOrderDetails',
        orderId: data.orderId,
        transactionId: data.transactionId,
      },
    }),
  },
};
