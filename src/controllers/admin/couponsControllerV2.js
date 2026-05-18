import Coupons from '../../models/admin/couponsModel.js';
import AdminInventory from '../../models/admin/InventoryModel.js';
import { User } from '../../models/app/user.js';
import { getAdminDB } from '../../config/db.js';

// ==========================================
// HELPER: Inventory Reservation Logic
// ==========================================
const manageInventoryReservation = async (
  productId,
  variantKey,
  quantity,
  action,
) => {
  const inventory = await AdminInventory.findOne({
    productId,
    isDeleted: false,
  });
  if (!inventory)
    throw new Error(`Inventory not found for product ID ${productId}`);

  const variantIndex = inventory.variants.findIndex(
    (v) => v.variantKey === variantKey,
  );
  if (variantIndex === -1)
    throw new Error(`Variant ${variantKey} not found in inventory`);

  const variant = inventory.variants[variantIndex];

  if (action === 'RESERVE') {
    if (variant.onHand < quantity) {
      throw new Error(
        `Insufficient stock. Available: ${variant.onHand}, Required: ${quantity}`,
      );
    }
    variant.onHand -= quantity;
    variant.reserved = (variant.reserved || 0) + quantity;
  } else if (action === 'RELEASE') {
    variant.reserved -= quantity;
    variant.onHand += quantity;
  }

  // Recalculate totals
  inventory.totalOnHand = inventory.variants.reduce(
    (sum, v) => sum + v.onHand,
    0,
  );
  inventory.totalReserved = inventory.variants.reduce(
    (sum, v) => sum + v.reserved,
    0,
  );

  await inventory.save();
};

// ==========================================
// 1. CREATE COUPON
// ==========================================
export const createPromotionalCoupon = async (req, res) => {
  const session = await getAdminDB().startSession();
  session.startTransaction();

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

    const existing = await Coupons.findOne({
      code: code.toUpperCase(),
      isDeleted: false,
    });
    if (existing) throw new Error('Coupon code already exists');

    const couponData = {
      title,
      code: code.toUpperCase(),
      couponType,
      description,
      minOrderValue: minOrderValue || 0,
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
      isInventoryReserved: false,
    };

    // --- TYPE SPECIFIC LOGIC ---

    // A. SCHEME (Buy X Get Y) -> Reserves Inventory
    if (couponType === 'SCHEME') {
      if (!schemeConfig?.buyProduct || !schemeConfig?.getProduct) {
        throw new Error('Scheme config incomplete');
      }
      if (!maxUsageLimit) {
        throw new Error(
          'Max Usage Limit required for Scheme coupons to reserve stock.',
        );
      }

      couponData.schemeConfig = schemeConfig;

      // Calculate Total Reserve Needed: (Free Qty) * (Total Limit)
      const qtyPerUser = schemeConfig.getProduct.quantity || 1;
      const totalReserve = qtyPerUser * maxUsageLimit;

      await manageInventoryReservation(
        schemeConfig.getProduct.productId,
        schemeConfig.getProduct.variantQuantity,
        totalReserve,
        'RESERVE',
      );
      couponData.isInventoryReserved = true;
    }

    // B. CART & PRODUCT (Flat/Percentage)
    else {
      if (!discountType || !discountValue) {
        throw new Error('Discount type and value are required');
      }
      couponData.discountType = discountType;
      couponData.discountValue = discountValue;
      couponData.maxDiscountAmount = maxDiscountAmount;

      if (couponType === 'PRODUCT') {
        if (!applicableProducts?.length && !applicableCategories?.length) {
          throw new Error('Product coupons need products or categories');
        }
        couponData.applicableProducts = applicableProducts;
        couponData.applicableCategories = applicableCategories;
      }
      // CART type just uses global settings (minOrderValue, etc.)
    }

    const coupon = new Coupons(couponData);
    await coupon.save({ session });

    await session.commitTransaction();
    res
      .status(201)
      .json({ success: true, message: 'Coupon created', data: coupon });
  } catch (error) {
    await session.abortTransaction();
    console.error('Create Coupon Error:', error);
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// ==========================================
// 2. GET SINGLE COUPON (With User Usage Details)
// ==========================================
export const getPromotionalCouponById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch Coupon
    const coupon = await Coupons.findById(id)
      .populate('applicableProducts.productId', 'name image')
      .populate('schemeConfig.buyProduct.productId', 'name image')
      .populate('schemeConfig.getProduct.productId', 'name image')
      .lean(); // Convert to plain JS object to modify

    if (!coupon)
      return res.status(404).json({ success: false, message: 'Not found' });

    // 2. Manual User Lookup (Cross-DB)
    // Extract all userIds from usageLogs
    if (coupon.usageLogs && coupon.usageLogs.length > 0) {
      const userIds = coupon.usageLogs.map((log) => log.userId);

      // Fetch users from App DB
      const users = await User.find({ _id: { $in: userIds } }).select(
        'fullName email phone',
      );

      // Map user details back to logs
      const userMap = {};
      users.forEach((u) => (userMap[u._id.toString()] = u));

      coupon.usageLogs = coupon.usageLogs.map((log) => ({
        ...log,
        userDetails: userMap[log.userId.toString()] || {
          fullName: 'Unknown User',
        },
      }));
    }

    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 4. INCREMENT USAGE (After Order)
// ==========================================
export const incrementPromotionalCouponUsage = async (req, res) => {
  try {
    const { code, userId, orderId, discountAmount } = req.body;

    const coupon = await Coupons.findOne({ code: code.toUpperCase() });
    if (!coupon)
      return res
        .status(404)
        .json({ success: false, message: 'Coupon not found' });

    // Push to logs array & Increment counter
    coupon.usageLogs.push({
      userId,
      orderId,
      discountAmount,
      usedAt: new Date(),
    });
    coupon.useCount += 1;

    await coupon.save();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 5. DELETE COUPON (Release Inventory)
// ==========================================
export const deletePromotionalCoupon = async (req, res) => {
  const session = await getAdminDB().startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const coupon = await Coupons.findById(id);

    if (!coupon) throw new Error('Coupon not found');

    // Release unused inventory for SCHEME coupons
    if (coupon.couponType === 'SCHEME' && coupon.isInventoryReserved) {
      const remaining = (coupon.maxUsageLimit || 0) - coupon.useCount;
      if (remaining > 0) {
        const qtyPerUser = coupon.schemeConfig.getProduct.quantity || 1;
        await manageInventoryReservation(
          coupon.schemeConfig.getProduct.productId,
          coupon.schemeConfig.getProduct.variantQuantity,
          remaining * qtyPerUser,
          'RELEASE',
        );
      }
    }

    await Coupons.deleteOne({ _id: id }).session(session);
    await session.commitTransaction();
    res
      .status(200)
      .json({ success: true, message: 'Deleted & Inventory Released' });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// ==========================================
// 6. GET ALL (Filter Logic)
// ==========================================

// export const getAllPromotionalCoupons = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, type, q } = req.query;
//     const filter = { isDeleted: false };

//     if (type) filter.couponType = type;

//     if (q) {
//       const reg = new RegExp(q, 'i');
//       filter.$or = [{ title: reg }, { code: reg }];
//     }

//     // 1️⃣ Fetch coupons
//     const coupons = await Coupons.find(filter)
//       .populate('applicableProducts.productId', 'name')
//       .sort({ createdAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit))
//       .lean(); // IMPORTANT

//     // 2️⃣ Extract userIds safely
//     const userIds = [];
//     coupons.forEach((coupon) => {
//       if (Array.isArray(coupon.usageLogs)) {
//         coupon.usageLogs.forEach((log) => {
//           if (log?.userId) {
//             userIds.push(log.userId.toString());
//           }
//         });
//       }
//     });

//     const uniqueUserIds = [...new Set(userIds)];

//     // 3️⃣ Fetch users from USER DB
//     const users = uniqueUserIds.length
//       ? await User.find(
//           { _id: { $in: uniqueUserIds } },
//           { fullName: 1, email: 1, mobile: 1 },
//         ).lean()
//       : [];

//     // 4️⃣ Create lookup map
//     const userMap = {};
//     users.forEach((user) => {
//       userMap[user._id.toString()] = user;
//     });

//     // 5️⃣ Attach user data into usageLogs
//     coupons.forEach((coupon) => {
//       coupon.usageLogs = Array.isArray(coupon.usageLogs)
//         ? coupon.usageLogs.map((log) => ({
//             ...log,
//             user: userMap[log.userId?.toString()] || null,
//           }))
//         : [];
//     });

//     const total = await Coupons.countDocuments(filter);

//     res.status(200).json({
//       success: true,
//       data: coupons,
//       pagination: {
//         total,
//         page: Number(page),
//         pages: Math.ceil(total / limit),
//       },
//     });
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ success: false, message: e.message });
//   }
// };

export const getAllPromotionalCoupons = async (req, res) => {
  try {
    const { type, q } = req.query;
    const filter = { isDeleted: false };

    if (type) filter.couponType = type;

    if (q) {
      const reg = new RegExp(q, 'i');
      filter.$or = [{ title: reg }, { code: reg }];
    }

    // 1️⃣ Fetch ALL coupons (Removed skip and limit)
    const coupons = await Coupons.find(filter)
      .populate([
        // 1. Existing: Populate applicable products list
        {
          path: 'applicableProducts.productId',
          select: 'name',
        },
        // 2. New: Populate the 'Buy' product in Scheme
        {
          path: 'schemeConfig.buyProduct.productId',
          select: 'name',
        },
        // 3. New: Populate the 'Get' product in Scheme
        {
          path: 'schemeConfig.getProduct.productId',
          select: 'name',
        },
      ])
      .sort({ createdAt: -1 })
      .lean();

    // 2️⃣ Extract userIds safely
    const userIds = [];
    coupons.forEach((coupon) => {
      if (Array.isArray(coupon.usageLogs)) {
        coupon.usageLogs.forEach((log) => {
          if (log?.userId) {
            userIds.push(log.userId.toString());
          }
        });
      }
    });

    const uniqueUserIds = [...new Set(userIds)];

    // 3️⃣ Fetch users from USER DB
    const users = uniqueUserIds.length
      ? await User.find(
          { _id: { $in: uniqueUserIds } },
          { fullName: 1, email: 1, mobile: 1 },
        ).lean()
      : [];

    // 4️⃣ Create lookup map
    const userMap = {};
    users.forEach((user) => {
      userMap[user._id.toString()] = user;
    });

    // 5️⃣ Attach user data into usageLogs
    coupons.forEach((coupon) => {
      coupon.usageLogs = Array.isArray(coupon.usageLogs)
        ? coupon.usageLogs.map((log) => ({
            ...log,
            user: userMap[log.userId?.toString()] || null,
          }))
        : [];
    });

    // Removed total count calculation and pagination object
    res.status(200).json({
      success: true,
      data: coupons,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
};

// ==========================================
// 7. UPDATE COUPON
// ==========================================
export const updatePromotionalCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const coupon = await Coupons.findOne({ _id: id, isDeleted: false });
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: 'Coupon not found' });
    }

    // 1. Prevent changing critical Scheme fields that mess up Inventory
    if (coupon.couponType === 'SCHEME' && coupon.isInventoryReserved) {
      // If trying to change limit, product, or variant
      if (
        updates.maxUsageLimit &&
        updates.maxUsageLimit !== coupon.maxUsageLimit
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Cannot change Max Usage Limit for active Scheme coupons. Please deactivate or create a new one.',
        });
      }
      if (updates.schemeConfig) {
        return res.status(400).json({
          success: false,
          message:
            'Cannot modify Scheme Config (Products) for active coupons. Please create a new one.',
        });
      }
    }

    // 2. Duplicate Code Check
    if (updates.code && updates.code.toUpperCase() !== coupon.code) {
      const existing = await Coupons.findOne({
        code: updates.code.toUpperCase(),
        isDeleted: false,
        _id: { $ne: id },
      });
      if (existing) {
        return res
          .status(409)
          .json({ success: false, message: 'Coupon code already exists' });
      }
      updates.code = updates.code.toUpperCase();
    }

    // 3. Format Array Fields
    if (updates.termsAndConditions) {
      updates.termsAndConditions = Array.isArray(updates.termsAndConditions)
        ? updates.termsAndConditions
        : [updates.termsAndConditions];
    }

    updates.updatedBy = req.user.id;

    // 4. Perform Update
    const updatedCoupon = await Coupons.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('applicableProducts.productId', 'name image')
      .populate('schemeConfig.buyProduct.productId', 'name image')
      .populate('schemeConfig.getProduct.productId', 'name image');

    res.status(200).json({
      success: true,
      message: 'Promotional coupon updated successfully',
      data: updatedCoupon,
    });
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 8. TOGGLE STATUS
// ==========================================
export const togglePromotionalCouponStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupons.findById(id);
    if (!coupon)
      return res.status(404).json({ success: false, message: 'Not found' });

    coupon.isActive = !coupon.isActive;
    coupon.updatedBy = req.user?.id;
    await coupon.save();

    res.status(200).json({
      success: true,
      message: `Coupon ${coupon.isActive ? 'Activated' : 'Deactivated'}`,
      data: coupon,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
