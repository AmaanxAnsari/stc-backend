import mongoose from 'mongoose';
import AppOrder from '../../models/admin/AppOrderModel.js';
import BulkOrder from '../../models/admin/BulkOrderModel.js';
import ReplacementRequest from '../../models/admin/ReplacementOrderModel.js';
import { User } from '../../models/app/user.js';
import { getAdminDB } from '../../config/db.js';

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

function normText(v) {
  return (v ?? '').toString().trim().toLowerCase();
}

function normPincode(v) {
  return (v ?? '').toString().trim();
}

function computeMatch(orderLoc, partnerLoc) {
  const areaMatch =
    orderLoc.area && partnerLoc.area && orderLoc.area === partnerLoc.area;
  const cityMatch =
    orderLoc.city && partnerLoc.city && orderLoc.city === partnerLoc.city;
  const pincodeMatch =
    orderLoc.pincode &&
    partnerLoc.pincode &&
    orderLoc.pincode === partnerLoc.pincode;

  const score =
    (areaMatch ? 1 : 0) + (cityMatch ? 1 : 0) + (pincodeMatch ? 1 : 0);

  return {
    score,
    matches: { area: areaMatch, city: cityMatch, pincode: pincodeMatch },
  };
}

/**
 * ADMIN: Assign an order to a partner (partner-managed)
 * Body: { orderId, orderType, partnerId }
 */
export const assignOrderToPartner = async (req, res) => {
  const session = await getAdminDB().startSession();

  try {
    session.startTransaction();

    const adminId = req.user?.id || req.user?._id;
    const { orderId, orderType, partnerId } = req.body;

    const normalizedType = normalizeOrderType(orderType);
    if (!orderId || !normalizedType || !partnerId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'orderId, orderType, and partnerId are required',
      });
    }

    const OrderModel = getOrderModel(normalizedType);
    if (!OrderModel) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Invalid orderType: ${orderType}`,
      });
    }

    // Validate partner user
    const partnerUser = await User.findById(partnerId).select(
      'fullName mobile email role',
    );

    if (!partnerUser) {
      return res.status(404).json({
        success: false,
        message: 'Partner user not found',
      });
    }

    // Optional role check (adjust roles as per your system)
    const allowedPartnerRoles = [
      'retailer',
      'wholesaler',
      'distributor',
      'super_stocker',
    ];
    if (!allowedPartnerRoles.includes(String(partnerUser.role).toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `User role ${partnerUser.role} is not allowed as partner`,
      });
    }

    const order = await OrderModel.findOne({
      _id: orderId,
      isDeleted: false,
    }).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Hard block: if ever moved to route-managed (locked), never allow partner assignment
    if (order.routeLocked === true || order.fulfillmentMode === 'route') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message:
          'This order is route-managed (warehouse packed). It cannot be assigned to a partner.',
      });
    }

    // If already assigned to a route via old flow (routeId exists), also block
    // (extra safety in case old data doesn't have routeLocked)
    if (order.routeId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message:
          'This order is already assigned to a route/stop. It cannot be assigned to a partner.',
      });
    }

    // Assign to partner (partner-managed)
    const update = {
      fulfillmentMode: 'partner',
      ...clearRouteFieldsUpdate(), // make sure it doesn't show in routes
      partnerAssignment: {
        partnerId: partnerUser._id,
        status: 'assigned',
        assignedBy: adminId || null,
        assignedAt: new Date(),
        acceptedAt: null,
        rejectedAt: null,
        rejectionReason: '',
      },
    };

    const updated = await OrderModel.findByIdAndUpdate(order._id, update, {
      new: true,
      session,
    });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: 'Order assigned to partner successfully',
      data: {
        orderType: normalizedType,
        order: updated,
        partner: {
          id: partnerUser._id,
          fullName: partnerUser.fullName,
          mobile: partnerUser.mobile,
          email: partnerUser.email,
          role: partnerUser.role,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('assignOrderToPartner error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign order to partner',
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

/**
 * ADMIN: Get partners by order location (cross DB safe)
 * GET /admin/partners/for-order/:orderId?orderType=normal|bulk|replacement
 */
export const getPartnersForOrderLocation = async (req, res) => {
  try {
    const { orderId } = req.params;
    const normalizedType = normalizeOrderType(req.query.orderType);

    if (!orderId || !normalizedType) {
      return res.status(400).json({
        success: false,
        message: 'orderId param and orderType query are required',
      });
    }

    const OrderModel = ORDER_MODELS[normalizedType];
    if (!OrderModel) {
      return res.status(400).json({
        success: false,
        message: `Invalid orderType: ${req.query.orderType}`,
      });
    }

    // 1) Fetch order from AdminDB
    const order = await OrderModel.findOne({
      _id: orderId,
      isDeleted: false,
    }).lean();
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: 'Order not found' });
    }

    const orderLoc = {
      area: normText(order?.deliveryAddress?.raw?.area),
      city: normText(order?.deliveryAddress?.raw?.city),
      pincode: normPincode(order?.deliveryAddress?.raw?.pincode),
    };

    if (!orderLoc.area && !orderLoc.city && !orderLoc.pincode) {
      return res.status(400).json({
        success: false,
        message: 'Order does not have deliveryAddress.raw.area/city/pincode',
      });
    }

    // 2) Fetch partner candidates from AppDB (filter first to reduce load)
    const allowedRoles = [
      'retailer',
      'wholesaler',
      'distributor',
      'super_stocker',
    ];

    // Build OR match so we don’t pull all partners
    const or = [];
    if (orderLoc.area)
      or.push({
        'business_info.area': new RegExp(
          `^${escapeRegExp(orderLoc.area)}$`,
          'i',
        ),
      });
    if (orderLoc.city)
      or.push({
        'business_info.city': new RegExp(
          `^${escapeRegExp(orderLoc.city)}$`,
          'i',
        ),
      });
    if (orderLoc.pincode)
      or.push({ 'business_info.pincode': orderLoc.pincode });

    const partnerQuery = {
      isDeleted: false,
      isActive: true,
      docStatus: 'approved',
      role: { $in: allowedRoles },
      ...(or.length ? { $or: or } : {}),
    };

    const partners = await User.find(partnerQuery)
      .select('role fullName email mobile profileImage business_info createdAt')
      .lean();

    // 3) Score + sort in Node
    const scored = partners
      .map((p) => {
        const partnerLoc = {
          area: normText(p?.business_info?.area),
          city: normText(p?.business_info?.city),
          pincode: normPincode(p?.business_info?.pincode),
        };

        const { score, matches } = computeMatch(orderLoc, partnerLoc);

        return {
          ...p,
          matchScore: score,
          matches,
        };
      })
      .filter((p) => p.matchScore >= 1)
      .sort((a, b) => {
        // Primary: score desc (3 -> 2 -> 1)
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;

        // Secondary: more stable ordering
        const nameCmp = String(a.fullName || '').localeCompare(
          String(b.fullName || ''),
        );
        if (nameCmp !== 0) return nameCmp;

        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

    return res.status(200).json({
      success: true,
      message: 'Partners fetched successfully',
      data: {
        order: {
          id: order._id,
          createdBy: order.createdBy,
          orderType: normalizedType,
          deliveryArea: order?.deliveryAddress?.raw?.area || null,
          deliveryCity: order?.deliveryAddress?.raw?.city || null,
          deliveryPincode: order?.deliveryAddress?.raw?.pincode || null,
        },
        partners: scored,
        counts: {
          total: scored.length,
          score3: scored.filter((p) => p.matchScore === 3).length,
          score2: scored.filter((p) => p.matchScore === 2).length,
          score1: scored.filter((p) => p.matchScore === 1).length,
        },
      },
    });
  } catch (error) {
    console.error('getPartnersForOrderLocation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch partners',
      error: error.message,
    });
  }
};

// helper for regex escaping
function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
