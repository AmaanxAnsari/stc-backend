import mongoose from 'mongoose';
import AppOrder from '../../models/admin/AppOrderModel.js';
import BulkOrder from '../../models/admin/BulkOrderModel.js';
import ReplacementRequest from '../../models/admin/ReplacementOrderModel.js';
import { TrackingService } from '../../utils/trackingService.js';
import { OrderService } from '../../utils/orderService.js';
import { getAdminDB } from '../../config/db.js';
import { sendOutForDeliveryNotification } from '../../utils/notificationService.js';

const ORDER_MODELS = {
  normal: AppOrder,
  bulk: BulkOrder,
  replacement: ReplacementRequest,
};

function getOrderModel(orderType) {
  return ORDER_MODELS[orderType];
}

function normalizeOrderType(orderType) {
  if (!orderType) return null;
  const t = String(orderType).toLowerCase();
  if (t === 'apporder' || t === 'normal') return 'normal';
  if (t === 'bulk' || t === 'bulkorder') return 'bulk';
  if (t === 'replacement' || t === 'replacementrequest') return 'replacement';
  return null;
}

function clearRouteFieldsUpdate() {
  return {
    assignedStop: null,
    stopAssignmentStatus: 'pending',
    routeId: null,
    stopNumber: null,
  };
}
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

function clearPartnerFieldsUpdate() {
  return {
    partnerAssignment: {
      partnerId: null,
      status: null,
      assignedBy: null,
      assignedAt: null,
      acceptedAt: null,
      rejectedAt: null,
      rejectionReason: '',
    },
  };
}

/**
 * PARTNER: Get all assigned/accepted orders for logged-in partner
 * Query: ?status=assigned|accepted|rejected (optional)
 */

// export const getAssignedOrdersForPartner = async (req, res) => {
//   try {
//     const partnerId = req.user?.id || req.user?._id;

//     // Backward compatible: old param `status` means assignment status
//     const assignmentStatus = req.query.assignmentStatus
//       ? String(req.query.assignmentStatus)
//       : req.query.status
//         ? String(req.query.status)
//         : null;

//     const orderStatus = req.query.orderStatus
//       ? String(req.query.orderStatus)
//       : null;

//     const match = {
//       isDeleted: false,
//       fulfillmentMode: 'partner',
//       'partnerAssignment.partnerId': new mongoose.Types.ObjectId(partnerId),
//     };

//     // assignment status filter
//     if (assignmentStatus) {
//       match['partnerAssignment.status'] = assignmentStatus;
//     } else {
//       // keep your current default
//       match['partnerAssignment.status'] = { $in: ['assigned', 'accepted'] };
//     }

//     // main order status filter (delivered/cancelled/etc)
//     if (orderStatus) {
//       match.status = orderStatus;
//     }

//     const [normalOrders, bulkOrders, replacementOrders] = await Promise.all([
//       AppOrder.find(match).lean(),
//       BulkOrder.find(match).lean(),
//       ReplacementRequest.find(match).lean(),
//     ]);

//     const merged = [
//       ...normalOrders.map((o) => ({ ...o, orderType: 'normal' })),
//       ...bulkOrders.map((o) => ({ ...o, orderType: 'bulk' })),
//       ...replacementOrders.map((o) => ({
//         ...o,
//         orderType: 'replacement',
//         orderId: o.requestId,
//       })),
//     ];

//     merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    

//     return res.status(200).json({
//       success: true,
//       message: 'Partner orders fetched successfully',
//       data: merged,
//       count: merged.length,
//     });
//   } catch (error) {
//     console.error('getAssignedOrdersForPartner error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch partner orders',
//       error: error.message,
//     });
//   }
// };

export const getAssignedOrdersForPartner = async (req, res) => {
  try {
    const partnerId = req.user?.id || req.user?._id;

    // Backward compatible: old param `status` means assignment status
    const assignmentStatus = req.query.assignmentStatus
      ? String(req.query.assignmentStatus)
      : req.query.status
        ? String(req.query.status)
        : null;

    const orderStatus = req.query.orderStatus
      ? String(req.query.orderStatus)
      : null;

    // Base match (common for list + counts)
    const baseMatch = {
      isDeleted: false,
      fulfillmentMode: 'partner',
      'partnerAssignment.partnerId': new mongoose.Types.ObjectId(partnerId),
    };

    // LIST query match (keeps your existing behavior)
    const match = { ...baseMatch };

    // assignment status filter
    if (assignmentStatus) {
      match['partnerAssignment.status'] = assignmentStatus;
    } else {
      // keep your current default
      match['partnerAssignment.status'] = { $in: ['assigned', 'accepted'] };
    }

    // main order status filter (delivered/cancelled/etc)
    if (orderStatus) {
      match.status = orderStatus;
    }

    // COUNTS pipeline
    // Note: we do NOT apply `assignmentStatus` here, because cards usually need totals
    // (we DO apply `orderStatus` if provided, to keep consistent with your optional filter)
    const countPipeline = [
      {
        $match: {
          ...baseMatch,
          ...(orderStatus ? { status: orderStatus } : {}),
        },
      },
      {
        $group: {
          _id: null,
          assigned: {
            $sum: {
              $cond: [{ $eq: ['$partnerAssignment.status', 'assigned'] }, 1, 0],
            },
          },
          accepted: {
            $sum: {
              $cond: [{ $eq: ['$partnerAssignment.status', 'accepted'] }, 1, 0],
            },
          },
          cancelled: {
            $sum: {
              $cond: [
                { $eq: ['$partnerAssignment.status', 'rejected'] },
                1,
                0,
              ],
            },
          },
          total: { $sum: 1 },
        },
      },
    ];

    const [
      normalOrders,
      bulkOrders,
      replacementOrders,
      normalCountsArr,
      bulkCountsArr,
      replacementCountsArr,
    ] = await Promise.all([
      AppOrder.find(match).lean(),
      BulkOrder.find(match).lean(),
      ReplacementRequest.find(match).lean(),
      AppOrder.aggregate(countPipeline),
      BulkOrder.aggregate(countPipeline),
      ReplacementRequest.aggregate(countPipeline),
    ]);

    const merged = [
      ...normalOrders.map((o) => ({ ...o, orderType: 'normal' })),
      ...bulkOrders.map((o) => ({ ...o, orderType: 'bulk' })),
      ...replacementOrders.map((o) => ({
        ...o,
        orderType: 'replacement',
        orderId: o.requestId,
      })),
    ];

    merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Merge counts from all 3 collections
    const safe = (arr) =>
      arr?.[0] || { assigned: 0, accepted: 0, cancelled: 0, total: 0 };

    const nc = safe(normalCountsArr);
    const bc = safe(bulkCountsArr);
    const rc = safe(replacementCountsArr);

    const counts = {
      assigned: (nc.assigned || 0) + (bc.assigned || 0) + (rc.assigned || 0),
      accepted: (nc.accepted || 0) + (bc.accepted || 0) + (rc.accepted || 0),
      cancelled:
        (nc.cancelled || 0) + (bc.cancelled || 0) + (rc.cancelled || 0),
      total: (nc.total || 0) + (bc.total || 0) + (rc.total || 0),
    };

    return res.status(200).json({
      success: true,
      message: 'Partner orders fetched successfully',
      data: merged,
      count: merged.length,
      counts, // <-- NEW (use this for cards)
    });
  } catch (error) {
    console.error('getAssignedOrdersForPartner error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch partner orders',
      error: error.message,
    });
  }
};


/**
 * PARTNER: Accept assigned order
 * Body: { orderId, orderType }
 */


export const acceptAssignedOrder = async (req, res) => {
  try {
    const partnerId = req.user?.id || req.user?._id;
    const { orderId, orderType } = req.body;

    const normalizedType = normalizeOrderType(orderType);
    if (!orderId || !normalizedType) {
      return res.status(400).json({
        success: false,
        message: 'orderId and orderType are required',
      });
    }

    const OrderModel = getOrderModel(normalizedType);
    if (!OrderModel) {
      return res.status(400).json({
        success: false,
        message: `Invalid orderType: ${orderType}`,
      });
    }

    const now = new Date();

    // 1) ATOMIC accept + status change
    // This is the key: filter includes partner + assigned status
    const acceptedOrder = await OrderModel.findOneAndUpdate(
      {
        _id: orderId,
        isDeleted: false,
        fulfillmentMode: 'partner',
        'partnerAssignment.partnerId': partnerId,
        'partnerAssignment.status': 'assigned',
      },
      {
        $set: {
          'partnerAssignment.status': 'accepted',
          'partnerAssignment.acceptedAt': now,

          // you wanted this also
          status: 'out_for_delivery',
          statusLabel: 'Out for Delivery',
          statusColor: '#2196F3',
        },
      },
      { new: true },
    );

    if (!acceptedOrder) {
      // Better error messages (optional extra lookup)
      const existing = await OrderModel.findOne({
        _id: orderId,
        isDeleted: false,
      });
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: 'Order not found' });
      }

      if (existing.fulfillmentMode !== 'partner') {
        return res
          .status(400)
          .json({
            success: false,
            message: 'This order is not partner-managed',
          });
      }

      if (!existing.partnerAssignment?.partnerId) {
        return res
          .status(400)
          .json({
            success: false,
            message: 'Order is not assigned to any partner',
          });
      }

      if (
        existing.partnerAssignment.partnerId.toString() !== partnerId.toString()
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message: 'You are not authorized to accept this order',
          });
      }

      return res.status(400).json({
        success: false,
        message: `Order assignment is already ${existing.partnerAssignment.status}`,
      });
    }

    // 2) Update delivery stages + tracking (NO session)
    const pendingTime = new Date(
      acceptedOrder.orderPlacedDate || acceptedOrder.createdAt || now,
    );
    const diff = Math.max(0, now.getTime() - pendingTime.getTime());

    const confirmedTime = new Date(pendingTime.getTime() + diff * 0.3);
    const packedTime = new Date(pendingTime.getTime() + diff * 0.6);

    // confirmed + packed stages
    await OrderService.updateMultipleStages(acceptedOrder._id, normalizedType, [
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

    // out_for_delivery tracking event (should update existing stage, not duplicate)
    const trackingEvent = TrackingService.createEvent(
      'out_for_delivery',
      'Order is out for delivery',
    );

    await OrderService.addTrackingEvent(
      acceptedOrder._id,
      normalizedType,
      trackingEvent,
    );

    // 3) Notification (don’t block success if it fails)
    try {
      await sendOutForDeliveryNotification(acceptedOrder, normalizedType);
    } catch (notifyErr) {
      console.error('Notification error (acceptAssignedOrder):', notifyErr);
    }

    // 4) Return final order (refetch so response includes stage updates)
    const finalOrder = await OrderModel.findById(orderId);

    return res.status(200).json({
      success: true,
      message: 'Order accepted successfully',
      data: { orderType: normalizedType, order: finalOrder || acceptedOrder },
    });
  } catch (error) {
    console.error('acceptAssignedOrder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to accept order',
      error: error.message,
    });
  }
};


/**
 * PARTNER: Reject assigned order
 * Body: { orderId, orderType, rejectionReason }
 */
export const rejectAssignedOrder = async (req, res) => {
  try {
    const partnerId = req.user?.id || req.user?._id;
    const { orderId, orderType, rejectionReason } = req.body;

    const normalizedType = normalizeOrderType(orderType);
    if (!orderId || !normalizedType) {
      return res.status(400).json({
        success: false,
        message: 'orderId and orderType are required',
      });
    }

    const OrderModel = getOrderModel(normalizedType);
    if (!OrderModel) {
      return res.status(400).json({
        success: false,
        message: `Invalid orderType: ${orderType}`,
      });
    }

    const order = await OrderModel.findOne({ _id: orderId, isDeleted: false });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: 'Order not found' });
    }

    if (order.fulfillmentMode !== 'partner') {
      return res.status(400).json({
        success: false,
        message: 'This order is not partner-managed',
      });
    }

    if (!order.partnerAssignment?.partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Order is not assigned to any partner',
      });
    }

    if (order.partnerAssignment.partnerId.toString() !== partnerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to reject this order',
      });
    }

    if (order.partnerAssignment.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        message: `Order assignment is already ${order.partnerAssignment.status}`,
      });
    }

    order.partnerAssignment.status = 'rejected';
    order.partnerAssignment.rejectedAt = new Date();
    order.partnerAssignment.rejectionReason = rejectionReason || '';
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Order rejected successfully',
      data: { orderType: normalizedType, order },
    });
  } catch (error) {
    console.error('rejectAssignedOrder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject order',
      error: error.message,
    });
  }
};
