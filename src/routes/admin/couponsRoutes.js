import express from 'express';
import { hasPermission } from '../../middleware/permission.js';
import { createPromotionalCoupon, deletePromotionalCoupon, getAllPromotionalCoupons, getPromotionalCouponById, incrementPromotionalCouponUsage, togglePromotionalCouponStatus, updatePromotionalCoupon } from '../../controllers/admin/couponsControllerV2.js';

// import { createCoupons, createPromotionalCoupon, deleteCoupons, deletePromotionalCoupon, getAllCoupons, getAllPromotionalCoupons, getPromotionalCouponById, incrementPromotionalCouponUsage, togglePromotionalCouponStatus, updateCoupons, updatePromotionalCoupon } from '../../controllers/admin/couponsController.js';


const router = express.Router();
// router.post('/', hasPermission('Coupons'), createCoupons);
// router.put('/:id', hasPermission('Coupons'),updateCoupons);
// router.get('/', hasPermission('Coupons'), getAllCoupons);
// router.delete('/:id', hasPermission('Coupons'), deleteCoupons);
// router.put('/status/:id', hasPermission('Category'), updateCategoryStatus);


// Admin routes (protected)
router.post('/add', hasPermission('Coupons'), createPromotionalCoupon);
router.get('/all', hasPermission('Coupons'), getAllPromotionalCoupons);
router.get('/:id', hasPermission('Coupons'), getPromotionalCouponById);
router.put('/:id/update', hasPermission('Coupons'), updatePromotionalCoupon);
router.patch('/:id/toggle-status', hasPermission('Coupons'), togglePromotionalCouponStatus);
router.delete('/:id/delete', hasPermission('Coupons'), deletePromotionalCoupon);
router.post('/increment-usage', hasPermission('Coupons'), incrementPromotionalCouponUsage);




export default router;
