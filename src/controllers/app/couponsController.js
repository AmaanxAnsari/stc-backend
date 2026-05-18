import Coupons from '../../models/admin/couponsModel.js';
import { createRepository } from '../../utils/repository.js';

const categoryRepo = createRepository(Coupons, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});

// Chnages in coupons 

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

// Get active promotional coupons for frontend (public endpoint)
// export const getActivePromotionalCoupons = async (req, res) => {

//   try {
//     const { couponType, category, productId } = req.query;
//     const currentDate = new Date();
//         if (!req.user?.id) {
//           return res
//             .status(401)
//             .json({ success: false, message: 'Unauthorized' });
//     }
//     console.log("Req User",req.user.id)

//     const filter = {
//       isDeleted: false,
//       isActive: true,
//       validFrom: { $lte: currentDate },
//       validTill: { $gte: currentDate },
//       couponType: { $in: ['PRODUCT', 'SCHEME', 'CART'] }, // Exclude CART
//     };

//     if (couponType && couponType !== 'CART') filter.couponType = couponType;
//     if (category) filter.applicableCategories = category;
//     if (productId)
//       filter['applicableProducts.productId'] = new mongoose.Types.ObjectId(
//         productId,
//       );

//     const coupons = await Coupons.find(filter)
//       .populate('applicableProducts.productId', 'name category image variants')
//       .populate(
//         'schemeConfig.buyProduct.productId',
//         'name category image variants',
//       )
//       .populate(
//         'schemeConfig.getProduct.productId',
//         'name category image variants',
//       )
//       .select('-createdBy -updatedBy')
//       .sort({ isDealOfTheDay: -1, createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       data: coupons,
//       count:coupons.length,
//     });
//   } catch (error) {
//     console.error('Error fetching active promotional coupons:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch active promotional coupons',
//       error: error.message,
//     });
//   }
// };

export const getActivePromotionalCoupons = async (req, res) => {
  try {
    const { couponType, category, productId } = req.query;
    const currentDate = new Date();

    // Ensure User ID is present
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = req.user.id.toString(); // Convert to string for comparison

    const filter = {
      isDeleted: false,
      isActive: true,
      validFrom: { $lte: currentDate },
      validTill: { $gte: currentDate },
      couponType: { $in: ['PRODUCT', 'SCHEME', 'CART'] },
    };

    if (couponType && couponType !== 'CART') filter.couponType = couponType;
    if (category) filter.applicableCategories = category;
    if (productId)
      filter['applicableProducts.productId'] = new mongoose.Types.ObjectId(
        productId,
      );

    // 1. Fetch ALL potential coupons matching the basic criteria
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
      .select('-createdBy -updatedBy')
      .sort({ isDealOfTheDay: -1, createdAt: -1 })
      .lean(); // Use .lean() for better performance as we are just reading

    // 2. Filter coupons based on Usage Limits
    const validCoupons = coupons.filter((coupon) => {
      // A. Check Global Max Usage Limit
      if (coupon.maxUsageLimit && coupon.useCount >= coupon.maxUsageLimit) {
        return false; // Coupon exhausted globally
      }

      // B. Check Per-User Usage Limit
      if (coupon.usagePerUser) {
        // Count how many times THIS user has used this coupon
        const userUsageCount = coupon.usageLogs
          ? coupon.usageLogs.filter(
              (log) => log.userId && log.userId.toString() === userId,
            ).length
          : 0;

        if (userUsageCount >= coupon.usagePerUser) {
          return false; // User has reached their personal limit for this coupon
        }
      }

      return true; // Coupon is valid for this user
    });

    res.status(200).json({
      success: true,
      data: validCoupons,
      count: validCoupons.length,
    });
  } catch (error) {
    console.error('Error fetching active promotional coupons:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active promotional coupons',
      error: error.message,
    });
  }
};


// Get promotional coupon by code (for frontend validation display)
export const getPromotionalCouponByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const currentDate = new Date();

    const coupon = await Coupons.findOne({
      code: code.toUpperCase(),
      isDeleted: false,
      isActive: true,
      status: true,
      validFrom: { $lte: currentDate },
      validTill: { $gte: currentDate },
      couponType: { $in: ['PRODUCT', 'SCHEME', 'CART'] },
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
      .select('-createdBy -updatedBy');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Promotional coupon not found or expired',
      });
    }

    // Check usage limit
    if (coupon.maxUsageLimit && coupon.useCount >= coupon.maxUsageLimit) {
      return res.status(400).json({
        success: false,
        message: 'Coupon usage limit exceeded',
      });
    }

    res.status(200).json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    console.error('Error fetching promotional coupon by code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promotional coupon',
      error: error.message,
    });
  }
};


// ==========================================
// 3. APPLY COUPON (Validation)
// ==========================================
export const applyCoupon = async (req, res) => {
  try {
    const { code, cartAmount } = req.body;
    const userId = req.user.id; // From Auth Middleware

    if (!code)
      return res.status(400).json({ success: false, message: 'Code required' });

    const coupon = await Coupons.findOne({
      code: code.toUpperCase(),
      isActive: true,
      isDeleted: false,
    });

    if (!coupon)
      return res
        .status(404)
        .json({ success: false, message: 'Invalid Coupon' });

    // A. Basic Checks
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validTill) {
      return res
        .status(400)
        .json({ success: false, message: 'Coupon expired or inactive' });
    }
    if (coupon.maxUsageLimit && coupon.useCount >= coupon.maxUsageLimit) {
      return res
        .status(400)
        .json({ success: false, message: 'Usage limit exhausted' });
    }
    if (cartAmount < coupon.minOrderValue) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Min order ₹${coupon.minOrderValue} required`,
        });
    }

    // B. User Limit Check (Check usageLogs array)
    // We filter the array in memory (efficient enough for normal usage arrays)
    const userUsageCount = coupon.usageLogs.filter(
      (log) => log.userId.toString() === userId,
    ).length;

    if (userUsageCount >= coupon.usagePerUser) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'You have used this coupon max times',
        });
    }

    // C. Calculate Benefit
    let discountAmount = 0;
    let message = 'Applied';
    let freeProduct = null;

    if (coupon.couponType === 'CART' || coupon.couponType === 'PRODUCT') {
      if (coupon.discountType === 'FLAT') {
        discountAmount = coupon.discountValue;
      } else {
        discountAmount = (cartAmount * coupon.discountValue) / 100;
        if (coupon.maxDiscountAmount) {
          discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
        }
      }
    } else if (coupon.couponType === 'SCHEME') {
      message = 'Free Product Added';
      freeProduct = coupon.schemeConfig.getProduct;
    }

    res.status(200).json({
      success: true,
      data: {
        couponId: coupon._id,
        discountAmount,
        freeProduct,
        message,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};