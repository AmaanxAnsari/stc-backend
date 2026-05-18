import DeliveryVehicle from "../../models/admin/deliveryVehicleModel.js";
import InVanInventory from "../../models/admin/InVanInventoryModel.js";
import Product from "../../models/admin/productModel.js";
import { createRepository } from "../../utils/repository.js";

const inVanInventoryRepo = createRepository(InVanInventory, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});

// Create empty inventory for a vehicle
export const createVanInventory = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { vehicleId, routeId } = req.body;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle ID is required',
      });
    }

    const vehicle = await DeliveryVehicle.findById(vehicleId);
    if (!vehicle || vehicle.isDeleted || !vehicle.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or inactive',
      });
    }

    // Check if inventory already exists for this vehicle
    const existingInventory = await InVanInventory.findOne({
      vehicleId,
      isDeleted: false,
    });
    if (existingInventory) {
      return res.status(400).json({
        success: false,
        message: 'Inventory already exists for this vehicle',
      });
    }

    const vanInventory = new InVanInventory({
      vehicleId,
      routeId: routeId || null,
      inventoryType: 'in_van',
      variants: [],
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    await vanInventory.save();

    return res.status(201).json({
      success: true,
      message: 'Van inventory created successfully',
      data: vanInventory,
    });
  } catch (error) {
    console.error('Error creating van inventory:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create van inventory',
      error: error.message,
    });
  }
};

// Update vehicle assignment for inventory
export const updateVehicleAssignment = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { inventoryId } = req.params;
    const { vehicleId, routeId } = req.body;

    const inventory = await InVanInventory.findOne({
      _id: inventoryId,
      isDeleted: false,
    });
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory not found',
      });
    }

    if (vehicleId) {
      const vehicle = await DeliveryVehicle.findById(vehicleId);
      if (!vehicle || vehicle.isDeleted || !vehicle.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found or inactive',
        });
      }

      // Check if another inventory exists for the new vehicle
      const existingInventory = await InVanInventory.findOne({
        vehicleId,
        _id: { $ne: inventoryId },
        isDeleted: false,
      });
      if (existingInventory) {
        return res.status(400).json({
          success: false,
          message: 'Another inventory already exists for this vehicle',
        });
      }

      inventory.vehicleId = vehicleId;
    }

    if (routeId !== undefined) {
      inventory.routeId = routeId || null;
    }

    inventory.updatedBy = adminId;
    inventory.updatedAt = new Date();

    await inventory.save();

    return res.status(200).json({
      success: true,
      message: 'Vehicle assignment updated successfully',
      data: inventory,
    });
  } catch (error) {
    console.error('Error updating vehicle assignment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update vehicle assignment',
      error: error.message,
    });
  }
};



// Add single product to van inventory
export const addProductToVan = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { vehicleId } = req.params;
    const { productId, variants } = req.body;
    console.log("VehiclId", vehicleId)
    console.log("Body",req.body)

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle ID is required',
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    // Check if vehicle exists
    const vehicle = await DeliveryVehicle.findOne({
      _id: vehicleId,
      isDeleted: false,
    });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
    }

    // Check if product already exists in this van inventory
    const existingInventory = await InVanInventory.findOne({
      vehicleId,
      productId,
      isDeleted: false,
    });

    if (existingInventory) {
      return res.status(400).json({
        success: false,
        message: 'Product already exists in this van inventory',
      });
    }

    // Get product details
    const product = await Product.findById(productId);
    if (!product || product.isDeleted || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or inactive',
      });
    }

    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Variants with stock and pricing required',
      });
    }

    // Build inventory variants
    const inventoryVariants = variants.map((v, index) => {
      const productVariant = product.variants[v.variantIndex ?? index];
      if (!productVariant) {
        throw new Error(
          `Variant index ${v.variantIndex ?? index} not found in product`,
        );
      }

      return {
        variantKey: productVariant.quantity,
        variantIndex: v.variantIndex ?? index,
        costPrice: v.costPrice ?? productVariant.costPrice,
        mrp: v.mrp ?? productVariant.mrp,
        initialStock: v.initialStock || 0,
        onHand: v.initialStock || 0,
        reserved: 0,
        sold: 0,
        inStock: (v.initialStock || 0) > 0,
        status: (v.initialStock || 0) > 0 ? 'in_stock' : 'out_of_stock',
        lowStockThreshold: v.lowStockThreshold || 0,
        tierPricing: {
          inVanPrice: v.inVanPrice || 0,
        },
      };
    });

    // Calculate totals
    const totalInitialStock = inventoryVariants.reduce(
      (sum, v) => sum + v.initialStock,
      0,
    );
    const totalOnHand = inventoryVariants.reduce((sum, v) => sum + v.onHand, 0);

    // Create new inventory entry
    const newInventory = new InVanInventory({
      vehicleId,
      routeId: vehicle.routeId || null,
      inventoryType: 'in_van',
      productId: product._id,
      productSlug: product.slug,
      name: product.name,
      category: product.category,
      image: product.image,
      images: product.images || [],
      variants: inventoryVariants,
      totalInitialStock,
      totalOnHand,
      totalReserved: 0,
      totalSold: 0,
      status: totalOnHand > 0 ? 'in_stock' : 'out_of_stock',
      isActive: true,
      isDeleted: false,
      createdBy: adminId,
      updatedBy: adminId,
    });

    await newInventory.save();

    return res.status(201).json({
      success: true,
      message: 'Product added to van inventory successfully',
      data: newInventory,
    });
  } catch (error) {
    console.error('Error adding product to van:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add product to van',
      error: error.message,
    });
  }
};


// Bulk add multiple products to van inventory
export const bulkAddProductsToVan = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { vehicleId, routeId, products } = req.body;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle ID is required',
      });
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Products array is required',
      });
    }

    const vehicle = await DeliveryVehicle.findById(vehicleId);
    if (!vehicle || vehicle.isDeleted || !vehicle.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or inactive',
      });
    }

    const createdInventories = [];
    const errors = [];

    for (const item of products) {
      try {
        const { productId, variants } = item;

        if (!productId || !variants || variants.length === 0) {
          errors.push({
            productId,
            error: 'Product ID and variants required',
          });
          continue;
        }

        // Check if inventory already exists
        const existing = await InVanInventory.findOne({
          vehicleId,
          productId,
          isDeleted: false,
        });
        if (existing) {
          errors.push({
            productId,
            error: 'Product already in van inventory',
          });
          continue;
        }

        const product = await Product.findById(productId);
        if (!product || product.isDeleted || !product.isActive) {
          errors.push({
            productId,
            error: 'Product not found or inactive',
          });
          continue;
        }

        const inventoryVariants = variants.map((v, index) => {
          const productVariant = product.variants[v.variantIndex ?? index];
          if (!productVariant) {
            throw new Error(
              `Variant index ${v.variantIndex ?? index} not found`,
            );
          }

          return {
            variantKey: productVariant.quantity,
            variantIndex: v.variantIndex ?? index,
            costPrice: v.costPrice ?? productVariant.costPrice,
            mrp: v.mrp ?? productVariant.mrp,
            initialStock: v.initialStock || 0,
            onHand: v.initialStock || 0,
            reserved: 0,
            sold: 0,
            inStock: (v.initialStock || 0) > 0,
            lowStockThreshold: v.lowStockThreshold || 0,
            tierPricing: {
              inVanPrice: v.inVanPrice || 0,
            },
          };
        });

        const vanInventory = new InVanInventory({
          vehicleId,
          routeId: routeId || null,
          inventoryType: 'in_van',
          productId: product._id,
          productSlug: product.slug,
          name: product.name,
          category: product.category,
          image: product.image,
          images: product.images || [],
          variants: inventoryVariants,
          isActive: true,
          createdBy: adminId,
          updatedBy: adminId,
        });

        await vanInventory.save();
        createdInventories.push(vanInventory);
      } catch (err) {
        errors.push({
          productId: item.productId,
          error: err.message,
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: `Bulk add completed. ${createdInventories.length} products added successfully`,
      data: {
        created: createdInventories,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error('Error bulk adding products to van:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to bulk add products',
      error: error.message,
    });
  }
};

// Update van inventory product and variants
export const updateVanInventory = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { inventoryId } = req.params;
    const { variants, isActive } = req.body;

    const inventory = await InVanInventory.findOne({
      _id: inventoryId,
      isDeleted: false,
    });
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory not found',
      });
    }

    if (!inventory.productId) {
      return res.status(400).json({
        success: false,
        message: 'No product assigned to this inventory',
      });
    }

    const product = await Product.findById(inventory.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (isActive !== undefined) inventory.isActive = isActive;

    if (variants && Array.isArray(variants)) {
      const newVariants = [];

      for (const v of variants) {
        const variantIndex = v.variantIndex;
        const productVariant = product.variants[variantIndex];
        if (!productVariant) {
          return res.status(400).json({
            success: false,
            message: `Variant index ${variantIndex} not found in product`,
          });
        }

        const existingVariant = inventory.variants.find(
          (iv) => iv.variantIndex === variantIndex,
        );

        if (existingVariant) {
          newVariants.push({
            variantKey: productVariant.quantity,
            variantIndex,
            costPrice: v.costPrice ?? existingVariant.costPrice,
            mrp: v.mrp ?? existingVariant.mrp,
            initialStock: v.initialStock ?? existingVariant.initialStock,
            onHand: v.onHand ?? existingVariant.onHand,
            reserved: existingVariant.reserved,
            sold: existingVariant.sold,
            inStock: (v.onHand ?? existingVariant.onHand) > 0,
            lowStockThreshold:
              v.lowStockThreshold ?? existingVariant.lowStockThreshold,
            tierPricing: v.tierPricing
              ? { ...existingVariant.tierPricing, ...v.tierPricing }
              : existingVariant.tierPricing,
          });
        } else {
          newVariants.push({
            variantKey: productVariant.quantity,
            variantIndex,
            costPrice: v.costPrice ?? productVariant.costPrice,
            mrp: v.mrp ?? productVariant.mrp,
            initialStock: v.initialStock || 0,
            onHand: v.onHand ?? (v.initialStock || 0),
            reserved: 0,
            sold: 0,
            inStock: (v.onHand ?? (v.initialStock || 0)) > 0,
            lowStockThreshold: v.lowStockThreshold || 0,
            tierPricing: v.tierPricing || { inVanPrice: 0 },
          });
        }
      }

      const requestedIndices = new Set(variants.map((v) => v.variantIndex));
      const removedVariants = inventory.variants.filter(
        (v) => !requestedIndices.has(v.variantIndex),
      );

      for (const removed of removedVariants) {
        if (removed.reserved > 0) {
          return res.status(400).json({
            success: false,
            message: `Cannot remove variant ${removed.variantKey} with reserved stock (${removed.reserved} units)`,
          });
        }
      }

      if (newVariants.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one variant is required',
        });
      }

      inventory.variants = newVariants;
    }

    inventory.updatedBy = adminId;
    inventory.updatedAt = new Date();

    await inventory.save();

    return res.status(200).json({
      success: true,
      message: 'Van inventory updated successfully',
      data: inventory,
    });
  } catch (error) {
    console.error('Error updating van inventory:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update van inventory',
      error: error.message,
    });
  }
};

// Update single variant in van inventory
export const updateVanInventoryVariant = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { inventoryId, variantIndex } = req.params;
    const { updates } = req.body;

    const varIndex = parseInt(variantIndex);
    if (isNaN(varIndex)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid variantIndex',
      });
    }

    const inventory = await InVanInventory.findOne({
      _id: inventoryId,
      isDeleted: false,
    });
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory not found',
      });
    }

    if (varIndex < 0 || varIndex >= inventory.variants.length) {
      return res.status(400).json({
        success: false,
        message: 'Variant index out of range',
      });
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
      message: 'Van inventory variant updated successfully',
      data: inventory,
    });
  } catch (error) {
    console.error('Error updating van inventory variant:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update variant',
      error: error.message,
    });
  }
};

// Adjust stock for van inventory
export const adjustVanStock = async (req, res) => {
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

    const inventory = await InVanInventory.findOne({
      _id: inventoryId,
      isDeleted: false,
    });
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory not found',
      });
    }

    if (variantIndex >= inventory.variants.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid variantIndex',
      });
    }

    const variant = inventory.variants[variantIndex];
    const newOnHand = variant.onHand + adjustment;

    if (newOnHand < 0) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock for adjustment',
      });
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
    console.error('Error adjusting van stock:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to adjust stock',
      error: error.message,
    });
  }
};


export const getAllVanInventory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort,
      q,
      vehicleId,
      status,
      category,
    } = req.query;

    const matchStage = { isDeleted: false };
    if (q) {
      matchStage.$or = [
        { name: { $regex: q, $options: 'i' } },
        { productSlug: { $regex: q, $options: 'i' } },
      ];
    }
    if (vehicleId) matchStage.vehicleId = mongoose.Types.ObjectId(vehicleId);
    if (status) matchStage.status = status;
    if (category) matchStage.category = category;

    // Build aggregation pipeline
    const pipeline = [
      { $match: matchStage },

      // Lookup vehicle details
      {
        $lookup: {
          from: 'deliveryvehicles',
          localField: 'vehicleId',
          foreignField: '_id',
          as: 'vehicleDetails',
        },
      },
      {
        $unwind: { path: '$vehicleDetails', preserveNullAndEmptyArrays: true },
      },

      // Group by vehicle
      {
        $group: {
          _id: '$vehicleId',
          vehicleName: { $first: '$vehicleDetails.vehicleName' },
          vehicleNumber: { $first: '$vehicleDetails.vehicleNumber' },
          routeId: { $first: '$routeId' },

          // Aggregate counts
          totalProducts: { $sum: 1 },
          totalInitialStock: { $sum: '$totalInitialStock' },
          totalOnHand: { $sum: '$totalOnHand' },
          totalReserved: { $sum: '$totalReserved' },
          totalSold: { $sum: '$totalSold' },
        },
      },

      // Project final structure
      {
        $project: {
          _id: 0,
          vehicleId: '$_id',
          vehicleName: 1,
          vehicleNumber: 1,
          routeId: 1,
          totalProducts: 1,
          totalInitialStock: 1,
          totalOnHand: 1,
          totalReserved: 1,
          totalSold: 1,
        },
      },

      // Sort
      { $sort: { vehicleName: 1 } },
    ];

    // Count pipeline
    const countPipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$vehicleId',
        },
      },
      { $count: 'total' },
    ];

    // Execute aggregation with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    
    const [results, totalCount] = await Promise.all([
      InVanInventory.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: parseInt(limit) },
      ]),
      InVanInventory.aggregate(countPipeline),
    ]);

    const total = totalCount[0]?.total || 0;
    const totalPages = Math.ceil(total / parseInt(limit));

    return res.status(200).json({
      success: true,
      status: 200,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages,
      data: results,
      message: 'Fetched successfully.',
    });
  } catch (error) {
    console.error('Error fetching van inventory:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch van inventory',
      error: error.message,
    });
  }
};


// Get single van inventory by ID
export const getVanInventoryById = async (req, res) => {
  try {
    const { inventoryId } = req.params;

    const result = await inVanInventoryRepo.getById(inventoryId, {
      lean: true,
      populate: [
        { path: 'vehicleId', select: 'vehicleName vehicleNumber' },
        // { path: 'routeId', select: 'routeName' },
        // { path: 'productId', select: 'name slug category' },
      ],
    });

    return res.status(result.status).json(result);
  } catch (error) {
    console.error('Error fetching van inventory:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch van inventory',
      error: error.message,
    });
  }
};

// Get van inventory by vehicle ID
export const getVanInventoryByVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const inventories = await InVanInventory.find({
      vehicleId,
      isDeleted: false,
    })
      .populate('vehicleId', 'vehicleName vehicleNumber')
      .populate('routeId', 'routeName')
      .populate('productId', 'name slug category')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: inventories,
      count: inventories.length,
    });
  } catch (error) {
    console.error('Error fetching van inventory by vehicle:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch van inventory',
      error: error.message,
    });
  }
};


export const deleteVanInventory = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'vehicleId is required',
      });
    }

    // Delete all inventories for the given vehicleId
    const deleteResult = await InVanInventory.deleteMany({
      vehicleId,
    });

    return res.status(200).json({
      success: true,
      message: 'All van inventories deleted successfully',
      deletedCount: deleteResult.deletedCount,
    });
  } catch (error) {
    console.error('Error deleting van inventory:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete van inventory',
      error: error.message,
    });
  }
};


// Remove product from van inventory
export const removeProductFromVan = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { inventoryId } = req.params;

    const inventory = await InVanInventory.findOne({
      _id: inventoryId,
      isDeleted: false,
    });
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory not found',
      });
    }

    // Check for reserved stock
    const hasReserved = inventory.variants.some((v) => v.reserved > 0);
    if (hasReserved) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove product with reserved stock',
      });
    }

    // Clear product data but keep vehicle assignment
    inventory.productId = undefined;
    inventory.productSlug = undefined;
    inventory.name = undefined;
    inventory.category = undefined;
    inventory.image = undefined;
    inventory.images = [];
    inventory.variants = [];
    inventory.updatedBy = adminId;
    inventory.updatedAt = new Date();

    await inventory.save();

    return res.status(200).json({
      success: true,
      message: 'Product removed from van inventory',
      data: inventory,
    });
  } catch (error) {
    console.error('Error removing product from van:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove product',
      error: error.message,
    });
  }
};

// Add single product to van inventory
// export const addProductToVan = async (req, res) => {
//   try {
//     const adminId = req.user?.id;
//     if (!adminId) {
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     const { inventoryId } = req.params;
//     const { productId, variants } = req.body;

//     if (!productId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Product ID is required',
//       });
//     }

//     const inventory = await InVanInventory.findOne({
//       _id: inventoryId,
//       isDeleted: false,
//     });
//     if (!inventory) {
//       return res.status(404).json({
//         success: false,
//         message: 'Inventory not found',
//       });
//     }

//     // Check if product already exists in this van inventory
//     if (inventory.productId && inventory.productId.toString() === productId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Product already exists in this van inventory',
//       });
//     }

//     const product = await Product.findById(productId);
//     if (!product || product.isDeleted || !product.isActive) {
//       return res.status(404).json({
//         success: false,
//         message: 'Product not found or inactive',
//       });
//     }

//     if (!variants || !Array.isArray(variants) || variants.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Variants with stock and pricing required',
//       });
//     }

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
//         costPrice: v.costPrice ?? productVariant.costPrice,
//         mrp: v.mrp ?? productVariant.mrp,
//         initialStock: v.initialStock || 0,
//         onHand: v.initialStock || 0,
//         reserved: 0,
//         sold: 0,
//         inStock: (v.initialStock || 0) > 0,
//         lowStockThreshold: v.lowStockThreshold || 0,
//         tierPricing: {
//           inVanPrice: v.inVanPrice || 0,
//         },
//       };
//     });

//     inventory.productId = product._id;
//     inventory.productSlug = product.slug;
//     inventory.name = product.name;
//     inventory.category = product.category;
//     inventory.image = product.image;
//     inventory.images = product.images || [];
//     inventory.variants = inventoryVariants;
//     inventory.updatedBy = adminId;
//     inventory.updatedAt = new Date();

//     await inventory.save();

//     return res.status(201).json({
//       success: true,
//       message: 'Product added to van inventory successfully',
//       data: inventory,
//     });
//   } catch (error) {
//     console.error('Error adding product to van:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to add product to van',
//       error: error.message,
//     });
//   }
// };


// Delete van inventory (soft delete)
// export const deleteVanInventory = async (req, res) => {
//   try {
//     const result = await inVanInventoryRepo.removeById(req.params.inventoryId, {
//       hard: true,
//     });

//     return res.status(result.status).json(result);
//   } catch (error) {
//     console.error('Error deleting van inventory:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to delete van inventory',
//       error: error.message,
//     });
//   }
// };


// Get all van inventories with filters
// export const getAllVanInventory = async (req, res) => {
//   try {
//     const { page, limit, sort, q, vehicleId, status, category } = req.query;

//     const filter = { isDeleted: false };
//     if (q) {
//       filter.$or = [
//         { name: { $regex: q, $options: 'i' } },
//         { productSlug: { $regex: q, $options: 'i' } },
//       ];
//     }
//     if (vehicleId) filter.vehicleId = vehicleId;
//     if (status) filter.status = status;
//     if (category) filter.category = category;

//     const result = await inVanInventoryRepo.getAll({
//       filter,
//       sort: sort ? JSON.parse(sort) : { createdAt: -1 },
//       page,
//       limit,
//       populate: [
//         { path: 'vehicleId', select: 'vehicleName vehicleNumber' },
//         { path: 'routeId', select: 'routeName' },
//       ],
//       collation: { locale: 'en', strength: 2 },
//     });

//     return res.status(result.status).json(result);
//   } catch (error) {
//     console.error('Error fetching van inventory:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch van inventory',
//       error: error.message,
//     });
//   }
// };
