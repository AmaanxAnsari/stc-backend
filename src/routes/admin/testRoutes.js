import express from 'express';
import upload from '../middleware/multer.js';
import {
  uploadResume,
  uploadRequirements,
  optimizeSingleImage,
  optimizeMultipleImages,
  deleteFile,
  createProject,
  updateProject,
  updateSingleImage,
  updateMultipleImages,
} from '../controllers/testController.js';

const router = express.Router();

router.post('/resume', upload.single('file'), uploadResume);

router.post('/requirements', upload.array('files', 10), uploadRequirements);

router.post('/optimize-single', upload.single('image'), optimizeSingleImage);

router.post(
  '/optimize-multiple',
  upload.array('images', 10),
  optimizeMultipleImages,
);
router.put('/update-single', upload.single('image'), updateSingleImage);

router.put(
  '/update-multiple',
  upload.array('images', 10),
  updateMultipleImages,
);
router.delete('/delete-file', deleteFile);

router.post(
  '/multiple-file-name',
  upload.fields([
    { name: 'banner_image', maxCount: 1 },
    { name: 'images', maxCount: 10 },
  ]),
  createProject,
);
router.put(
  '/:id',
  upload.fields([
    { name: 'banner_image', maxCount: 1 },
    { name: 'images', maxCount: 10 },
  ]),
  updateProject,
);

export default router;
