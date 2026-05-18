import mongoose from 'mongoose';
import DeliveryVehicle from '../../models/admin/deliveryVehicleModel.js';
import InVanInventory from '../../models/admin/InVanInventoryModel.js';
import AdminInventory from '../../models/admin/InventoryModel.js';
import Product from '../../models/admin/productModel.js';
import { createRepository } from '../../utils/repository.js';
import { getAdminDB } from '../../config/db.js';

const inVanInventoryRepo = createRepository(InVanInventory, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});

// Helper to update Admin Inventory Stock (Move from OnHand -> Reserved)
const transferStockToVan = async (
  adminInventory,
  variantIndex,
  quantity,
  session = null,
) => {
  const adminVariant = adminInventory.variants.find(
    (v) => v.variantIndex === variantIndex,
  );

  if (!adminVariant) {
    throw new Error(
      `Variant index ${variantIndex} not found in Admin Inventory`,
    );
  }

  if (adminVariant.onHand < quantity) {
    throw new Error(
      `Insufficient stock in Admin Inventory for ${adminVariant.variantKey}. Available: ${adminVariant.onHand}, Requested: ${quantity}`,
    );
  }

  // Move stock: OnHand -> Reserved (representing stock held in vans)
  adminVariant.onHand -= quantity;
  adminVariant.reserved += quantity;

  // Recalculate Admin status/totals handled by pre-save hook, but we modify direct object here
  // We rely on the save() call in the main handler to persist this
};

// Helper to return Stock from Van -> Admin (Move from Reserved -> OnHand)
const returnStockToAdmin = async (
  adminInventory,
  variantIndex,
  quantity,
  session = null,
) => {
  const adminVariant = adminInventory.variants.find(
    (v) => v.variantIndex === variantIndex,
  );

  if (!adminVariant) {
    // If variant doesn't exist (edge case), we might just log it, but strictly it should exist
    throw new Error(
      `Variant index ${variantIndex} not found in Admin Inventory during return`,
    );
  }

  // Move stock back: Reserved -> OnHand
  // We assume 'reserved' tracks stock in vans. Validation to ensure we don't return more than reserved is good safety.
  if (adminVariant.reserved < quantity) {
    console.warn(
      `Warning: Returning ${quantity} but only ${adminVariant.reserved} is reserved. Adjusting math safely.`,
    );
    // In strict systems, throw error. Here, we prioritize consistency.
    adminVariant.onHand += quantity;
    adminVariant.reserved = Math.max(0, adminVariant.reserved - quantity);
  } else {
    adminVariant.reserved -= quantity;
    adminVariant.onHand += quantity;
  }
};

// ==========================================
// 1. Create Empty Van Inventory (Vehicle Assignment)
// ==========================================
export const createVanInventory = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { vehicleId, routeId, productId } = req.body;

    if (!vehicleId || !productId) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle ID and Product ID are required',
      });
    }

    const vehicle = await DeliveryVehicle.findById(vehicleId);
    if (!vehicle || vehicle.isDeleted || !vehicle.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or inactive',
      });
    }

    // ✅ uniqueness per vehicle + product
    const existingInventory = await InVanInventory.findOne({
      vehicleId,
      productId,
      isDeleted: false,
    });

    if (existingInventory) {
      return res.status(400).json({
        success: false,
        message: 'Inventory already exists for this product in this vehicle',
      });
    }

    const vanInventory = new InVanInventory({
      vehicleId,
      routeId: routeId || null,
      productId,
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


// ==========================================
// 2. Add Single Product to Van (Centralized)
// ==========================================
export const addProductToVan = async (req, res) => {
  const session = await getAdminDB().startSession();
  session.startTransaction();

  try {
    const adminId = req.user?.id;
    if (!adminId) {
      await session.abortTransaction();
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { vehicleId } = req.params;
    // We expect adminInventoryId, NOT just productId, to ensure we link to the specific stock source
    const { adminInventoryId, variants } = req.body;

    if (!vehicleId || !adminInventoryId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Vehicle ID and Admin Inventory ID are required',
      });
    }

    // 1. Fetch Vehicle
    const vehicle = await DeliveryVehicle.findById(vehicleId).session(session);
    if (!vehicle || vehicle.isDeleted) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: 'Vehicle not found' });
    }

    // 🧹 CLEANUP: Remove default/empty van inventories (created during initialization)
    await InVanInventory.deleteMany(
      {
        vehicleId,
        isDeleted: false,
        $or: [{ productId: { $exists: false } }, { productId: null }],
        variants: { $size: 0 },
        totalInitialStock: 0,
        totalOnHand: 0,
        totalReserved: 0,
        totalSold: 0,
      },
      { session },
    );

    // 2. Fetch Source Admin Inventory
    const adminInventory = await AdminInventory.findOne({
      _id: adminInventoryId,
      isDeleted: false,
    }).session(session);

    if (!adminInventory) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: 'Admin Inventory item not found' });
    }

    // 3. Check for Existing Van Entry (Prevent Duplicates)
    const existingVanInventory = await InVanInventory.findOne({
      vehicleId,
      productId: adminInventory.productId, // Match by Product ID derived from Admin Inventory
      isDeleted: false,
    }).session(session);

    if (existingVanInventory) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message:
          'Product already exists in this van. Use update to add more stock.',
      });
    }

    // 4. Process Variants & Manage Stock Transfer
    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: 'Variants required' });
    }

    const inventoryVariants = [];

    for (const v of variants) {
      // Find matching variant in Admin Inventory
      const adminVariant = adminInventory.variants.find(
        (av) => av.variantIndex === v.variantIndex,
      );

      if (!adminVariant) {
        throw new Error(
          `Variant index ${v.variantIndex} not found in Admin Inventory`,
        );
      }

      const transferQty = v.initialStock || 0;

      // CRITICAL: Transfer Stock Logic
      // Check Admin Stock and Move to Reserved
      if (transferQty > 0) {
        if (adminVariant.onHand < transferQty) {
          throw new Error(
            `Insufficient Admin Stock for ${adminVariant.variantKey}. Available: ${adminVariant.onHand}, Requested: ${transferQty}`,
          );
        }
        adminVariant.onHand -= transferQty;
        adminVariant.reserved += transferQty;
      }

      // Build Van Variant Object (Copying Master Data from Admin)
      inventoryVariants.push({
        variantKey: adminVariant.variantKey,
        variantIndex: v.variantIndex,
        costPrice: adminVariant.costPrice,
        mrp: adminVariant.mrp,
        initialStock: transferQty,
        onHand: transferQty, // In Van, initial = onHand at start
        reserved: 0,
        sold: 0,
        inStock: transferQty > 0,
        status: transferQty > 0 ? 'in_stock' : 'out_of_stock',
        lowStockThreshold: v.lowStockThreshold || 0,
        tierPricing: v.tierPricing || { inVanPrice: 0 },
      });
    }

    // 5. Save Admin Inventory (with updated Reserved counts)
    await adminInventory.save({ session });

    // 6. Create Van Inventory Entry
    const totalInitial = inventoryVariants.reduce(
      (sum, v) => sum + v.initialStock,
      0,
    );
    const totalOH = inventoryVariants.reduce((sum, v) => sum + v.onHand, 0);

    const newVanInventory = new InVanInventory({
      vehicleId,
      routeId: vehicle.routeId || null,
      inventoryType: 'in_van',
      productId: adminInventory.productId,
      productSlug: adminInventory.productSlug,
      name: adminInventory.name,
      category: adminInventory.category,
      image: adminInventory.image,
      images: adminInventory.images || [],
      variants: inventoryVariants,
      totalInitialStock: totalInitial,
      totalOnHand: totalOH,
      totalReserved: 0,
      totalSold: 0,
      status: totalOH > 0 ? 'in_stock' : 'out_of_stock',
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    await newVanInventory.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: 'Product added to van and stock reserved in Admin Inventory',
      data: newVanInventory,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error adding product to van:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to add product to van',
    });
  }
};

// ==========================================
// 3. Bulk Add Products to Van (Centralized)
// ==========================================
export const bulkAddProductsToVan = async (req, res) => {
  const session = await getAdminDB().startSession();
  session.startTransaction();

  try {
    const adminId = req.user?.id;
    if (!adminId) {
      await session.abortTransaction();
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { vehicleId, products } = req.body; // products = [{ adminInventoryId, variants: [...] }]

    if (!vehicleId || !Array.isArray(products) || products.length === 0) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: 'Vehicle ID and products required' });
    }

    const vehicle = await DeliveryVehicle.findById(vehicleId).session(session);
    if (!vehicle) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: 'Vehicle not found' });
    }

    const createdInventories = [];

    // Iterate through requested products
    for (const item of products) {
      const { adminInventoryId, variants } = item;

      // Fetch Admin Master
      const adminInventory = await AdminInventory.findOne({
        _id: adminInventoryId,
        isDeleted: false,
      }).session(session);

      if (!adminInventory) {
        throw new Error(
          `Admin Inventory ID ${adminInventoryId} not found. Transaction aborted.`,
        );
      }

      // Check Duplicates
      const existing = await InVanInventory.findOne({
        vehicleId,
        productId: adminInventory.productId,
        isDeleted: false,
      }).session(session);

      if (existing) {
        // Skip duplicates in bulk, or throw? Let's throw to ensure data integrity or log.
        // For robustness, we'll throw to force frontend to clean up selection.
        throw new Error(
          `Product ${adminInventory.name} already in van. Cannot add duplicate.`,
        );
      }

      const inventoryVariants = [];

      for (const v of variants) {
        const adminVariant = adminInventory.variants.find(
          (av) => av.variantIndex === v.variantIndex,
        );

        if (!adminVariant) {
          throw new Error(
            `Variant index ${v.variantIndex} missing in ${adminInventory.name}`,
          );
        }

        const qty = v.initialStock || 0;

        // Stock Check & Transfer
        if (qty > 0) {
          if (adminVariant.onHand < qty) {
            throw new Error(
              `Insufficient stock for ${adminInventory.name} (Var: ${adminVariant.variantKey}). Req: ${qty}, Avail: ${adminVariant.onHand}`,
            );
          }
          adminVariant.onHand -= qty;
          adminVariant.reserved += qty;
        }

        inventoryVariants.push({
          variantKey: adminVariant.variantKey,
          variantIndex: v.variantIndex,
          costPrice: adminVariant.costPrice,
          mrp: adminVariant.mrp,
          initialStock: qty,
          onHand: qty,
          reserved: 0,
          sold: 0,
          inStock: qty > 0,
          status: qty > 0 ? 'in_stock' : 'out_of_stock',
          lowStockThreshold: v.lowStockThreshold || 0,
          tierPricing: v.tierPricing || { inVanPrice: 0 },
        });
      }

      // Save updated Admin Inventory
      await adminInventory.save({ session });

      // Create Van Entry
      const newEntry = new InVanInventory({
        vehicleId,
        routeId: vehicle.routeId,
        inventoryType: 'in_van',
        productId: adminInventory.productId,
        productSlug: adminInventory.productSlug,
        name: adminInventory.name,
        category: adminInventory.category,
        image: adminInventory.image,
        images: adminInventory.images || [],
        variants: inventoryVariants,
        isActive: true,
        createdBy: adminId,
        updatedBy: adminId,
      });

      // Recalculate totals (handled by pre-save usually, but good to explicit if creating new)
      newEntry.recalculateAggregates();
      await newEntry.save({ session });

      createdInventories.push(newEntry);
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: `Bulk add successful. ${createdInventories.length} items added.`,
      data: createdInventories,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Bulk add error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// 4. Update Van Inventory (Restock / Adjust)
// ==========================================
export const updateVanInventory = async (req, res) => {
  const session = await getAdminDB().startSession();
  session.startTransaction();

  try {
    const adminId = req.user?.id;
    if (!adminId) {
      await session.abortTransaction();
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { inventoryId } = req.params;
    const { variants, isActive } = req.body; // variants array with variantIndex, onHand (new target), etc.

    const vanInventory = await InVanInventory.findOne({
      _id: inventoryId,
      isDeleted: false,
    }).session(session);

    if (!vanInventory) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: 'Van Inventory not found' });
    }

    // Fetch Linked Admin Inventory for stock checks
    // We need to find the AdminInventory that matches the productId
    const adminInventory = await AdminInventory.findOne({
      productId: vanInventory.productId,
      isDeleted: false,
    }).session(session);

    if (!adminInventory) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Linked Master Admin Inventory not found',
      });
    }

    if (isActive !== undefined) vanInventory.isActive = isActive;

    if (variants && Array.isArray(variants)) {
      const newVariants = [];

      for (const v of variants) {
        const variantIndex = v.variantIndex;

        // Ensure variant exists in master
        const adminVariant = adminInventory.variants.find(
          (av) => av.variantIndex === variantIndex,
        );
        if (!adminVariant) {
          throw new Error(
            `Variant index ${variantIndex} mismatch with Master Inventory`,
          );
        }

        // Check if exists in Van
        const existingVanVariant = vanInventory.variants.find(
          (iv) => iv.variantIndex === variantIndex,
        );

        if (existingVanVariant) {
          // LOGIC: Calculate Stock Difference
          // If we are updating 'initialStock' or 'onHand' via this endpoint (e.g. Loading more stock)
          // We usually compare the NEW onHand vs OLD onHand to see if we need to pull more from Admin
          // NOTE: If 'onHand' is passed, we treat it as the Target Level.

          let newOnHand = v.onHand ?? existingVanVariant.onHand;
          const currentOnHand = existingVanVariant.onHand;

          const diff = newOnHand - currentOnHand;

          if (diff > 0) {
            // Adding stock to van -> Pull from Admin
            if (adminVariant.onHand < diff) {
              throw new Error(
                `Insufficient Admin Stock to add ${diff} units for ${adminVariant.variantKey}`,
              );
            }
            adminVariant.onHand -= diff;
            adminVariant.reserved += diff;
          } else if (diff < 0) {
            // Removing stock from van -> Return to Admin (Un-reserve)
            // diff is negative, so -diff is positive quantity to return
            const returnQty = Math.abs(diff);
            if (adminVariant.reserved < returnQty) {
              // Safety fallback
              adminVariant.reserved = 0;
              adminVariant.onHand += returnQty; // Or logic specific to your mismatch handling
            } else {
              adminVariant.reserved -= returnQty;
              adminVariant.onHand += returnQty;
            }
          }

          newVariants.push({
            ...existingVanVariant.toObject(), // Keep existing sales data
            costPrice: v.costPrice ?? adminVariant.costPrice, // Update price if master changed
            mrp: v.mrp ?? adminVariant.mrp,
            onHand: newOnHand,
            initialStock: v.initialStock ?? existingVanVariant.initialStock, // Usually updates with onHand on restock
            lowStockThreshold:
              v.lowStockThreshold ?? existingVanVariant.lowStockThreshold,
            tierPricing: v.tierPricing
              ? { ...existingVanVariant.tierPricing, ...v.tierPricing }
              : existingVanVariant.tierPricing,
            status: newOnHand > 0 ? 'in_stock' : 'out_of_stock',
            inStock: newOnHand > 0,
          });
        } else {
          // NEW VARIANT in Van (that wasn't there before but exists in master)
          const qty = v.initialStock || 0;
          if (qty > 0) {
            if (adminVariant.onHand < qty) {
              throw new Error(
                `Insufficient Admin Stock for new variant ${adminVariant.variantKey}`,
              );
            }
            adminVariant.onHand -= qty;
            adminVariant.reserved += qty;
          }

          newVariants.push({
            variantKey: adminVariant.variantKey,
            variantIndex,
            costPrice: adminVariant.costPrice,
            mrp: adminVariant.mrp,
            initialStock: qty,
            onHand: qty,
            reserved: 0,
            sold: 0,
            inStock: qty > 0,
            status: qty > 0 ? 'in_stock' : 'out_of_stock',
            lowStockThreshold: v.lowStockThreshold || 0,
            tierPricing: v.tierPricing || { inVanPrice: 0 },
          });
        }
      }

      // Handle removals? Usually we don't remove variants via update, we use delete endpoint.
      // But if variants are missing from payload, do we remove them?
      // Strict update: We only update what is sent. We should MERGE with existing that aren't sent?
      // Or if this replaces the array?
      // Logic: Merge sent variants into existing list. If not sent, keep existing (unless logic implies replace).
      // Assuming "Patch" style logic is safer. But your code had "replace variants".
      // Let's stick to your "Requested Indices" logic but ensure we Return Stock for removed ones.

      const requestedIndices = new Set(variants.map((v) => v.variantIndex));
      const removedVariants = vanInventory.variants.filter(
        (v) => !requestedIndices.has(v.variantIndex),
      );

      for (const removed of removedVariants) {
        if (removed.onHand > 0) {
          // Returning stock to admin
          const adminVar = adminInventory.variants.find(
            (av) => av.variantIndex === removed.variantIndex,
          );
          if (adminVar) {
            adminVar.reserved = Math.max(0, adminVar.reserved - removed.onHand);
            adminVar.onHand += removed.onHand;
          }
        }
      }

      // If we are replacing the whole array:
      // We need to make sure we keep the variants that were NOT in the request?
      // Or does the frontend send the FULL list?
      // Your previous code filtered out removed ones. We will follow that:
      // Any variant NOT in the request is REMOVED.
      // So newVariants contains ONLY requested ones.

      vanInventory.variants = newVariants;
    }

    vanInventory.updatedBy = adminId;
    await vanInventory.save({ session });
    await adminInventory.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: 'Van inventory synchronized and updated',
      data: vanInventory,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating van inventory:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// 5. Remove Product from Van (Return All Stock)
// ==========================================
export const removeProductFromVan = async (req, res) => {
  const session = await getAdminDB().startSession();
  session.startTransaction();

  try {
    const adminId = req.user?.id;
    if (!adminId) {
      await session.abortTransaction();
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { inventoryId } = req.params;

    const vanInventory = await InVanInventory.findOne({
      _id: inventoryId,
    }).session(session);

    if (!vanInventory) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Inventory not found',
      });
    }

    /**
     * ❌ Cannot delete if van has reserved items
     * (Reserved = pending order in van)
     */
    const hasReservedInVan = vanInventory.variants.some((v) => v.reserved > 0);

    if (hasReservedInVan) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message:
          'Cannot remove product. Van has active reservations (pending orders).',
      });
    }

    /**
     * 🔁 Return remaining stock back to Admin Inventory
     */
    const adminInventory = await AdminInventory.findOne({
      productId: vanInventory.productId,
    }).session(session);

    if (adminInventory) {
      for (const vanVar of vanInventory.variants) {
        if (vanVar.onHand > 0) {
          const adminVar = adminInventory.variants.find(
            (av) => av.variantIndex === vanVar.variantIndex,
          );

          if (adminVar) {
            // Admin.reserved = stock currently assigned to vans
            adminVar.reserved = Math.max(0, adminVar.reserved - vanVar.onHand);
            adminVar.onHand += vanVar.onHand;
          }
        }
      }

      await adminInventory.save({ session });
    }

    /**
     * ❌ HARD DELETE Van Inventory
     */
    await InVanInventory.deleteOne({ _id: inventoryId }, { session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message:
        'Product permanently removed from van and stock returned to Admin.',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('Error removing product from van:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// 6. Get All Van Inventory (Unchanged from your V1, just ensure import)
// ==========================================
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

// ==========================================
// 7. Get Van Inventory By Vehicle (Unchanged V1 logic)
// ==========================================
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
