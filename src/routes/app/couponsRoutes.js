import express from 'express';
import authMiddleware from '../../middleware/auth.js';
import {
  getAllCoupons,
  getActivePromotionalCoupons,
  getPromotionalCouponByCode,
} from '../../controllers/app/couponsController.js';


const router = express.Router();

router.get('/', authMiddleware, getAllCoupons);
router.get('/active/list', authMiddleware, getActivePromotionalCoupons);
router.get('/code/:code', authMiddleware,getPromotionalCouponByCode);


export default router;
