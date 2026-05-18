import express from "express";

import { updateUserProfile } from "../../controllers/admin/profileController.js";
import { hasPermission } from "../../middleware/permission.js";
import { uploadDisk } from './../../middleware/multer.js';

const router = express.Router();

router.put("/:id", hasPermission("General"),uploadDisk.single('profile'), updateUserProfile);


export default router;
