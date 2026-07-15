import fs from 'fs';
import path from 'path';

import mongoose from 'mongoose';
import puppeteer from 'puppeteer';
import ejs from 'ejs';

import Order from '../../models/admin/orderModel.js';

// ======================================================
// GET ALL QC ORDERS
// ======================================================
export const getAllQCOrders = async (req, res) => {
  try {
    const { date, type } = req.query;

    // ======================================================
    // MATCH QC + DISPATCHED
    // ======================================================
    const matchStage = {
      $or: [
        {
          status: 'qc',
        },

        {
          status: 'partially_completed',
        },

        {
          'items.status': {
            $in: ['qc', 'dispatched'],
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
      // FILTER QC + DISPATCHED ITEMS
      // ======================================================
      {
        $addFields: {
          items: {
            $filter: {
              input: '$items',

              as: 'item',

              cond: {
                $in: ['$$item.status', ['qc', 'dispatched']],
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
      // REMOVE EMPTY
      // ======================================================
      {
        $match: {
          'items.0': {
            $exists: true,
          },
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
    console.log('getAllQCOrders error', error);

    return res.status(500).json({
      success: false,

      message: 'Failed to fetch QC orders',

      error: error.message,
    });
  }
};

// ======================================================
// GET QC ORDER BY ID
// ======================================================
export const getQCOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order id',
      });
    }

    const order = await Order.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
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
      // FILTER ONLY QC ITEMS
      // ======================================================
      {
        $addFields: {
          items: {
            $filter: {
              input: '$items',
              as: 'item',
              cond: {
                $eq: ['$$item.status', 'qc'],
              },
            },
          },
        },
      },

      // ======================================================
      // REMOVE EMPTY
      // ======================================================
      {
        $match: {
          'items.0': { $exists: true },
        },
      },
    ]);

    if (!order || order.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'QC order not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: order[0],
    });
  } catch (error) {
    console.log('getQCOrderById error', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch QC order',
      error: error.message,
    });
  }
};
// ======================================================
// MOVE ALL QC ITEMS TO COMPLETED
// ======================================================
// ======================================================
// MOVE ALL DISPATCHED ITEMS TO COMPLETED
// ======================================================
export const moveAllToCompleted = async (
  req,
  res,
) => {
  try {
    const { orderId } = req.params;

    // ======================================================
    // ORDER
    // ======================================================
    const order = await Order.findById(
      orderId,
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // ======================================================
    // GET DISPATCHED ITEMS
    // ======================================================
    const dispatchedItems =
      order.items.filter(
        (item) =>
          item.status ===
          'dispatched',
      );

    if (dispatchedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          'No dispatched items found',
      });
    }

    // ======================================================
    // UPDATE ITEMS
    // ======================================================
    order.items.forEach((item) => {
      if (
        item.status === 'dispatched'
      ) {
        // STATUS
        item.status = 'completed';

        // AUDIT LOG
        item.auditLogs.push({
          action:
            'Moved To Completed',

          remark:
            'Dispatched item marked as completed',

          performedBy:
            req.user?._id ||
            order.createdBy,

          performedAt: new Date(),
        });
      }
    });

    // ======================================================
    // CHECK ALL ITEMS COMPLETED
    // ======================================================
    const allCompleted =
      order.items.every(
        (item) =>
          item.status ===
          'completed',
      );

    // ======================================================
    // UPDATE MAIN STATUS
    // ======================================================
    if (allCompleted) {
      order.status = 'completed';
    } else {
      order.status =
        'partially_completed';
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message:
        'Dispatched items moved to completed successfully',

      data: order,
    });
  } catch (error) {
    console.log(
      'moveAllToCompleted error',
      error,
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================================
// GENERATE DELIVERY CHALLAN
// ======================================================
// ======================================================
// GENERATE DELIVERY CHALLAN
// ======================================================
export const generateDeliveryChallan = async (req, res) => {
  try {
    const { orderId } = req.params;

    const { vehicleNumber } = req.body;

    // ======================================================
    // VALIDATION
    // ======================================================
    if (!vehicleNumber) {
      return res.status(400).json({
        success: false,

        message: 'Vehicle number is required',
      });
    }

    // ======================================================
    // ORDER
    // ======================================================
    const order = await Order.findById(orderId).populate('customer');

    if (!order) {
      return res.status(404).json({
        success: false,

        message: 'Order not found',
      });
    }

    // ======================================================
    // GET QC ITEMS ONLY
    // ======================================================
    const qcItems = order.items.filter((item) => item.status === 'qc');

    if (qcItems.length === 0) {
      return res.status(400).json({
        success: false,

        message: 'No QC items found',
      });
    }

    // ======================================================
    // CHECK WEIGHT
    // ======================================================
    const invalidWeightItem = qcItems.find(
      (item) => !item.weight || Number(item.weight) <= 0,
    );

    if (invalidWeightItem) {
      return res.status(400).json({
        success: false,

        message:
          'Please enter weight for all QC items before generating challan',
      });
    }

    // ======================================================
    // CALCULATIONS
    // ======================================================
    const totalWeight = qcItems.reduce(
      (acc, item) => acc + Number(item.weight || 0),
      0,
    );

    const totalRate = qcItems.reduce(
      (acc, item) => acc + Number(item.amount || 0),
      0,
    );

    const challanNo = `DC-${Date.now()}`;

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
      items: qcItems,
      challanNo,
      totalWeight,
      totalRate,
      vehicleNumber,
      currentDate: new Date(),
    });

    // ======================================================
    // PDF GENERATION
    // ======================================================
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

await page.setContent(html, {
  waitUntil: 'domcontentloaded',
});

    const pdfBuffer = await page.pdf({
      format: 'A4',

      printBackground: true,

      preferCSSPageSize: true,
    });

    await browser.close();

    // ======================================================
    // UPDATE QC ITEMS -> DISPATCHED
    // ======================================================
    order.items.forEach((item) => {
      if (item.status === 'qc') {
        // STATUS
        item.status = 'dispatched';

        // DELIVERY CHALLAN
        item.deliveryChallan = {
          challanNo,

          vehicleNumber,

          generatedAt: new Date(),
        };

        // AUDIT LOG
        item.auditLogs.push({
          action: 'Item Dispatched',

          remark: `Delivery challan generated. Vehicle No: ${vehicleNumber}`,

          performedBy: req.user?._id || order.createdBy,

          performedAt: new Date(),
        });
      }
    });

    // ======================================================
    // UPDATE MAIN ORDER STATUS
    // ======================================================
    const allDispatched = order.items.every(
      (item) => item.status === 'dispatched' || item.status === 'completed',
    );

    if (allDispatched) {
      order.status = 'partially_completed';
    } else {
      order.status = 'qc';
    }

    await order.save();

    // ======================================================
    // SEND PDF
    // ======================================================
    const buffer = Buffer.from(pdfBuffer);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',

      'Content-Length': buffer.length,

      'Content-Disposition': `inline; filename="delivery-challan-${challanNo}.pdf"`,

      'Cache-Control': 'no-store',
    });

    return res.end(buffer);
  } catch (error) {
    console.log('generateDeliveryChallan error', error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};
// ======================================================
// UPDATE ITEM WEIGHT
// ======================================================
export const updateItemWeight = async (
  req,
  res,
) => {
  try {
    const { orderId, itemId } = req.params;

    const { weight } = req.body;

    // ======================================================
    // VALIDATION
    // ======================================================
    if (
      weight === undefined ||
      weight === null ||
      weight === ''
    ) {
      return res.status(400).json({
        success: false,
        message: 'Weight is required',
      });
    }

    if (Number(weight) <= 0) {
      return res.status(400).json({
        success: false,
        message:
          'Weight must be greater than 0',
      });
    }

    // ======================================================
    // ORDER
    // ======================================================
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // ======================================================
    // ITEM
    // ======================================================
    const item = order.items.id(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    // ======================================================
    // ONLY QC ITEMS ALLOWED
    // ======================================================
    if (item.status !== 'qc') {
      return res.status(400).json({
        success: false,
        message:
          'Weight can only be updated for QC items',
      });
    }

    // ======================================================
    // UPDATE WEIGHT
    // ======================================================
    item.weight = Number(weight);

    // ======================================================
    // AUDIT LOG
    // ======================================================
    item.auditLogs.push({
      action: 'Weight Updated',

      remark: `Weight updated to ${weight} kg`,

      performedBy:
        req.user?._id || order.createdBy,

      performedAt: new Date(),
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Weight updated successfully',
      data: item,
    });
  } catch (error) {
    console.log('updateItemWeight error', error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};