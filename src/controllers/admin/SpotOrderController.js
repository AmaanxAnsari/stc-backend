import { generateUniqueOrderId } from '../../helper/orderIdHelper.js';
import AppOrder from '../../models/admin/AppOrderModel.js';
import BulkOrder from '../../models/admin/BulkOrderModel.js';
import InVanInventory from '../../models/admin/InVanInventoryModel.js';
import SpotOrder from '../../models/admin/SpotOrderModel.js';
import SpotOrderCart from '../../models/app/SpotOrderCartModel.js';
import { createRepository } from '../../utils/repository.js';

const spotOrderRepo = createRepository(SpotOrder, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});

const getCODOrderModel = (orderType) => {
  switch (orderType) {
    case 'normal':
      return AppOrder;
    case 'bulk':
      return BulkOrder;
    case 'on_spot':
      return SpotOrder;
    default:
      throw new Error('Invalid orderType');
  }
};

// // Create spot order from cart
export const createSpotOrder = async (req, res) => {
  try {
    const driverId = req.user?.id;
    const driverName = req.user?.fullName || req.user?.name;
    const driverPhone =
      req.user?.mobile || req.user?.mobileNumber || req.user?.phone;

    if (!driverId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      vehicleId,
      customerDetails,
      paymentDetails,
      orderLocation,
      orderNotes,
      inventorySource = 'van_stock',
    } = req.body;

    // Validate required fields
    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'vehicleId is required',
      });
    }

    if (
      !customerDetails ||
      !customerDetails.name ||
      !customerDetails.phone ||
      !customerDetails.address
    ) {
      return res.status(400).json({
        success: false,
        message: 'Customer details (name, phone, address) are required',
      });
    }

    if (!paymentDetails || !paymentDetails.method) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required',
      });
    }

    // Fetch cart
    const cart = await SpotOrderCart.findOne({
      driverId,
      vehicleId,
      isActive: true,
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty',
      });
    }

    const orderProducts = [];
    let itemTotal = 0;
    let productCount = 0;

    // Validate stock and prepare order products
    for (const item of cart.items) {
      const inventory = await InVanInventory.findById(item.inventoryId);

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: `Inventory not found for ${item.name}`,
        });
      }

      const variant = inventory.variants[item.variantIndex];
      if (!variant) {
        return res.status(404).json({
          success: false,
          message: `Variant not found for ${item.name}`,
        });
      }

      // Check if reserved stock matches cart quantity
      if (variant.reserved < item.cartQuantity) {
        return res.status(400).json({
          success: false,
          message: `Stock reservation mismatch for ${item.name}`,
        });
      }

      itemTotal += item.price * item.cartQuantity;
      productCount += item.cartQuantity;

      orderProducts.push({
        cartItemId: item.cartItemId,
        inventoryId: inventory._id,
        productId: item.productId,
        variantIndex: item.variantIndex,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        originalPrice: item.originalPrice,
        image: item.image,
        orderQuantity: item.cartQuantity,
        category: item.category,
      });
    }

    const totalAmount = itemTotal;

    // Generate order ID
    const orderId = await generateUniqueOrderId(SpotOrder, 'SPOT');

    // Current timestamp
    const now = new Date();
    const formattedDateTime = now.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });

    // Create spot order
    const newOrder = new SpotOrder({
      orderId,
      orderType: 'on_spot',
      status: 'delivered',
      statusLabel: 'Order Delivered',
      statusColor: '#4CAF50',
      orderPlacedAt: formattedDateTime,
      orderPlacedDate: now,
      deliveredAt: formattedDateTime,
      deliveredDate: now,
      totalAmount,
      currency: '₹',
      productCount,
      products: orderProducts,
      customerDetails: {
        name: customerDetails.name,
        phone: customerDetails.phone,
        address: customerDetails.address,
        customerType: customerDetails.customerType || 'Retailer',
        newCustomer: customerDetails.newCustomer !== false,
      },
      paymentDetails: {
        method: paymentDetails.method,
        status: paymentDetails.status || 'Paid',
        amount: totalAmount,
        transactionId: paymentDetails.transactionId || null,
        chequeNumber: paymentDetails.chequeNumber || null,
        paidAt: now,
      },
      billSummary: {
        itemTotal: totalAmount,
        totalAmount,
      },
      deliveryOfficer: {
        id: driverId,
        name: driverName,
        phone: driverPhone || '',
      },
      orderLocation: orderLocation || {},
      inventorySource,
      vehicleId,
      driverId,
      orderNotes: orderNotes || '',
    });

    // Update inventory: move reserved to sold, decrement onHand
    for (const item of cart.items) {
      const inventory = await InVanInventory.findById(item.inventoryId);
      if (inventory) {
        const variant = inventory.variants[item.variantIndex];
        if (variant) {
          variant.reserved -= item.cartQuantity;
          variant.sold += item.cartQuantity;
          await inventory.save();
        }
      }
    }

    await newOrder.save();

    // // Clear cart and mark as inactive
    // cart.items = [];
    // cart.isActive = false;
    // await cart.save();
    // Remove the cart entirely after order creation
    await SpotOrderCart.findByIdAndDelete(cart._id);

    return res.status(201).json({
      success: true,
      message: 'Spot order created successfully',
      order: newOrder,
    });
  } catch (error) {
    console.error('Create spot order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create spot order',
      error: error.message,
    });
  }
};

// Get all spot orders by driver
export const getAllSpotOrders = async (req, res) => {
  try {
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { page, limit, sort, startDate, endDate } = req.query;

    const filter = { isDeleted: false };

    // Date range filter
    if (startDate || endDate) {
      filter.orderPlacedDate = {};
      if (startDate) {
        filter.orderPlacedDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.orderPlacedDate.$lte = end;
      }
    }

    const result = await spotOrderRepo.getAll({
      filter,
      sort: sort ? JSON.parse(sort) : { orderPlacedDate: -1 },
      populate: [{ path: 'vehicleId', select: 'vehicleName vehicleNumber' }],
      paginate: false,
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error('Get all spot orders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch spot orders',
      error: error.message,
    });
  }
};
// Get all spot orders by driver
export const getSpotOrdersByDriver = async (req, res) => {
  try {
    const { driverId } = req.body;

    if (!driverId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { page, limit, sort, startDate, endDate } = req.query;

    const filter = { 'deliveryOfficer.id': driverId, isDeleted: false };

    // Date range filter
    if (startDate || endDate) {
      filter.orderPlacedDate = {};
      if (startDate) {
        filter.orderPlacedDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.orderPlacedDate.$lte = end;
      }
    }

    const result = await spotOrderRepo.getAll({
      filter,
      sort: sort ? JSON.parse(sort) : { orderPlacedDate: -1 },
      page,
      limit,
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error('Get spot orders by driver error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch spot orders',
      error: error.message,
    });
  }
};

// Get spot order by ID
export const getSpotOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await spotOrderRepo.getById(id, {
      populate: [
        { path: 'vehicleId', select: 'vehicleName vehicleNumber' },
        { path: 'orderLocation.routeId', select: 'routeName' },
      ],
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error('Get spot order by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch spot order',
      error: error.message,
    });
  }
};

// Get spot orders by vehicle
export const getSpotOrdersByVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { page, limit, sort, startDate, endDate } = req.query;

    const filter = { vehicleId, isDeleted: false };

    if (startDate || endDate) {
      filter.orderPlacedDate = {};
      if (startDate) {
        filter.orderPlacedDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.orderPlacedDate.$lte = end;
      }
    }

    const result = await spotOrderRepo.getAll({
      filter,
      sort: sort ? JSON.parse(sort) : { orderPlacedDate: -1 },
      page,
      limit,
      populate: [
        { path: 'vehicleId', select: 'vehicleName vehicleNumber' },
        { path: 'deliveryOfficer.id', select: 'fullName phone' },
      ],
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error('Get spot orders by vehicle error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch spot orders',
      error: error.message,
    });
  }
};

// Get spot orders by route
export const getSpotOrdersByRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { page, limit, sort } = req.query;

    const filter = { 'orderLocation.routeId': routeId, isDeleted: false };

    const result = await spotOrderRepo.getAll({
      filter,
      sort: sort ? JSON.parse(sort) : { orderPlacedDate: -1 },
      page,
      limit,
      populate: [
        { path: 'vehicleId', select: 'vehicleName vehicleNumber' },
        { path: 'deliveryOfficer.id', select: 'fullName phone' },
      ],
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error('Get spot orders by route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch spot orders',
      error: error.message,
    });
  }
};

// Get spot orders by customer type
export const getSpotOrdersByCustomerType = async (req, res) => {
  try {
    const { customerType } = req.params;
    const { page, limit, sort } = req.query;

    const filter = {
      'customerDetails.customerType': customerType,
      isDeleted: false,
    };

    const result = await spotOrderRepo.getAll({
      filter,
      sort: sort ? JSON.parse(sort) : { orderPlacedDate: -1 },
      page,
      limit,
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error('Get spot orders by customer type error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch spot orders',
      error: error.message,
    });
  }
};

// Get spot orders by payment method
export const getSpotOrdersByPaymentMethod = async (req, res) => {
  try {
    const { paymentMethod } = req.params;
    const { page, limit, sort } = req.query;

    const filter = { 'paymentDetails.method': paymentMethod, isDeleted: false };

    const result = await spotOrderRepo.getAll({
      filter,
      sort: sort ? JSON.parse(sort) : { orderPlacedDate: -1 },
      page,
      limit,
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error('Get spot orders by payment method error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch spot orders',
      error: error.message,
    });
  }
};

// Get new customers from spot orders
export const getNewCustomersFromSpotOrders = async (req, res) => {
  try {
    const { page, limit, sort } = req.query;

    const filter = { 'customerDetails.newCustomer': true, isDeleted: false };

    const result = await spotOrderRepo.getAll({
      filter,
      sort: sort ? JSON.parse(sort) : { orderPlacedDate: -1 },
      page,
      limit,
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error('Get new customers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch new customers',
      error: error.message,
    });
  }
};

// Get today's spot orders
export const getTodaysSpotOrders = async (req, res) => {
  try {
    const { page, limit } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const filter = {
      orderPlacedDate: { $gte: today, $lt: tomorrow },
      isDeleted: false,
    };

    const result = await spotOrderRepo.getAll({
      filter,
      sort: { orderPlacedDate: -1 },
      page,
      limit,
      populate: [{ path: 'vehicleId', select: 'vehicleName vehicleNumber' }],
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Get today's spot orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch today's spot orders",
      error: error.message,
    });
  }
};

// Get spot orders statistics
export const getSpotOrdersStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = { isDeleted: false };

    if (startDate || endDate) {
      filter.orderPlacedDate = {};
      if (startDate) {
        filter.orderPlacedDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.orderPlacedDate.$lte = end;
      }
    }

    const orders = await SpotOrder.find(filter);

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );
    const newCustomers = orders.filter(
      (order) => order.customerDetails.newCustomer,
    ).length;

    const paymentBreakdown = {
      Cash: 0,
      UPI: 0,
      Cheque: 0,
      Card: 0,
    };

    const customerTypeBreakdown = {
      Distributor: 0,
      Wholesaler: 0,
      Retailer: 0,
      Individual: 0,
    };

    orders.forEach((order) => {
      paymentBreakdown[order.paymentDetails.method]++;
      customerTypeBreakdown[order.customerDetails.customerType]++;
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        totalRevenue,
        newCustomers,
        paymentBreakdown,
        customerTypeBreakdown,
      },
    });
  } catch (error) {
    console.error('Get spot orders stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch spot orders statistics',
      error: error.message,
    });
  }
};

// Delete spot order (soft delete)
export const deleteSpotOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await spotOrderRepo.removeById(id, { hard: false });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error('Delete spot order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete spot order',
      error: error.message,
    });
  }
};

export const markCODPaymentCompleted = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User info missing.',
      });
    }

    const { orderId, orderType } = req.body;

    if (!orderId || !orderType) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and orderType are required.',
      });
    }

    // Get the correct Order Model
    const OrderModel = getCODOrderModel(orderType);
    const order = await OrderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // Prevent updating already completed payments
    if (order.paymentStatus === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment is already marked as Completed.',
      });
    }

    // Update payment status based on order type
    
    if (orderType === 'on_spot') {
      // Spot Order: DOUBLE NESTED paymentDetails.paymentDetails.status
      if (!order.paymentDetails) {
        return res.status(400).json({
          success: false,
          message: 'No payment details found for spot order.',
        });
      }

      // Update TOP LEVEL paymentDetails
      order.paymentDetails.status = 'Paid';
      order.paymentDetails.paidAt = new Date();

      // Update NESTED paymentDetails.paymentDetails (the actual status field)
      if (order.paymentDetails.paymentDetails) {
        order.paymentDetails.paymentDetails.status = 'Paid';
        order.paymentDetails.paymentDetails.paidAt = new Date();
      }

      order.updatedBy = userId;
      order.updatedAt = new Date();
    } else {
      // AppOrder & BulkOrder: paymentStatus (top-level)
      order.paymentStatus = 'Completed';
      order.updatedBy = userId;
      order.updatedAt = new Date();
    }

    await order.save();

    // Log the action
    console.log(
      `✅ COD Payment Completed: Order ${order.orderId} (${orderType}) by ${req.user.fullName || req.user.name}`,
    );

    return res.status(200).json({
      success: true,
      message: `COD payment marked as Completed for order ${order.orderId}`,
      data: {
        orderId: order.orderId,
        paymentStatus:
          orderType === 'on_spot'
            ? order.paymentDetails.status
            : order.paymentStatus,
        updatedAt: order.updatedAt,
      },
    });
  } catch (error) {
    console.error('Mark COD Payment Completed error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message,
    });
  }
};