import express from 'express';
import { getAllCategory } from '../../controllers/app/categoryController.js';
import authMiddleware from '../../middleware/auth.js';


const router = express.Router();

router.get('/', authMiddleware, getAllCategory);


export default router;
