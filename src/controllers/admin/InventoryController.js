import CompanyConfig from '../../models/admin/CompanyConfigModel.js';
import AdminInventory from '../../models/admin/InventoryModel.js';
import { createLog } from '../../utils/logUtils.js';
import { createRepository } from '../../utils/repository.js';
import Product from './../../models/admin/productModel.js';

const inventoryRepo = createRepository(AdminInventory, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});

// Add product to inventory (creates inventory entry from product)
// export const addToInventory = async (req, res) => {
//   try {
//     const adminId = req.user?.id;
//     const adminName = req.user?.fullName || 'Admin'; // Get name from req.user
//     if (!adminId) {
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     const { productId, variants, warehouseId, location } = req.body;

//     if (!productId) {
//       return res
//         .status(400)
//         .json({ success: false, message: 'Product ID is required' });
//     }

//     const product = await Product.findById(productId);
//     if (!product) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'Product not found' });
//     }

//     if (product.isDeleted || !product.isActive) {
//       return res
//         .status(400)
//         .json({ success: false, message: 'Product is not active' });
//     }

//     const existingInventory = await AdminInventory.findOne({
//       productId,
//       isDeleted: false,
//     });
//     if (existingInventory) {
//       return res
//         .status(400)
//         .json({ success: false, message: 'Product already in inventory' });
//     }

//     if (!variants || !Array.isArray(variants) || variants.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Variants with stock and pricing required',
//       });
//     }

//     // Map variants with stock and simplified pricing
//     const inventoryVariants = variants.map((v, index) => {
//       const productVariant = product.variants[v.variantIndex ?? index];
//       if (!productVariant) {
//         throw new Error(
//           `Variant index ${v.variantIndex ?? index} not found in product`,
//         );
//       }

//       return {
//         variantKey: productVariant.quantity,
//         variantIndex: v.variantIndex ?? index,
//         costPrice: productVariant.costPrice,
//         mrp: productVariant.mrp,
//         images: productVariant.images,
//         initialStock: v.initialStock || 0,
//         onHand: v.initialStock || 0,
//         reserved: 0,
//         sold: 0,
//         inStock: (v.initialStock || 0) > 0,
//         lowStockThreshold: v.lowStockThreshold || 0,
//         tierPricing: v.tierPricing || {
//           consumer: 0,
//           retailer: 0,
//           wholesaler: 0,
//           distributor: 0,
//           super_stocker: 0,
//         },
//       };
//     });

//     const inventory = new AdminInventory({
//       productId: product._id,
//       productSlug: product.slug,
//       name: product.name,
//       category: product.category,
//       image: product.image,
//       images: product.images || [],
//       variants: inventoryVariants,
//       isActive: true,
//       isDeleted: false,
//       createdBy: adminId,
//       updatedBy: adminId,
//       warehouseId: warehouseId || undefined,
//       location: location || {},
//     });

//     await inventory.save();
//     // ============================================================
//     // ✅ NEW: LOG THE ACTION
//     // ============================================================
//     // We don't await this so response is fast (Fire & Forget)
//     createLog({
//       adminId,
//       adminName,
//       type: 'INVENTORY_ADD',
//       module: 'AdminInventory',
//       description: `Added new product "${inventory.name}" to Warehouse`,
//       metadata: {
//         inventoryId: inventory._id,
//         productId: inventory.productId,
//         initialStock: inventory.totalInitialStock,
//       },
//     });

//     return res.status(201).json({
//       success: true,
//       message: 'Product added to inventory successfully',
//       data: inventory,
//     });
//   } catch (error) {
//     console.error('Error adding to inventory:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to add to inventory',
//       error: error.message,
//     });
//   }
// };

export const addToInventory = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const adminName = req.user?.fullName || req.user?.name || 'Admin';

    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { productId, variants, warehouseId, location } = req.body;

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: 'Product ID is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: 'Product not found' });
    }

    if (product.isDeleted || !product.isActive) {
      return res
        .status(400)
        .json({ success: false, message: 'Product is not active' });
    }

    const existingInventory = await AdminInventory.findOne({
      productId,
      isDeleted: false,
    });
    if (existingInventory) {
      return res
        .status(400)
        .json({ success: false, message: 'Product already in inventory' });
    }

    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'Variants with stock and pricing required',
        });
    }

    // --- LOGGING PREP ---
    let totalInitialStock = 0;
    const stockBreakdown = [];

    // Map variants with stock and simplified pricing
    const inventoryVariants = variants.map((v, index) => {
      const productVariant = product.variants[v.variantIndex ?? index];
      if (!productVariant) {
        throw new Error(
          `Variant index ${v.variantIndex ?? index} not found in product`,
        );
      }

      const initialStock = v.initialStock || 0;

      // Accumulate stats for logging
      totalInitialStock += initialStock;
      if (initialStock > 0) {
        stockBreakdown.push(`${productVariant.quantity} (${initialStock})`);
      }

      return {
        variantKey: productVariant.quantity,
        variantIndex: v.variantIndex ?? index,
        costPrice: productVariant.costPrice,
        mrp: productVariant.mrp,
        images: productVariant.images,
        initialStock: initialStock,
        onHand: initialStock,
        reserved: 0,
        sold: 0,
        inStock: initialStock > 0,
        lowStockThreshold: v.lowStockThreshold || 0,
        tierPricing: v.tierPricing || {
          consumer: 0,
          retailer: 0,
          wholesaler: 0,
          distributor: 0,
          super_stocker: 0,
        },
      };
    });

    const inventory = new AdminInventory({
      productId: product._id,
      productSlug: product.slug,
      name: product.name,
      category: product.category,
      image: product.image,
      images: product.images || [],
      variants: inventoryVariants,
      isActive: true,
      isDeleted: false,
      createdBy: adminId,
      updatedBy: adminId,
      warehouseId: warehouseId || undefined,
      location: location || {},
    });

    await inventory.save();

    // ============================================================
    // ✅ NEW: LOG THE ACTION
    // ============================================================
    let logDescription = `Added "${inventory.name}" to Inventory`;
    if (totalInitialStock > 0) {
      logDescription += ` with ${totalInitialStock} units`;
      if (stockBreakdown.length > 0) {
        // Add brief breakdown if it fits, otherwise put in metadata
        if (stockBreakdown.length <= 3) {
          logDescription += ` [${stockBreakdown.join(', ')}]`;
        }
      }
    } else {
      logDescription += ` (0 Stock)`;
    }

    createLog({
      adminId,
      adminName,
      type: 'INVENTORY_ADD',
      module: 'AdminInventory',
      description: logDescription,
      metadata: {
        inventoryId: inventory._id,
        productId: inventory.productId,
        inventoryName: inventory.name,
        inventoryCategory: inventory.category,
        inventoryImage: inventory.image,
        initialStock: totalInitialStock,
        variantCount: inventory.variants.length,
        stockBreakdown: stockBreakdown,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Product added to inventory successfully',
      data: inventory,
    });
  } catch (error) {
    console.error('Error adding to inventory:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add to inventory',
      error: error.message,
    });
  }
};

// Unified update inventory - handles product info, add/update/remove variants
// export const updateInventory = async (req, res) => {
//   try {
//     const adminId = req.user?.id;
//     const adminName = req.user?.fullName || 'Admin';
//     if (!adminId) {
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     const { inventoryId } = req.params;
//     const { variants, warehouseId, location, isActive } = req.body;

//     const inventory = await AdminInventory.findOne({
//       _id: inventoryId,
//       isDeleted: false,
//     });
//     if (!inventory) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'Inventory not found' });
//     }

//     // Fetch product for variant validation
//     const product = await Product.findById(inventory.productId);
//     if (!product) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'Product not found' });
//     }

//     // Update basic inventory fields if provided
//     if (warehouseId !== undefined) inventory.warehouseId = warehouseId;
//     if (location !== undefined) inventory.location = location;
//     if (isActive !== undefined) inventory.isActive = isActive;

//     // Handle variants if provided
//     if (variants && Array.isArray(variants)) {
//       // Build new variants array from request
//       const newVariants = [];

//       for (const v of variants) {
//         const variantIndex = v.variantIndex;

//         // Validate variant exists in product
//         const productVariant = product.variants[variantIndex];
//         if (!productVariant) {
//           return res.status(400).json({
//             success: false,
//             message: `Variant index ${variantIndex} not found in product`,
//           });
//         }

//         // Find if this variant already exists in inventory
//         const existingVariant = inventory.variants.find(
//           (iv) => iv.variantIndex === variantIndex,
//         );

//         if (existingVariant) {
//           // Update existing variant
//           newVariants.push({
//             variantKey: productVariant.quantity,
//             variantIndex,
//             costPrice: v.costPrice ?? existingVariant.costPrice,
//             mrp: v.mrp ?? existingVariant.mrp,
//             images:existingVariant.images,
//             initialStock: v.initialStock ?? existingVariant.initialStock,
//             onHand: v.onHand ?? existingVariant.onHand,
//             reserved: existingVariant.reserved, // Don't allow direct update
//             sold: existingVariant.sold, // Don't allow direct update
//             inStock: (v.onHand ?? existingVariant.onHand) > 0,
//             lowStockThreshold:
//               v.lowStockThreshold ?? existingVariant.lowStockThreshold,
//             tierPricing: v.tierPricing
//               ? { ...existingVariant.tierPricing, ...v.tierPricing }
//               : existingVariant.tierPricing,
//           });
//         } else {
//           // Add new variant
//           newVariants.push({
//             variantKey: productVariant.quantity,
//             variantIndex,
//             costPrice: v.costPrice ?? productVariant.costPrice,
//             mrp: v.mrp ?? productVariant.mrp,
//             initialStock: v.initialStock || 0,
//             onHand: v.onHand ?? (v.initialStock || 0),
//             inStock: (v.onHand ?? (v.initialStock || 0)) > 0,
//             reserved: 0,
//             sold: 0,
//             lowStockThreshold: v.lowStockThreshold || 0,
//             tierPricing: v.tierPricing || {
//               consumer: 0,
//               retailer: 0,
//               wholesaler: 0,
//               distributor: 0,
//               super_stocker: 0,
//             },
//           });
//         }
//       }

//       // Check for variants being removed (exist in inventory but not in request)
//       const requestedIndices = new Set(variants.map((v) => v.variantIndex));
//       const removedVariants = inventory.variants.filter(
//         (v) => !requestedIndices.has(v.variantIndex),
//       );

//       // Validate removed variants don't have reserved stock
//       for (const removed of removedVariants) {
//         if (removed.reserved > 0) {
//           return res.status(400).json({
//             success: false,
//             message: `Cannot remove variant ${removed.variantKey} with reserved stock (${removed.reserved} units). Release reservations first.`,
//           });
//         }
//       }

//       // Ensure at least one variant remains
//       if (newVariants.length === 0) {
//         return res.status(400).json({
//           success: false,
//           message: 'At least one variant is required',
//         });
//       }

//       // Replace variants
//       inventory.variants = newVariants;
//     }

//     inventory.updatedBy = adminId;
//     inventory.updatedAt = new Date();

//     await inventory.save(); // Triggers recalculation

//     return res.status(200).json({
//       success: true,
//       message: 'Inventory updated successfully',
//       data: inventory,
//     });
//   } catch (error) {
//     console.error('Error updating inventory:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to update inventory',
//       error: error.message,
//     });
//   }
// };

export const updateInventory = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const adminName = req.user?.fullName || req.user?.name || 'Admin';

    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { inventoryId } = req.params;
    const { variants, warehouseId, location, isActive } = req.body;

    const inventory = await AdminInventory.findOne({
      _id: inventoryId,
      isDeleted: false,
    });

    if (!inventory) {
      return res
        .status(404)
        .json({ success: false, message: 'Inventory not found' });
    }

    const product = await Product.findById(inventory.productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: 'Product not found' });
    }

    // --- LOGGING PREP: Track what changes ---
    const changesLog = [];
    const stockChangesLog = []; // To store specific stock updates (e.g., "100ml: +10")
    let totalStockAdded = 0;

    // Basic fields
    if (warehouseId !== undefined && inventory.warehouseId !== warehouseId)
      changesLog.push('Warehouse');
    if (location !== undefined) changesLog.push('Location');
    if (isActive !== undefined && inventory.isActive !== isActive)
      changesLog.push(`Status (${isActive})`);

    // Update basic fields
    if (warehouseId !== undefined) inventory.warehouseId = warehouseId;
    if (location !== undefined) inventory.location = location;
    if (isActive !== undefined) inventory.isActive = isActive;

    // Handle Variants
    if (variants && Array.isArray(variants)) {
      const newVariants = [];

      for (const v of variants) {
        const variantIndex = v.variantIndex;
        const productVariant = product.variants[variantIndex];

        if (!productVariant) continue; // Skip invalid indices

        const existingVariant = inventory.variants.find(
          (iv) => iv.variantIndex === variantIndex,
        );

        if (existingVariant) {
          // --- CALCULATE STOCK DIFFERENCE ---
          const oldStock = existingVariant.onHand;
          const newStock = v.onHand !== undefined ? v.onHand : oldStock;
          const diff = newStock - oldStock;

          if (diff !== 0) {
            totalStockAdded += diff;
            stockChangesLog.push(
              `${productVariant.quantity} (${diff > 0 ? '+' : ''}${diff})`,
            );
          }

          // Check for price changes (optional logging)
          if (
            (v.mrp && v.mrp !== existingVariant.mrp) ||
            (v.costPrice && v.costPrice !== existingVariant.costPrice)
          ) {
            // changesLog.push(`Price update for ${productVariant.quantity}`);
          }

          // Update variant
          newVariants.push({
            variantKey: productVariant.quantity,
            variantIndex,
            costPrice: v.costPrice ?? existingVariant.costPrice,
            mrp: v.mrp ?? existingVariant.mrp,
            images: existingVariant.images,
            initialStock: v.initialStock ?? existingVariant.initialStock,
            onHand: newStock,
            reserved: existingVariant.reserved,
            sold: existingVariant.sold,
            inStock: newStock > 0,
            lowStockThreshold:
              v.lowStockThreshold ?? existingVariant.lowStockThreshold,
            tierPricing: v.tierPricing
              ? { ...existingVariant.tierPricing, ...v.tierPricing }
              : existingVariant.tierPricing,
          });
        } else {
          // New Variant Added
          const initialStock = v.initialStock || 0;
          totalStockAdded += initialStock;
          stockChangesLog.push(
            `${productVariant.quantity} (New: +${initialStock})`,
          );

          newVariants.push({
            variantKey: productVariant.quantity,
            variantIndex,
            costPrice: v.costPrice ?? productVariant.costPrice,
            mrp: v.mrp ?? productVariant.mrp,
            initialStock: initialStock,
            onHand: v.onHand ?? initialStock,
            inStock: (v.onHand ?? initialStock) > 0,
            reserved: 0,
            sold: 0,
            lowStockThreshold: v.lowStockThreshold || 0,
            tierPricing: v.tierPricing || {
              consumer: 0,
              retailer: 0,
              wholesaler: 0,
              distributor: 0,
              super_stocker: 0,
            },
          });
        }
      }

      // Check removed variants
      const requestedIndices = new Set(variants.map((v) => v.variantIndex));
      const removedVariants = inventory.variants.filter(
        (v) => !requestedIndices.has(v.variantIndex),
      );

      for (const removed of removedVariants) {
        if (removed.reserved > 0)
          return res
            .status(400)
            .json({
              success: false,
              message: 'Cannot remove variant with reserved stock',
            });
        // Log removal
        totalStockAdded -= removed.onHand;
        stockChangesLog.push(
          `${removed.variantKey} (Removed: -${removed.onHand})`,
        );
      }

      inventory.variants = newVariants;
    }

    inventory.updatedBy = adminId;
    inventory.updatedAt = new Date();

    await inventory.save();

    // ============================================================
    // ✅ SMART LOGGING LOGIC
    // ============================================================
    let logDescription = `Updated "${inventory.name}"`;

    // 1. Prioritize Stock Changes in Description
    if (stockChangesLog.length > 0) {
      const sign = totalStockAdded > 0 ? '+' : '';
      logDescription += `: Stock ${sign}${totalStockAdded} units`;

      // Add breakdown if concise enough, otherwise put in metadata
      if (stockChangesLog.length <= 3) {
        logDescription += ` [${stockChangesLog.join(', ')}]`;
      }
    }
    // 2. Or mention other changes
    else if (changesLog.length > 0) {
      logDescription += `: Updated ${changesLog.join(', ')}`;
    } else {
      logDescription += ': Updated details';
    }

    createLog({
      adminId,
      adminName,
      type: 'INVENTORY_UPDATE',
      module: 'AdminInventory',
      description: logDescription,
      metadata: {
        inventoryId: inventory._id,
        productId: inventory.productId,
        inventoryName: inventory.name,
        inventoryCategory: inventory.category,
        inventoryImage: inventory.image,
        stockChangeTotal: totalStockAdded,
        stockBreakdown: stockChangesLog, // Full detail here
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Inventory updated successfully',
      data: inventory,
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    return res
      .status(500)
      .json({
        success: false,
        message: 'Failed to update inventory',
        error: error.message,
      });
  }
};

// Update inventory variant stock or pricing
export const updateInventoryVariant = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { inventoryId } = req.params;
    const { variantIndex, updates } = req.body;

    if (variantIndex == null) {
      return res
        .status(400)
        .json({ success: false, message: 'variantIndex required' });
    }

    const inventory = await AdminInventory.findOne({
      _id: inventoryId,
      isDeleted: false,
    });
    if (!inventory) {
      return res
        .status(404)
        .json({ success: false, message: 'Inventory not found' });
    }

    if (variantIndex >= inventory.variants.length) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid variantIndex' });
    }

    const variant = inventory.variants[variantIndex];
    if (updates.onHand != null) variant.onHand = updates.onHand;
    if (updates.initialStock != null)
      variant.initialStock = updates.initialStock;
    if (updates.lowStockThreshold != null)
      variant.lowStockThreshold = updates.lowStockThreshold;
    if (updates.tierPricing)
      variant.tierPricing = { ...variant.tierPricing, ...updates.tierPricing };
    if (updates.costPrice != null) variant.costPrice = updates.costPrice;
    if (updates.mrp != null) variant.mrp = updates.mrp;

    inventory.updatedBy = adminId;
    inventory.updatedAt = new Date();
    console.log('Default status before save:', inventory.status);


    // await inventory.save();

    return res.status(200).json({
      success: true,
      message: 'Inventory variant updated',
      data: inventory,
    });
  } catch (error) {
    console.error('Error updating inventory variant:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update inventory variant',
      error: error.message,
    });
  }
};

// Adjust stock (add or reduce onHand for restocks or corrections)
export const adjustStock = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { inventoryId } = req.params;
    const { variantIndex, adjustment, reason } = req.body;

    if (variantIndex == null || adjustment == null) {
      return res.status(400).json({
        success: false,
        message: 'variantIndex and adjustment required',
      });
    }

    const inventory = await AdminInventory.findOne({
      _id: inventoryId,
      isDeleted: false,
    });
    if (!inventory) {
      return res
        .status(404)
        .json({ success: false, message: 'Inventory not found' });
    }

    if (variantIndex >= inventory.variants.length) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid variantIndex' });
    }

    const variant = inventory.variants[variantIndex];
    const newOnHand = variant.onHand + adjustment;

    if (newOnHand < 0) {
      return res
        .status(400)
        .json({ success: false, message: 'Insufficient stock for adjustment' });
    }

    variant.onHand = newOnHand;
    inventory.updatedBy = adminId;
    inventory.updatedAt = new Date();

    await inventory.save();

    return res.status(200).json({
      success: true,
      message: `Stock adjusted by ${adjustment}. Reason: ${reason || 'N/A'}`,
      data: inventory,
    });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to adjust stock',
      error: error.message,
    });
  }
};

// Remove product from inventory (soft delete)
// export const removeFromInventory = async (req, res) => {
//   try {
//     const adminId = req.user?.id;
//     if (!adminId) {
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     const { inventoryId } = req.params;

//     const inventory = await AdminInventory.findOne({
//       _id: inventoryId,
//       isDeleted: false,
//     });
//     if (!inventory) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'Inventory not found' });
//     }

//     inventory.isDeleted = true;
//     inventory.deletedAt = new Date();
//     inventory.updatedBy = adminId;

//     await inventory.save();

//     return res.status(200).json({
//       success: true,
//       message: 'Product removed from inventory',
//       data: inventory,
//     });
//   } catch (error) {
//     console.error('Error removing from inventory:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to remove from inventory',
//       error: error.message,
//     });
//   }
// };

export const removeFromInventory = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const adminName = req.user?.fullName || req.user?.name || 'Admin';

    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { inventoryId } = req.params;

    const inventory = await AdminInventory.findOne({
      _id: inventoryId,
      // No filter for isDeleted needed for hard delete,
      // but good practice if you have mixed data.
    });

    if (!inventory) {
      return res
        .status(404)
        .json({ success: false, message: 'Inventory not found' });
    }

    // Capture details for logs BEFORE deleting
    const logDetails = {
      inventoryName: inventory.name,
      inventoryCategory: inventory.category,
      inventoryImage: inventory.image,
      id: inventory._id,
      productId: inventory.productId,
      finalStock: inventory.totalOnHand,
    };

    // ============================================================
    // ✅ LOG THE ACTION
    // ============================================================
    createLog({
      adminId,
      adminName,
      type: 'INVENTORY_DELETE',
      module: 'AdminInventory',
      description: `Removed "${logDetails.inventoryName}" from inventory`,
      metadata: logDetails,
    });

    // ============================================================
    // 💥 HARD DELETE
    // ============================================================
    await AdminInventory.findByIdAndDelete(inventoryId);

    return res.status(200).json({
      success: true,
      message: 'Product  removed from inventory',
      data: null, // No data to return after delete
    });
  } catch (error) {
    console.error('Error removing from inventory:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove from inventory',
      error: error.message,
    });
  }
};

// // Get all inventory with filters, pagination, sorting
// export const getAllInventory = async (req, res) => {
//   try {
//     const { page, limit, sort, q, category, status } = req.query;

//     const filter = { isDeleted: false };
//     if (q) {
//       filter.$or = [
//         { name: { $regex: q, $options: 'i' } },
//         { productSlug: { $regex: q, $options: 'i' } },
//       ];
//     }
//     if (category) filter.category = category;
//     if (status) filter.status = status;

//     const result = await inventoryRepo.getAll({
//       filter,
//       sort: sort ? JSON.parse(sort) : { createdAt: -1 },
//       page,
//       limit,
//       paginate:false,
//       collation: { locale: 'en', strength: 2 },
//     });

//     return res.status(result.status).json(result);
//   } catch (error) {
//     console.error('Error fetching inventory:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch inventory',
//       error: error.message,
//     });
//   }
// };


export const getAllInventory = async (req, res) => {
  try {
    const { page = 1, limit = 20, sort, q, category, status } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // 1. Build Match Stage (Filtering)
    const matchStage = { isDeleted: false };
    if (q) {
      matchStage.$or = [
        { name: { $regex: q, $options: 'i' } },
        { productSlug: { $regex: q, $options: 'i' } },
      ];
    }
    if (category) matchStage.category = category;
    if (status) matchStage.status = status;

    // 2. Build Sort Stage
    let sortStage = { createdAt: -1 };
    if (sort) {
      try {
        sortStage = JSON.parse(sort);
      } catch (e) {
        console.warn('Invalid sort JSON, using default');
      }
    }

    // 3. Aggregation Pipeline
    const pipeline = [
      // A. Filter & Sort First (Efficiency)
      { $match: matchStage },
      { $sort: sortStage },
      { $skip: skip },
      // { $limit: limitNum },

      // B. Lookup Van Inventories for this Product
      // We look for any InVanInventory doc where productId matches this AdminInventory._id
      // (Note: AdminInventory._id IS the productId reference in InVanInventory if you structured it that way?
      // WAIT - looking at your schema, AdminInventory has a 'productId' field referencing 'Product'.
      // AND InVanInventory has 'productId' referencing 'Product'.
      // SO we must join on 'productId', NOT '_id'.)
      {
        $lookup: {
          from: 'invaninventories', // Ensure this matches your actual MongoDB collection name!
          localField: 'productId', // AdminInventory.productId
          foreignField: 'productId', // InVanInventory.productId
          as: 'vanDocs',
        },
      },

      // C. Lookup Vehicle Details for the Van Docs
      // This is a bit complex in standard lookup.
      // Easier approach: Unwind vanDocs, lookup vehicle, regroup.
      // But unwinding explodes the document count.
      // Better approach: Use a pipeline lookup inside the first lookup? No, let's keep it simple.
      // We will simply compute totals first, then project the array.

      // Let's use $map to transform vanDocs into the shape we want,
      // BUT we need vehicle names.
      // We can use a nested lookup pipeline (MongoDB 3.6+)
      {
        $lookup: {
          from: 'invaninventories',
          let: { pid: '$productId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$productId', '$$pid'] } } },
            { $match: { isDeleted: false } }, // Optional safety
            // Lookup Vehicle for this Van Inventory
            {
              $lookup: {
                from: 'deliveryvehicles', // Ensure collection name is correct
                localField: 'vehicleId',
                foreignField: '_id',
                as: 'vehicleInfo',
              },
            },
            {
              $unwind: {
                path: '$vehicleInfo',
                preserveNullAndEmptyArrays: true,
              },
            },
            // Project only what we need for the array
            {
              $project: {
                vehicleId: '$vehicleId',
                vehicleName: '$vehicleInfo.vehicleName',
                vehicleNumber: '$vehicleInfo.vehicleNumber',
                totalOnHand: '$totalOnHand', // Stock currently in this van
              },
            },
          ],
          as: 'detailedVanData',
        },
      },

      // D. Calculate Aggregates
      {
        $addFields: {
          // Sum of stock currently sitting in ALL vans
          totalInVan: { $sum: '$detailedVanData.totalOnHand' },

          // List of vehicles holding this stock
          totalVehicleInventory: '$detailedVanData',
        },
      },

      // E. Calculate App Reserved
      // App Reserved = Total Reserved (Admin) - Total In Van
      // Logic: Admin 'totalReserved' includes stock moved to vans.
      // So subtraction gives us stock reserved for App orders (pre-dispatch).
      {
        $addFields: {
          totalAppReserved: {
            $subtract: ['$totalReserved', '$totalInVan'],
          },
        },
      },

      // F. Final Projection (Optional cleanup)
      {
        $project: {
          vanDocs: 0, // Remove the raw large array if any
          detailedVanData: 0, // We mapped this to totalVehicleInventory already? No, let's keep naming clean.
        },
      },
      // Rename 'detailedVanData' to 'totalVehicleInventory' if preferred, or just leave it.
      // Let's rely on the addFields above.
      {
        $addFields: {
          // Ensure we don't return negative numbers if data is slightly out of sync
          totalAppReserved: { $max: [0, '$totalAppReserved'] },
        },
      },
    ];

    // 4. Execute Aggregation
    const inventoryData = await AdminInventory.aggregate(pipeline);

    // 5. Get Total Count for Pagination (Separate query)
    const totalCount = await AdminInventory.countDocuments(matchStage);
    const config = await CompanyConfig.findOne({ isDeleted: false });

    return res.status(200).json({
      success: true,
      message: 'Fetched successfully.',
      config:config,
      data: inventoryData,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      },
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

// Add new variant to existing inventory
export const addVariantToInventory = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { inventoryId } = req.params;
    const { variant } = req.body;

    if (!variant) {
      return res
        .status(400)
        .json({ success: false, message: 'Variant data is required' });
    }

    const inventory = await AdminInventory.findOne({
      _id: inventoryId,
      isDeleted: false,
    });
    if (!inventory) {
      return res
        .status(404)
        .json({ success: false, message: 'Inventory not found' });
    }

    const product = await Product.findById(inventory.productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: 'Product not found' });
    }

    const variantIndex = variant.variantIndex;
    if (variantIndex == null || !product.variants[variantIndex]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid variantIndex or variant not found in product',
      });
    }

    const existingVariant = inventory.variants.find(
      (v) => v.variantIndex === variantIndex,
    );
    if (existingVariant) {
      return res.status(400).json({
        success: false,
        message: 'Variant already exists in inventory',
      });
    }

    const productVariant = product.variants[variantIndex];

    const newInventoryVariant = {
      variantKey: productVariant.quantity,
      variantIndex,
      costPrice: productVariant.costPrice,
      mrp: productVariant.mrp,
      initialStock: variant.initialStock || 0,
      onHand: variant.initialStock || 0,
      reserved: 0,
      sold: 0,
      inStock: (variant.initialStock || 0) > 0,
      lowStockThreshold: variant.lowStockThreshold || 0,
      tierPricing: variant.tierPricing || {
        consumer: 0,
        retailer: 0,
        wholesaler: 0,
        distributor: 0,
        super_stocker: 0,
      },
    };

    inventory.variants.push(newInventoryVariant);
    inventory.updatedBy = adminId;
    inventory.updatedAt = new Date();

    await inventory.save();

    return res.status(200).json({
      success: true,
      message: 'Variant added to inventory successfully',
      data: inventory,
    });
  } catch (error) {
    console.error('Error adding variant to inventory:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add variant to inventory',
      error: error.message,
    });
  }
};

// Update specific inventory variant by index
export const updateInventoryVariantByIndex = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { inventoryId, variantIndex } = req.params;
    const { updates } = req.body;

    const varIndex = parseInt(variantIndex);
    if (isNaN(varIndex)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid variantIndex' });
    }

    const inventory = await AdminInventory.findOne({
      _id: inventoryId,
      isDeleted: false,
    });
    if (!inventory) {
      return res
        .status(404)
        .json({ success: false, message: 'Inventory not found' });
    }

    if (varIndex < 0 || varIndex >= inventory.variants.length) {
      return res
        .status(400)
        .json({ success: false, message: 'Variant index out of range' });
    }

    const variant = inventory.variants[varIndex];
    if (updates.onHand != null) variant.onHand = updates.onHand;
    if (updates.initialStock != null)
      variant.initialStock = updates.initialStock;
    if (updates.lowStockThreshold != null)
      variant.lowStockThreshold = updates.lowStockThreshold;
    if (updates.tierPricing)
      variant.tierPricing = { ...variant.tierPricing, ...updates.tierPricing };
    if (updates.costPrice != null) variant.costPrice = updates.costPrice;
    if (updates.mrp != null) variant.mrp = updates.mrp;

    inventory.updatedBy = adminId;
    inventory.updatedAt = new Date();

    await inventory.save();

    return res.status(200).json({
      success: true,
      message: 'Inventory variant updated successfully',
      data: inventory,
    });
  } catch (error) {
    console.error('Error updating inventory variant:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update inventory variant',
      error: error.message,
    });
  }
};

// Delete specific variant from inventory
export const deleteInventoryVariant = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { inventoryId, variantIndex } = req.params;

    const varIndex = parseInt(variantIndex);
    if (isNaN(varIndex)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid variantIndex' });
    }

    const inventory = await AdminInventory.findOne({
      _id: inventoryId,
      isDeleted: false,
    });
    if (!inventory) {
      return res
        .status(404)
        .json({ success: false, message: 'Inventory not found' });
    }

    if (varIndex < 0 || varIndex >= inventory.variants.length) {
      return res
        .status(400)
        .json({ success: false, message: 'Variant index out of range' });
    }

    if (inventory.variants.length === 1) {
      return res.status(400).json({
        success: false,
        message:
          'Cannot delete the last variant. Remove the product from inventory instead.',
      });
    }

    const deletedVariant = inventory.variants[varIndex];

    if (deletedVariant.reserved > 0) {
      return res.status(400).json({
        success: false,
        message:
          'Cannot delete variant with reserved stock. Release reservations first.',
      });
    }

    inventory.variants.splice(varIndex, 1);
    inventory.updatedBy = adminId;
    inventory.updatedAt = new Date();

    await inventory.save();

    return res.status(200).json({
      success: true,
      message: 'Inventory variant deleted successfully',
      data: inventory,
    });
  } catch (error) {
    console.error('Error deleting inventory variant:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete inventory variant',
      error: error.message,
    });
  }
};

// Bulk update multiple variants at once
export const bulkUpdateInventoryVariants = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { inventoryId } = req.params;
    const { variantUpdates } = req.body;

    if (!Array.isArray(variantUpdates) || variantUpdates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'variantUpdates array is required',
      });
    }

    const inventory = await AdminInventory.findOne({
      _id: inventoryId,
      isDeleted: false,
    });
    if (!inventory) {
      return res
        .status(404)
        .json({ success: false, message: 'Inventory not found' });
    }

    variantUpdates.forEach((update) => {
      const { variantIndex, updates } = update;
      if (
        variantIndex != null &&
        variantIndex >= 0 &&
        variantIndex < inventory.variants.length
      ) {
        const variant = inventory.variants[variantIndex];
        if (updates.onHand != null) variant.onHand = updates.onHand;
        if (updates.initialStock != null)
          variant.initialStock = updates.initialStock;
        if (updates.lowStockThreshold != null)
          variant.lowStockThreshold = updates.lowStockThreshold;
        if (updates.tierPricing)
          variant.tierPricing = {
            ...variant.tierPricing,
            ...updates.tierPricing,
          };
        if (updates.costPrice != null) variant.costPrice = updates.costPrice;
        if (updates.mrp != null) variant.mrp = updates.mrp;
      }
    });

    inventory.updatedBy = adminId;
    inventory.updatedAt = new Date();

    await inventory.save();

    return res.status(200).json({
      success: true,
      message: 'Bulk variant update completed successfully',
      data: inventory,
    });
  } catch (error) {
    console.error('Error bulk updating inventory variants:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to bulk update variants',
      error: error.message,
    });
  }
};
