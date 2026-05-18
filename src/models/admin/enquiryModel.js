import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const enquiryItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
    },

    thickness: {
      type: String,
      required: true,
      trim: true,
    },

    length: {
      type: String,
      required: true,
      trim: true,
    },

    width: {
      type: String,
      required: true,
      trim: true,
    },

    qty: {
      type: Number,
      required: true,
      min: 1,
    },

    programNo: {
      type: String,
      trim: true,
    },

    partNo: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const enquirySchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    poNumber: {
      type: String,
      trim: true,
    },

    enquiryText: {
      type: String,
      trim: true,
    },

    includePartNumbers: {
      type: Boolean,
      default: true,
    },

    items: {
      type: [enquiryItemSchema],
      required: true,
      validate: {
        validator: function (val) {
          return val.length > 0;
        },
        message: 'At least one enquiry item is required',
      },
    },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },

    // Soft Delete
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    // Auditing
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
    },
  },
  { timestamps: true },
);

const Enquiry = getAdminDB().model('Enquiry', enquirySchema);

export default Enquiry;
