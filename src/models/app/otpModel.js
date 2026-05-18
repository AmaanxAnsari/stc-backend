import mongoose from 'mongoose';
import { getAppDB } from '../../config/db.js';


const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true, 
    },
    otp: {
        type: String,
        required: true,
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
});

const OtpApp = getAppDB().model('OtpApp', otpSchema);

 export default OtpApp;
