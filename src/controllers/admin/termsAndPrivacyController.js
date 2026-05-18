import { createRepository } from '../../utils/repository.js';
import TermsAndPrivacy from '../../models/admin/termsAndPrivacyModel.js';
import CompanyConfig from '../../models/admin/CompanyConfigModel.js';
// import ContactSupport from '../../models/admin/contactSupport.js';
const termsRepo = createRepository(TermsAndPrivacy, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});
// const contactRepo = createRepository(ContactSupport, {
//   softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
// });

// ✅ Create new Terms or Privacy Policy
export const createTermsOrPrivacy = async (req, res) => {
  try {
    const { userType, policyType, heading, section } = req.body;
console.log("req",req.body)
    if (!req.user?.id)
      return res
        .status(401)
        .json({ success: false, message: 'Unauthorized: User info missing.' });

    // Validation
    if (!userType || ![ 'consumer','partner','delivery_officer'].includes(userType))
      return res
        .status(400)
        .json({ success: false, message: 'Invalid or missing userType.' });

    if (
      !policyType ||
      !['privacy_policy', 'terms_of_service'].includes(policyType)
    )
      return res
        .status(400)
        .json({ success: false, message: 'Invalid or missing policyType.' });

    if (!heading || !heading.trim())
      return res
        .status(400)
        .json({ success: false, message: 'Heading is required.' });

    if (
      !Array.isArray(section) ||
      section.length === 0 ||
      section.some(
        (s) =>
          !s.title ||
          !s.title.trim() ||
          !Array.isArray(s.content) ||
          s.content.length === 0 ||
          s.content.some((c) => !c.trim()),
      )
    )
      return res.status(400).json({
        success: false,
        message:
          'Invalid section format. Each section must include a title and non-empty content array.',
      });

    const newDoc = await TermsAndPrivacy.create({
      userType,
      policyType,
      heading: heading.trim(),
      section: section.map((s) => ({
        title: s.title.trim(),
        content: s.content.map((c) => c.trim()),
      })),
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Policy created successfully.',
      data: newDoc,
    });
  } catch (error) {
    console.error('Create Policy Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Update Terms or Privacy Policy
export const updateTermsOrPrivacy = async (req, res) => {
  try {
    const { id } = req.params;
    const { userType, policyType, heading, section } = req.body;

    if (!req.user?.id)
      return res
        .status(401)
        .json({ success: false, message: 'Unauthorized: User info missing.' });

    const existing = await TermsAndPrivacy.findById(id);
    if (!existing || existing.isDeleted)
      return res
        .status(404)
        .json({ success: false, message: 'Policy not found.' });

    if (userType && ['consumer','partner','delivery_officer'].includes(userType))
      existing.userType = userType;
    if (
      policyType &&
      ['privacy_policy', 'terms_of_service'].includes(policyType)
    )
      existing.policyType = policyType;
    if (heading && heading.trim()) existing.heading = heading.trim();

    if (
      Array.isArray(section) &&
      section.length > 0 &&
      section.every(
        (s) =>
          s.title &&
          s.title.trim() &&
          Array.isArray(s.content) &&
          s.content.length > 0 &&
          s.content.every((c) => c.trim()),
      )
    ) {
      existing.section = section.map((s) => ({
        title: s.title.trim(),
        content: s.content.map((c) => c.trim()),
      }));
    }

    existing.updatedBy = req.user.id;
    await existing.save();

    return res.json({
      success: true,
      message: 'Policy updated successfully.',
      data: existing,
    });
  } catch (error) {
    console.error('Update Policy Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get all (with filters, pagination, search)
export const getAllTermsAndPrivacy = async (req, res) => {
  try {
    const { page, limit, sort, q, userType, policyType, isActive } = req.query;
    const filter = {};

    if (q) {
      filter.$or = [
        { heading: { $regex: q, $options: 'i' } },
        { 'section.title': { $regex: q, $options: 'i' } },
        { 'section.content': { $regex: q, $options: 'i' } },
      ];
    }

    if (userType) filter.userType = userType;
    if (policyType) filter.policyType = policyType;
    if (isActive != null) filter.isActive = isActive === 'true';

    const result = await termsRepo.getAll({
      filter,
      sort: sort ? JSON.parse(sort) : { createdAt: -1 },
      page,
      limit,
      collation: { locale: 'en', strength: 2 },
      paginate:false
    });

    return res.status(result.status).json(result);
  } catch (err) {
    console.error('Get All Policy Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
function resolveAudience(role) {
  if (role === 'consumer') return 'consumer';
  if (role === 'delivery_officer') return 'delivery_officer';
  return 'partner';
}

export const getAllTermsAndPrivacyApp = async (req, res) => {
  try {
    const role = req.user?.role;
    const audience = resolveAudience(role);

    // company config (same for all)
    const config = await CompanyConfig.findOne({ isDeleted: false })
      .sort({ createdAt: -1 })
      .lean();

    const baseFilter = {
      isDeleted: false,
      isActive: true,
      userType: audience,
    };

    const [termsDocs, privacyDocs] = await Promise.all([
      TermsAndPrivacy.find({ ...baseFilter, policyType: 'terms_of_service' })
        .sort({ createdAt: -1 })
        .lean(),

      TermsAndPrivacy.find({ ...baseFilter, policyType: 'privacy_policy' })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      audience,
      data: {
        terms: termsDocs || [],
        privacy: privacyDocs || [],
        contact: config || null, // as you wanted
      },
    });
  } catch (err) {
    console.error('getAllTermsAndPrivacyApp Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


// ✅ Get by ID
export const getTermsOrPrivacyById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await TermsAndPrivacy.findById(id).lean();

    if (!doc || doc.isDeleted)
      return res
        .status(404)
        .json({ success: false, message: 'Policy not found.' });

    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error('Get Policy By ID Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Soft Delete
export const deleteTermsOrPrivacy = async (req, res) => {
  try {
    const result = await termsRepo.removeById(req.params.id, { hard: false });
    return res.status(result.status).json(result);
  } catch (err) {
    console.error('Delete Policy Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Update Status
export const updateTermsOrPrivacyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean')
      return res
        .status(400)
        .json({ success: false, message: 'isActive must be boolean.' });

    const doc = await TermsAndPrivacy.findByIdAndUpdate(
      id,
      { isActive, updatedBy: req.user.id },
      { new: true },
    );

    if (!doc)
      return res
        .status(404)
        .json({ success: false, message: 'Policy not found.' });

    return res.json({
      success: true,
      message: 'Status updated successfully.',
      data: doc,
    });
  } catch (err) {
    console.error('Update Policy Status Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
// export const createContactSupport = async (req, res) => {
//   try {
//     const { email, phone } = req.body;

//     if (!req.user?.id)
//       return res
//         .status(401)
//         .json({ success: false, message: 'Unauthorized: User info missing.' });

//     const newDoc = await ContactSupport.create({
//       email,
//       phone,
//       createdBy: req.user.id,
//       updatedBy: req.user.id,
//     });

//     return res.status(201).json({
//       success: true,
//       message: 'Contact support created successfully.',
//       data: newDoc,
//     });
//   } catch (error) {
//     console.error('Create Policy Error:', error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };
// export const updateContactSupport = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { email, phone } = req.body;

//     if (!req.user?.id)
//       return res
//         .status(401)
//         .json({ success: false, message: 'Unauthorized: User info missing.' });

//     const existing = await ContactSupport.findById(id);
//     if (!existing || existing.isDeleted)
//       return res
//         .status(404)
//         .json({ success: false, message: 'Policy not found.' });

//     if (email) existing.email = email;
//     if (phone) existing.phone = phone;

//     existing.updatedBy = req.user.id;
//     await existing.save();

//     return res.json({
//       success: true,
//       message: 'Contact Support updated successfully.',
//       data: existing,
//     });
//   } catch (error) {
//     console.error('Update Policy Error:', error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// export const getAllContactSupport = async (req, res) => {
//   try {
//     const { page, limit, sort, q } = req.query;
//     const filter = {};

//     const result = await contactRepo.getAll({
//       filter,
//       sort: sort ? JSON.parse(sort) : { createdAt: -1 },
//       page,
//       limit,
//       collation: { locale: 'en', strength: 2 },
//     });

//     return res.status(result.status).json(result);
//   } catch (err) {
//     console.error('Get All Policy Error:', err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };
