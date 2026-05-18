import SystemLog from '../models/admin/SystemLogModel.js';

/**
 * Creates a system log entry.
 * Fire and forget (don't await it if you don't want to slow down response).
 */
export const createLog = async ({
  adminId, // The ID of user performing action
  adminName, // Name of user (optional, will try to fetch if not provided)
  role = 'admin',
  type, // Enum: INVENTORY_ADD, VAN_LOAD, etc.
  module, // Enum: Inventory, Orders
  description, // "Added 50 Fogg to Warehouse"
  metadata = {}, // { productId: '...', oldValue: 10, newValue: 20 }
}) => {
  try {
    // Basic validation
    if (!adminId || !type || !description) {
      console.warn('⚠️ Skipping log creation: Missing required fields');
      return;
    }

    await SystemLog.create({
      actionBy: {
        id: adminId,
        name: adminName || 'Unknown User', //Ideally pass name from req.user
        role,
      },
      actionType: type,
      module,
      description,
      metadata,
    });

    // console.log(`✅ Logged: ${description}`);
  } catch (error) {
    console.error('❌ Failed to create system log:', error.message);
    // We do NOT throw error here, so the main app flow doesn't break if logging fails
  }
};
