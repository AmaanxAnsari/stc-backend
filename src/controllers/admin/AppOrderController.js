import mongoose from 'mongoose';
import Product from '../../models/admin/productModel.js';
import AppOrder from '../../models/admin/AppOrderModel.js';
import { createRepository } from './../../utils/repository.js';
import { autoAssignOrderToStop } from '../../utils/stopMatcher.js';


const appOrderRepo = createRepository(AppOrder, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});
export const createOrder = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    const {
      products: productItems,
      deliveryAddress,
      paymentMethod,
      deliveryNotes,
      couponApplied,
      deliveryFee = 30,
      handlingFee = 10,
    } = req.body;

    if (
      !productItems ||
      !Array.isArray(productItems) ||
      productItems.length === 0
    )
      return res
        .status(400)
        .json({ success: false, message: 'Products are required' });

    const orderProducts = [];
    let itemTotal = 0;
    let originalItemTotal = 0;
    let productCount = 0;

    // Fetch product details
    for (const item of productItems) {
      if (!mongoose.Types.ObjectId.isValid(item.productId)) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid productId' });
      }

      const product = await Product.findById(item.productId);
      if (!product)
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`,
        });

      const orderQuantity = item.orderQuantity || 1;
      const price = product.variants?.[0]?.costPrice || product.price || 0;
      const originalPrice =
        product.variants?.[0]?.mrp || product.originalPrice || price;

      itemTotal += price * orderQuantity;
      originalItemTotal += originalPrice * orderQuantity;
      productCount += orderQuantity;

      orderProducts.push({
        productId: product._id,
        name: product.name,
        quantity: product.variants?.[0]?.quantity || '',
        price,
        originalPrice,
        image: product.image || '',
        orderQuantity,
      });
    }

    // Calculate discount if coupon applied
    let discount = 0;
    if (couponApplied) {
      if (couponApplied.type === 'fixed') discount = couponApplied.discount;
      else if (couponApplied.type === 'percentage')
        discount = (itemTotal * couponApplied.discount) / 100;
    }

    const totalAmount = itemTotal + deliveryFee + handlingFee - discount;

    const newOrder = new AppOrder({
      orderId: `ORD-${Date.now()}`,
      status: 'pending',
      orderPlacedDate: new Date(),
      orderPlacedAt: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      }),
      totalAmount,
      originalAmount: originalItemTotal,
      currency: '₹',
      productCount,
      products: orderProducts,
      deliveryAddress,
      paymentMethod,
      paymentStatus: paymentMethod === 'Cash' ? 'COD' : 'Pending',
      deliveryNotes: deliveryNotes || '',
      couponApplied: couponApplied || null,
      billSummary: {
        itemTotal,
        originalItemTotal,
        deliveryFee,
        originalDeliveryFee: deliveryFee,
        handlingFee,
        discount,
        totalAmount,
      },
      createdBy: userId,
    });

    await newOrder.save();

    // Auto-assign to stop
    const assignmentResult = await autoAssignOrderToStop(
      newOrder._id,
      'normal',
      newOrder.deliveryAddress,
    );

    let assignment_message = 'Order created successfully';
    if (assignmentResult) {
      assignment_message += ` and auto-assigned to stop: ${assignmentResult.stop.stopName}`;
    } else {
      assignment_message +=
        '. No matching stop found - pending manual assignment.';
    }
    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      assignment_message: assignment_message,
      order: newOrder,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return res
      .status(500)
      .json({
        success: false,
        message: 'Something went wrong',
        error: error.message,
      });
  }
};

export const getAllAppOrder = async (req, res) => {
  try {
    const { page, limit, sort, q, isActive } = req.query;

    const filter = {};
    if (q) {
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
      ];
    }
    if (isActive != null) filter.isActive = isActive === 'true';

    const result = await appOrderRepo.getAll({
      filter,
      sort: sort ? JSON.parse(sort) : undefined,
      page,
      limit,
      projection: {},
      paginate:false,
      collation: { locale: 'en', strength: 2 },
    });

    return res.status(result.status).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 500,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const result = await appOrderRepo.getById(req.params.id, {
      projection: {__v: 0 },
    });

    // Directly return the repository response
    return res.status(result.status).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 500,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};
