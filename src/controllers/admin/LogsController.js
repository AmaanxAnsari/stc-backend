import AdminInventory from '../../models/admin/InventoryModel.js';
import SystemLog from '../../models/admin/SystemLogModel.js';
import mongoose from 'mongoose';
// Get all logs with filters
export const getSystemLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, module, search } = req.query;

    const filter = {};

    // Filter by Type (e.g., only show INVENTORY_ADD)
    if (type) filter.actionType = type;

    // Filter by Module (e.g., only show Orders)
    if (module) filter.module = module;

    // Search in description or user name
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { 'actionBy.name': { $regex: search, $options: 'i' } },
      ];
    }

    const logs = await SystemLog.find(filter)
      .sort({ createdAt: -1 }) // Newest first
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await SystemLog.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to fetch logs' });
  }
};
// export const getSystemLogs = async (req, res) => {
//   try {
//     const { page = 1, limit = 20, type, module, search } = req.query;
//     const filter = {};

//     if (type) filter.actionType = type;
//     if (module) filter.module = module;
//     if (search) {
//       filter.$or = [
//         { description: { $regex: search, $options: 'i' } },
//         { 'actionBy.name': { $regex: search, $options: 'i' } },
//       ];
//     }

//     // 1. Fetch Logs (Plain JS Objects)
//     // .lean() makes them plain JSON, easier to modify
//     const logs = await SystemLog.find(filter)
//       .sort({ createdAt: -1 })
//       .limit(parseInt(limit) || 20) // Use limit if you want, or remove
//       .lean();

//     // 2. Collect all Inventory IDs from metadata
//     const inventoryIds = logs
//       .map((log) => log.metadata?.inventoryId)
//       .filter((id) => id); // Remove nulls/undefined

//     // 3. Fetch all related Inventory Items in one go
//     const inventoryItems = await AdminInventory.find({
//       _id: { $in: inventoryIds },
//     })
//       .select('name category image')
//       .lean();

//     // 4. Create a Map for O(1) lookup
//     // key: ID (string), value: Item details
//     const inventoryMap = {};
//     inventoryItems.forEach((item) => {
//       inventoryMap[item._id.toString()] = item;
//     });

//     // 5. Attach details to logs
//     const populatedLogs = logs.map((log) => {
//       const invId = log.metadata?.inventoryId;
//       if (invId) {
//         const details = inventoryMap[invId.toString()];
//         if (details) {
//           // Merge into metadata so frontend gets what it expects
//           log.metadata.inventoryName = details.name;
//           log.metadata.inventoryCategory = details.category;
//           log.metadata.inventoryImage = details.image;
//         }
//       }
//       return log;
//     });

//     const total = await SystemLog.countDocuments(filter);

//     return res.status(200).json({
//       success: true,
//       data: populatedLogs,
//       total,
//     });
//   } catch (error) {
//     console.error('Error fetching logs:', error);
//     return res
//       .status(500)
//       .json({ success: false, message: 'Failed to fetch logs' });
//   }
// };
