import bcrypt from 'bcryptjs';
import { User } from '../../models/app/user.js';
import { Consumer } from '../../models/app/consumerModel.js';
import { Retailer } from './../../models/app/retailerModel.js';
import { Wholesaler } from './../../models/app/wholesalerModel.js';
import { SuperStocker } from './../../models/app/superStockerModel.js';
import { Distributor } from './../../models/app/distributorModel.js';
import uploadHelper from '../../utils/uploadHelper.js';
import { generateSlug } from '../../helper/slugHelper.js';
import { parseMaybeJSON } from '../../utils/parser.js';
import { createRepository } from '../../utils/repository.js';
import { DeliveryOfficer } from '../../models/app/deliveryOfficerModel.js';
import cleanupHelper from '../../helper/cleanupHelper.js';
import AdminUser from '../../models/admin/adminUser.js';
import { notifyAdmins, notifyUser } from '../../utils/notificationService.js';

const userRepo = createRepository(User, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});

/* --------------------------- USER --------------------------- */
export const getAllUsers = async (req, res) => {
  try {
    const { page, limit, sort, q, isActive } = req.query;

    const filter = {};
    if (q) {
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
      ];
    }
    if (isActive != null) filter.isActive = isActive === 'true';

    // Parse user sort OR default
    let finalSort = sort ? JSON.parse(sort) : {};

    // ⬇️ Force active users first
    finalSort.isActive = -1;
    finalSort.createdAt = -1;

    const result = await userRepo.getAll({
      filter,
      sort: finalSort,
      page,
      limit,
      projection: { password: 0 },
      paginate: false,
      collation: { locale: 'en', strength: 2 },
    });

    // Directly return repository response
    return res.status(result.status).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 500,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const result = await userRepo.getById(req.params.id, {
      projection: { password: 0 },
    });

    // Directly return the repository response
    return res.status(result.status).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 500,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const result = await userRepo.removeById(req.params.id, { hard: true });

    // Directly return the repository response
    return res.status(result.status).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 500,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};

// export const updateStatus = async (req, res) => {
//   try {
//     const status = req.body;

//     const result = await userRepo.updateStatus(req.params.id, status, {
//       projection: { password: 0 },
//     });

//     // Directly return the repository response
//     return res.status(result.status).json(result);
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       status: 500,
//       message: 'An unexpected error occurred.',
//       error: err.message,
//     });
//   }
// };
export const updateStatus = async (req, res) => {
  try {
    const status = req.body;
    const userId = req.params.id;

    // Get user details before update
    const user = await User.findById(userId).select(
      'fullName email role isActive isVerified docStatus',
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'User not found',
      });
    }

    // Store old values
    const oldIsActive = user.isActive;
    const oldDocStatus = user.docStatus;

    // Update status
    const result = await userRepo.updateStatus(userId, status, {
      projection: { password: 0 },
    });

    // ✅ Send notifications based on status changes
    if (result.success && user.email) {
      const roleNameMap = {
        retailer: 'Retailer',
        wholesaler: 'Wholesaler',
        super_stocker: 'Super Stocker',
        distributor: 'Distributor',
        consumer: 'Consumer',
      };
      const roleName = roleNameMap[user.role] || user.role;

      const notificationData = {
        userName: user.fullName,
        roleName: roleName,
        loginUrl: `${process.env.APP_URL || 'https://gavran.com'}/login`,
        reuploadUrl: `${process.env.APP_URL || 'https://gavran.com'}/profile/documents`,
      };

      // 1️⃣ Check if account was DEACTIVATED
      if (
        status.hasOwnProperty('isActive') &&
        status.isActive === false &&
        oldIsActive === true
      ) {
        notifyUser({
          userId: userId,
          userEmail: user.email,
          userName: user.fullName,
          templateKey: 'accountDeactivated',
          data: notificationData,
        }).catch((err) => {
          console.error('❌ Account deactivation notification failed:', err);
        });
      }

      // 2️⃣ ✅ NEW: Check if account was REACTIVATED
      if (
        status.hasOwnProperty('isActive') &&
        status.isActive === true &&
        oldIsActive === false
      ) {
        notifyUser({
          userId: userId,
          userEmail: user.email,
          userName: user.fullName,
          templateKey: 'accountReactivated',
          data: notificationData,
        }).catch((err) => {
          console.error('❌ Account reactivation notification failed:', err);
        });
      }

      // 3️⃣ Check if documents were APPROVED
      if (
        status.hasOwnProperty('docStatus') &&
        status.docStatus === 'approved' &&
        oldDocStatus !== 'approved'
      ) {
        notifyUser({
          userId: userId,
          userEmail: user.email,
          userName: user.fullName,
          templateKey: 'documentsApproved',
          data: notificationData,
        }).catch((err) => {
          console.error('❌ Document approval notification failed:', err);
        });
      }

      // 4️⃣ Check if documents were REJECTED
      if (
        status.hasOwnProperty('docStatus') &&
        status.docStatus === 'rejected' &&
        oldDocStatus !== 'rejected'
      ) {
        notifyUser({
          userId: userId,
          userEmail: user.email,
          userName: user.fullName,
          templateKey: 'documentsRejected',
          data: notificationData,
        }).catch((err) => {
          console.error('❌ Document rejection notification failed:', err);
        });
      }
    }

    // Directly return the repository response
    return res.status(result.status).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 500,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { userId, fullName, email, mobile } = req.body;

    // Validate presence of userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Check at least one updatable field
    const hasUpdatableField =
      typeof fullName !== 'undefined' ||
      typeof email !== 'undefined' ||
      typeof mobile !== 'undefined' ||
      (req.files && Object.keys(req.files).length > 0);

    if (!hasUpdatableField) {
      return res.status(400).json({
        success: false,
        message:
          'Provide at least one field to update: fullName, email, mobile, or profileImage.',
      });
    }

    // Validate email uniqueness
    if (email && email !== user.email) {
      const emailTaken = await User.findOne({ email, _id: { $ne: user._id } });
      if (emailTaken) {
        return res.status(409).json({
          success: false,
          message: 'Another user already exists with this email.',
        });
      }
    }

    // Validate mobile uniqueness
    if (mobile && mobile !== user.mobile) {
      const mobileTaken = await User.findOne({
        mobile,
        _id: { $ne: user._id },
      });
      if (mobileTaken) {
        return res.status(409).json({
          success: false,
          message: 'Another user already exists with this mobile number.',
        });
      }
    }

    // --- Handle Profile Image Upload ---
    let profileImageUrl = user.profileImage; // retain old if none uploaded

    const filePaths = uploadHelper.extractFilePaths(req.files);
    const profileFiles = filePaths.profileImage || filePaths.image || [];

    const outputDir = `app/profiles/${userId}`;
    if (profileFiles.length > 0) {
      const optimizedProfile = await uploadHelper.optimizeImage(profileFiles, {
        outputDir,
      });
      profileImageUrl = optimizedProfile; // path/url returned from helper
    }

    // --- Apply updates ---
    if (typeof fullName !== 'undefined') user.fullName = fullName;
    if (typeof email !== 'undefined') user.email = email;
    if (typeof mobile !== 'undefined') user.mobile = mobile;
    if (profileImageUrl) user.profileImage = profileImageUrl;

    // Save user
    const updatedUser = await user.save();
    await cleanupHelper.autoFolderCleaner(outputDir, updatedUser);

    // Remove sensitive fields
    const safeUser = updatedUser.toObject();
    delete safeUser.password;

    return res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: safeUser,
    });
  } catch (error) {
    // Handle duplicate key error
    if (error && error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(409).json({
        success: false,
        message: `Duplicate value for ${field}.`,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error while updating user.',
      error: error.message,
    });
  }
};

// Add a new address
export const addAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const addressData = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Optional: Make sure only one address is default
    if (addressData.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    user.addresses.push(addressData);
    await user.save();

    res
      .status(201)
      .json({ message: 'Address added', addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAddress = async (req, res) => {
  try {
    const { id, addressId } = req.params; // id = userId, addressId = _id of address
    const updatedData = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const address = user.addresses.id(addressId);
    if (!address) return res.status(404).json({ message: 'Address not found' });

    // Optional: Make sure only one address is default
    if (updatedData.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    // Update address fields
    Object.keys(updatedData).forEach((key) => {
      address[key] = updatedData[key];
    });

    await user.save();

    res
      .status(200)
      .json({ message: 'Address updated', addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const { id, addressId } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Remove the address
    user.addresses = user.addresses.filter(
      (addr) => addr._id.toString() !== addressId,
    );

    // Handle default address logic
    if (user.addresses.length > 0) {
      // Check if any address is currently default
      const hasDefault = user.addresses.some((addr) => addr.isDefault);

      // If none is default, make the first one default
      if (!hasDefault) {
        user.addresses[0].isDefault = true;
      }
    }

    await user.save();

    res
      .status(200)
      .json({ message: 'Address deleted', addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* --------------------------- CONSUMER --------------------------- */
// export const registerConsumer = async (req, res) => {
//   try {
//     const { fullName, email, mobile, password } = req.body;

//     if (!fullName || !mobile || !password) {
//       return res.status(400).json({
//         success: false,
//         message: 'Full name, mobile, and password are required.',
//       });
//     }

//     const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
//     if (existingUser) {
//       return res.status(409).json({
//         success: false,
//         message: 'User already exists with this email or mobile.',
//       });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const user = await Consumer.create({
//       fullName,
//       email,
//       mobile,
//       password: hashedPassword,
//       role: 'consumer',
//     });

//     return res.status(201).json({
//       success: true,
//       message: 'Consumer registered successfully.',
//       data: user,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Server error while registering consumer.',
//       error: error.message,
//     });
//   }
// };

export const registerConsumer = async (req, res) => {
  try {
    const { fullName, email, mobile, password } = req.body;

    if (!fullName || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, mobile, and password are required.',
      });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email or mobile.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await Consumer.create({
      fullName,
      email,
      mobile,
      password: hashedPassword,
      role: 'consumer',
    });

    // ✅ Notify admins (Email + DB) - SIMPLE VERSION
    // Get admin users from DB
    const adminUsers = await AdminUser.find({
      role: 'admin',
      isActive: true,
    }).select('_id email');

    if (adminUsers.length > 0) {
      notifyAdmins({
        admins: adminUsers.map((admin) => ({
          userId: admin._id.toString(),
          email: admin.email,
        })),
        templateKey: 'newConsumerRegistration',
        data: {
          consumerName: user.fullName,
          consumerEmail: user.email || 'Not provided',
          consumerMobile: user.mobile,
          userId: user._id.toString(),
          registrationDate: new Date().toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          adminUserUrl: `${process.env.HOST_URL || 'https://gavran-admin.demohub.tech'}/management/app-users`,
        },
      }).catch((err) => {
        console.error('❌ Admin notification failed:', err);
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Consumer registered successfully.',
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while registering consumer.',
      error: error.message,
    });
  }
};

export const updateConsumer = async (req, res) => {
  try {
    const { userId, fullName, email, mobile } = req.body;

    // Basic presence check: at least one updatable field must be provided
    if (
      typeof fullName === 'undefined' &&
      typeof email === 'undefined' &&
      typeof mobile === 'undefined'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Provide at least one field to update: fullName, email, or mobile.',
      });
    }

    // Load the consumer document
    const user = await Consumer.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Consumer not found.',
      });
    }

    // If email/mobile being changed, ensure not taken by another user
    if (email && email !== user.email) {
      const emailTaken = await User.findOne({ email, _id: { $ne: user._id } });
      if (emailTaken) {
        return res.status(409).json({
          success: false,
          message: 'Another user already exists with this email.',
        });
      }
    }

    if (mobile && mobile !== user.mobile) {
      const mobileTaken = await User.findOne({
        mobile,
        _id: { $ne: user._id },
      });
      if (mobileTaken) {
        return res.status(409).json({
          success: false,
          message: 'Another user already exists with this mobile.',
        });
      }
    }

    // Apply allowed updates only
    if (typeof fullName !== 'undefined') user.fullName = fullName;
    if (typeof email !== 'undefined') user.email = email;
    if (typeof mobile !== 'undefined') user.mobile = mobile;

    // Save triggers validation and middleware
    const updated = await user.save();

    // Remove sensitive fields from response
    const safeUser = updated.toObject();
    delete safeUser.password;

    return res.status(200).json({
      success: true,
      message: 'Consumer updated successfully.',
      data: safeUser,
    });
  } catch (error) {
    // Handle potential duplicate key errors from unique indexes
    if (error && error.code === 11000) {
      // Determine which field caused conflict if needed
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(409).json({
        success: false,
        message: `Duplicate value for ${field}.`,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error while updating consumer.',
      error: error.message,
    });
  }
};

/* ----------------------- PARTNER ROLES ----------------------- */
// export const registerPartner = async (req, res) => {
//   try {
//     const {
//       user_info,
//       business_info,
//       infrastructure_coverage_info,
//       market_info,
//       financials_documents_info,
//     } = req.body;
//     console.log('Body', req.body);

//     // -------- Basic Validations --------
//     if (
//       !user_info ||
//       !user_info.fullName ||
//       !user_info.mobileNumber ||
//       !user_info.password ||
//       !user_info.role
//     ) {
//       return res.status(400).json({
//         success: false,
//         message:
//           'Full name, mobile, password, and role are required in user_info.',
//       });
//     }

//     const validRoles = [
//       'retailer',
//       'wholesaler',
//       'super_stocker',
//       'distributor',
//     ];
//     if (!validRoles.includes(user_info.role)) {
//       return res.status(400).json({ success: false, message: 'Invalid role.' });
//     }

//     const existingUser = await User.findOne({
//       $or: [{ email: user_info.email }, { mobile: user_info.mobileNumber }],
//     });
//     if (existingUser) {
//       return res.status(409).json({
//         success: false,
//         message: 'User already exists with this email or mobile.',
//       });
//     }

//     const hashedPassword = await bcrypt.hash(user_info.password, 10);

//     // -------- Unique slug + file location --------
//     const slug = generateSlug(user_info.fullName);
//     const fileLocation = `${user_info.role}/${slug}`;

//     // -------- Handle uploaded files --------
//     const filesByField = uploadHelper.extractFilePaths(req.files);

//     const optimizedFiles = await uploadHelper.processFiles(
//       filesByField,
//       fileLocation,
//     );

//     // -------- Prepare final user data --------
//     const userData = {
//       role: user_info.role,
//       fullName: user_info.fullName,
//       email: user_info.email,
//       mobile: user_info.mobileNumber,
//       password: hashedPassword,
//       file_location: fileLocation,
//       business_info: business_info || {},
//       infrastructure_coverage_info: {
//         ...infrastructure_coverage_info,
//         godownImage:
//           optimizedFiles['infrastructure_coverage_info[godownImage]'] ||
//           infrastructure_coverage_info?.godownImage,
//       },
//       market_info: market_info || {},
//       financials_documents_info: {
//         ...financials_documents_info,
//         gstDocument:
//           optimizedFiles['financials_documents_info[gstDocument]'] ||
//           financials_documents_info?.gstDocument,
//         panDocument:
//           optimizedFiles['financials_documents_info[panDocument]'] ||
//           financials_documents_info?.panDocument,
//         shopEstablishmentDocument:
//           optimizedFiles[
//             'financials_documents_info[shopEstablishmentDocument]'
//           ] || financials_documents_info?.shopEstablishmentDocument,
//         otherDocsDocument:
//           optimizedFiles['financials_documents_info[otherDocsDocument]'] ||
//           financials_documents_info?.otherDocsDocument,
//       },
//     };

//     // -------- Save user to DB based on role --------
//     let user;
//     switch (user_info.role) {
//       case 'retailer':
//         user = await Retailer.create(userData);
//         break;
//       case 'wholesaler':
//         user = await Wholesaler.create(userData);
//         break;
//       case 'super_stocker':
//         user = await SuperStocker.create(userData);
//         break;
//       case 'distributor':
//         user = await Distributor.create(userData);
//         break;
//     }

//     // -------- Role name formatting --------
//     const roleNameMap = {
//       retailer: 'Retailer',
//       wholesaler: 'Wholesaler',
//       super_stocker: 'Super Stocker',
//       distributor: 'Distributor',
//     };
//     const roleName = roleNameMap[user_info.role] || user_info.role;

//     // -------- Prepare notification data --------
//     const registrationDate = new Date().toLocaleDateString('en-IN', {
//       year: 'numeric',
//       month: 'long',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//       timeZone: 'Asia/Kolkata',
//     });

//     const documentsUploaded = [];
//     if (optimizedFiles['infrastructure_coverage_info[godownImage]']) {
//       documentsUploaded.push('Godown Image');
//     }
//     if (optimizedFiles['financials_documents_info[gstDocument]']) {
//       documentsUploaded.push('GST Document');
//     }
//     if (optimizedFiles['financials_documents_info[panDocument]']) {
//       documentsUploaded.push('PAN Document');
//     }
//     if (
//       optimizedFiles['financials_documents_info[shopEstablishmentDocument]']
//     ) {
//       documentsUploaded.push('Shop Establishment Document');
//     }
//     if (optimizedFiles['financials_documents_info[otherDocsDocument]']) {
//       documentsUploaded.push('Other Documents');
//     }

//     const notificationData = {
//       userId: user._id.toString(),
//       partnerName: user.fullName,
//       partnerEmail: user.email || 'Not provided',
//       partnerMobile: user.mobile,
//       roleName: roleName,
//       role: user_info.role,
//       registrationDate: registrationDate,
//       adminPartnerUrl: `${process.env.HOST_URL || 'https://gavran-admin.demohub.tech'}/management/app-users`,
//       // ✅ FIX: Convert array to comma-separated string
//       documentsUploaded:
//         documentsUploaded.length > 0 ? documentsUploaded.join(', ') : 'None',
//     };

//     // ✅ 1. Send email to PARTNER (welcome + pending verification)
//     if (user.email) {
//       notifyUser({
//         userId: user._id.toString(),
//         userEmail: user.email,
//         userName: user.fullName,
//         templateKey: 'partnerRegistrationSuccess',
//         data: notificationData,
//       }).catch((err) => {
//         console.error('❌ Partner notification failed:', err);
//       });
//     }

//     // ✅ 2. Send notification to ADMINS (email + DB)
//     const adminUsers = await AdminUser.find({
//       role: 'admin',
//       isActive: true,
//     }).select('_id email');

//     if (adminUsers.length > 0) {
//       notifyAdmins({
//         admins: adminUsers.map((admin) => ({
//           userId: admin._id.toString(),
//           email: admin.email,
//         })),
//         templateKey: 'newPartnerRegistration',
//         data: notificationData,
//       }).catch((err) => {
//         console.error('❌ Admin notification failed:', err);
//       });
//     }

//     // Remove sensitive data
//     const userResponse = user.toObject();
//     delete userResponse.password;

//     return res.status(201).json({
//       success: true,
//       message: `${user_info.role.charAt(0).toUpperCase() + user_info.role.slice(1).replace('_', ' ')} registered successfully.`,
//       data: userResponse,
//     });
//   } catch (error) {
//     console.error('Error registering partner:', error);
//     res
//       .status(500)
//       .json({ success: false, message: 'Server error', error: error.message });
//   }
// };
// Working One





export const registerPartner = async (req, res) => {
  try {
    const {
      user_info,
      business_info,
      infrastructure_coverage_info,
      market_info,
      financials_documents_info,
    } = req.body;
    console.log('Body', req.body);

    // -------- Basic Validations --------
    if (
      !user_info ||
      !user_info.fullName ||
      !user_info.mobileNumber ||
      !user_info.password ||
      !user_info.role
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Full name, mobile, password, and role are required in user_info.',
      });
    }

    const validRoles = [
      'retailer',
      'wholesaler',
      'super_stocker',
      'distributor',
    ];
    if (!validRoles.includes(user_info.role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    // const existingUser = await User.findOne({
    //   $or: [{ email: user_info.email }, { mobile: user_info.mobileNumber }],
    // });

    const existingUser = await User.findOne({
      $or: [{ email: user_info.email }, { mobile: user_info.mobileNumber }],
    }).sort({ createdAt: -1 }); // get latest record

    // if (existingUser) {
    //   return res.status(409).json({
    //     success: false,
    //     message: 'User already exists with this email or mobile.',
    //   });
    // }

    if (existingUser) {
      // ❌ Block if already approved or pending
      if (
        existingUser.isVerified === true ||
        existingUser.docStatus === 'approved' ||
        existingUser.docStatus === 'pending'
      ) {
        return res.status(409).json({
          success: false,
          message: 'User already exists and is under verification or approved.',
        });
      }

      // ✅ Allow re-registration ONLY if rejected + not verified
      if (
        existingUser.docStatus === 'rejected' &&
        existingUser.isVerified === false
      ) {
        // allow re-registration → do nothing
      } else {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this email or mobile.',
        });
      }
    }


    const hashedPassword = await bcrypt.hash(user_info.password, 10);

    // -------- Unique slug + file location --------
    const slug = generateSlug(user_info.fullName);
    const fileLocation = `${user_info.role}/${slug}`;

    // -------- Handle uploaded files --------
    const filesByField = uploadHelper.extractFilePaths(req.files);

    const optimizedFiles = await uploadHelper.processFiles(
      filesByField,
      fileLocation,
    );

    // -------- Prepare final user data --------
    const userData = {
      role: user_info.role,
      fullName: user_info.fullName,
      email: user_info.email,
      mobile: user_info.mobileNumber,
      password: hashedPassword,
      file_location: fileLocation,
      business_info: business_info || {},
      infrastructure_coverage_info: {
        ...infrastructure_coverage_info,
        godownImage:
          optimizedFiles['infrastructure_coverage_info[godownImage]'] ||
          infrastructure_coverage_info?.godownImage,
      },
      market_info: market_info || {},
      financials_documents_info: {
        ...financials_documents_info,
        gstDocument:
          optimizedFiles['financials_documents_info[gstDocument]'] ||
          financials_documents_info?.gstDocument,
        panDocument:
          optimizedFiles['financials_documents_info[panDocument]'] ||
          financials_documents_info?.panDocument,
        shopEstablishmentDocument:
          optimizedFiles[
            'financials_documents_info[shopEstablishmentDocument]'
          ] || financials_documents_info?.shopEstablishmentDocument,
        otherDocsDocument:
          optimizedFiles['financials_documents_info[otherDocsDocument]'] ||
          financials_documents_info?.otherDocsDocument,
      },
    };

    // -------- Save user to DB based on role --------
    let user;
    switch (user_info.role) {
      case 'retailer':
        user = await Retailer.create(userData);
        break;
      case 'wholesaler':
        user = await Wholesaler.create(userData);
        break;
      case 'super_stocker':
        user = await SuperStocker.create(userData);
        break;
      case 'distributor':
        user = await Distributor.create(userData);
        break;
    }

    // -------- Role name formatting --------
    const roleNameMap = {
      retailer: 'Retailer',
      wholesaler: 'Wholesaler',
      super_stocker: 'Super Stocker',
      distributor: 'Distributor',
    };
    const roleName = roleNameMap[user_info.role] || user_info.role;

    // -------- Prepare notification data --------
    const registrationDate = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });

    const documentsUploaded = [];
    if (optimizedFiles['infrastructure_coverage_info[godownImage]']) {
      documentsUploaded.push('Godown Image');
    }
    if (optimizedFiles['financials_documents_info[gstDocument]']) {
      documentsUploaded.push('GST Document');
    }
    if (optimizedFiles['financials_documents_info[panDocument]']) {
      documentsUploaded.push('PAN Document');
    }
    if (
      optimizedFiles['financials_documents_info[shopEstablishmentDocument]']
    ) {
      documentsUploaded.push('Shop Establishment Document');
    }
    if (optimizedFiles['financials_documents_info[otherDocsDocument]']) {
      documentsUploaded.push('Other Documents');
    }

    const notificationData = {
      userId: user._id.toString(),
      partnerName: user.fullName,
      partnerEmail: user.email || 'Not provided',
      partnerMobile: user.mobile,
      roleName: roleName,
      role: user_info.role,
      registrationDate: registrationDate,
      adminPartnerUrl: `${process.env.HOST_URL || 'https://gavran-admin.demohub.tech'}/management/app-users`,
      // ✅ FIX: Convert array to comma-separated string
      documentsUploaded:
        documentsUploaded.length > 0 ? documentsUploaded.join(', ') : 'None',
    };

    // ✅ 1. Send email to PARTNER (welcome + pending verification)
    if (user.email) {
      notifyUser({
        userId: user._id.toString(),
        userEmail: user.email,
        userName: user.fullName,
        templateKey: 'partnerRegistrationSuccess',
        data: notificationData,
      }).catch((err) => {
        console.error('❌ Partner notification failed:', err);
      });
    }

    // ✅ 2. Send notification to ADMINS (email + DB)
    const adminUsers = await AdminUser.find({
      role: 'admin',
      isActive: true,
    }).select('_id email');

    if (adminUsers.length > 0) {
      notifyAdmins({
        admins: adminUsers.map((admin) => ({
          userId: admin._id.toString(),
          email: admin.email,
        })),
        templateKey: 'newPartnerRegistration',
        data: notificationData,
      }).catch((err) => {
        console.error('❌ Admin notification failed:', err);
      });
    }

    // Remove sensitive data
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(201).json({
      success: true,
      message: `${user_info.role.charAt(0).toUpperCase() + user_info.role.slice(1).replace('_', ' ')} registered successfully.`,
      data: userResponse,
    });
  } catch (error) {
    console.error('Error registering partner:', error);
    res
      .status(500)
      .json({ success: false, message: 'Server error', error: error.message });
  }
};
export const updatePartner = async (req, res) => {
  try {
    let { userId, role, target, payload } = req.body;
    payload = parseMaybeJSON(payload);

    const validRoles = new Set([
      'retailer',
      'wholesaler',
      'super_stocker',
      'distributor',
    ]);
    const validTargets = new Set([
      'user_info',
      'business_info',
      'infrastructure_coverage_info',
      'market_info',
      'financials_documents_info',
    ]);

    if (!userId || !role || !target) {
      return res.status(400).json({
        success: false,
        message: 'userId, role, target are required.',
      });
    }
    if (!validRoles.has(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }
    if (!validTargets.has(target)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid target section.' });
    }

    // Role model map (import your models appropriately)
    const RoleModelMap = {
      retailer: Retailer,
      wholesaler: Wholesaler,
      super_stocker: SuperStocker,
      distributor: Distributor,
    };
    const Model = RoleModelMap[role];
    if (!Model) {
      return res
        .status(400)
        .json({ success: false, message: 'Unsupported role model.' });
    }

    const doc = await Model.findById(userId);
    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found.' });
    }

    const fileLocation = doc.file_location;

    const filesByField = uploadHelper.extractFilePaths(req.files || req.file);

    const sectionFileFields = {
      user_info: [],
      business_info: [],
      infrastructure_coverage_info: ['godownImage'],
      market_info: [],
      financials_documents_info: [
        'gstDocument',
        'panDocument',
        'shopEstablishmentDocument',
        'otherDocsDocument',
      ],
    };

    if (target === 'user_info') {
      const allow = ['fullName', 'email', 'mobile'];
      for (const k of allow) {
        if (
          payload &&
          Object.prototype.hasOwnProperty.call(payload, k) &&
          typeof payload[k] === 'string'
        ) {
          doc[k] = payload[k];
        }
      }

      if (payload?.email && payload.email !== doc.email) {
        const emailExists = await User.findOne({
          email: payload.email,
          _id: { $ne: doc._id },
        });
        if (emailExists) {
          return res.status(409).json({
            success: false,
            message: 'Another user already exists with this email.',
          });
        }
      }
      if (payload?.mobile && payload.mobile !== doc.mobile) {
        const mobileExists = await User.findOne({
          mobile: payload.mobile,
          _id: { $ne: doc._id },
        });
        if (mobileExists) {
          return res.status(409).json({
            success: false,
            message: 'Another user already exists with this mobile.',
          });
        }
      }
    } else {
      const sectionObj = doc[target] || {};
      if (!doc[target]) doc[target] = {};
      if (payload && typeof payload === 'object') {
        for (const [k, v] of Object.entries(payload)) {
          if (typeof v === 'string' && !k.endsWith('_filesToReplace')) {
            doc[target][k] = v;
          }
        }
      }
    }

    const fileFields = sectionFileFields[target] || [];
    if (fileFields.length > 0) {
      const updatedSection = await uploadHelper.updateProcessedFiles({
        oldSection: target === 'user_info' ? {} : doc[target] || {},
        filesByField, // expects multer field names to match the file field keys
        fieldsMap: fileFields, // which keys are file-bearing
        outputDir: fileLocation, // where to place optimized/uploaded
        payloadForReplaceHints: payload, // use `${field}_filesToReplace` arrays if provided
      });

      if (target !== 'user_info') {
        doc[target] = updatedSection;
        // Mark Mixed paths modified if schema uses Mixed/schemaless for nested sections
        doc.markModified(target);
      }
    }

    // 3) Save document
    const saved = await doc.save(); // runs validation & middleware

    const safe = saved.toObject();
    delete safe.password;

    return res.status(200).json({
      success: true,
      message: `${target} updated successfully.`,
      data: safe,
    });
  } catch (error) {
    if (error && error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(409).json({
        success: false,
        message: `Duplicate value for ${field}.`,
        error: error.message,
      });
    }

    console.error('Error updating partner:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// export const registerDeliveryOfficer = async (req, res) => {
//   try {
//     const {
//       fullName,
//       email,
//       mobile,
//       password,
//       document,
//       lincense_front,
//       lincense_back,

//     } = req.body;

//     // ✅ Basic validations
//     if (
//       !fullName ||
//       !mobile ||
//       !password ||
//       // !document ||
//       !lincense_front ||
//       !lincense_back
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please fill all required fields',
//       });
//     }

//     // ✅ Check if mobile/email already exists
//     const existingUser = await User.findOne({
//       $or: [{ mobile }, { email }],
//     });

//     if (existingUser) {
//       return res.status(400).json({
//         success: false,
//         message: 'User with this mobile or email already exists',
//       });
//     }

//     // ✅ Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     const slug = generateSlug(fullName);
//     const fileLocation = `delivery_officer/${slug}`;

//     const filesByField = uploadHelper.extractFilePaths(req.files);

//     const optimizedFiles = await uploadHelper.processFiles(
//       filesByField,
//       fileLocation,
//     );

//     // ✅ Create new Delivery Officer
//     const newOfficer = new DeliveryOfficer({
//       role: 'delivery_officer',
//       fullName,
//       email,
//       mobile,
//       password: hashedPassword,
//       document: documentUrl || undefined,
//       lincense_front,
//       file_location: fileLocation,
//       lincense_back,

//     });

//     await newOfficer.save();

//     res.status(201).json({
//       success: true,
//       message: 'Delivery Officer created successfully',
//       data: newOfficer,
//     });
//   } catch (error) {
//     console.error('Error creating delivery officer:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal Server Error',
//       error: error.message,
//     });
//   }
// };

export const registerDeliveryOfficer = async (req, res) => {
  try {
    const { fullName, email, mobile, password } = req.body;

    // -------- Basic Validations --------
    if (!fullName || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, mobile, and password are required.',
      });
    }

    // -------- Check if user already exists --------
    const existingUser = await User.findOne({
      $or: [{ mobile }, { email }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this mobile or email already exists.',
      });
    }

    // -------- Hash Password --------
    const hashedPassword = await bcrypt.hash(password, 10);

    // -------- Unique slug + file location --------
    const slug = generateSlug(fullName);
    const fileLocation = `delivery_officer/${slug}`;

    // -------- Handle Uploaded Files --------
    const filesByField = uploadHelper.extractFilePaths(req.files);

    const optimizedFiles = await uploadHelper.processFiles(
      filesByField,
      fileLocation,
    );

    // Extract optimized file URLs
    const document = optimizedFiles.document || null;
    const lincense_front = optimizedFiles.lincense_front || null;
    const lincense_back = optimizedFiles.lincense_back || null;

    // -------- Validate file uploads --------
    if (!lincense_front || !lincense_back) {
      return res.status(400).json({
        success: false,
        message: 'License front and back files are required.',
      });
    }

    // -------- Create Delivery Officer --------
    const newOfficer = new DeliveryOfficer({
      role: 'delivery_officer',
      fullName,
      email,
      mobile,
      password: hashedPassword,
      document,
      lincense_front,
      lincense_back,
      file_location: fileLocation,
    });

    await newOfficer.save();

    // -------- Response --------
    const response = newOfficer.toObject();
    delete response.password;

    res.status(201).json({
      success: true,
      message: 'Delivery Officer registered successfully.',
      data: response,
    });
  } catch (error) {
    console.error('Error creating delivery officer:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};
