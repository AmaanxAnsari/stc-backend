

import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';


// ======================================================
// PROCESS TRACKING SCHEMA
// ======================================================
const processTrackingSchema = new mongoose.Schema(
  {
    unit: {
      type: String,
      default: '',
      trim: true,
    },

    machine: {
      type: String,
      default: '',
      trim: true,
    },

    operator: {
      type: String,
      default: '',
      trim: true,
    },

    isDone: {
      type: Boolean,
      default: false,
    },

    movedToQualityAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

// ======================================================
// DELIVERY CHALLAN SCHEMA
// ======================================================
const deliveryChallanSchema =
  new mongoose.Schema(
    {
      challanNo: {
        type: String,
        default: '',
      },

      vehicleNumber: {
        type: String,
        default: '',
      },

      generatedAt: {
        type: Date,
        default: null,
      },
    },
    { _id: false },
  );
// ======================================================
// ORDER ITEM SCHEMA
// ======================================================
const orderItemSchema = new mongoose.Schema(
  {
    type: String,

    thickness: String,

    length: String,

    width: String,

    qty: Number,

    weight: {
      type: Number,
      default: 0,
    },

    ratePerKg: {
      type: Number,
      default: 0,
    },

    amount: {
      type: Number,
      default: 0,
    },

    programNo: String,

    partNo: String,

    // ======================================================
    // ITEM STATUS
    // ======================================================
    status: {
      type: String,
      enum: [
        'in_process',
        'cutting',
        'bending',
        'qc',
        'dispatched',
        'completed',
        'cancelled',
      ],
      default: 'in_process',
    },

    // ======================================================
    // NEW INPROCESS FIELDS
    // ======================================================
    processTracking: {
      type: processTrackingSchema,
      default: () => ({}),
    },
    // ======================================================
    // DELIVERY CHALLAN
    // ======================================================
    deliveryChallan: {
      type: deliveryChallanSchema,

      default: () => ({}),
    },

    // ======================================================
    // AUDIT LOGS
    // ======================================================
    auditLogs: [
      {
        action: String,

        remark: String,

        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'AdminUser',
        },

        performedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
);


// ======================================================
// ORDER SCHEMA
// ======================================================
const orderSchema = new mongoose.Schema(
  {
    orderNo: {
      type: String,
      unique: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },

    poNumber: String,

    enquiryText: String,

    quotation: {
      quotationNo: String,

      pdfUrl: String,

      subtotal: Number,

      gstAmount: Number,

      loading: Number,

      totalAmount: Number,
    },

    items: [orderItemSchema],

    // ======================================================
    // ORDER STATUS
    // ======================================================
    status: {
      type: String,
      enum: [
        'in_process',
        'qc',
        'partially_completed',
        'completed',
      ],
      default: 'in_process',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
    },
  },
  { timestamps: true },
);

const Order = getAdminDB().model('Order', orderSchema);

export default Order;