
import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const adminUserSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, unique: true, required: true },
    address: { type: String },
    phone: { type: String },
    password: { type: String, required: true },
    profile_image: {
      type: String,
      default: 'https://i.ibb.co/tTGVWLvx/toppng-com-avatar-png-512x512.png',
    },
    role: { type: String, default: 'admin' },
    role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'role' },
    permissions: [
      {
        module_name: { type: String, required: true },
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },
    ],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'adminuser' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'adminuser' },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const AdminUser = getAdminDB().model('AdminUser', adminUserSchema);
export default AdminUser; 