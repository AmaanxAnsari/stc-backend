import express from 'express';
import {
  createModule,
  deleteModule,
  getAllModules,
  updateModule,
} from '../../controllers/admin/moduleController.js';

const router = express.Router();

router.post('/', createModule);
router.get('/', getAllModules);
router.put('/:id', updateModule);
router.delete('/:id', deleteModule);

export default router;
