import DeliveryStop from '../models/admin/deliveryStopsModel.js';
import AppOrder from '../models/admin/AppOrderModel.js';
import ReplacementRequest from '../models/admin/ReplacementOrderModel.js';
import BulkOrder from '../models/admin/BulkOrderModel.js';


/**
 * Finds a matching stop based on delivery address
 * Priority: Pincode + City > Area + City > City only
 */
export const findMatchingStop = async (deliveryAddress) => {
  if (!deliveryAddress || !deliveryAddress.raw) return null;

  const { area, city, pincode } = deliveryAddress.raw;

  if (!city) return null;

  try {
    // Priority 1: Exact match (pincode + city)
    if (pincode) {
      const stopByPincode = await DeliveryStop.findOne({
        pincode: pincode.trim(),
        city: { $regex: new RegExp(`^${city.trim()}$`, 'i') },
        isActive: true,
        isDeleted: false,
      });

      if (stopByPincode) {
        return { stop: stopByPincode, matchType: 'pincode_city' };
      }
    }

    // Priority 2: Area + City match (case insensitive)
    if (area) {
      const stopByArea = await DeliveryStop.findOne({
        $or: [
          {
            area: { $regex: new RegExp(`^${area.trim()}$`, 'i') },
            city: { $regex: new RegExp(`^${city.trim()}$`, 'i') },
          },
          {
            areaAliases: { $in: [new RegExp(`^${area.trim()}$`, 'i')] },
            city: { $regex: new RegExp(`^${city.trim()}$`, 'i') },
          },
        ],
        isActive: true,
        isDeleted: false,
      });

      if (stopByArea) {
        return { stop: stopByArea, matchType: 'area_city' };
      }
    }

    // No match found
    return null;
  } catch (error) {
    console.error('Error finding matching stop:', error);
    return null;
  }
};

/**
 * Auto-assign order to a stop if match is found
 */
export const autoAssignOrderToStop = async (
  orderId,
  orderType,
  deliveryAddress,
) => {
  try {
    const matchResult = await findMatchingStop(deliveryAddress);

    if (matchResult) {
      const OrderModel = getOrderModel(orderType);

      await OrderModel.findByIdAndUpdate(orderId, {
        assignedStop: matchResult.stop._id,
        stopAssignmentStatus: 'auto_assigned',
      });

      return {
        success: true,
        stop: matchResult.stop,
        matchType: matchResult.matchType,
      };
    }

    // No match - order stays pending
    await getOrderModel(orderType).findByIdAndUpdate(orderId, {
      assignedStop: null,
      stopAssignmentStatus: 'pending',
    });

    return null;
  } catch (error) {
    console.error('Auto-assignment error:', error);
    return null;
  }
};

/**
 * Get the correct order model based on type
 */
export const getOrderModel = (orderType) => {
  if (orderType === 'normal') return AppOrder;
  if (orderType === 'bulk') return BulkOrder;
  if (orderType === 'replacement') return ReplacementRequest;
  throw new Error('Invalid order type');
};

/**
 * Find all pending orders that match a stop
 */
export const findOrdersMatchingStop = async (stop) => {
  const query = {
    $or: [],
    isDeleted: false,
    $or: [{ assignedStop: null }, { stopAssignmentStatus: 'pending' }],
  };

  const matchConditions = [];

  // Match by pincode + city
  if (stop.pincode) {
    matchConditions.push({
      'deliveryAddress.raw.pincode': stop.pincode,
      'deliveryAddress.raw.city': { $regex: new RegExp(`^${stop.city}$`, 'i') },
    });
  }

  // Match by area + city
  if (stop.area) {
    matchConditions.push({
      'deliveryAddress.raw.area': { $regex: new RegExp(`^${stop.area}$`, 'i') },
      'deliveryAddress.raw.city': { $regex: new RegExp(`^${stop.city}$`, 'i') },
    });
  }

  // Match by area aliases
  if (stop.areaAliases && stop.areaAliases.length > 0) {
    matchConditions.push({
      'deliveryAddress.raw.area': {
        $in: stop.areaAliases.map((alias) => new RegExp(`^${alias}$`, 'i')),
      },
      'deliveryAddress.raw.city': { $regex: new RegExp(`^${stop.city}$`, 'i') },
    });
  }

  if (matchConditions.length === 0) return [];

  query.$or = matchConditions;

  try {
    const [normalOrders, bulkOrders, replacementOrders] = await Promise.all([
      AppOrder.find(query),
      BulkOrder.find(query),
      ReplacementRequest.find(query),
    ]);

    return [
      ...normalOrders.map((o) => ({ order: o, orderType: 'normal' })),
      ...bulkOrders.map((o) => ({ order: o, orderType: 'bulk' })),
      ...replacementOrders.map((o) => ({ order: o, orderType: 'replacement' })),
    ];
  } catch (error) {
    console.error('Error finding matching orders:', error);
    return [];
  }
};
