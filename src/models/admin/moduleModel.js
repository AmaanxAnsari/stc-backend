import mongoose from "mongoose";
import { getAdminDB } from '../../config/db.js';


const moduleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

const Module = getAdminDB().model('Module', moduleSchema);
export default Module;
