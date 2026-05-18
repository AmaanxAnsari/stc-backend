import AppOrder from '../../models/admin/AppOrderModel.js';
import BulkOrder from '../../models/admin/BulkOrderModel.js';
import DeliveryStop from '../../models/admin/deliveryStopsModel.js';
import ReplacementRequest from '../../models/admin/ReplacementOrderModel.js';
import { User } from '../../models/app/user.js';
import { findOrdersMatchingStop, getOrderModel } from '../../utils/stopMatcher.js';

/**
 * Create a new stop
 */
export const createStop = async (req, res) => {
  try {
    const { stopName, area, city, pincode, areaAliases, coordinates } =
      req.body;
    const adminId = req.user.id;

    // Check if stop already exists
    const existingStop = await DeliveryStop.findOne({
      area: { $regex: new RegExp(`^${area}$`, 'i') },
      city: { $regex: new RegExp(`^${city}$`, 'i') },
      isDeleted: false,
    });

    if (existingStop) {
      return res.status(400).json({
        success: false,
        message: 'Stop with this area and city already exists',
        data: existingStop,
      });
    }

    // Create new stop
    const stop = await DeliveryStop.create({
      stopName,
      area,
      city,
      pincode,
      areaAliases: areaAliases || [],
      coordinates,
      createdBy: adminId,
    });

    // Find and auto-assign all pending orders that match this stop
    const matchingOrders = await findOrdersMatchingStop(stop);

    let assignedCount = 0;
    for (const { order, orderType } of matchingOrders) {
      const OrderModel = getOrderModel(orderType);
      await OrderModel.findByIdAndUpdate(order._id, {
        assignedStop: stop._id,
        stopAssignmentStatus: 'auto_assigned',
      });
      assignedCount++;
    }

    res.status(201).json({
      success: true,
      message: `Stop created successfully. ${assignedCount} pending order(s) auto-assigned.`,
      data: {
        stop,
        assignedOrdersCount: assignedCount,
      },
    });
  } catch (error) {
    console.error('Create stop error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create stop',
      error: error.message,
    });
  }
};

/**
 * Get all stops
 */
export const getAllStops = async (req, res) => {
  try {
    const stops = await DeliveryStop.find({ isDeleted: false }).sort({
      createdAt: -1,
    }); // ⬅ Sort by latest

    res.status(200).json({
      success: true,
      message: 'Stops fetched successfully',
      data: stops,
    });
  } catch (error) {
    console.error('Get stops error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stops',
      error: error.message,
    });
  }
};


/**
 * Get stop by ID
 */
export const getStopById = async (req, res) => {
  try {
    const { stopId } = req.params;

    const stop = await DeliveryStop.findOne({ _id: stopId, isDeleted: false });

    if (!stop) {
      return res.status(404).json({
        success: false,
        message: 'Stop not found',
      });
    }

    res.status(200).json({
      success: true,
      data: stop,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Update stop
 */
export const updateStop = async (req, res) => {
  try {
    const { stopId } = req.params;
    const updateData = req.body;
    const adminId = req.user.id;

    const stop = await DeliveryStop.findOneAndUpdate(
      { _id: stopId, isDeleted: false },
      {
        ...updateData,
        updatedBy: adminId,
      },
      { new: true },
    );

    if (!stop) {
      return res.status(404).json({
        success: false,
        message: 'Stop not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Stop updated successfully',
      data: stop,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update stop',
      error: error.message,
    });
  }
};

/**
 * Delete stop (soft delete)
 */
export const deleteStop = async (req, res) => {
  try {
    const { stopId } = req.params;

    // Hard delete: Permanently remove the stop
    const result = await DeliveryStop.deleteOne({ _id: stopId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stop not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Stop deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete stop',
      error: error.message,
    });
  }
};


export const getOrdersByStop = async (req, res) => {
  try {
    const { stopId } = req.params;

    const stop = await DeliveryStop.findOne({ _id: stopId, isDeleted: false });

    if (!stop) {
      return res.status(404).json({
        success: false,
        message: 'Stop not found',
      });
    }

    const [normalOrders, bulkOrders, replacementOrders] = await Promise.all([
      AppOrder.find({ assignedStop: stopId, isDeleted: false }),
      BulkOrder.find({ assignedStop: stopId, isDeleted: false }),
      ReplacementRequest.find({
        assignedStop: stopId,
        isDeleted: false,
      }).populate('orderId'),
    ]);

    // Get unique user IDs from all orders
    const userIds = new Set();
    [...normalOrders, ...bulkOrders, ...replacementOrders].forEach((order) => {
      if (order.createdBy) {
        userIds.add(order.createdBy.toString());
      }
    });

    // Fetch all users at once
    const users = await User.find(
      { _id: { $in: Array.from(userIds) } },
      'fullName mobile email role',
    ).lean();

    // Create user map for quick lookup
    const userMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {});

    // Map orders with user details
    const allOrders = [
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
        orderType: 'replacement',
        createdBy: userMap[o.createdBy?.toString()] || null,
      })),
    ];

    res.status(200).json({
      success: true,
      stop: stop,
      orderCount: allOrders.length,
      data: allOrders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Manually assign multiple orders to stop (Batch Assignment)
 */
export const batchAssignOrdersToStop = async (req, res) => {
  try {
    const { orderIds, stopId } = req.body;
    const adminId = req.user.id;

    // Validate input
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'orderIds must be a non-empty array',
      });
    }

    if (!stopId) {
      return res.status(400).json({
        success: false,
        message: 'stopId is required',
      });
    }

    // Verify stop exists
    const stop = await DeliveryStop.findOne({ _id: stopId, isDeleted: false });
    if (!stop) {
      return res.status(404).json({
        success: false,
        message: 'Stop not found',
      });
    }

    // Search for orders across all three models
    const [normalOrders, bulkOrders, replacementOrders] = await Promise.all([
      AppOrder.find({ _id: { $in: orderIds }, isDeleted: false }),
      BulkOrder.find({ _id: { $in: orderIds }, isDeleted: false }),
      ReplacementRequest.find({ _id: { $in: orderIds }, isDeleted: false }),
    ]);

    // Build results array with order type detection
    const foundOrders = [
      ...normalOrders.map(o => ({ order: o, orderType: 'normal', model: AppOrder })),
      ...bulkOrders.map(o => ({ order: o, orderType: 'bulk', model: BulkOrder })),
      ...replacementOrders.map(o => ({ order: o, orderType: 'replacement', model: ReplacementRequest })),
    ];

    if (foundOrders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid orders found for the provided IDs',
      });
    }

    // Update all found orders in parallel
    const updatePromises = foundOrders.map(({ order, orderType, model }) =>
      model.findByIdAndUpdate(
        order._id,
        {
          assignedStop: stopId,
          stopAssignmentStatus: 'manually_assigned',
          updatedBy: adminId,
          updatedAt: new Date(),
        },
        { new: true }
      )
    );

    const updatedOrders = await Promise.all(updatePromises);

    // Prepare response with order type info
    const assignedOrdersDetails = updatedOrders.map((order, index) => ({
      orderId: order._id,
      orderNumber: order.orderId || order.requestId,
      orderType: foundOrders[index].orderType,
      assignedStop: stopId,
      status: 'assigned',
    }));

    // Count by type
    const summary = {
      total: foundOrders.length,
      normal: foundOrders.filter(o => o.orderType === 'normal').length,
      bulk: foundOrders.filter(o => o.orderType === 'bulk').length,
      replacement: foundOrders.filter(o => o.orderType === 'replacement').length,
      notFound: orderIds.length - foundOrders.length,
    };

    res.status(200).json({
      success: true,
      message: `Successfully assigned ${foundOrders.length} order(s) to stop`,
      summary,
      data: assignedOrdersDetails,
    });
  } catch (error) {
    console.error('Batch assign orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign orders to stop',
      error: error.message,
    });
  }
};

/**
 * Manually assign single order to stop (Legacy - kept for backward compatibility)
 */
export const manuallyAssignOrderToStop = async (req, res) => {
  try {
    const { orderId, orderType, stopId } = req.body;
    const adminId = req.user.id;

    const stop = await DeliveryStop.findOne({ _id: stopId, isDeleted: false });

    if (!stop) {
      return res.status(404).json({
        success: false,
        message: 'Stop not found',
      });
    }

    const OrderModel = getOrderModel(orderType);

    const order = await OrderModel.findByIdAndUpdate(
      orderId,
      {
        assignedStop: stopId,
        stopAssignmentStatus: 'manually_assigned',
        updatedBy: adminId,
      },
      { new: true },
    ).populate('assignedStop');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order manually assigned to stop',
      data: order,
    });
  } catch (error) {
    console.error('Assign order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign order',
      error: error.message,
    });
  }
};

/**
 * Get unassigned orders (pending assignment)
 */

export const getUnassignedOrders = async (req, res) => {
  try {
    // Query for orders that are:
    // 1. Not deleted
    // 2. Status is 'pending'
    // 3. Not assigned to any stop (assignedStop is null)
    const query = {
      status: 'pending',
      assignedStop: null,
      isDeleted: false,
    };
    const replquery = {
      status: 'approved',
      assignedStop: null,
      isDeleted: false,
    };


    const [normalOrders, bulkOrders, replacementOrders] = await Promise.all([
      AppOrder.find(query),
      BulkOrder.find(query),
      ReplacementRequest.find(replquery),
    ]);

    // Get unique user IDs from all orders
    const userIds = new Set();
    [...normalOrders, ...bulkOrders, ...replacementOrders].forEach((order) => {
      if (order.createdBy) {
        userIds.add(order.createdBy.toString());
      }
    });

    // Fetch all users at once
    const users = await User.find(
      { _id: { $in: Array.from(userIds) } },
      'fullName mobile email role',
    ).lean();

    // Create user map for quick lookup
    const userMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {});

    // Map orders with user details and orderType
    const unassignedOrders = [
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
        orderType: 'replacement',
        createdBy: userMap[o.createdBy?.toString()] || null,
      })),
    ];

    // Group by unique location (city + area + pincode)
    const groupedByLocation = unassignedOrders.reduce((acc, order) => {
      const raw = order.deliveryAddress?.raw;
      const key = `${raw?.city || 'unknown'}_${raw?.area || 'unknown'}_${raw?.pincode || 'unknown'}`;

      if (!acc[key]) {
        acc[key] = {
          location: {
            city: raw?.city,
            area: raw?.area,
            pincode: raw?.pincode,
          },
          orderCount: 0,
          orders: [],
        };
      }

      acc[key].orders.push(order);
      acc[key].orderCount++;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      totalUnassigned: unassignedOrders.length,
      data: {
        allOrders: unassignedOrders,
        groupedByLocation: Object.values(groupedByLocation),
      },
    });
  } catch (error) {
    console.error('Get unassigned orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unassigned orders',
      error: error.message,
    });
  }
};
