import express from 'express';
import authMiddleware from '../../middleware/auth.js';
import { hasPermission } from '../../middleware/permission.js';
import { createTermsOrPrivacy, deleteTermsOrPrivacy, getAllTermsAndPrivacy, getAllTermsAndPrivacyApp, getTermsOrPrivacyById, updateTermsOrPrivacy, updateTermsOrPrivacyStatus } from '../../controllers/admin/termsAndPrivacyController.js';


const router = express.Router();

router.use(authMiddleware);

router.post('/', hasPermission('TERMS_PRIVACY'), createTermsOrPrivacy);

router.put('/:id', hasPermission('TERMS_PRIVACY'), updateTermsOrPrivacy);

router.get('/', hasPermission('TERMS_PRIVACY'), getAllTermsAndPrivacy);
router.get('/app', authMiddleware, getAllTermsAndPrivacyApp);

router.get('/:id', hasPermission('TERMS_PRIVACY'), getTermsOrPrivacyById);

router.delete('/:id', hasPermission('TERMS_PRIVACY'), deleteTermsOrPrivacy);

router.patch(
  '/:id/status',
  hasPermission('TERMS_PRIVACY'),
  updateTermsOrPrivacyStatus,
);

// router.post(
//   '/contact/support',
//   hasPermission('TERMS_PRIVACY'),
//   createContactSupport,
// );
// router.put(
//   '/contact/support/:id',
//   hasPermission('TERMS_PRIVACY'),
//   updateContactSupport,
// );
// router.get(
//   '/contact/support',
//   hasPermission('TERMS_PRIVACY'),
//   getAllContactSupport,
// );

export default router;
