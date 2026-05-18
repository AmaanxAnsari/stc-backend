import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const faceTecSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: 'User', // Good practice to reference the User model
    },
    faceMapId: { type: String, default: null }, // ID stored in FaceTec Server
    isEnrolled: { type: Boolean, default: false }, // Simple flag for "1st time done"

    enrollmentDate: { type: Date, default: null },
    lastVerificationDate: { type: Date, default: null },

    // TRACKING THE 3 STRIKES
    consecutiveFailures: { type: Number, default: 0 },

    lastVerificationStatus: {
      type: String,
      enum: ['PASS', 'FAIL'],
      default: null,
    },
    auditTrail: [
      {
        action: { type: String, enum: ['ENROLL', 'VERIFY'] },
        status: { type: String, enum: ['PASS', 'FAIL'] },
        timestamp: { type: Date, default: Date.now },
        sessionId: String,
        failureReason: String,
      },
    ],
  },
  { timestamps: true },
);

const FaceTec = getAdminDB().model('FaceTec', faceTecSchema);
export default FaceTec;
