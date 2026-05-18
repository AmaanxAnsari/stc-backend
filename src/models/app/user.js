import mongoose from 'mongoose';
import { getAppDB } from '../../config/db.js';

const addressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      // required: [true, 'Address label is required'],
    },
    houseNo: {
      type: String,
      trim: true,
      // required: [true, 'House/Building/Lane number is required'],
    },
    addressLine: {
      type: String,
      trim: true,
      // required: [true, 'Address line is required'],
    },
    area: {
      type: String,
      trim: true,
      // required: [true, 'Area is required'],
      index: true, // Index for efficient route filtering
    },
    landmark: {
      type: String,
      trim: true,
      // required: [true, 'Landmark is required'],
    },
    city: {
      type: String,
      trim: true,
      // required: [true, 'City is required'],
    },
    pincode: {
      type: String,
      trim: true,
      // required: [true, 'Pincode is required'],
      match: [/^[0-9]{6}$/, 'Pincode must be 6 digits'],
      index: true, // Index for efficient route filtering
    },
    name: {
      type: String,
      trim: true,
      // required: [true, 'Name is required'],
    },
    phone: {
      type: String,
      trim: true,
      // required: [true, 'Phone number is required'],
      match: [/^[0-9]{10}$/, 'Phone number must be 10 digits'],
    },
    alternatePhone: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: function (v) {
          return !v || /^[0-9]{10}$/.test(v);
        },
        message: 'Alternate phone must be 10 digits',
      },
    },
    fullAddress: {
      type: String,
      trim: true,
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: true, // auto-generate _id for each address
    timestamps: true, // to track when an address was added/updated
  },
);

addressSchema.index({ area: 1, pincode: 1 });

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: [
        'consumer',
        'retailer',
        'wholesaler',
        'super_stocker',
        'distributor',
        'delivery_officer',
      ],
      required: true,
    },
    fullName: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    mobile: {
      type: String,
      unique: true,
      sparse: true,
    },
    profileImage: { type: String, required: false },
    addresses: [addressSchema],
    file_location: { type: String, required: false },
    // password: { type: String, required: true },
    password: {
      type: String,
      // Changed from required: true - not needed for Google users
      required: function () {
        return this.authType === 'local'; // Only required for local auth
      },
    },

    // ✨ NEW FIELDS FOR GOOGLE SIGN-IN
    authType: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
      required: true,
    },
    googleProviderId: {
      type: String,
      unique: true,
      sparse: true, // Allows null/undefined values
      // This is the Firebase UID
    },
    isActive: { type: Boolean, default: true },
    docStatus: {
      type: String,
      enum: ['approved', 'rejected', 'pending'],
      default: 'pending',
    },
    isVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    discriminatorKey: 'role',
    timestamps: true,
  },
);

export const User = getAppDB().model('User', userSchema);
