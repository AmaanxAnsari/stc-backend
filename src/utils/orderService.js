// services/orderService.js

import AppOrder from '../models/admin/AppOrderModel.js';
import BulkOrder from '../models/admin/BulkOrderModel.js';
import ReplacementRequest from '../models/admin/ReplacementOrderModel.js';

/**
 * Unified Order Service for all order types
 */
export const OrderService = {
  getModel(orderType) {
    const models = {
      normal: AppOrder,
      bulk: BulkOrder,
      replacement: ReplacementRequest,
    };
    return models[orderType] || AppOrder;
  },

  async updateStatus(orderId, orderType, newStatus) {
    const Model = this.getModel(orderType);
    return await Model.findByIdAndUpdate(
      orderId,
      { status: newStatus },
      { new: true },
    );
  },

  async getById(orderId, orderType) {
    const Model = this.getModel(orderType);
    return await Model.findById(orderId);
  },

  /**
   * Add or Update tracking event
   * - Finds the stage by ID and updates it if it exists
   * - Falls back to push if not found (though schema should have default stages)
   */
  async addTrackingEvent(orderId, orderType, event) {
    const Model = this.getModel(orderType);

    // Special handling for replacement if it uses a different field structure
    if (orderType === 'replacement') {
      // Assuming replacement might still use the old array push method or needs migration
      // If you want to standardize replacement to match others, you'd need schema changes there too.
      // For now, keeping your existing logic for replacement strictly as requested to not disturb it,
      // UNLESS it shares the exact same schema structure now.
      // If ReplacementRequest schema also has deliveryStatus.stages with IDs, use the logic below.
      // Returning existing logic to be safe based on your prompt:
      return await Model.findByIdAndUpdate(
        orderId,
        { $push: { replacementTracking: event } }, // Keep old behavior for safety or update if schema matches
        { new: true },
      );
    }

    // Standard Logic for Normal/Bulk (and Replacement if schema matches)
    // 1. Try to update existing stage
    const updateResult = await Model.findOneAndUpdate(
      {
        _id: orderId,
        'deliveryStatus.stages.id': event.id,
      },
      {
        $set: {
          'deliveryStatus.stages.$.status': 'completed',
          'deliveryStatus.stages.$.timestamp': event.timestamp,
          'deliveryStatus.stages.$.displayTime': event.displayTime,
          // Update label/icon/notes if needed, but ID stays same
        },
      },
      { new: true },
    );

    // 2. If no document matched (stage ID didn't exist), push it (legacy support)
    if (!updateResult) {
      return await Model.findByIdAndUpdate(
        orderId,
        { $push: { 'deliveryStatus.stages': event } },
        { new: true },
      );
    }

    return updateResult;
  },

  /**
   * Helper to update multiple stages at once (Used for Confirmed/Packed backfilling)
   */
  async updateMultipleStages(orderId, orderType, updates) {
    const Model = this.getModel(orderType);

    // Construct the dynamic $set object
    const setUpdates = {};

    // We can't use the positional operator $ easily for multiple different array elements in one query
    // So we fetch, modify, and save. This is safer for complex multi-stage updates.
    const order = await Model.findById(orderId);
    if (!order || !order.deliveryStatus || !order.deliveryStatus.stages)
      return null;

    let isModified = false;

    updates.forEach((update) => {
      const stageIndex = order.deliveryStatus.stages.findIndex(
        (s) => s.id === update.id,
      );
      if (stageIndex !== -1) {
        order.deliveryStatus.stages[stageIndex].status = 'completed';
        order.deliveryStatus.stages[stageIndex].timestamp = update.timestamp;
        order.deliveryStatus.stages[stageIndex].displayTime =
          update.displayTime;
        isModified = true;
      }
    });

    if (isModified) {
      return await order.save();
    }
    return order;
  },

  async storeOTP(orderId, orderType, otpData) {
    const Model = this.getModel(orderType);
    return await Model.findByIdAndUpdate(
      orderId,
      { deliveryOTP: otpData },
      { new: true },
    );
  },

  async verifyOTP(orderId, orderType) {
    const Model = this.getModel(orderType);
    return await Model.findByIdAndUpdate(
      orderId,
      {
        'deliveryOTP.verified': true,
        'deliveryOTP.verifiedAt': new Date(),
      },
      { new: true },
    );
  },

  async getOrdersByRoute(routeId) {
    const [normalOrders, bulkOrders, replacementOrders] = await Promise.all([
      AppOrder.find({ routeId, isDeleted: false }),
      BulkOrder.find({ routeId, isDeleted: false }),
      ReplacementRequest.find({ routeId, isDeleted: false }),
    ]);

    return [
      ...normalOrders.map((o) => ({ ...o.toObject(), orderType: 'normal' })),
      ...bulkOrders.map((o) => ({ ...o.toObject(), orderType: 'bulk' })),
      ...replacementOrders.map((o) => ({
        ...o.toObject(),
        orderType: 'replacement',
      })),
    ];
  },

  async checkRouteCompletion(routeId) {
    const orders = await this.getOrdersByRoute(routeId);
    const pendingOrders = orders.filter(
      (o) => o.status === 'pending' || o.status === 'out_for_delivery',
    );

    return {
      totalOrders: orders.length,
      completedOrders: orders.length - pendingOrders.length,
      pendingOrders: pendingOrders.length,
      isComplete: pendingOrders.length === 0,
    };
  },
};

// import AppOrder from "../models/admin/AppOrderModel.js";
// import BulkOrder from "../models/admin/BulkOrderModel.js";
// import ReplacementRequest from "../models/admin/ReplacementOrderModel.js";

// /**
//  * Unified Order Service for all order types
//  */

// export const OrderService = {
//   /**
//    * Get the correct model based on order type
//    */
//   getModel(orderType) {
//     const models = {
//       normal: AppOrder,
//       bulk: BulkOrder,
//       replacement: ReplacementRequest,
//     };
//     return models[orderType] || AppOrder;
//   },

//   /**
//    * Update order status
//    */
//   async updateStatus(orderId, orderType, newStatus) {
//     const Model = this.getModel(orderType);
//     return await Model.findByIdAndUpdate(
//       orderId,
//       { status: newStatus },
//       { new: true },
//     );
//   },

//   /**
//    * Get order by ID
//    */
//   async getById(orderId, orderType) {
//     const Model = this.getModel(orderType);
//     return await Model.findById(orderId);
//   },

//   /**
//    * Add tracking event
//    */
//   async addTrackingEvent(orderId, orderType, event) {
//     const Model = this.getModel(orderType);

//     // Replacement uses different tracking field
//     if (orderType === 'replacement') {
//       return await Model.findByIdAndUpdate(
//         orderId,
//         { $push: { replacementTracking: event } },
//         { new: true },
//       );
//     } else {
//       return await Model.findByIdAndUpdate(
//         orderId,
//         { $push: { 'deliveryStatus.stages': event } },
//         { new: true },
//       );
//     }
//   },

//   // /**
//   //  * Store OTP in order
//   //  */
//   // async storeOTP(orderId, orderType, otpData) {
//   //   const Model = this.getModel(orderType);

//   //   return await Model.findByIdAndUpdate(
//   //     orderId,
//   //     {
//   //       deliveryOTP: otpData,
//   //       $inc: { 'deliveryOTP.regeneratedCount': otpData.regeneratedCount || 0 },
//   //     },
//   //     { new: true },
//   //   );
//   // },

//   /**
//    * Store OTP in order (FIXED)
//    */
//   /**
//    * Store OTP in order (FIXED - No conflict)
//    */
//   async storeOTP(orderId, orderType, otpData) {
//     const Model = this.getModel(orderType);

//     return await Model.findByIdAndUpdate(
//       orderId,
//       {
//         deliveryOTP: otpData, // Set entire object at once
//       },
//       { new: true },
//     );
//   },

//   /**
//    * Mark OTP as verified
//    */
//   async verifyOTP(orderId, orderType) {
//     const Model = this.getModel(orderType);

//     return await Model.findByIdAndUpdate(
//       orderId,
//       {
//         'deliveryOTP.verified': true,
//         'deliveryOTP.verifiedAt': new Date(),
//       },
//       { new: true },
//     );
//   },

//   /**
//    * Get all orders for a route
//    */
//   async getOrdersByRoute(routeId) {
//     const [normalOrders, bulkOrders, replacementOrders] = await Promise.all([
//       AppOrder.find({ routeId, isDeleted: false }),
//       BulkOrder.find({ routeId, isDeleted: false }),
//       ReplacementRequest.find({ routeId, isDeleted: false }),
//     ]);

//     return [
//       ...normalOrders.map((o) => ({ ...o.toObject(), orderType: 'normal' })),
//       ...bulkOrders.map((o) => ({ ...o.toObject(), orderType: 'bulk' })),
//       ...replacementOrders.map((o) => ({
//         ...o.toObject(),
//         orderType: 'replacement',
//       })),
//     ];
//   },

//   /**
//    * Check if all route orders are completed
//    */
//   async checkRouteCompletion(routeId) {
//     const orders = await this.getOrdersByRoute(routeId);

//     const pendingOrders = orders.filter(
//       (o) => o.status === 'pending' || o.status === 'out_for_delivery',
//     );

//     return {
//       totalOrders: orders.length,
//       completedOrders: orders.length - pendingOrders.length,
//       pendingOrders: pendingOrders.length,
//       isComplete: pendingOrders.length === 0,
//     };
//   },
// };
