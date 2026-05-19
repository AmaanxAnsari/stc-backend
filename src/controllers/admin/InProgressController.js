// controllers/orderManagement/inProcessController.js

import mongoose from 'mongoose';
import Order from '../../models/admin/orderModel.js';

// ======================================================
// GET ALL ORDERS
// ======================================================
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customer')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.log('getAllOrders error', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message,
    });
  }
};

// ======================================================
// GET ORDER BY ID
// ======================================================
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order id',
      });
    }

    const order = await Order.findById(id).populate('customer');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.log('getOrderById error', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message,
    });
  }
};

// ======================================================
// GET ALL IN PROCESS ORDERS WITH FILTERS
// ======================================================
// export const getAllInProcessOrders = async (req, res) => {
//   try {
//     const { date, type, unit, machine, operator } = req.query;

//     const matchStage = {
//       'items.status': {
//         $in: ['in_process', 'cutting', 'bending'],
//       },
//     };

//     // ======================================================
//     // DATE FILTER
//     // ======================================================
//     if (date) {
//       const startDate = new Date(date);

//       startDate.setHours(0, 0, 0, 0);

//       const endDate = new Date(date);

//       endDate.setHours(23, 59, 59, 999);

//       matchStage.createdAt = {
//         $gte: startDate,
//         $lte: endDate,
//       };
//     }

//     const orders = await Order.aggregate([
//       {
//         $match: matchStage,
//       },

//       // ======================================================
//       // FILTER ONLY INPROCESS ITEMS
//       // ======================================================
//       {
//         $addFields: {
//           items: {
//             $filter: {
//               input: '$items',
//               as: 'item',
//               cond: {
//                 $in: ['$$item.status', ['in_process', 'cutting', 'bending']],
//               },
//             },
//           },
//         },
//       },

//       // ======================================================
//       // TYPE FILTER
//       // ======================================================
//       ...(type && type !== 'All Types'
//         ? [
//             {
//               $addFields: {
//                 items: {
//                   $filter: {
//                     input: '$items',
//                     as: 'item',
//                     cond: {
//                       $eq: ['$$item.type', type],
//                     },
//                   },
//                 },
//               },
//             },
//           ]
//         : []),

//       // ======================================================
//       // UNIT FILTER
//       // ======================================================
//       ...(unit && unit !== 'All Units'
//         ? [
//             {
//               $addFields: {
//                 items: {
//                   $filter: {
//                     input: '$items',
//                     as: 'item',
//                     cond: {
//                       $eq: ['$$item.processTracking.unit', unit],
//                     },
//                   },
//                 },
//               },
//             },
//           ]
//         : []),

//       // ======================================================
//       // MACHINE FILTER
//       // ======================================================
//       ...(machine && machine !== 'All Machines'
//         ? [
//             {
//               $addFields: {
//                 items: {
//                   $filter: {
//                     input: '$items',
//                     as: 'item',
//                     cond: {
//                       $eq: ['$$item.processTracking.machine', machine],
//                     },
//                   },
//                 },
//               },
//             },
//           ]
//         : []),

//       // ======================================================
//       // OPERATOR FILTER
//       // ======================================================
//       ...(operator && operator !== 'All Operators'
//         ? [
//             {
//               $addFields: {
//                 items: {
//                   $filter: {
//                     input: '$items',
//                     as: 'item',
//                     cond: {
//                       $eq: ['$$item.processTracking.operator', operator],
//                     },
//                   },
//                 },
//               },
//             },
//           ]
//         : []),

//       // ======================================================
//       // REMOVE EMPTY ORDERS
//       // ======================================================
//       {
//         $match: {
//           'items.0': { $exists: true },
//         },
//       },

//       {
//         $sort: {
//           createdAt: -1,
//         },
//       },
//     ]);

//     return res.status(200).json({
//       success: true,
//       count: orders.length,
//       data: orders,
//     });
//   } catch (error) {
//     console.log('getAllInProcessOrders error', error);

//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch in process orders',
//       error: error.message,
//     });
//   }
// };

export const getAllInProcessOrders = async (req, res) => {
  try {
    const { date, type, unit, machine, operator } = req.query;

    const matchStage = {
      'items.status': {
        $in: ['in_process', 'cutting', 'bending'],
      },
    };

    // ======================================================
    // DATE FILTER
    // ======================================================
    if (date) {
      const startDate = new Date(date);

      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(date);

      endDate.setHours(23, 59, 59, 999);

      matchStage.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const orders = await Order.aggregate([
      {
        $match: matchStage,
      },

      // ======================================================
      // POPULATE CUSTOMER
      // ======================================================
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customer',
        },
      },

      {
        $unwind: {
          path: '$customer',
          preserveNullAndEmptyArrays: true,
        },
      },

      // ======================================================
      // FILTER ONLY INPROCESS ITEMS
      // ======================================================
      {
        $addFields: {
          items: {
            $filter: {
              input: '$items',
              as: 'item',
              cond: {
                $in: ['$$item.status', ['in_process', 'cutting', 'bending']],
              },
            },
          },
        },
      },

      // ======================================================
      // TYPE FILTER
      // ======================================================
      ...(type && type !== 'All Types'
        ? [
            {
              $addFields: {
                items: {
                  $filter: {
                    input: '$items',
                    as: 'item',
                    cond: {
                      $eq: ['$$item.type', type],
                    },
                  },
                },
              },
            },
          ]
        : []),

      // ======================================================
      // UNIT FILTER
      // ======================================================
      ...(unit && unit !== 'All Units'
        ? [
            {
              $addFields: {
                items: {
                  $filter: {
                    input: '$items',
                    as: 'item',
                    cond: {
                      $eq: ['$$item.processTracking.unit', unit],
                    },
                  },
                },
              },
            },
          ]
        : []),

      // ======================================================
      // MACHINE FILTER
      // ======================================================
      ...(machine && machine !== 'All Machines'
        ? [
            {
              $addFields: {
                items: {
                  $filter: {
                    input: '$items',
                    as: 'item',
                    cond: {
                      $eq: ['$$item.processTracking.machine', machine],
                    },
                  },
                },
              },
            },
          ]
        : []),

      // ======================================================
      // OPERATOR FILTER
      // ======================================================
      ...(operator && operator !== 'All Operators'
        ? [
            {
              $addFields: {
                items: {
                  $filter: {
                    input: '$items',
                    as: 'item',
                    cond: {
                      $eq: ['$$item.processTracking.operator', operator],
                    },
                  },
                },
              },
            },
          ]
        : []),

      // ======================================================
      // REMOVE EMPTY ORDERS
      // ======================================================
      {
        $match: {
          'items.0': { $exists: true },
        },
      },

      // ======================================================
      // SORT
      // ======================================================
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.log('getAllInProcessOrders error', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch in process orders',
      error: error.message,
    });
  }
};

// ======================================================
// UPDATE UNIT
// ======================================================
export const updateItemUnit = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { unit } = req.body;

    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        'items._id': itemId,
      },
      {
        $set: {
          'items.$.processTracking.unit': unit,
        },
      },
      { new: true },
    );

    return res.status(200).json({
      success: true,
      message: 'Unit updated successfully',
      data: order,
    });
  } catch (error) {
    console.log('updateItemUnit error', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update unit',
      error: error.message,
    });
  }
};

// ======================================================
// UPDATE MACHINE
// ======================================================
export const updateItemMachine = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { machine } = req.body;

    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        'items._id': itemId,
      },
      {
        $set: {
          'items.$.processTracking.machine': machine,
        },
      },
      { new: true },
    );

    return res.status(200).json({
      success: true,
      message: 'Machine updated successfully',
      data: order,
    });
  } catch (error) {
    console.log('updateItemMachine error', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update machine',
      error: error.message,
    });
  }
};

// ======================================================
// UPDATE OPERATOR
// ======================================================
export const updateItemOperator = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { operator } = req.body;

    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        'items._id': itemId,
      },
      {
        $set: {
          'items.$.processTracking.operator': operator,
        },
      },
      { new: true },
    );

    return res.status(200).json({
      success: true,
      message: 'Operator updated successfully',
      data: order,
    });
  } catch (error) {
    console.log('updateItemOperator error', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update operator',
      error: error.message,
    });
  }
};

// ======================================================
// MARK DONE
// ======================================================
export const markItemDone = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { isDone } = req.body;

    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        'items._id': itemId,
      },
      {
        $set: {
          'items.$.processTracking.isDone': isDone,
        },
      },
      { new: true },
    );

    return res.status(200).json({
      success: true,
      message: 'Item updated successfully',
      data: order,
    });
  } catch (error) {
    console.log('markItemDone error', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update item',
      error: error.message,
    });
  }
};

// ======================================================
// MOVE SELECTED ITEMS TO QC
// ======================================================
// export const moveSelectedItemsToQC = async (req, res) => {
//   try {
//     const { orderId } = req.params;

//     const { itemIds } = req.body;

//     const order = await Order.findById(orderId);

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: 'Order not found',
//       });
//     }

//     order.items.forEach((item) => {
//       const shouldMove =
//         itemIds.includes(item._id.toString()) && item.processTracking?.isDone;

//       if (shouldMove) {
//         item.status = 'qc';

//         item.processTracking.movedToQualityAt = new Date();
//       }
//     });

//     await order.save();

//     return res.status(200).json({
//       success: true,
//       message: 'Selected items moved to QC successfully',
//       data: order,
//     });
//   } catch (error) {
//     console.log('moveSelectedItemsToQC error', error);

//     return res.status(500).json({
//       success: false,
//       message: 'Failed to move items to QC',
//       error: error.message,
//     });
//   }
// };
// ======================================================
// MOVE SELECTED ITEMS TO QC
// ======================================================
export const moveSelectedItemsToQC = async (
  req,
  res,
) => {
  try {
    const { orderId } = req.params;

    const { itemIds } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // ======================================================
    // MOVE SELECTED ITEMS
    // ======================================================
    order.items.forEach((item) => {
      const shouldMove =
        itemIds.includes(item._id.toString()) &&
        item.processTracking?.isDone;

      if (shouldMove) {
        // UPDATE STATUS
        item.status = 'qc';

        // QC MOVED DATE
        item.processTracking.movedToQualityAt =
          new Date();

        // ======================================================
        // AUDIT LOG
        // ======================================================
        item.auditLogs.push({
          action: 'Moved To QC',

          remark: `Item moved to QC from In Process`,

          performedBy:
            req.user?._id || order.createdBy,

          performedAt: new Date(),
        });
      }
    });

    // ======================================================
    // CHECK ORDER STATUS
    // ======================================================
    const allItemsMovedToQC = order.items.every(
      (item) => item.status === 'qc',
    );

    // ======================================================
    // UPDATE MAIN ORDER STATUS
    // ======================================================
    if (allItemsMovedToQC) {
      order.status = 'qc';
    } else {
      order.status = 'in_process';
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message:
        'Selected items moved to QC successfully',
      data: order,
    });
  } catch (error) {
    console.log(
      'moveSelectedItemsToQC error',
      error,
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to move items to QC',
      error: error.message,
    });
  }
};

// ======================================================
// MOVE ALL ITEMS TO QC
// ======================================================
// export const moveAllItemsToQC = async (req, res) => {
//   try {
//     const { orderId } = req.params;

//     const order = await Order.findById(orderId);

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: 'Order not found',
//       });
//     }

//     order.items.forEach((item) => {
//       if (
//         ['in_process', 'cutting', 'bending'].includes(item.status) &&
//         item.processTracking?.isDone
//       ) {
//         item.status = 'qc';

//         item.processTracking.movedToQualityAt = new Date();
//       }
//     });

//     await order.save();

//     return res.status(200).json({
//       success: true,
//       message: 'All completed items moved to QC successfully',
//       data: order,
//     });
//   } catch (error) {
//     console.log('moveAllItemsToQC error', error);

//     return res.status(500).json({
//       success: false,
//       message: 'Failed to move items to QC',
//       error: error.message,
//     });
//   }
// };
// ======================================================
// MOVE ALL ITEMS TO QC
// ======================================================
export const moveAllItemsToQC = async (
  req,
  res,
) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // ======================================================
    // MOVE ALL DONE ITEMS
    // ======================================================
    order.items.forEach((item) => {
      if (
        ['in_process', 'cutting', 'bending'].includes(
          item.status,
        ) &&
        item.processTracking?.isDone
      ) {
        // UPDATE STATUS
        item.status = 'qc';

        // QC DATE
        item.processTracking.movedToQualityAt =
          new Date();

        // ======================================================
        // AUDIT LOG
        // ======================================================
        item.auditLogs.push({
          action: 'Moved To QC',

          remark:
            'Item moved to QC using Move All action',

          performedBy:
            req.user?._id || order.createdBy,

          performedAt: new Date(),
        });
      }
    });

    // ======================================================
    // CHECK IF ALL ITEMS ARE QC
    // ======================================================
    const allItemsMovedToQC = order.items.every(
      (item) => item.status === 'qc',
    );

    // ======================================================
    // UPDATE ORDER STATUS
    // ======================================================
    if (allItemsMovedToQC) {
      order.status = 'qc';
    } else {
      order.status = 'in_process';
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message:
        'All completed items moved to QC successfully',
      data: order,
    });
  } catch (error) {
    console.log('moveAllItemsToQC error', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to move items to QC',
      error: error.message,
    });
  }
};