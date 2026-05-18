import mongoose from 'mongoose';
import { User } from './user.js';

const wholesalerSchema = new mongoose.Schema(
  {
    business_info: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    infrastructure_coverage_info: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    market_info: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    financials_documents_info: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

export const Wholesaler = User.discriminator('wholesaler', wholesalerSchema);
