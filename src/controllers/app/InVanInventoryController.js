import DeliveryVehicle from '../../models/admin/deliveryVehicleModel.js';
import InVanInventory from '../../models/admin/InVanInventoryModel.js';
import Product from '../../models/admin/productModel.js';
import { createRepository } from '../../utils/repository.js';

const inVanInventoryRepo = createRepository(InVanInventory, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});

// Get van inventory for driver (by vehicleId)
export const getDriverVanInventory = async (req, res) => {
  try {
    const {sort, q, category, status } = req.query;
    const { vehicleId } = req.body; // Driver passes their assigned vehicleId
    const userRole = req.user?.role || 'consumer'; // default to consumer

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle ID is required',
      });
    }

    const filter = { isDeleted: false, isActive: true, vehicleId };

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { productSlug: { $regex: q, $options: 'i' } },
      ];
    }
    if (category) filter.category = category;
    if (status) filter.status = status;

    // ✅ Fetch paginated van inventory
    const inventories = await InVanInventory.find(filter)
      .sort(sort ? JSON.parse(sort) : { createdAt: -1 })
      .lean();

    if (!Array.isArray(inventories)) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch van inventory list',
      });
    }

    // ✅ Map inventories into frontend-ready productData format
    const formattedData = await Promise.all(
      inventories.map(async (inv) => {
        if (!inv.productId) return null;

        const product = await Product.findById(inv.productId)
          .select(
            'name category description specifications featureTags rating reviewCount image variants',
          )
          .lean();

        if (!product) return null;

        // ✅ Map each variant with images + price logic + STOCK
        const mappedVariants = inv.variants.map((v) => {
          const productVariant =
            product.variants?.find(
              (pv, idx) =>
                pv.quantity === v.variantKey ||
                pv.variantIndex === v.variantIndex,
            ) || {};

          // ✅ Choose images priority: inventory variant > product variant
          const variantImages =
            v.images?.length > 0
              ? v.images
              : productVariant.images?.length > 0
                ? productVariant.images
                : [];

          // ✅ Price logic: Use inVanPrice from tierPricing or role-based pricing
          const variantPrice =
            v.tierPricing?.inVanPrice ??
            v.tierPricing?.[userRole] ??
            v.tierPricing?.consumer ??
            0;

          return {
            quantity: v.variantKey,
            price: variantPrice,
            originalPrice: v.mrp ?? 0,
            images: variantImages,
            remainingStock: v.onHand ?? 0, // ✅ available stock for this variant
            soldQuantity: v.sold ?? 0, // ✅ available stock for this variant
            initialStock: v.initialStock ?? 0, // ✅ available stock for this variant
            variantIndex: v.variantIndex, // ✅ to identify variant
            status: v.status, // ✅ variant-level status
            inStock: v.inStock, // ✅ boolean flag
          };
        });

        // ✅ Use first variant as default reference
        const firstVariant = mappedVariants[0] || {};

        // ✅ Parent image fallback logic
        const finalImage =
          product.image || firstVariant.images?.[0] || inv.image || '';

        // ✅ Now parent images come from variant images (only once)
        const finalImages =
          firstVariant.images?.length > 0 ? firstVariant.images : [];

        return {
          id: inv._id,
          productId: inv.productId,
          name: product.name,
          category: product.category,
          quantity: firstVariant.quantity || '',
          price: firstVariant.price || 0,
          originalPrice: firstVariant.originalPrice || 0,
          inStock: inv.status === 'in_stock',
          availableStock: firstVariant.remainingStock || 0, // ✅ stock for default variant
          image: finalImage,
          images: finalImages, // ✅ variant-level images mapped to parent
          variants: mappedVariants, // ✅ includes availableStock for each variant
          specifications: product.specifications || {},
          description: product.description || '',
          featureTags: product.featureTags || [],
          rating: product.rating || 0,
          reviewCount: product.reviewCount || 0,
          totalInitialStock: inv.totalInitialStock || 0, // ✅ Total stock across all variants
          totalRemaining: inv.totalOnHand || 0, // ✅ Total stock across all variants
          totalReserved: inv.totalReserved || 0, // ✅ Reserved stock
          totalSold: inv.totalSold || 0, // ✅ Reserved stock
          status: inv.status, // ✅ Overall inventory status
        };
      }),
    );

    // Remove nulls (e.g., missing product)
    const cleanedData = formattedData.filter(Boolean);

    return res.status(200).json({
      status: 200,
      success: true,
      data: cleanedData,
      message: 'Van inventory fetched successfully.',
    });
  } catch (error) {
    console.error('Error fetching driver van inventory:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch van inventory',
      error: error.message,
    });
  }
};
// Get van inventory for driver (by vehicleId)
export const getVanInventory = async (req, res) => {
  try {
    const {sort, q, category, status } = req.query;
    const { vehicleId } = req.body; // Driver passes their assigned vehicleId
    const userRole = req.user?.role || 'consumer'; // default to consumer

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle ID is required',
      });
    }

    const filter = { isDeleted: false, isActive: true, vehicleId };

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { productSlug: { $regex: q, $options: 'i' } },
      ];
    }
    if (category) filter.category = category;
    if (status) filter.status = status;

    // ✅ Fetch paginated van inventory
    const inventories = await InVanInventory.find(filter)
      .sort(sort ? JSON.parse(sort) : { createdAt: -1 })
      .lean();
    const vehicle = await DeliveryVehicle.findOne({
      isDeleted: false,
      isActive: true,
      _id:vehicleId,
    });

    // console.log("VehileData",vehicle)
    

    if (!Array.isArray(inventories)) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch van inventory list',
      });
    }

    // ✅ Map inventories into frontend-ready productData format
    const formattedData = await Promise.all(
      inventories.map(async (inv) => {
        if (!inv.productId) return null;

        const product = await Product.findById(inv.productId)
          .select(
            'name category description specifications featureTags rating reviewCount image variants',
          )
          .lean();

        if (!product) return null;

        // ✅ Map each variant with images + price logic + STOCK
        const mappedVariants = inv.variants.map((v) => {
          const productVariant =
            product.variants?.find(
              (pv, idx) =>
                pv.quantity === v.variantKey ||
                pv.variantIndex === v.variantIndex,
            ) || {};

          // ✅ Choose images priority: inventory variant > product variant
          const variantImages =
            v.images?.length > 0
              ? v.images
              : productVariant.images?.length > 0
                ? productVariant.images
                : [];

          // ✅ Price logic: Use inVanPrice from tierPricing or role-based pricing
          const variantPrice =
            v.tierPricing?.inVanPrice ??
            v.tierPricing?.[userRole] ??
            v.tierPricing?.consumer ??
            0;

          return {
            quantity: v.variantKey,
            price: variantPrice,
            originalPrice: v.mrp ?? 0,
            images: variantImages,
            remainingStock: v.onHand ?? 0, // ✅ available stock for this variant
            soldQuantity: v.sold ?? 0, // ✅ available stock for this variant
            initialStock: v.initialStock ?? 0, // ✅ available stock for this variant
            variantIndex: v.variantIndex, // ✅ to identify variant
            status: v.status, // ✅ variant-level status
            inStock: v.inStock, // ✅ boolean flag
          };
        });

        // ✅ Use first variant as default reference
        const firstVariant = mappedVariants[0] || {};

        // ✅ Parent image fallback logic
        const finalImage =
          product.image || firstVariant.images?.[0] || inv.image || '';

        // ✅ Now parent images come from variant images (only once)
        const finalImages =
          firstVariant.images?.length > 0 ? firstVariant.images : [];

        return {
          id: inv._id,
          productId: inv.productId,
          name: product.name,
          category: product.category,
          quantity: firstVariant.quantity || '',
          price: firstVariant.price || 0,
          originalPrice: firstVariant.originalPrice || 0,
          inStock: inv.status === 'in_stock',
          availableStock: firstVariant.remainingStock || 0, // ✅ stock for default variant
          image: finalImage,
          images: finalImages, // ✅ variant-level images mapped to parent
          variants: mappedVariants, // ✅ includes availableStock for each variant
          specifications: product.specifications || {},
          description: product.description || '',
          featureTags: product.featureTags || [],
          rating: product.rating || 0,
          reviewCount: product.reviewCount || 0,
          totalInitialStock: inv.totalInitialStock || 0, // ✅ Total stock across all variants
          totalRemaining: inv.totalOnHand || 0, // ✅ Total stock across all variants
          totalReserved: inv.totalReserved || 0, // ✅ Reserved stock
          totalSold: inv.totalSold || 0, // ✅ Reserved stock
          status: inv.status, // ✅ Overall inventory status
        };
      }),
    );

    // Remove nulls (e.g., missing product)
    const cleanedData = formattedData.filter(Boolean);

    return res.status(200).json({
      status: 200,
      success: true,
      vehicle,
      data: cleanedData,
      message: 'Van inventory fetched successfully.',
    });
  } catch (error) {
    console.error('Error fetching driver van inventory:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch van inventory',
      error: error.message,
    });
  }
};
