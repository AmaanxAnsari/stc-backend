
import mongoose from 'mongoose';
import { User } from './user.js';

const consumerSchema = new mongoose.Schema({});
export const Consumer = User.discriminator('consumer', consumerSchema);
