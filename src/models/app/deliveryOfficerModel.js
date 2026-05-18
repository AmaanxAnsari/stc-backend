
import mongoose from 'mongoose';
import { User } from './user.js';

const deliveryOfficerSchema = new mongoose.Schema({
document:{
    type: String,
},
lincense_front:{
    type: String,
    required: true, 
},
lincense_back:{
    type: String,
    required: true,
},
 
});
export const DeliveryOfficer = User.discriminator(
  'delivery_officer',
  deliveryOfficerSchema,
);
