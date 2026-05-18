import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const TermsAndPrivacySchema = new mongoose.Schema(
  {
    userType: {
      type: String,
      required: true,
      trim: true,
      enum: [
        'consumer',
        // 'retailer',
        // 'wholesaler',
        // 'super_stocker',
        // 'distributor',
        'partner',
        'delivery_officer',
      ],
    },
    policyType: {
      type: String,
      required: true,
      trim: true,
      enum: ['privacy_policy', 'terms_of_service'],
    },
    heading: {
      type: String,
      required: true,
      trim: true,
    },
    section: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        content: [
          {
            type: String,
            required: true,
            trim: true,
          },
        ],
      },
    ],
    // Activation and soft-delete flags consistent with your adminUser
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },

    // Auditing
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true },
);

const TermsAndPrivacy = getAdminDB().model('TermsAndPrivacy', TermsAndPrivacySchema);
export default TermsAndPrivacy;
