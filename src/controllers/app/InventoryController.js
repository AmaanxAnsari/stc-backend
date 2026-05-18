import CompanyConfig from '../../models/admin/CompanyConfigModel.js';
import AdminInventory from '../../models/admin/InventoryModel.js';
import Product from '../../models/admin/productModel.js';
import { createRepository } from '../../utils/repository.js';

const inventoryRepo = createRepository(AdminInventory, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});


// Get all inventory with filters, pagination, sorting
// export const getAllInventory = async (req, res) => {
//   try {
//     const { page = 1, limit = 20, sort, q, category, status } = req.query;
//     const userRole = req.user?.role || 'consumer'; // default to consumer

//     const filter = { isDeleted: false, isActive: true };

//     if (q) {
//       filter.$or = [
//         { name: { $regex: q, $options: 'i' } },
//         { productSlug: { $regex: q, $options: 'i' } },
//       ];
//     }
//     if (category) filter.category = category;
//     if (status) filter.status = status;

//     // ✅ Fetch paginated inventory
//     const result = await inventoryRepo.getAll({
//       filter,
//       sort: sort ? JSON.parse(sort) : { createdAt: -1 },
//       page,
//       limit,
//       collation: { locale: 'en', strength: 2 },
//     });

//     if (!result.success || !Array.isArray(result.data)) {
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to fetch inventory list',
//       });
//     }

//     // ✅ Map inventories into frontend-ready productData format
//     const formattedData = await Promise.all(
//       result.data.map(async (inv) => {
//         const product = await Product.findById(inv.productId)
//           .select(
//             'name category description specifications featureTags rating reviewCount images image variants',
//           )
//           .lean();

//         if (!product) return null;

//         // ✅ Map each variant with images + price logic
//         const mappedVariants = inv.variants.map((v) => {
//           const productVariant =
//             product.variants?.find(
//               (pv, idx) =>
//                 pv.quantity === v.variantKey ||
//                 pv.variantIndex === v.variantIndex,
//             ) || {};

//           const variantImages =
//             v.images?.length > 0
//               ? v.images
//               : productVariant.images?.length
//                 ? productVariant.images
//                 : [];

//           return {
//             quantity: v.variantKey,
//             price: v.tierPricing?.[userRole] ?? v.tierPricing?.consumer ?? 0,
//             originalPrice: v.mrp ?? 0,
//             images: variantImages,
//           };
//         });

//         const firstVariant = mappedVariants[0] || {};

//         return {
//           id: inv._id,
//           productId: inv.productId,
//           name: product.name,
//           category: product.category,
//           quantity: firstVariant.quantity || '',
//           price: firstVariant.price || 0,
//           originalPrice: firstVariant.originalPrice || 0,
//           inStock: inv.status === 'available',
//           image: product.image || inv.image || firstVariant.images?.[0] || '',
//           images:
//             product.images?.length > 0
//               ? product.images
//               : inv.images?.length > 0
//                 ? inv.images
//                 : firstVariant.images || [],
//           variants: mappedVariants,
//           specifications: product.specifications || {},
//           description: product.description || '',
//           featureTags: product.featureTags || [],
//           rating: product.rating || 0,
//           reviewCount: product.reviewCount || 0,
//         };
//       }),
//     );

//     // Remove nulls (e.g. missing product)
//     const cleanedData = formattedData.filter(Boolean);

//     return res.status(200).json({
//       status: 200,
//       success: true,
//       page: Number(page),
//       limit: Number(limit),
//       total: result.total || cleanedData.length,
//       totalPages: result.totalPages || 1,
//       data: cleanedData,
//       message: 'Fetched successfully.',
//     });
//   } catch (error) {
//     console.error('Error fetching inventory:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch inventory',
//       error: error.message,
//     });
//   }
// };

// export const getAllInventory = async (req, res) => {
//   try {
//     const { page = 1, limit = 20, sort, q, category, status } = req.query;
//     const userRole = req.user?.role || 'consumer'; // default to consumer

//     const filter = { isDeleted: false, isActive: true };

//     if (q) {
//       filter.$or = [
//         { name: { $regex: q, $options: 'i' } },
//         { productSlug: { $regex: q, $options: 'i' } },
//       ];
//     }
//     if (category) filter.category = category;
//     if (status) filter.status = status;

//     // ✅ Fetch paginated inventory
//     const result = await inventoryRepo.getAll({
//       filter,
//       sort: sort ? JSON.parse(sort) : { createdAt: -1 },
//       page,
//       limit,
//       collation: { locale: 'en', strength: 2 },
//     });

//     if (!result.success || !Array.isArray(result.data)) {
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to fetch inventory list',
//       });
//     }

//     // ✅ Map inventories into frontend-ready productData format
//     const formattedData = await Promise.all(
//       result.data.map(async (inv) => {
//         const product = await Product.findById(inv.productId)
//           .select(
//             'name category description specifications featureTags rating reviewCount image variants',
//           )
//           .lean();

//         if (!product) return null;

//         // ✅ Map each variant with images + price logic
//         const mappedVariants = inv.variants.map((v) => {
//           const productVariant =
//             product.variants?.find(
//               (pv, idx) =>
//                 pv.quantity === v.variantKey ||
//                 pv.variantIndex === v.variantIndex,
//             ) || {};

//           // ✅ Choose images priority: inventory variant > product variant
//           const variantImages =
//             v.images?.length > 0
//               ? v.images
//               : productVariant.images?.length > 0
//                 ? productVariant.images
//                 : [];

//           return {
//             quantity: v.variantKey,
//             price: v.tierPricing?.[userRole] ?? v.tierPricing?.consumer ?? 0,
//             originalPrice: v.mrp ?? 0,
//             images: variantImages,
//           };
//         });

//         // ✅ Use first variant as default reference
//         const firstVariant = mappedVariants[0] || {};

//         // ✅ Parent image fallback logic
//         const finalImage =
//           product.image || firstVariant.images?.[0] || inv.image || '';

//         // ✅ Now parent images come from variant images (only once)
//         const finalImages =
//           firstVariant.images?.length > 0 ? firstVariant.images : [];

//         return {
//           id: inv._id,
//           productId: inv.productId,
//           name: product.name,
//           category: product.category,
//           quantity: firstVariant.quantity || '',
//           price: firstVariant.price || 0,
//           originalPrice: firstVariant.originalPrice || 0,
//           inStock: inv.status === 'in_stock',
//           image: finalImage,
//           images: finalImages, // ✅ variant-level images mapped to parent
//           variants: mappedVariants,
//           specifications: product.specifications || {},
//           description: product.description || '',
//           featureTags: product.featureTags || [],
//           rating: product.rating || 0,
//           reviewCount: product.reviewCount || 0,
//         };
//       }),
//     );

//     // Remove nulls (e.g., missing product)
//     const cleanedData = formattedData.filter(Boolean);

//     return res.status(200).json({
//       status: 200,
//       success: true,
//       page: Number(page),
//       limit: Number(limit),
//       total: result.total || cleanedData.length,
//       totalPages: result.totalPages || 1,
//       data: cleanedData,
//       message: 'Fetched successfully.',
//     });
//   } catch (error) {
//     console.error('Error fetching inventory:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch inventory',
//       error: error.message,
//     });
//   }
// };

// Main Working Code 
// export const getAllInventory = async (req, res) => {
//   try {
//     const { page, limit, sort, q, category, status } = req.query;
//     const userRole = req.user?.role || 'consumer'; // default to consumer

//     const filter = { isDeleted: false, isActive: true };

//     if (q) {
//       filter.$or = [
//         { name: { $regex: q, $options: 'i' } },
//         { productSlug: { $regex: q, $options: 'i' } },
//       ];
//     }
//     if (category) filter.category = category;
//     if (status) filter.status = status;

//     // ✅ Fetch paginated inventory
//     const result = await inventoryRepo.getAll({
//       filter,
//       sort: sort ? JSON.parse(sort) : { createdAt: -1 },
//       page,
//       limit,
//       paginate:false,
//       collation: { locale: 'en', strength: 2 },
//     });

//     if (!result.success || !Array.isArray(result.data)) {
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to fetch inventory list',
//       });
//     }

//     // ✅ Map inventories into frontend-ready productData format
//     const formattedData = await Promise.all(
//       result.data.map(async (inv) => {
//         const product = await Product.findById(inv.productId)
//           .select(
//             'name category description specifications featureTags rating reviewCount image variants',
//           )
//           .lean();

//         if (!product) return null;

//         // ✅ Map each variant with images + price logic + STOCK
//         const mappedVariants = inv.variants.map((v) => {
//           const productVariant =
//             product.variants?.find(
//               (pv, idx) =>
//                 pv.quantity === v.variantKey ||
//                 pv.variantIndex === v.variantIndex,
//             ) || {};

//           // ✅ Choose images priority: inventory variant > product variant
//           const variantImages =
//             v.images?.length > 0
//               ? v.images
//               : productVariant.images?.length > 0
//                 ? productVariant.images
//                 : [];

//           return {
//             quantity: v.variantKey,
//             price: v.tierPricing?.[userRole] ?? v.tierPricing?.consumer ?? 0,
//             originalPrice: v.mrp ?? 0,
//             images: variantImages,
//             availableStock: v.onHand ?? 0, // ✅ ADD THIS - available stock for this variant
//             variantIndex: v.variantIndex, // ✅ ADD THIS - to identify variant
//           };
//         });

//         // ✅ Use first variant as default reference
//         const firstVariant = mappedVariants[0] || {};

//         // ✅ Parent image fallback logic
//         const finalImage =
//           product.image || firstVariant.images?.[0] || inv.image || '';

//         // ✅ Now parent images come from variant images (only once)
//         const finalImages =
//           firstVariant.images?.length > 0 ? firstVariant.images : [];

//         return {
//           id: inv._id,
//           productId: inv.productId,
//           name: product.name,
//           category: product.category,
//           quantity: firstVariant.quantity || '',
//           price: firstVariant.price || 0,
//           originalPrice: firstVariant.originalPrice || 0,
//           inStock: inv.status === 'in_stock',
//           // availableStock: firstVariant.availableStock || 0, // ✅ ADD THIS - stock for default variant
//           image: finalImage,
//           images: finalImages, // ✅ variant-level images mapped to parent
//           variants: mappedVariants, // ✅ Now includes availableStock for each variant
//           specifications: product.specifications || {},
//           description: product.description || '',
//           featureTags: product.featureTags || [],
//           rating: product.rating || 0,
//           reviewCount: product.reviewCount || 0,
//         };
//       }),
//     );

//     // Remove nulls (e.g., missing product)
//     const cleanedData = formattedData.filter(Boolean);

//     return res.status(200).json({
//       status: 200,
//       success: true,
//       total: result.total || cleanedData.length,
//       data: cleanedData,
//       message: 'Fetched successfully.',
//     });
//   } catch (error) {
//     console.error('Error fetching inventory:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch inventory',
//       error: error.message,
//     });
//   }
// };
// Main Working code

export const getAllInventory = async (req, res) => {
  try {
    const { page, limit, sort, q, category, status } = req.query;
    const userRole = req.user?.role || 'consumer';

    const filter = { isDeleted: false, isActive: true };

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { productSlug: { $regex: q, $options: 'i' } },
      ];
    }
    if (category) filter.category = category;
    if (status) filter.status = status;

    // ✅ Fetch paginated inventory
    const result = await inventoryRepo.getAll({
      filter,
      sort: sort ? JSON.parse(sort) : { createdAt: -1 },
      page,
      limit,
      paginate: false,
      collation: { locale: 'en', strength: 2 },
    });

    if (!result.success || !Array.isArray(result.data)) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch inventory list',
      });
    }

    // ✅ Map inventories and EXPLODE each variant as separate product
    const formattedData = await Promise.all(
      result.data.map(async (inv) => {
        const product = await Product.findById(inv.productId)
          .select(
            'name category description specifications featureTags rating reviewCount image variants',
          )
          .lean();

        if (!product) return [];

        // ✅ Map all variants first (will be shared across all exploded entries)
        const mappedVariants = inv.variants.map((v) => {
          const productVariant =
            product.variants?.find(
              (pv) =>
                pv.quantity === v.variantKey ||
                pv.variantIndex === v.variantIndex,
            ) || {};

          const variantImages =
            v.images?.length > 0
              ? v.images
              : productVariant.images?.length > 0
                ? productVariant.images
                : [];

          return {
            quantity: v.variantKey,
            price: v.tierPricing?.[userRole] ?? v.tierPricing?.consumer ?? 0,
            originalPrice: v.mrp ?? 0,
            images: variantImages,
            availableStock: v.onHand ?? 0,
            variantIndex: v.variantIndex,
          };
        });

        // ✅ NOW: Create a separate product entry for EACH variant
        return mappedVariants.map((currentVariant) => {
          const finalImage =
            currentVariant.images?.[0] || product.image || inv.image || '';

          const finalImages =
            currentVariant.images?.length > 0 ? currentVariant.images : [];

          return {
            id: inv._id, // ✅ Keep original inventory ID
            productId: inv.productId, // ✅ Keep original product ID
            name: product.name,
            category: product.category,
            quantity: currentVariant.quantity || '',
            price: currentVariant.price || 0,
            originalPrice: currentVariant.originalPrice || 0,
            variantIndex:currentVariant?.variantIndex,
            inStock:
              inv.status === 'in_stock' && currentVariant.availableStock > 0,
            image: finalImage,
            images: finalImages,
            variants: mappedVariants, // ✅ All variants available for switching
            specifications: product.specifications || {},
            description: product.description || '',
            featureTags: product.featureTags || [],
            rating: product.rating || 0,
            reviewCount: product.reviewCount || 0,
          };
        });
      }),
    );

    // ✅ Flatten the array (since we now return array of arrays)
    const cleanedData = formattedData.flat().filter(Boolean);

    const config = await CompanyConfig.findOne({ isDeleted: false });

    return res.status(200).json({
      status: 200,
      success: true,
      total: cleanedData.length,
      config:config,
      data: cleanedData,
      message: 'Fetched successfully.',
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory',
      error: error.message,
    });
  }
};



// Get single inventory by ID
export const getInventoryById = async (req, res) => {
  try {
    const { inventoryId } = req.params;

    const result = await inventoryRepo.getById(inventoryId, { lean: true });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory',
      error: error.message,
    });
  }
};

