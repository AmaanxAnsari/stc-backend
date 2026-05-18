import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const fcmTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    fcmToken: {
      type: String,
      required: true,
      trim: true,
    },

    deviceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    platform: {
      type: String,
      enum: ['ios', 'android'],
      required: true,
      lowercase: true,
    },

    deviceInfo: {
      brand: { type: String, trim: true },
      model: { type: String, trim: true },
      systemVersion: { type: String, trim: true },
      appVersion: { type: String, trim: true },
    },

    // Track last notification sent
    lastNotificationSentAt: {
      type: Date,
      default: null,
    },

    // Track if token is still valid
    isValid: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Track failed notification attempts
    failedAttempts: {
      type: Number,
      default: 0,
    },

    lastFailedAt: {
      type: Date,
      default: null,
    },

    // Soft delete flags
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index: one token per user per device
fcmTokenSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

// Index for querying valid tokens
fcmTokenSchema.index({ isValid: 1, isActive: 1, isDeleted: 1 });

const FCMToken = getAdminDB().model('FCMToken', fcmTokenSchema);
export default FCMToken;
