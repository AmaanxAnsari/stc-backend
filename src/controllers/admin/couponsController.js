import Coupons from '../../models/admin/couponsModel.js';
import { createRepository } from '../../utils/repository.js';
import mongoose from 'mongoose';

const categoryRepo = createRepository(Coupons, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});


// Create new promotional coupon (product/scheme based)
export const createPromotionalCoupon = async (req, res) => {
  try {
    const {
      title,
      code,
      couponType,
      discountType,
      discountValue,
      applicableProducts,
      applicableCategories,
      schemeConfig,
      description,
      minOrderValue,
      maxDiscountAmount,
      validFrom,
      validTill,
      isDealOfTheDay,
      termsAndConditions,
      maxUsageLimit,
      usagePerUser,
    } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User info missing.',
      });
    }

    // Validation based on coupon type
    if (
      couponType === 'PRODUCT' &&
      (!applicableProducts || applicableProducts.length === 0) &&
      (!applicableCategories || applicableCategories.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Product-specific coupons require at least one product or category',
      });
    }

    if (couponType === 'SCHEME' && !schemeConfig) {
      return res.status(400).json({
        success: false,
        message: 'Scheme coupons require schemeConfig',
      });
    }

    // Check if code already exists
    const existingCoupon = await Coupons.findOne({
      code: code.toUpperCase(),
      isDeleted: false,
    });
    if (existingCoupon) {
      return res.status(409).json({
        success: false,
        message: 'Coupon code already exists',
      });
    }

    const coupon = new Coupons({
      title,
      code: code.toUpperCase(),
      couponType,
      discountType,
      discountValue,
      applicableProducts,
      applicableCategories,
      schemeConfig,
      description,
      minOrderValue: minOrderValue || 0,
      maxDiscountAmount,
      validFrom,
      validTill,
      isDealOfTheDay,
      termsAndConditions: Array.isArray(termsAndConditions)
        ? termsAndConditions
        : [termsAndConditions],
      maxUsageLimit,
      usagePerUser: usagePerUser || 1,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    await coupon.save();

    res.status(201).json({
      success: true,
      message: 'Promotional coupon created successfully',
      data: coupon,
    });
  } catch (error) {
    console.error('Error creating promotional coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create promotional coupon',
      error: error.message,
    });
  }
};

// Get all promotional coupons (with filters)
export const getAllPromotionalCoupons = async (req, res) => {
  try {
    const {
      couponType,
      status,
      isActive,
      isDealOfTheDay,
      page = 1,
      limit = 10,
      q,
    } = req.query;

    const filter = { isDeleted: false };

    // Only get PRODUCT and SCHEME type coupons (exclude CART)
    filter.couponType = { $in: ['PRODUCT', 'SCHEME'] };

    if (couponType && couponType !== 'CART') filter.couponType = couponType;
    if (status !== undefined) filter.status = status === 'true';
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isDealOfTheDay !== undefined)
      filter.isDealOfTheDay = isDealOfTheDay === 'true';

    // Search query
    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [{ title: regex }, { code: regex }, { description: regex }];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const coupons = await Coupons.find(filter)
      .populate('applicableProducts.productId', 'name category image variants')
      .populate(
        'schemeConfig.buyProduct.productId',
        'name category image variants',
      )
      .populate(
        'schemeConfig.getProduct.productId',
        'name category image variants',
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Coupons.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: coupons,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('Error fetching promotional coupons:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promotional coupons',
      error: error.message,
    });
  }
};



// Get single promotional coupon by ID
export const getPromotionalCouponById = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupons.findOne({
      _id: id,
      isDeleted: false,
      couponType: { $in: ['PRODUCT', 'SCHEME'] },
    })
      .populate('applicableProducts.productId', 'name category image variants')
      .populate(
        'schemeConfig.buyProduct.productId',
        'name category image variants',
      )
      .populate(
        'schemeConfig.getProduct.productId',
        'name category image variants',
      )
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Promotional coupon not found',
      });
    }

    res.status(200).json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    console.error('Error fetching promotional coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promotional coupon',
      error: error.message,
    });
  }
};

// Update promotional coupon
export const updatePromotionalCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User info missing.',
      });
    }

    const coupon = await Coupons.findOne({
      _id: id,
      isDeleted: false,
      couponType: { $in: ['PRODUCT', 'SCHEME'] },
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Promotional coupon not found',
      });
    }

    // If code is being updated, check for duplicates
    if (updates.code && updates.code.toUpperCase() !== coupon.code) {
      const existingCoupon = await Coupons.findOne({
        code: updates.code.toUpperCase(),
        isDeleted: false,
        _id: { $ne: id },
      });

      if (existingCoupon) {
        return res.status(409).json({
          success: false,
          message: 'Coupon code already exists',
        });
      }
    }

    updates.updatedBy = req.user.id;
    if (updates.code) updates.code = updates.code.toUpperCase();
    if (updates.termsAndConditions) {
      updates.termsAndConditions = Array.isArray(updates.termsAndConditions)
        ? updates.termsAndConditions
        : [updates.termsAndConditions];
    }

    const updatedCoupon = await Coupons.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('applicableProducts.productId', 'name category image variants')
      .populate(
        'schemeConfig.buyProduct.productId',
        'name category image variants',
      )
      .populate(
        'schemeConfig.getProduct.productId',
        'name category image variants',
      );

    res.status(200).json({
      success: true,
      message: 'Promotional coupon updated successfully',
      data: updatedCoupon,
    });
  } catch (error) {
    console.error('Error updating promotional coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update promotional coupon',
      error: error.message,
    });
  }
};

// Toggle promotional coupon status (active/inactive)
export const togglePromotionalCouponStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User info missing.',
      });
    }

    const coupon = await Coupons.findOne({
      _id: id,
      isDeleted: false,
      couponType: { $in: ['PRODUCT', 'SCHEME'] },
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Promotional coupon not found',
      });
    }

    coupon.status = !coupon.status;
    coupon.updatedBy = req.user.id;
    await coupon.save();

    res.status(200).json({
      success: true,
      message: `Promotional coupon ${coupon.status ? 'activated' : 'deactivated'} successfully`,
      data: coupon,
    });
  } catch (error) {
    console.error('Error toggling promotional coupon status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle promotional coupon status',
      error: error.message,
    });
  }
};



// Hard delete promotional coupon
export const deletePromotionalCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User info missing.',
      });
    }

    const coupon = await Coupons.findOne({
      _id: id,
      couponType: { $in: ['PRODUCT', 'SCHEME'] },
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Promotional coupon not found',
      });
    }

    await Coupons.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: 'Promotional coupon permanently deleted',
    });
  } catch (error) {
    console.error('Error deleting promotional coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete promotional coupon',
      error: error.message,
    });
  }
};


// Increment usage count (call this after successful order)
export const incrementPromotionalCouponUsage = async (req, res) => {
  try {
    const { code } = req.body;

    const coupon = await Coupons.findOneAndUpdate(
      {
        code: code.toUpperCase(),
        isDeleted: false,
        couponType: { $in: ['PRODUCT', 'SCHEME'] },
      },
      { $inc: { useCount: 1 } },
      { new: true },
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Promotional coupon not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Promotional coupon usage incremented',
      data: coupon,
    });
  } catch (error) {
    console.error('Error incrementing promotional coupon usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to increment promotional coupon usage',
      error: error.message,
    });
  }
};


// // Soft delete promotional coupon
// export const deletePromotionalCoupon = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!req.user?.id) {
//       return res.status(401).json({
//         success: false,
//         message: 'Unauthorized: User info missing.',
//       });
//     }

//     const coupon = await Coupons.findOne({
//       _id: id,
//       isDeleted: false,
//       couponType: { $in: ['PRODUCT', 'SCHEME'] },
//     });

//     if (!coupon) {
//       return res.status(404).json({
//         success: false,
//         message: 'Promotional coupon not found',
//       });
//     }

//     coupon.isDeleted = true;
//     coupon.deletedAt = new Date();
//     coupon.updatedBy = req.user.id;
//     await coupon.save();

//     res.status(200).json({
//       success: true,
//       message: 'Promotional coupon deleted successfully',
//     });
//   } catch (error) {
//     console.error('Error deleting promotional coupon:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to delete promotional coupon',
//       error: error.message,
//     });
//   }
// };


export const createCoupons = async (req, res) => {
  try {
    const {
      title,
      validTill,
      validFrom,
      minOrder,
      description,
      value,
      type,
      isDealOfTheDay,
      termsAndConditions,
      use_count,
    } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User info missing.',
      });
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: title is required.',
      });
    }

    
    // Build doc
    const coupons = new Coupons({
      title: title,
      validTill: validTill,
      validFrom: validFrom,
      minOrder: minOrder,
      description: description,
      value: value,
      type: type,
      isDealOfTheDay: isDealOfTheDay,
     termsAndConditions: Array.isArray(termsAndConditions)
    ? termsAndConditions
    : [termsAndConditions], // ensures it's always an array
      use_count: use_count,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    // Persist
    await coupons.save();

    // Success
    return res.status(201).json({
      success: true,
      message: 'Coupons created successfully.',
      data: coupons,
    });
  } catch (error) {
    if (error && (error.code === 11000 || error.code === 11001)) {
      const dupField = Object.keys(error.keyPattern || {})[0] || 'slug';
      return res.status(409).json({
        success: false,
        message: `Duplicate value for ${dupField}. Please use a different ${dupField}.`,
      });
    }
    console.error('Create coupons error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. ' + error.message,
    });
  }
};


export const updateCoupons = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User info missing.',
      });
    }

    const { id } = req.params;
    const {
      title,
      validTill,
      validFrom,
      minOrder,
      description,
      value,
      type,
      isDealOfTheDay,
      termsAndConditions,
      use_count,
      status,
    } = req.body;

    const existing = await Coupons.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.',
      });
    }

    // --- Update fields only if provided ---
    if (typeof title === 'string' && title.trim()) {
      existing.title = title.trim();
    }

    if (validTill) existing.validTill = validTill;
    if (validFrom) existing.validFrom = validFrom;
    if (minOrder) existing.minOrder = minOrder;
    if (description) existing.description = description;
    if (value) existing.value = value;
    if (type) existing.type = type;
    if (typeof isDealOfTheDay === 'boolean') {
      existing.isDealOfTheDay = isDealOfTheDay;
    }
     if (typeof status === 'boolean') {
      existing.status = status;
    }
   if (termsAndConditions) {
  existing.termsAndConditions = Array.isArray(termsAndConditions)
    ? termsAndConditions
    : [termsAndConditions];
}

    if (use_count !== undefined && use_count !== null) {
      existing.use_count = use_count;
    }

    // Audit update
    existing.updatedBy = req.user.id;

    await existing.save();

    return res.json({
      success: true,
      message: 'Coupon updated successfully.',
      data: existing,
    });
  } catch (error) {
    if (error && (error.code === 11000 || error.code === 11001)) {
      const dupField = Object.keys(error.keyPattern || {})[0] || 'slug';
      return res.status(409).json({
        success: false,
        message: `Duplicate value for ${dupField}. Please use a different ${dupField}.`,
      });
    }

    console.error('Update coupon error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getAllCoupons = async (req, res) => {
  try {
    let { page = 1, limit = 10, q, sort } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    // 🔍 Filters
    const filter = {};
    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { title: regex },
        { description: regex },
        { type: regex },
      ];
    }

    let sortObj = { createdAt: -1 };
    if (sort) {
      try {
        sortObj = JSON.parse(sort);
      } catch {
        console.warn('Invalid sort JSON. Using default sort.');
      }
    }

    const result = await categoryRepo.getAll({
      filter,
      sort: sortObj,
      page,
      limit,
      projection: {},
      collation: { locale: 'en', strength: 2 },
    });

    const data = {};
    if (result?.data?.length) {
      result.data.forEach((coupon) => {
        const key = coupon.title ? coupon.title.replace(/\s+/g, '').trim() : 'UNKNOWN';
        data[key] = coupon;
      });
    }

    return res.status(200).json({
      success: true,
      status: 200,
      message: 'Coupons fetched successfully',
      page,
      limit,
      total: result.total || 0,
      data,
    });
  } catch (err) {
    console.error('GetAllCoupons error:', err);
    return res.status(500).json({
      success: false,
      status: 500,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};


export const deleteCoupons = async (req, res) => {
  try {
    const result = await categoryRepo.removeById(req.params.id, { hard: false });

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