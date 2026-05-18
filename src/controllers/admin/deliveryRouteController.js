import AppOrder from '../../models/admin/AppOrderModel.js';
import BasicRoute from '../../models/admin/BasicRoutesModel.js';
import BulkOrder from '../../models/admin/BulkOrderModel.js';
import DeliveryRoute from '../../models/admin/deliveryRouteModel.js';
import DeliveryStop from '../../models/admin/deliveryStopsModel.js';
import ReplacementRequest from '../../models/admin/ReplacementOrderModel.js';
import { getOrderModel } from '../../utils/stopMatcher.js';
import { User } from './../../models/app/user.js';
import DeliveryVehicle from './../../models/admin/deliveryVehicleModel.js';


/**
 * Create a new route
 */

// export const createRoute = async (req, res) => {
//   try {
//     const { routeName, area, nextDeliveryDate, estimatedDuration } = req.body;
//     const adminId = req.user.id;

//     // Parse and normalize the date (start of day)
//     const parsedDate = new Date(nextDeliveryDate);
//     const normalizedDate = new Date(
//       parsedDate.getFullYear(),
//       parsedDate.getMonth(),
//       parsedDate.getDate(),
//     );

//     // Check if route with same name, area, and delivery date already exists
//     const existingRoute = await DeliveryRoute.findOne({
//       routeName,
//       area,
//       nextDeliveryDate: {
//         $gte: normalizedDate,
//         $lt: new Date(normalizedDate.getTime() + 24 * 60 * 60 * 1000), // Next day
//       },
//       isDeleted: false,
//     });

//     if (existingRoute) {
//       return res.status(400).json({
//         success: false,
//         message: `A route with name "${routeName}" for area "${area}" already exists for ${normalizedDate.toLocaleDateString(
//           'en-IN',
//           {
//             year: 'numeric',
//             month: 'short',
//             day: '2-digit',
//           },
//         )}`,
//       });
//     }

//     // Create the route
//     const route = await DeliveryRoute.create({
//       routeName,
//       area,
//       nextDeliveryDate: normalizedDate,
//       nextDeliveryDateDisplay: normalizedDate.toLocaleDateString('en-IN', {
//         year: 'numeric',
//         month: 'short',
//         day: '2-digit',
//         timeZone: 'Asia/Kolkata',
//       }),
//       estimatedDuration,
//       status: 'scheduled',
//       stops: [],
//       createdBy: adminId,
//     });

//     res.status(201).json({
//       success: true,
//       message: 'Route created successfully',
//       data: route,
//     });
//   } catch (error) {
//     console.error('Create route error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create route',
//       error: error.message,
//     });
//   }
// };

export const createRoute = async (req, res) => {
  try {
    const { routeId, nextDeliveryDate, estimatedDuration } = req.body;
    const adminId = req.user.id;

    // Validate required fields
    if (!routeId || !nextDeliveryDate) {
      return res.status(400).json({
        success: false,
        message: 'Route ID and Next Delivery Date are required',
      });
    }

    // Find the basic route
    const basicRoute = await BasicRoute.findOne({
      _id: routeId,
      isDeleted: false,
    });

    if (!basicRoute) {
      return res.status(404).json({
        success: false,
        message: 'Basic route not found',
      });
    }

    // Parse and normalize the date (start of day)
    const parsedDate = new Date(nextDeliveryDate);
    const normalizedDate = new Date(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate(),
    );

    // Check if route with same name, area, and delivery date already exists
    const existingRoute = await DeliveryRoute.findOne({
      routeName: basicRoute.routeName,
      area: basicRoute.area,
      nextDeliveryDate: {
        $gte: normalizedDate,
        $lt: new Date(normalizedDate.getTime() + 24 * 60 * 60 * 1000),
      },
      isDeleted: false,
    });

    if (existingRoute) {
      return res.status(400).json({
        success: false,
        message: `A route with name "${basicRoute.routeName}" for area "${basicRoute.area}" already exists for ${normalizedDate.toLocaleDateString(
          'en-IN',
          {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
          },
        )}`,
      });
    }

    // Create the route using data from basic route
    const route = await DeliveryRoute.create({
      routeName: basicRoute.routeName,
      area: basicRoute.area,
      routeId: routeId,
      nextDeliveryDate: normalizedDate,
      nextDeliveryDateDisplay: normalizedDate.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        timeZone: 'Asia/Kolkata',
      }),
      estimatedDuration: estimatedDuration || '3 hours',
      status: 'scheduled',
      stops: [],
      createdBy: adminId,
    });

    res.status(201).json({
      success: true,
      message: 'Route created successfully',
      data: route,
    });
  } catch (error) {
    console.error('Create route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create route',
      error: error.message,
    });
  }
};


export const getAllRoutes = async (req, res) => {
  try {
    const { status } = req.query;

    const query = { isDeleted: false };
    if (status) {
      query.status = status;
    }

    const routes = await DeliveryRoute.find(query).sort({
      nextDeliveryDate: 1,
    });

    if (!routes || routes.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    // Collect unique officer, creator, and order IDs
    const officerIds = [
      ...new Set(
        routes.map((r) => r.deliveryOfficer?.toString()).filter(Boolean),
      ),
    ];
        const vehicleIds = [
          ...new Set(
            routes.map((r) => r.deliveryVehicle?.toString()).filter(Boolean),
          ),
        ];
    const creatorIds = [
      ...new Set(routes.map((r) => r.createdBy?.toString()).filter(Boolean)),
    ];

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
    const [
      officers,
      vehicles,
      creators,
      normalOrders,
      bulkOrders,
      replacementOrders,
    ] = await Promise.all([
      User.find({ _id: { $in: officerIds } }).select(
        'fullName mobile email profileImage role',
      ),
      DeliveryVehicle.find({ _id: { $in: vehicleIds } }).select(
        'vehicleName vehicleNumber',
      ),
      User.find({ _id: { $in: creatorIds } }).select(
        'fullName email profileImage',
      ),
      AppOrder.find({ _id: { $in: normalOrderIds } }),
      BulkOrder.find({ _id: { $in: bulkOrderIds } }),
      ReplacementRequest.find({ _id: { $in: replacementOrderIds } }),
    ]);

    // Build maps
    const officerMap = Object.fromEntries(
      officers.map((o) => [
        o._id.toString(),
        {
          _id: o._id,
          name: o.fullName || 'Unknown',
          phone: o.mobile || '',
          email: o.email || '',
          avatar: o.profileImage || null,
          role: o.role || '',
        },
      ]),
    );

        const vehicleMap = Object.fromEntries(
          vehicles.map((v) => [
            v._id.toString(),
            {
              _id: v._id,
              vehicleName: v.vehicleName || '',
              vehicleNumber: v.vehicleNumber || '',
            },
          ]),
        );

    const creatorMap = Object.fromEntries(
      creators.map((c) => [
        c._id.toString(),
        {
          _id: c._id,
          name: c.fullName || 'Unknown',
          email: c.email || '',
          avatar: c.profileImage || null,
        },
      ]),
    );

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

      routeObj.deliveryOfficer = routeObj.deliveryOfficer
        ? officerMap[routeObj.deliveryOfficer.toString()] || null
        : null;
      
      routeObj.deliveryVehicle = routeObj.deliveryVehicle
        ? vehicleMap[routeObj.deliveryVehicle.toString()] || null
        : null;

      routeObj.createdBy = routeObj.createdBy
        ? creatorMap[routeObj.createdBy.toString()] || null
        : null;

      // Format stops with live order data
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
            })
            .filter(Boolean),
        })),
      }));

      return routeObj;
    });

    // Sort by createdAt (latest first)
    finalData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      count: finalData.length,
      data: finalData,
    });
  } catch (error) {
    console.error('getAllRoutes error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get route by ID
 */
export const getRouteById = async (req, res) => {
  try {
    const { routeId } = req.params;

    const route = await DeliveryRoute.findOne({
      _id: routeId,
      isDeleted: false,
    })
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

/**
 * Add stop to route
 */

export const addStopToRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { stopId, stopNumber } = req.body;
    const adminId = req.user.id;

    const route = await DeliveryRoute.findOne({
      _id: routeId,
      isDeleted: false,
    });
    const stop = await DeliveryStop.findOne({ _id: stopId, isDeleted: false });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
      });
    }

    if (!stop) {
      return res.status(404).json({
        success: false,
        message: 'Stop not found',
      });
    }

    // Get all orders for this stop (without populate)
    const [normalOrders, bulkOrders, replacementOrders] = await Promise.all([
      AppOrder.find({ assignedStop: stopId, isDeleted: false }),
      BulkOrder.find({ assignedStop: stopId, isDeleted: false }),
      ReplacementRequest.find({
        assignedStop: stopId,
        isDeleted: false,
      }),
    ]);

    const allOrders = [
      ...normalOrders.map((o) => ({ order: o, orderType: 'normal' })),
      ...bulkOrders.map((o) => ({ order: o, orderType: 'bulk' })),
      ...replacementOrders.map((o) => ({ order: o, orderType: 'replacement' })),
    ];

    if (allOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No orders found for this stop',
      });
    }

    // Collect all unique user IDs
    const allUserIds = [
      ...normalOrders.map((o) => o.createdBy),
      ...bulkOrders.map((o) => o.createdBy),
      ...replacementOrders.map((o) => o.createdBy),
    ].filter(Boolean);

    // Fetch users from correct DB (User model)
    const users = await User.find({ _id: { $in: allUserIds } }).select(
      'fullName mobile email role',
    );
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

    // Group orders by partner
    const partnerGroups = {};

    for (const { order, orderType } of allOrders) {
      const partner = userMap[order.createdBy?.toString()];
      if (!partner) continue; // Skip if user not found

      const partnerId = partner._id.toString();

      if (!partnerGroups[partnerId]) {
        partnerGroups[partnerId] = {
          id: `partner_${partnerId}`,
          partnerId: partner._id,
          partnerName: partner.fullName || 'Unknown Partner',
          partnerType: partner.role || 'Retailer',
          phone: partner.mobile || '',
          email: partner.email || '',
          address: order.deliveryAddress?.raw?.addressLine || '',
          fullAddress: order.deliveryAddress?.fullAddress || '',
          orderCount: 0,
          totalAmount: 0,
          orders: [],
        };
      }

      // Store only order reference
      partnerGroups[partnerId].orders.push({
        id: order._id.toString(),
        orderType: orderType,
      });
      partnerGroups[partnerId].orderCount += 1;
      partnerGroups[partnerId].totalAmount += order.totalAmount || 0;
    }

    // Create new stop
    const newStop = {
      stopNumber: stopNumber || route.stops.length + 1,
      location: `${stop.area}, ${stop.city}`,
      stopId: stop._id,
      partners: Object.values(partnerGroups),
    };

    // Add or update stop
    const stops = route.stops || [];
    const existingStopIndex = stops.findIndex(
      (s) => s.stopNumber === newStop.stopNumber,
    );

    if (existingStopIndex >= 0) {
      stops[existingStopIndex] = newStop;
    } else {
      stops.push(newStop);
    }

    // Sort stops by number
    stops.sort((a, b) => a.stopNumber - b.stopNumber);

    // Update route totals
    route.stops = stops;
    route.totalStops = stops.length;
    route.totalOrders = stops.reduce(
      (sum, s) => sum + s.partners.reduce((pSum, p) => pSum + p.orderCount, 0),
      0,
    );
    route.totalAmount = stops.reduce(
      (sum, s) => sum + s.partners.reduce((pSum, p) => pSum + p.totalAmount, 0),
      0,
    );
    route.updatedBy = adminId;
    route.markModified('stops');

    await route.save();

    // Update route info inside all orders
    const updatePromises = allOrders.map(({ order, orderType }) => {
      const OrderModel = getOrderModel(orderType);
      return OrderModel.findByIdAndUpdate(order._id, {
        routeId: route._id,
        stopNumber: newStop.stopNumber,
      });
    });

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: `Stop added to route with ${allOrders.length} order(s)`,
      data: route,
    });
  } catch (error) {
    console.error('Add stop to route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add stop to route',
      error: error.message,
    });
  }
};

/**
 * Remove stop from route
 */
export const removeStopFromRoute = async (req, res) => {
  try {
    const { routeId, stopNumber } = req.params;
    const adminId = req.user.id;

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

    const stops = route.stops || [];
    const stopIndex = stops.findIndex(
      (s) => s.stopNumber === parseInt(stopNumber),
    );

    if (stopIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Stop not found in route',
      });
    }

    // Get all order IDs from this stop
    const orderIds = [];
    stops[stopIndex].partners.forEach((partner) => {
      partner.orders.forEach((order) => {
        orderIds.push(order.id);
      });
    });

    // Remove stop
    stops.splice(stopIndex, 1);

    // Renumber remaining stops
    stops.forEach((stop, index) => {
      stop.stopNumber = index + 1;
    });

    // Update route
    route.stops = stops;
    route.totalStops = stops.length;
    route.totalOrders = stops.reduce(
      (sum, s) => sum + s.partners.reduce((pSum, p) => pSum + p.orderCount, 0),
      0,
    );
    route.totalAmount = stops.reduce(
      (sum, s) => sum + s.partners.reduce((pSum, p) => pSum + p.totalAmount, 0),
      0,
    );
    route.updatedBy = adminId;
    route.markModified('stops');

    await route.save();

    // Clear route reference from orders
    await Promise.all([
      AppOrder.updateMany(
        { _id: { $in: orderIds } },
        { $unset: { routeId: '', stopNumber: '' } },
      ),
      BulkOrder.updateMany(
        { _id: { $in: orderIds } },
        { $unset: { routeId: '', stopNumber: '' } },
      ),
      ReplacementRequest.updateMany(
        { _id: { $in: orderIds } },
        { $unset: { routeId: '', stopNumber: '' } },
      ),
    ]);

    res.status(200).json({
      success: true,
      message: 'Stop removed from route',
      data: route,
    });
  } catch (error) {
    console.error('Remove stop from route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove stop from route',
      error: error.message,
    });
  }
};

/**
 * Assign driver to route
 */
export const assignDriverToRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { driverId } = req.body;
    const adminId = req.user.id;

    // Find the target route
    const targetRoute = await DeliveryRoute.findOne({
      _id: routeId,
      isDeleted: false,
    });

    if (!targetRoute) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
      });
    }

    // Normalize the delivery date (start of day)
    const deliveryDate = new Date(targetRoute.nextDeliveryDate);
    const normalizedDate = new Date(
      deliveryDate.getFullYear(),
      deliveryDate.getMonth(),
      deliveryDate.getDate(),
    );

    // Check if driver is already assigned to another route on the same date
    const existingAssignment = await DeliveryRoute.findOne({
      _id: { $ne: routeId }, // Exclude current route
      deliveryOfficer: driverId,
      nextDeliveryDate: {
        $gte: normalizedDate,
        $lt: new Date(normalizedDate.getTime() + 24 * 60 * 60 * 1000),
      },
      isDeleted: false,
    });

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: `Driver is already assigned to route "${existingAssignment.routeName}" for ${normalizedDate.toLocaleDateString(
          'en-IN',
          {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
          },
        )}. A driver cannot be assigned to multiple routes on the same delivery date.`,
      });
    }

    // Assign driver to route
    const route = await DeliveryRoute.findOneAndUpdate(
      { _id: routeId, isDeleted: false },
      {
        deliveryOfficer: driverId,
        // status: 'active',
        updatedBy: adminId,
      },
      { new: true },
    ).populate('deliveryOfficer', 'fullName mobile email profileImage role');

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Driver assigned to route successfully',
      data: route,
    });
  } catch (error) {
    console.error('Assign driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign driver',
      error: error.message,
    });
  }
};

/**
 * Assign vehicle to route
 */
export const assignVehicleToRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { vehicleId } = req.body;
    const adminId = req.user.id;

    // Find the target route
    const targetRoute = await DeliveryRoute.findOne({
      _id: routeId,
      isDeleted: false,
    });

    if (!targetRoute) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
      });
    }

    // Normalize the delivery date (start of day)
    const deliveryDate = new Date(targetRoute.nextDeliveryDate);
    const normalizedDate = new Date(
      deliveryDate.getFullYear(),
      deliveryDate.getMonth(),
      deliveryDate.getDate(),
    );

    // Check if vehicle is already assigned to another route on the same date
    const existingAssignment = await DeliveryRoute.findOne({
      _id: { $ne: routeId }, // Exclude current route
      deliveryVehicle: vehicleId,
      nextDeliveryDate: {
        $gte: normalizedDate,
        $lt: new Date(normalizedDate.getTime() + 24 * 60 * 60 * 1000),
      },
      isDeleted: false,
    });

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: `Vehicle is already assigned to route "${existingAssignment.routeName}" for ${normalizedDate.toLocaleDateString(
          'en-IN',
          {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
          },
        )}. A vehicle cannot be assigned to multiple routes on the same delivery date.`,
      });
    }

    // Assign vehicle to route
    const route = await DeliveryRoute.findOneAndUpdate(
      { _id: routeId, isDeleted: false },
      {
        deliveryVehicle: vehicleId,
        updatedBy: adminId,
      },
      { new: true },
    )
      .populate('deliveryVehicle', 'vehicleNumber vehicleName')
      .populate('deliveryOfficer', 'fullName mobile email profileImage role');

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle assigned to route successfully',
      data: route,
    });
  } catch (error) {
    console.error('Assign vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign vehicle',
      error: error.message,
    });
  }
};

/**
 * Get route for driver (complete route with all details)
 */

export const getRouteForDriver = async (req, res) => {
  try {
    const { routeId } = req.params;

    // Fetch route from DeliveryRoute (no populate)
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

    // 🔹 Manually fetch delivery officer from User DB
    let deliveryOfficerData = null;
    if (route.deliveryOfficer) {
      const officer = await User.findById(route.deliveryOfficer).select(
        'fullName mobile email profileImage role',
      );

      if (officer) {
        deliveryOfficerData = {
          _id: officer._id,
          name: officer.fullName || 'Unknown',
          phone: officer.mobile || '',
          email: officer.email || '',
          avatar: officer.profileImage || null,
          role: officer.role || 'delivery_officer',
        };
      }
    }

    // 🔹 Attach mapped delivery officer details to route
    const responseData = {
      ...route,
      deliveryOfficer: deliveryOfficerData,
    };

    return res.status(200).json({
      success: true,
      data: responseData,
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







/**
 * Update route
 */
export const updateRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const updateData = req.body;
    const adminId = req.user.id;

    // Don't allow updating stops directly through this endpoint
    delete updateData.stops;

    if (updateData.nextDeliveryDate) {
      updateData.nextDeliveryDateDisplay = new Date(
        updateData.nextDeliveryDate,
      ).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        timeZone: 'Asia/Kolkata',
      });
    }

    const route = await DeliveryRoute.findOneAndUpdate(
      { _id: routeId, isDeleted: false },
      {
        ...updateData,
        updatedBy: adminId,
      },
      { new: true },
    ).populate('deliveryOfficer', 'name phone email avatar');

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Route updated successfully',
      data: route,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update route',
      error: error.message,
    });
  }
};

/**
 * Delete route (soft delete)
 */
// export const deleteRoute = async (req, res) => {
//   try {
//     const { routeId } = req.params;
//     const adminId = req.user.id;

//     const route = await DeliveryRoute.findOneAndUpdate(
//       { _id: routeId, isDeleted: false },
//       {
//         isDeleted: true,
//         deletedAt: new Date(),
//         updatedBy: adminId,
//       },
//       { new: true },
//     );

//     if (!route) {
//       return res.status(404).json({
//         success: false,
//         message: 'Route not found',
//       });
//     }

//     // Clear route reference from all orders in this route
//     const orderIds = [];
//     route.stops.forEach((stop) => {
//       stop.partners.forEach((partner) => {
//         partner.orders.forEach((order) => {
//           orderIds.push(order.id);
//         });
//       });
//     });

//     await Promise.all([
//       AppOrder.updateMany(
//         { _id: { $in: orderIds } },
//         { $unset: { routeId: '', stopNumber: '' } },
//       ),
//       BulkOrder.updateMany(
//         { _id: { $in: orderIds } },
//         { $unset: { routeId: '', stopNumber: '' } },
//       ),
//       ReplacementRequest.updateMany(
//         { _id: { $in: orderIds } },
//         { $unset: { routeId: '', stopNumber: '' } },
//       ),
//     ]);

//     res.status(200).json({
//       success: true,
//       message: 'Route deleted successfully',
//       data: route,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Failed to delete route',
//       error: error.message,
//     });
//   }
// };

// Helper functions
export const deleteRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const adminId = req.user.id;

    // Fetch route first (so we can clear order refs)
    const route = await DeliveryRoute.findById(routeId);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
      });
    }

    // ✅ CHECK: Only allow deletion of draft or scheduled routes
    if (route.status !== 'draft' && route.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: `Cannot delete ${route.status} route. Only draft or scheduled routes can be deleted.`,
      });
    }

    // Collect order IDs to clear route references
    const orderIds = [];
    route.stops?.forEach((stop) => {
      stop.partners?.forEach((partner) => {
        partner.orders?.forEach((order) => {
          orderIds.push(order.id);
        });
      });
    });

    // Clear route references in orders
    await Promise.all([
      AppOrder.updateMany(
        { _id: { $in: orderIds } },
        { $unset: { routeId: '', stopNumber: '' } },
      ),
      BulkOrder.updateMany(
        { _id: { $in: orderIds } },
        { $unset: { routeId: '', stopNumber: '' } },
      ),
      ReplacementRequest.updateMany(
        { _id: { $in: orderIds } },
        { $unset: { routeId: '', stopNumber: '' } },
      ),
    ]);

    // ❌ HARD DELETE ROUTE
    await DeliveryRoute.findByIdAndDelete(routeId);

    return res.status(200).json({
      success: true,
      message: 'Route permanently deleted',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete route',
      error: error.message,
    });
  }
};



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
