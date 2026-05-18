import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';


const testProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    banner: { type: String },
    images: [{ type: String }],
  },
  { timestamps: true },
);

const TestModel = getAdminDB().model('TestModel', testProjectSchema);
export default TestModel;
