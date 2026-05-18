import mongoose from 'mongoose';
import { getAdminDB } from '../../config/db.js';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    type: {
      type: String,
      // enum: [
      //   'order_placed',
      //   'order_confirmed',
      //   'order_shipped',
      //   'order_out_for_delivery',
      //   'order_delivered',
      //   'order_cancelled',
      //   'payment_success',
      //   'payment_failed',
      //   'refund_initiated',
      //   'refund_completed',
      //   'broadcast',
      //   'promotional',
      //   'account',
      //   'system',
      // ],
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    body: {
      type: String,
      required: true,
      trim: true,
    },

    imageUrl: {
      type: String,
      trim: true,
    },

    // Related entities
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },

    // Notification delivery channels
    channels: {
      push: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
        fcmResponse: { type: String },
      },
      email: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
        emailId: { type: String },
      },
      inApp: {
        read: { type: Boolean, default: false },
        readAt: { type: Date },
      },
    },

    // Additional data payload for deep linking
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
    },

    // Scheduling
    scheduledFor: {
      type: Date,
    },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

// Indexes for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ 'channels.inApp.read': 1, userId: 1 });

const Notification = getAdminDB().model('Notification', notificationSchema);
export default Notification;
