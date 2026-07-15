import path from 'path';

import ejs from 'ejs';

import puppeteer from 'puppeteer';

import Order from '../../models/admin/orderModel.js';

// ======================================================
// GET ALL COMPLETED ORDERS
// ======================================================
export const getAllCompletedOrders = async (req, res) => {
  try {
    const { date, type, q } = req.query;

    const matchStage = {
      $or: [
        {
          status: 'completed',
        },

        {
          'items.status': {
            $in: ['completed', 'dispatched'],
          },
        },
      ],
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
      // FILTER ITEMS
      // ======================================================
      {
        $addFields: {
          items: {
            $filter: {
              input: '$items',

              as: 'item',

              cond: {
                $in: ['$$item.status', ['dispatched', 'completed']],
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
                ],
              },
            },
          ]
        : []),

      // ======================================================
      // REMOVE EMPTY
      // ======================================================
      {
        $match: {
          'items.0': {
            $exists: true,
          },
        },
      },

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
    console.log('getAllCompletedOrders error', error);

    return res.status(500).json({
      success: false,

      message: 'Failed to fetch completed orders',

      error: error.message,
    });
  }
};

// ======================================================
// GET COMPLETED ORDER BY ID
// ======================================================
export const getCompletedOrderById = async (req, res) => {
  try {
    const { id } = req.params;

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
    console.log('getCompletedOrderById error', error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

// ======================================================
// UPDATE ITEM WEIGHT
// ======================================================
export const updateCompletedItemWeight = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;

    const { weight } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,

        message: 'Order not found',
      });
    }

    const item = order.items.id(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,

        message: 'Item not found',
      });
    }

    item.weight = Number(weight);

    item.auditLogs.push({
      action: 'Completed Weight Updated',

      remark: `Weight updated to ${weight} kg`,

      performedBy: req.user?._id || order.createdBy,

      performedAt: new Date(),
    });

    await order.save();

    return res.status(200).json({
      success: true,

      message: 'Weight updated successfully',
    });
  } catch (error) {
    console.log('updateCompletedItemWeight error', error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

// ======================================================
// FINISH & ARCHIVE
// ======================================================
export const finishAndArchiveOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,

        message: 'Order not found',
      });
    }

    order.status = 'completed';

    order.items.forEach((item) => {
      if (item.status === 'dispatched') {
        item.status = 'completed';

        item.auditLogs.push({
          action: 'Order Archived',

          remark: 'Finished & Archived from completed module',

          performedBy: req.user?._id || order.createdBy,

          performedAt: new Date(),
        });
      }
    });

    await order.save();

    return res.status(200).json({
      success: true,

      message: 'Order archived successfully',

      data: order,
    });
  } catch (error) {
    console.log('finishAndArchiveOrder error', error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

// ======================================================
// VIEW DELIVERY CHALLAN
// ======================================================
export const viewDeliveryChallan = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).populate('customer');

    if (!order) {
      return res.status(404).json({
        success: false,

        message: 'Order not found',
      });
    }

    // ======================================================
    // ITEMS
    // ======================================================
    const items = order.items.filter((item) => item.deliveryChallan?.challanNo);

    if (items.length === 0) {
      return res.status(400).json({
        success: false,

        message: 'No delivery challan found',
      });
    }

    const challan = items[0].deliveryChallan;

    const totalWeight = items.reduce(
      (acc, item) => acc + Number(item.weight || 0),
      0,
    );

    const totalRate = items.reduce(
      (acc, item) => acc + Number(item.amount || 0),
      0,
    );

    // ======================================================
    // TEMPLATE
    // ======================================================
    const templatePath = path.join(
      process.cwd(),
      'src/templates',
      'deliveryChallanTemplate.ejs',
    );

    const html = await ejs.renderFile(templatePath, {
      order,
      items,
      challanNo: challan.challanNo,
      totalWeight,
      totalRate,
      vehicleNumber: challan.vehicleNumber,
      currentDate: challan.generatedAt,
    });

    // ======================================================
    // PDF
    // ======================================================
    // ================= PUPPETEER CONFIG =================
    const browser = await puppeteer.launch({
      // Agar Docker environment me path set hai to wo uthayega, local normal chalaoge to default uthayega
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
      ],
    });

    const page = await browser.newPage();

    // await page.setContent(html, {
    //   waitUntil: 'networkidle0',
    // });
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
    });
    const pdfBuffer = await page.pdf({
      format: 'A4',

      printBackground: true,
    });

    await browser.close();

    const buffer = Buffer.from(pdfBuffer);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',

      'Content-Length': buffer.length,

      'Content-Disposition': `inline; filename="${challan.challanNo}.pdf"`,

      'Cache-Control': 'no-store',
    });

    return res.end(buffer);
  } catch (error) {
    console.log('viewDeliveryChallan error', error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};
