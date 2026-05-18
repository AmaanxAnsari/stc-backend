// config/db.js
import mongoose from 'mongoose';

const options = { autoIndex: true };

let adminConnection;
let appConnection;

export const connectDB = async () => {
  try {
    // DEFAULT connection for sessions
    // await mongoose.connect(process.env.DEFAULT_DATABASE_URL);
    // console.log('✅ Main DB connected');

    adminConnection = await mongoose
      .createConnection(process.env.ADMIN_DATABASE_URL, options)
      .asPromise(); // Use asPromise() for better async handling
    console.log('✅ Admin DB connected');

    appConnection = await mongoose
      .createConnection(process.env.APP_DATABASE_URL, options)
      .asPromise();
    console.log('✅ App DB connected');

    return { adminConnection, appConnection };
  } catch (err) {
    console.error('❌ DB connection error:', err.message);
    process.exit(1);
  }
};

export const getAdminDB = () => adminConnection;
export const getAppDB = () => appConnection;

