import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const companyConfigSchema = new mongoose.Schema(
  {
    companyOne: {
      name: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      contact: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true },
      gstin: { type: String, trim: true, default: null },
      panNo: { type: String, trim: true, default: null }, // Added
      gstPercentage: { type: Number, default: 18, min: 0 },
      logo: { type: String, trim: true },
      color: { type: String, default: '#2563eb' },

      // Bank Details
      bankName: { type: String, trim: true, default: null }, // Added
      accountNumber: { type: String, trim: true, default: null }, // Added
      ifscCode: { type: String, trim: true, default: null }, // Added
    },

    companyTwo: {
      name: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      contact: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true },
      gstin: { type: String, trim: true, default: null },
      panNo: { type: String, trim: true, default: null }, // Added
      gstPercentage: { type: Number, default: 0, min: 0 },
      logo: { type: String, trim: true },
      color: { type: String, default: '#16a34a' },

      // Bank Details
      bankName: { type: String, trim: true, default: null }, // Added
      accountNumber: { type: String, trim: true, default: null }, // Added
      ifscCode: { type: String, trim: true, default: null }, // Added
    },

    deliveryFee: { type: Number, default: 0, min: 0 },
    handlingFee: { type: Number, default: 0, min: 0 },
    minOrderValueForFreeDelivery: { type: Number, default: 0, min: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const CompanyConfig = getAdminDB().model('CompanyConfig', companyConfigSchema);
export default CompanyConfig;
