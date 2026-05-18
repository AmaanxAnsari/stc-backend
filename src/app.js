import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cors from 'cors';
import { connectDB } from './config/db.js';

dotenv.config();
const app = express();
app.use(morgan('dev'));
app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// ✅ FaceTec blobs can be large → raise limits
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// ✅ Connect DB first
await connectDB();

app.use('/api/v1/uploads', express.static('uploads'));

// ✅ Dynamic imports AFTER connection
const { default: appRouteInitializer } = await import(
  './routes/appRouteInitializer.js'
);
const { default: adminRouteInitializer } = await import(
  './routes/adminRouteInitializer.js'
);

appRouteInitializer(app);
adminRouteInitializer(app);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
