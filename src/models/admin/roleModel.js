//role schema
import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    is_active: { type: Boolean, default: true },
    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);
const Role = getAdminDB().model('role', RoleSchema);
export default Role;
