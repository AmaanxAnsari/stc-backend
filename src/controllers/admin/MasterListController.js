import Order from '../../models/admin/orderModel.js';

// ======================================================
// GET ALL ORDERS MASTER LIST
// ======================================================
export const getAllMasterOrders = async (req, res) => {
  try {
    const { date, status, type, q } = req.query;

    const matchStage = {};

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

    // ======================================================
    // STATUS FILTER
    // ======================================================
    if (status && status !== 'All Status') {
      matchStage.status = status;
    }

    const orders = await Order.aggregate([
      {
        $match: matchStage,
      },

      // ======================================================
      // CUSTOMER
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

            {
              $match: {
                'items.0': {
                  $exists: true,
                },
              },
            },
          ]
        : []),

      // ======================================================
      // SEARCH
      // ======================================================
      ...(q
        ? [
            {
              $match: {
                $or: [
                  {
                    orderNo: {
                      $regex: q,
                      $options: 'i',
                    },
                  },

                  {
                    'customer.customerName': {
                      $regex: q,
                      $options: 'i',
                    },
                  },

                  {
                    poNumber: {
                      $regex: q,
                      $options: 'i',
                    },
                  },
                ],
              },
            },
          ]
        : []),

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
    console.log('getAllMasterOrders error', error);

    return res.status(500).json({
      success: false,

      message: 'Failed to fetch master list',

      error: error.message,
    });
  }
};

// ======================================================
// GET MASTER ORDER BY ID
// ======================================================
export const getMasterOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id).populate('customer');

    if (!order) {
      return res.status(404).json({
        success: false,

        message: 'Order not found',
      });
    }

    // ======================================================
    // CHALLAN HISTORY
    // ======================================================
    const challanMap = {};

    order.items.forEach((item) => {
      if (item?.deliveryChallan?.challanNo) {
        const challanNo = item.deliveryChallan.challanNo;

        if (!challanMap[challanNo]) {
          challanMap[challanNo] = {
            challanNo,

            vehicleNumber: item.deliveryChallan.vehicleNumber,

            generatedAt: item.deliveryChallan.generatedAt,

            items: [],
          };
        }

        challanMap[challanNo].items.push({
          itemId: item._id,

          type: item.type,

          thickness: item.thickness,

          length: item.length,

          width: item.width,

          qty: item.qty,

          weight: item.weight,
        });
      }
    });

    const challanHistory = Object.values(challanMap);

    return res.status(200).json({
      success: true,

      data: {
        ...order.toObject(),

        challanHistory,
      },
    });
  } catch (error) {
    console.log('getMasterOrderById error', error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};
