import AdminUser from '../../models/admin/adminUser.js';
import uploadHelper from '../../utils/uploadHelper.js';

export const updateUserProfile = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address } = req.body;

  // Parse `profileToReplace` flag sent from frontend
  // const profileToReplace = req.body.profileToReplace || null;

  console.log('Body:', req.body);
  console.log('File:', req.file);

  try {
    const user = await AdminUser.findById(id);
    if (!user || user.is_deleted) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (address) user.address = address;

    const filePaths = uploadHelper.extractFilePaths(req.file);
    console.log('Filepaths', filePaths);

    if (filePaths?.profile) {
      user.profile_image = await uploadHelper.mergeUploadedFiles({
        oldValue: user.profile_image,
        newUploaded: filePaths.profile,
        filesToReplace: user.profile_image ? [user.profile_image] : [],
        outputDir: `admin/profiles`,
      });
    }

    await user.save();

    const payload = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user?.phone || '',
      address: user?.address || '',
      profile: user.profile_image,
      role: user.role,
      permissions: user.permissions,
      is_active: user.is_active,
    };

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: payload,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};



// export const updateUserProfile = async (req, res) => {
//   const { id } = req.params;
//   const { name, email, phone, address } = req.body;
//   const profile_image = req.file?.filename;

//   try {
//     const user = await User.findById(id);
//     if (!user || user.is_deleted) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found',
//       });
//     }

//     // Update only the provided fields
//     if (name) user.name = name;
//     if (email) user.email = email;
//     if (phone) user.phone = phone;
//     if (address) user.address = address;
//     if (profile_image) user.profile_image = profile_image;

//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: 'Profile updated successfully',
//       data: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         phone: user.phone,
//         address: user.address,
//         profile: user.profile_image,
//       },
//     });
//   } catch (error) {
//     logger.error('Error updating user profile:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal Server Error',
//       error: error.message,
//     });
//   }
// };

// export const updateUserProfile = async (req, res) => {
//   const { id } = req.params;
//   const { name, email, phone, address } = req.body;
//   const profile = req.file?.filename;

//   console.log("Body,File",req.body,req.file)

//   try {
//     const user = await User.findById(id);
//     if (!user || user.is_deleted) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found',
//       });
//     }

//     if (name) user.name = name;
//     if (email) user.email = email;
//     if (phone) user.phone = phone;
//     if (address) user.address = address;
//     if (profile) user.profile_image = profile;

//     await user.save();

//     const payload = {
//       id: user._id,
//       name: user.name,
//       email: user.email,
//       phone: user?.phone || '',
//       address: user?.address || '',
//       profile: user.profile_image,
//       role: user.role,
//       permissions: user.permissions,
//       is_active: user.is_active,
//     };

//     // const newToken = generateToken(payload);

//     res.status(200).json({
//       success: true,
//       message: 'Profile updated successfully',
//       // accessToken: newToken,
//       data: payload,
//     });
//   } catch (error) {
//     logger.error('Error updating user profile:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal Server Error',
//       error: error.message,
//     });
//   }
// };
