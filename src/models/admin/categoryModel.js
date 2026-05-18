import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const categorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    label: {
      type: String,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
    },
    icon: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },

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

const Category = getAdminDB().model('Category', categorySchema);
export default Category;
