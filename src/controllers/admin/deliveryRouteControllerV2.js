import mongoose from 'mongoose';
import AppOrder from '../../models/admin/AppOrderModel.js';
import BasicRoute from '../../models/admin/BasicRoutesModel.js';
import BulkOrder from '../../models/admin/BulkOrderModel.js';
import DeliveryRoute from '../../models/admin/deliveryRouteModel.js';
import DeliveryStop from '../../models/admin/deliveryStopsModel.js';
import ReplacementRequest from '../../models/admin/ReplacementOrderModel.js';
import { User } from '../../models/app/user.js';
import { getAdminDB } from '../../config/db.js';

/**
 * Build Universal Location Matching Query for a Stop
 * Matches ANY of stop.area, stop.city, stop.pincode, stop.areaAliases[]
 * against order.address.area, order.address.city, order.address.pincode
 */

export function buildLocationMatchQuery(stop) {
  const keywords = [
    stop.area,
    stop.city,
    stop.pincode,
    ...(stop.areaAliases || []),
  ]
    .filter(Boolean)
    .map((w) => w.trim());

  const locationConditions = keywords.map((word) => ({
    $or: [
      { 'deliveryAddress.raw.area': { $regex: new RegExp(word, 'i') } },
      { 'deliveryAddress.raw.city': { $regex: new RegExp(word, 'i') } },
      { 'deliveryAddress.raw.pincode': { $regex: new RegExp(word, 'i') } },
    ],
  }));

  return {
    isDeleted: false,

    // Only show UNASSIGNED orders (VERY IMPORTANT)
    $or: [{ routeId: null }, { routeId: { $exists: false } }, { routeId: '' }],

    // Status allowed for assignment
    status: { $in: ['pending', 'confirmed'] },

    // Match ANY location keyword
    $or: locationConditions,
  };
}

/**
 * STEP 1: Create Route Instance from Basic Route (Predefined Route)
 * Creates a new delivery route instance with predefined stops from basic route
 */

const normalizeToUTCMidnight = (input) => {
  if (!input) return null;

  // If already a Date
  if (input instanceof Date && !isNaN(input)) {
    return new Date(
      Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()),
    );
  }

  // If string like YYYY-MM-DD
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [year, month, day] = input.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  // If ISO string
  const parsed = new Date(input);
  if (!isNaN(parsed)) {
    return new Date(
      Date.UTC(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate(),
      ),
    );
  }

  return null;
};

export const createRouteFromBasicRoute = async (req, res) => {
  const session = await getAdminDB().startSession();

  try {
    session.startTransaction();

    const { basicRouteId, nextDeliveryDate, estimatedDuration } = req.body;
    const adminId = req.user.id;

    // Validation
    if (!basicRouteId || !nextDeliveryDate) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Basic Route ID and Next Delivery Date are required',
      });
    }

    // Fetch basic route with its stops
    const basicRoute = await BasicRoute.findOne({
      _id: basicRouteId,
      isDeleted: false,
    }).session(session);

    if (!basicRoute) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Basic route not found',
      });
    }

    // Parse and normalize the delivery date
    // const parsedDate = new Date(nextDeliveryDate);
    // const normalizedDate = new Date(
    //   parsedDate.getFullYear(),
    //   parsedDate.getMonth(),
    //   parsedDate.getDate(),
    // );

    const normalizedDate = normalizeToUTCMidnight(nextDeliveryDate);

    if (!normalizedDate) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Invalid nextDeliveryDate format',
      });
    }

    // Check if route instance already exists for this date
    const existingRoute = await DeliveryRoute.findOne({
      routeName: basicRoute.routeName,
      area: basicRoute.area,
      nextDeliveryDate: {
        $gte: normalizedDate,
        $lt: new Date(normalizedDate.getTime() + 24 * 60 * 60 * 1000),
      },
      isDeleted: false,
    }).session(session);

    if (existingRoute) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `A route instance for "${basicRoute.routeName}" already exists for ${normalizedDate.toLocaleDateString(
          'en-IN',
          {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
          },
        )}`,
      });
    }

    // Verify all stops exist
    const stopIds = basicRoute.stops || [];
    if (stopIds.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message:
          'Basic route has no stops defined. Please add stops to the basic route first.',
      });
    }

    const stops = await DeliveryStop.find({
      _id: { $in: stopIds },
      isDeleted: false,
    }).session(session);

    if (stops.length !== stopIds.length) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Some stops from the basic route no longer exist',
      });
    }

    // Create route instance with empty stops structure (orders will be added later)
    const routeStops = stops.map((stop, index) => ({
      stopNumber: index + 1,
      location: `${stop.area}, ${stop.city}`,
      stopId: stop._id,
      partners: [], // Empty - will be populated when orders are assigned
    }));

    const route = await DeliveryRoute.create(
      [
        {
          routeName: basicRoute.routeName,
          area: basicRoute.area,
          routeId: basicRouteId,
          nextDeliveryDate: normalizedDate,
          nextDeliveryDateDisplay: normalizedDate.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            timeZone: 'Asia/Kolkata',
          }),
          estimatedDuration: estimatedDuration || '3 hours',
          status: 'draft', // Status: draft until orders are assigned
          stops: routeStops,
          totalStops: routeStops.length,
          totalOrders: 0,
          totalAmount: 0,
          createdBy: adminId,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Route instance created successfully with predefined stops',
      data: {
        route: route[0],
        stopsCount: routeStops.length,
        note: 'Route is in DRAFT status. Assign orders to activate.',
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Create route from basic route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create route instance',
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

/**
 * STEP 2: Get Available Orders for a Specific Stop in Route
 * Fetches orders between previous route date and current route date
 */

export const getAvailableOrdersForStop = async (req, res) => {
  try {
    const { routeId, stopId } = req.params;

    // Fetch current route
    const currentRoute = await DeliveryRoute.findOne({
      _id: routeId,
      isDeleted: false,
    });

    if (!currentRoute) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
      });
    }

    // Verify stop exists in this route
    const stopExists = currentRoute.stops.some(
      (s) => s.stopId.toString() === stopId,
    );

    if (!stopExists) {
      return res.status(400).json({
        success: false,
        message: 'Stop does not belong to this route',
      });
    }

    // Fetch stop details
    const stop = await DeliveryStop.findById(stopId);
    if (!stop) {
      return res.status(404).json({
        success: false,
        message: 'Stop not found',
      });
    }

    // Find previous route instance
    const previousRoute = await DeliveryRoute.findOne({
      routeId: currentRoute.routeId,
      nextDeliveryDate: { $lt: currentRoute.nextDeliveryDate },
      isDeleted: false,
    }).sort({ nextDeliveryDate: -1 });

    // Determine date range
    let startDate;
    if (previousRoute) {
      startDate = new Date(previousRoute.nextDeliveryDate);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }

    const endDate = new Date(currentRoute.nextDeliveryDate);
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);

    // Helper: Sanitize and escape string for regex (removes extra spaces)
    const sanitizeForRegex = (str) => {
      if (!str) return '';
      return str
        .trim() // Remove leading/trailing spaces
        .replace(/\s+/g, '\\s+') // Replace multiple spaces with regex whitespace pattern
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special regex chars
    };

    // Prepare sanitized patterns
    const sanitizedArea = sanitizeForRegex(stop.area);
    const sanitizedCity = sanitizeForRegex(stop.city);
    const sanitizedAliases = (stop.areaAliases || [])
      .map((alias) => sanitizeForRegex(alias))
      .filter(Boolean);

    // Build area matching conditions (handles all aliases)
    const areaMatchConditions = [
      // Match stop area (with word boundary for partial matches like "MJ Road" in "MJ Road, Saswad")
      {
        'deliveryAddress.raw.area': {
          $regex: new RegExp(`\\b${sanitizedArea}\\b`, 'i'),
        },
      },
      // Match any area alias
      ...sanitizedAliases.map((alias) => ({
        'deliveryAddress.raw.area': {
          $regex: new RegExp(`\\b${alias}\\b`, 'i'),
        },
      })),
      // Fallback: Check formatted address
      {
        'deliveryAddress.formatted': {
          $regex: new RegExp(`\\b${sanitizedArea}\\b`, 'i'),
        },
      },
    ];

    // Build city matching conditions (handles spelling variations)
    const cityMatchConditions = [
      // Exact match
      {
        'deliveryAddress.raw.city': {
          $regex: new RegExp(`^${sanitizedCity}$`, 'i'),
        },
      },
      // Word boundary match for partial/misspelled city names
      {
        'deliveryAddress.raw.city': {
          $regex: new RegExp(`\\b${sanitizedCity}\\b`, 'i'),
        },
      },
    ];

    const excludePartnerAssigned = {
      $nor: [{ 'partnerAssignment.status': { $in: ['assigned', 'accepted'] } }],
    };

    // ROBUST LOCATION QUERY
    const locationQuery = {
      isDeleted: false,

      // PRIORITY 1: Pincode must match exactly (trim spaces from both sides)
      'deliveryAddress.raw.pincode': stop.pincode.toString().trim(),
      // NEW: hide orders already taken by partner
      ...excludePartnerAssigned,

      $or: [
        // Branch 1: Old pending orders (any date, no route assigned)
        {
          status: 'pending',
          // City must match (one of the conditions)
          $or: cityMatchConditions,
          // Area must match (one of the conditions)
          $or: areaMatchConditions,
          // Not assigned to any route
          $or: [{ routeId: null }, { routeId: { $exists: false } }],
        },

        // Branch 2: Recent orders within date range
        {
          orderPlacedDate: { $gte: startDate, $lte: endDate },
          status: { $in: ['pending', 'confirmed'] },
          // City must match
          $or: cityMatchConditions,
          // Area must match
          $or: areaMatchConditions,
          // Not assigned to any route
          $or: [{ routeId: null }, { routeId: { $exists: false } }],
        },
      ],
    };
    const replocationQuery = {
      isDeleted: false,

      // PRIORITY 1: Pincode must match exactly (trim spaces from both sides)
      'deliveryAddress.raw.pincode': stop.pincode.toString().trim(),
      // NEW: hide orders already taken by partner
      ...excludePartnerAssigned,

      $or: [
        // Branch 1: Old pending orders (any date, no route assigned)
        {
          status: 'approved',
          // City must match (one of the conditions)
          $or: cityMatchConditions,
          // Area must match (one of the conditions)
          $or: areaMatchConditions,
          // Not assigned to any route
          $or: [{ routeId: null }, { routeId: { $exists: false } }],
        },

        // Branch 2: Recent orders within date range
        {
          orderPlacedDate: { $gte: startDate, $lte: endDate },
          status: { $in: ['approved', 'confirmed'] },
          // City must match
          $or: cityMatchConditions,
          // Area must match
          $or: areaMatchConditions,
          // Not assigned to any route
          $or: [{ routeId: null }, { routeId: { $exists: false } }],
        },
      ],
    };

    // Fetch orders from all three models
    const [normalOrders, bulkOrders, replacementOrders] = await Promise.all([
      AppOrder.find(locationQuery),
      BulkOrder.find(locationQuery),
      ReplacementRequest.find({
        ...replocationQuery,
        $or: replocationQuery.$or.map((condition) => ({
          ...condition,
          orderPlacedDate:
            condition.orderPlacedDate || condition.requestSubmittedAt,
        })),
      }),
    ]);

    // Fetch user details
    const allOrders = [...normalOrders, ...bulkOrders, ...replacementOrders];
    const userIds = [
      ...new Set(allOrders.map((o) => o.createdBy?.toString()).filter(Boolean)),
    ];

    const users = await User.find({ _id: { $in: userIds } }).select(
      'fullName mobile email role',
    );

    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

    // Format response with order details
    const formattedOrders = [
      ...normalOrders.map((o) => ({
        ...o.toObject(),
        orderType: 'normal',
        createdBy: userMap[o.createdBy?.toString()] || null,
      })),
      ...bulkOrders.map((o) => ({
        ...o.toObject(),
        orderType: 'bulk',
        createdBy: userMap[o.createdBy?.toString()] || null,
      })),
      ...replacementOrders.map((o) => ({
        ...o.toObject(),
        orderId: o.requestId,
        orderType: 'replacement',
        createdBy: userMap[o.createdBy?.toString()] || null,
      })),
    ];

    res.status(200).json({
      success: true,
      data: {
        routeInfo: {
          routeId: currentRoute._id,
          routeName: currentRoute.routeName,
          deliveryDate: currentRoute.nextDeliveryDate,
        },
        stopInfo: {
          stopId: stop._id,
          stopName: stop.stopName,
          area: stop.area,
          city: stop.city,
          pincode: stop.pincode,
          areaAliases: stop.areaAliases,
        },
        dateRange: {
          startDate: startDate,
          endDate: endDate,
          hasPreviousRoute: !!previousRoute,
          previousRouteDate: previousRoute?.nextDeliveryDate || null,
        },
        orders: formattedOrders,
        summary: {
          totalOrders: formattedOrders.length,
          pendingOrders: formattedOrders.filter((o) => o.status === 'pending')
            .length,
          confirmedOrders: formattedOrders.filter(
            (o) => o.status === 'confirmed',
          ).length,
          normalOrders: normalOrders.length,
          bulkOrders: bulkOrders.length,
          replacementOrders: replacementOrders.length,
        },
      },
    });
  } catch (error) {
    console.error('Get available orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available orders',
      error: error.message,
    });
  }
};

/**
 * STEP 3: Assign Selected Orders to Route Stop
 * Assigns specific orders to a stop within a route instance
 */

export const assignOrdersToRouteStop = async (req, res) => {
  const session = await getAdminDB().startSession();

  try {
    session.startTransaction();

    const { routeId, stopId } = req.params;
    const { orderIds } = req.body;
    const adminId = req.user.id;

    // Validation
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'orderIds must be a non-empty array',
      });
    }

    // Fetch route
    const route = await DeliveryRoute.findOne({
      _id: routeId,
      isDeleted: false,
    }).session(session);

    if (!route) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Route not found',
      });
    }

    // Find stop in route
    const stopIndex = route.stops.findIndex(
      (s) => s.stopId.toString() === stopId,
    );

    if (stopIndex === -1) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Stop not found in this route',
      });
    }

    // ✅ Fetch orders from all models WITHOUT populate
    const [normalOrders, bulkOrders, replacementOrders] = await Promise.all([
      AppOrder.find({ _id: { $in: orderIds }, isDeleted: false }).session(
        session,
      ),
      BulkOrder.find({ _id: { $in: orderIds }, isDeleted: false }).session(
        session,
      ),
      ReplacementRequest.find({
        _id: { $in: orderIds },
        isDeleted: false,
      }).session(session),
    ]);

    const allOrders = [
      ...normalOrders.map((o) => ({ order: o, orderType: 'normal' })),
      ...bulkOrders.map((o) => ({ order: o, orderType: 'bulk' })),
      ...replacementOrders.map((o) => ({ order: o, orderType: 'replacement' })),
    ];

    if (allOrders.length === 0) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'No valid orders found',
      });
    }

    // Check if any order is already assigned to a different route
    const alreadyAssignedOrders = allOrders.filter(
      ({ order }) => order.routeId && order.routeId.toString() !== routeId,
    );

    if (alreadyAssignedOrders.length > 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `${alreadyAssignedOrders.length} order(s) are already assigned to different routes`,
        conflictingOrders: alreadyAssignedOrders.map(({ order }) => ({
          orderId: order._id,
          orderNumber: order.orderId || order.requestId,
          assignedRoute: order.routeId,
        })),
      });
    }

    // ✅ Fetch all users (partners) from User model
    const userIds = [
      ...new Set(
        allOrders
          .map(({ order }) => order.createdBy?.toString())
          .filter(Boolean),
      ),
    ];

    const users = await User.find({ _id: { $in: userIds } }).select(
      'fullName mobile email role',
    );

    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

    // Group orders by partner (user)
    const partnerGroups = {};

    for (const { order, orderType } of allOrders) {
      const partnerId = order.createdBy?.toString();

      if (!partnerId) {
        console.warn(`Order ${order._id} has no createdBy, skipping...`);
        continue;
      }

      // ✅ Get partner from User model
      const partner = userMap[partnerId];

      if (!partner) {
        console.warn(
          `Partner ${partnerId} not found in User model, skipping order ${order._id}...`,
        );
        continue;
      }

      if (!partnerGroups[partnerId]) {
        partnerGroups[partnerId] = {
          id: `partner_${partnerId}`,
          partnerId: partner._id,
          partnerName: partner.fullName || 'Unknown Partner',
          partnerType: partner.role || 'retailer',
          phone: partner.mobile || '',
          email: partner.email || '',
          // ✅ Store address info from order
          address: {
            label: order.deliveryAddress?.label || 'Business Address',
            fullAddress:
              order.deliveryAddress?.fullAddress ||
              order.deliveryAddress?.raw?.addressLine ||
              'Address not available',
            raw: order.deliveryAddress?.raw || {},
          },
          orderCount: 0,
          totalAmount: 0,
          orders: [],
        };
      }

      // ✅ Store FULL order details in route
      partnerGroups[partnerId].orders.push({
        id: order._id.toString(),
        orderType: orderType,
        // ✅ Add essential order fields
        orderId: order.orderId || order.requestId,
        orderPlacedAt: order.orderPlacedAt,
        orderPlacedDate: order.orderPlacedDate || order.createdAt,
        status: order.status,
        statusLabel: order.statusLabel || order.status,
        statusColor: order.statusColor || '#FFC107',
        totalAmount: order.totalAmount || 0,
        originalAmount: order.originalAmount || 0,
        currency: order.currency || '₹',
        productCount: order.productCount || order.products?.length || 0,
        products: order.products || [],
        billSummary: order.billSummary || {},
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        deliveryNotes: order.deliveryNotes || '',
        // ✅ Store delivery address with order
        deliveryAddress: order.deliveryAddress,
        // ✅ Store customer info (from User model)
        createdBy: {
          _id: partner._id,
          fullName: partner.fullName,
          mobile: partner.mobile,
          email: partner.email,
          role: partner.role,
        },
        // ✅ For replacement orders
        reason: order.reason,
        reasonDescription: order.reasonDescription,
        images: order.images,
      });

      partnerGroups[partnerId].orderCount += 1;
      partnerGroups[partnerId].totalAmount += order.totalAmount || 0;
    }

    // Update stop in route with new orders
    const stop = route.stops[stopIndex];
    const existingPartners = stop.partners || [];

    // Merge with existing partners
    Object.values(partnerGroups).forEach((newPartner) => {
      const existingPartnerIndex = existingPartners.findIndex(
        (p) => p.partnerId.toString() === newPartner.partnerId.toString(),
      );

      if (existingPartnerIndex >= 0) {
        // Merge orders
        const existing = existingPartners[existingPartnerIndex];
        existing.orders = [...existing.orders, ...newPartner.orders];
        existing.orderCount += newPartner.orderCount;
        existing.totalAmount += newPartner.totalAmount;
      } else {
        existingPartners.push(newPartner);
      }
    });

    route.stops[stopIndex].partners = existingPartners;

    // Recalculate route totals
    route.totalOrders = route.stops.reduce(
      (sum, s) => sum + s.partners.reduce((pSum, p) => pSum + p.orderCount, 0),
      0,
    );
    route.totalAmount = route.stops.reduce(
      (sum, s) => sum + s.partners.reduce((pSum, p) => pSum + p.totalAmount, 0),
      0,
    );
    route.status = 'scheduled'; // Change from draft to scheduled
    route.updatedBy = adminId;
    route.markModified('stops');

    await route.save({ session });

    // Update orders with route assignment
    const updatePromises = allOrders.map(({ order, orderType }) => {
      const OrderModel =
        orderType === 'normal'
          ? AppOrder
          : orderType === 'bulk'
            ? BulkOrder
            : ReplacementRequest;

      return OrderModel.findByIdAndUpdate(
        order._id,
        {
          routeId: route._id,
          stopNumber: stop.stopNumber,
          assignedStop: stopId,
          stopAssignmentStatus: 'assigned',
        },
        { session },
      );
    });

    await Promise.all(updatePromises);

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `Successfully assigned ${allOrders.length} order(s) to route stop`,
      data: {
        route: route,
        assignedOrders: allOrders.length,
        stopNumber: stop.stopNumber,
        routeStatus: route.status,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Assign orders to route stop error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign orders to route stop',
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};


/**
 * STEP 4: Get Route Details with All Assigned Orders
 * Fetches complete route details with all stops and assigned orders
 */
export const getRouteWithOrders = async (req, res) => {
  try {
    const { routeId } = req.params;

    const route = await DeliveryRoute.findOne({
      _id: routeId,
      isDeleted: false,
    }).lean();

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
      });
    }

    // Collect all order IDs from stops
    const normalOrderIds = [];
    const bulkOrderIds = [];
    const replacementOrderIds = [];

    route.stops?.forEach((stop) => {
      stop.partners?.forEach((partner) => {
        partner.orders?.forEach((orderRef) => {
          if (orderRef.orderType === 'normal') normalOrderIds.push(orderRef.id);
          else if (orderRef.orderType === 'bulk')
            bulkOrderIds.push(orderRef.id);
          else if (orderRef.orderType === 'replacement')
            replacementOrderIds.push(orderRef.id);
        });
      });
    });

    // Fetch all orders and users in parallel
    const [normalOrders, bulkOrders, replacementOrders, officer, creator] =
      await Promise.all([
        AppOrder.find({ _id: { $in: normalOrderIds } }),
        BulkOrder.find({ _id: { $in: bulkOrderIds } }),
        ReplacementRequest.find({ _id: { $in: replacementOrderIds } }),
        route.deliveryOfficer
          ? User.findById(route.deliveryOfficer).select(
              'fullName mobile email profileImage role',
            )
          : null,
        route.createdBy
          ? User.findById(route.createdBy).select('fullName email profileImage')
          : null,
      ]);

    // Create order map
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

    // Map officer and creator
    const deliveryOfficerData = officer
      ? {
          _id: officer._id,
          name: officer.fullName || 'Unknown',
          phone: officer.mobile || '',
          email: officer.email || '',
          avatar: officer.profileImage || null,
          role: officer.role || '',
        }
      : null;

    const creatorData = creator
      ? {
          _id: creator._id,
          name: creator.fullName || 'Unknown',
          email: creator.email || '',
          avatar: creator.profileImage || null,
        }
      : null;

    // Extract all stopIds first
    const stopIds = (route.stops || [])
      .map((stop) => stop.stopId)
      .filter(Boolean);

    // Fetch all stops in one query
    const stops = await DeliveryStop.find({
      _id: { $in: stopIds },
    }).lean();

    // Create a map for quick lookup
    const stopMap = Object.fromEntries(
      stops.map((stop) => [stop._id.toString(), stop]),
    );

    // Populate stops with live order data (using helper functions from your original code)
    // Map stops with orders
    const stopsWithOrders = (route.stops || []).map((stop) => {
      const stopDetails = stopMap[stop.stopId.toString()];

      return {
        stopNumber: stop.stopNumber,
        location: stop.location,
        stopId: stop.stopId,
        // Add all stop details
        stopName: stopDetails?.stopName || null,
        area: stopDetails?.area || null,
        city: stopDetails?.city || null,
        pincode: stopDetails?.pincode || null,
        areaAliases: stopDetails?.areaAliases || [],
        partners: (stop.partners || []).map((partner) => ({
          ...partner,
          orders: (partner.orders || [])
            .map((orderRef) => {
              const { order, orderType } = orderMap[orderRef.id] || {};
              if (!order) return null;

              return formatOrderForResponse(order, orderType);
            })
            .filter(Boolean),
        })),
      };
    });

    res.status(200).json({
      success: true,
      data: {
        ...route,
        deliveryOfficer: deliveryOfficerData,
        createdBy: creatorData,
        stops: stopsWithOrders,
      },
    });
  } catch (error) {
    console.error('Get route with orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch route details',
      error: error.message,
    });
  }
};

/**
 * Helper: Format order for response (reusing your logic)
 */
function formatOrderForResponse(order, orderType) {
  if (orderType === 'normal' || orderType === 'bulk') {
    return {
      id: order._id.toString(),
      orderId: order.orderId,
      orderPlacedAt: order.orderPlacedAt,
      orderPlacedDate: order.orderPlacedDate,
      status: order.status,
      statusLabel: order.statusLabel || getStatusLabel(order.status),
      statusColor: order.statusColor || getStatusColor(order.status),
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
    const mappedProducts = (order.replacementItems || []).map((item) => ({
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
    }));

    return {
      id: order._id.toString(),
      orderId: order.requestId || order._id.toString(),
      orderPlacedAt: order.requestSubmittedAt
        ? new Date(order.requestSubmittedAt).toLocaleString('en-IN')
        : '',
      orderPlacedDate: order.requestSubmittedAt,
      status: order.status,
      statusLabel: order.statusLabel || getStatusLabel(order.status),
      statusColor: order.statusColor || getStatusColor(order.status),
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
}

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

/**
 * Remove Orders from Route Stop
 * Allows admin to unassign orders before finalizing route
 */
export const removeOrdersFromRouteStop = async (req, res) => {
  const session = await getAdminDB().startSession();

  try {
    session.startTransaction();

    const { routeId, stopId } = req.params;
    const { orderIds } = req.body;
    const adminId = req.user.id;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'orderIds must be a non-empty array',
      });
    }

    const route = await DeliveryRoute.findOne({
      _id: routeId,
      isDeleted: false,
    }).session(session);

    if (!route) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Route not found',
      });
    }

    const stopIndex = route.stops.findIndex(
      (s) => s.stopId.toString() === stopId,
    );

    if (stopIndex === -1) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Stop not found in route',
      });
    }

    // Remove orders from partners
    const stop = route.stops[stopIndex];
    stop.partners = stop.partners
      .map((partner) => ({
        ...partner,
        orders: partner.orders.filter((o) => !orderIds.includes(o.id)),
      }))
      .map((partner) => {
        // Recalculate partner totals
        const orderCount = partner.orders.length;
        return {
          ...partner,
          orderCount,
        };
      })
      .filter((partner) => partner.orders.length > 0); // Remove empty partners

    route.stops[stopIndex] = stop;

    // Recalculate route totals
    route.totalOrders = route.stops.reduce(
      (sum, s) => sum + s.partners.reduce((pSum, p) => pSum + p.orderCount, 0),
      0,
    );
    route.totalAmount = route.stops.reduce(
      (sum, s) => sum + s.partners.reduce((pSum, p) => pSum + p.totalAmount, 0),
      0,
    );
    route.updatedBy = adminId;
    route.markModified('stops');

    await route.save({ session });

    // Clear route assignment from orders
    await Promise.all([
      AppOrder.updateMany(
        { _id: { $in: orderIds } },
        {
          $unset: {
            routeId: '',
            stopNumber: '',
            assignedStop: '',
            stopAssignmentStatus: 'pending',
          },
        },
        { session },
      ),
      BulkOrder.updateMany(
        { _id: { $in: orderIds } },
        {
          $unset: {
            routeId: '',
            stopNumber: '',
            assignedStop: '',
            stopAssignmentStatus: 'pending',
          },
        },
        { session },
      ),
      ReplacementRequest.updateMany(
        { _id: { $in: orderIds } },
        {
          $unset: {
            routeId: '',
            stopNumber: '',
            assignedStop: '',
            stopAssignmentStatus: 'pending',
          },
        },
        { session },
      ),
    ]);

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `Removed ${orderIds.length} order(s) from route stop`,
      data: route,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Remove orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove orders',
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};
