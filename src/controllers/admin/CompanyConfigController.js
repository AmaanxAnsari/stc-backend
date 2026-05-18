import CompanyConfig from '../../models/admin/CompanyConfigModel.js';
import uploadHelper from '../../utils/uploadHelper.js';



// // --- Create / Initialize Config ---
// export const createCompanyConfig = async (req, res) => {
//   try {
//     if (!req.user?.id) {
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     // Check if config already exists (Singleton check)
//     const existingConfig = await CompanyConfig.findOne({ isDeleted: false });
//     if (existingConfig) {
//       return res.status(400).json({
//         success: false,
//         message: 'Configuration already exists. Please update the existing one.',
//       });
//     }

//     const {
//       // Company 1
//       companyOneName,
//       companyOneAddress,
//       companyOneContact, // ✅ Added
//       companyOneEmail,   // ✅ Added
//       companyOneGst,
//       companyOneGstPercentage,
//       companyOneColor,

//       // Company 2
//       companyTwoName,
//       companyTwoAddress,
//       companyTwoContact, // ✅ Added
//       companyTwoEmail,   // ✅ Added
//       companyTwoGst,
//       companyTwoGstPercentage,
//       companyTwoColor,

//       // Global
//       deliveryFee,
//       handlingFee,
//       minOrderValueForFreeDelivery,
//     } = req.body;

//     // File Upload Handling
//     const outputDir = `company-config`;
//     const filePaths = uploadHelper.extractFilePaths(req.files);

//     let logoOneUrl = null;
//     let logoTwoUrl = null;

//     // Optimize & Upload Logo 1
//     if (filePaths.companyOneLogo?.length > 0) {
//       logoOneUrl = await uploadHelper.optimizeImage(filePaths.companyOneLogo, {
//         outputDir,
//       });
//     }

//     // Optimize & Upload Logo 2
//     if (filePaths.companyTwoLogo?.length > 0) {
//       logoTwoUrl = await uploadHelper.optimizeImage(filePaths.companyTwoLogo, {
//         outputDir,
//       });
//     }

//     const newConfig = new CompanyConfig({
//       companyOne: {
//         name: companyOneName,
//         address: companyOneAddress,
//         contact: companyOneContact, // ✅ Added
//         email: companyOneEmail,     // ✅ Added
//         gstin: companyOneGst || null,
//         gstPercentage: Number(companyOneGstPercentage) || 18,
//         logo: logoOneUrl,
//         color: companyOneColor,
//       },
//       companyTwo: {
//         name: companyTwoName,
//         address: companyTwoAddress,
//         contact: companyTwoContact, // ✅ Added
//         email: companyTwoEmail,     // ✅ Added
//         gstin: companyTwoGst || null,
//         gstPercentage: Number(companyTwoGstPercentage) || 0,
//         logo: logoTwoUrl,
//         color: companyTwoColor,
//       },
//       deliveryFee: Number(deliveryFee) || 0,
//       handlingFee: Number(handlingFee) || 0,
//       minOrderValueForFreeDelivery: Number(minOrderValueForFreeDelivery) || 0,
//       createdBy: req.user.id,
//       updatedBy: req.user.id,
//     });

//     await newConfig.save();

//     return res.status(201).json({
//       success: true,
//       message: 'Company configuration created successfully.',
//       data: newConfig,
//     });
//   } catch (error) {
//     console.error('Create Config Error:', error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// // --- Update Config ---
// export const updateCompanyConfig = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const config = await CompanyConfig.findById(id);

//     if (!config) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'Configuration not found.' });
//     }

//     const outputDir = `company-config`;
//     const filePaths = uploadHelper.extractFilePaths(req.files);
//     const body = req.body;

//     // --- Update Company One ---
//     if (body.companyOneName) config.companyOne.name = body.companyOneName;
//     if (body.companyOneAddress) config.companyOne.address = body.companyOneAddress;
//     if (body.companyOneContact) config.companyOne.contact = body.companyOneContact; // ✅ Added
//     if (body.companyOneEmail) config.companyOne.email = body.companyOneEmail;       // ✅ Added
//     if (body.companyOneGst !== undefined) config.companyOne.gstin = body.companyOneGst;
//     if (body.companyOneColor) config.companyOne.color = body.companyOneColor;

//     if (body.companyOneGstPercentage !== undefined) {
//       config.companyOne.gstPercentage = Number(body.companyOneGstPercentage);
//     }

//     // Logo 1 Update
//     if (filePaths.companyOneLogo) {
//       config.companyOne.logo = await uploadHelper.mergeUploadedFiles({
//         oldValue: config.companyOne.logo,
//         newUploaded: filePaths.companyOneLogo,
//         filesToReplace: config.companyOne.logo,
//         outputDir,
//       });
//     }

//     // --- Update Company Two ---
//     if (body.companyTwoName) config.companyTwo.name = body.companyTwoName;
//     if (body.companyTwoAddress) config.companyTwo.address = body.companyTwoAddress;
//     if (body.companyTwoContact) config.companyTwo.contact = body.companyTwoContact; // ✅ Added
//     if (body.companyTwoEmail) config.companyTwo.email = body.companyTwoEmail;       // ✅ Added
//     if (body.companyTwoGst !== undefined) config.companyTwo.gstin = body.companyTwoGst;
//     if (body.companyTwoColor) config.companyTwo.color = body.companyTwoColor;

//     if (body.companyTwoGstPercentage !== undefined) {
//       config.companyTwo.gstPercentage = Number(body.companyTwoGstPercentage);
//     }

//     // Logo 2 Update
//     if (filePaths.companyTwoLogo) {
//       config.companyTwo.logo = await uploadHelper.mergeUploadedFiles({
//         oldValue: config.companyTwo.logo,
//         newUploaded: filePaths.companyTwoLogo,
//         filesToReplace: config.companyTwo.logo,
//         outputDir,
//       });
//     }

//     // --- Update Charges ---
//     if (body.deliveryFee !== undefined)
//       config.deliveryFee = Number(body.deliveryFee);
//     if (body.handlingFee !== undefined)
//       config.handlingFee = Number(body.handlingFee);
//     if (body.minOrderValueForFreeDelivery !== undefined)
//       config.minOrderValueForFreeDelivery = Number(
//         body.minOrderValueForFreeDelivery,
//       );

//     config.updatedBy = req.user.id;
//     await config.save();

//     return res.status(200).json({
//       success: true,
//       message: 'Configuration updated successfully.',
//       data: config,
//     });
//   } catch (error) {
//     console.error('Update Config Error:', error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// // --- Get Config ---
// export const getCompanyConfig = async (req, res) => {
//   try {
//     const config = await CompanyConfig.findOne({ isDeleted: false });

//     if (!config) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'No configuration found.' });
//     }

//     return res.status(200).json({
//       success: true,
//       data: config,
//     });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };
// --- Create / Initialize Config ---
export const createCompanyConfig = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Check if config already exists (Singleton check)
    const existingConfig = await CompanyConfig.findOne({ isDeleted: false });
    if (existingConfig) {
      return res.status(400).json({
        success: false,
        message: 'Configuration already exists. Please update the existing one.',
      });
    }

    const {
      // Company 1
      companyOneName,
      companyOneAddress,
      companyOneContact,
      companyOneEmail,
      companyOneGst,
      companyOnePan, // ✅ Added
      companyOneGstPercentage,
      companyOneColor,
      companyOneBankName, // ✅ Added
      companyOneAccountNumber, // ✅ Added
      companyOneIfscCode, // ✅ Added

      // Company 2
      companyTwoName,
      companyTwoAddress,
      companyTwoContact,
      companyTwoEmail,
      companyTwoGst,
      companyTwoPan, // ✅ Added
      companyTwoGstPercentage,
      companyTwoColor,
      companyTwoBankName, // ✅ Added
      companyTwoAccountNumber, // ✅ Added
      companyTwoIfscCode, // ✅ Added

      // Global
      deliveryFee,
      handlingFee,
      minOrderValueForFreeDelivery,
    } = req.body;

    // File Upload Handling
    const outputDir = `company-config`;
    const filePaths = uploadHelper.extractFilePaths(req.files);

    let logoOneUrl = null;
    let logoTwoUrl = null;

    // Optimize & Upload Logo 1
    if (filePaths.companyOneLogo?.length > 0) {
      logoOneUrl = await uploadHelper.optimizeImage(filePaths.companyOneLogo, {
        outputDir,
      });
    }

    // Optimize & Upload Logo 2
    if (filePaths.companyTwoLogo?.length > 0) {
      logoTwoUrl = await uploadHelper.optimizeImage(filePaths.companyTwoLogo, {
        outputDir,
      });
    }

    const newConfig = new CompanyConfig({
      companyOne: {
        name: companyOneName,
        address: companyOneAddress,
        contact: companyOneContact,
        email: companyOneEmail,
        gstin: companyOneGst || null,
        panNo: companyOnePan || null, // ✅ Added
        gstPercentage: Number(companyOneGstPercentage) || 18,
        logo: logoOneUrl,
        color: companyOneColor,
        bankName: companyOneBankName || null, // ✅ Added
        accountNumber: companyOneAccountNumber || null, // ✅ Added
        ifscCode: companyOneIfscCode || null, // ✅ Added
      },
      companyTwo: {
        name: companyTwoName,
        address: companyTwoAddress,
        contact: companyTwoContact,
        email: companyTwoEmail,
        gstin: companyTwoGst || null,
        panNo: companyTwoPan || null, // ✅ Added
        gstPercentage: Number(companyTwoGstPercentage) || 0,
        logo: logoTwoUrl,
        color: companyTwoColor,
        bankName: companyTwoBankName || null, // ✅ Added
        accountNumber: companyTwoAccountNumber || null, // ✅ Added
        ifscCode: companyTwoIfscCode || null, // ✅ Added
      },
      deliveryFee: Number(deliveryFee) || 0,
      handlingFee: Number(handlingFee) || 0,
      minOrderValueForFreeDelivery: Number(minOrderValueForFreeDelivery) || 0,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    await newConfig.save();

    return res.status(201).json({
      success: true,
      message: 'Company configuration created successfully.',
      data: newConfig,
    });
  } catch (error) {
    console.error('Create Config Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// --- Update Config ---
export const updateCompanyConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await CompanyConfig.findById(id);

    if (!config) {
      return res
        .status(404)
        .json({ success: false, message: 'Configuration not found.' });
    }

    const outputDir = `company-config`;
    const filePaths = uploadHelper.extractFilePaths(req.files);
    const body = req.body;

    // --- Update Company One ---
    if (body.companyOneName) config.companyOne.name = body.companyOneName;
    if (body.companyOneAddress) config.companyOne.address = body.companyOneAddress;
    if (body.companyOneContact) config.companyOne.contact = body.companyOneContact;
    if (body.companyOneEmail) config.companyOne.email = body.companyOneEmail;
    if (body.companyOneGst !== undefined) config.companyOne.gstin = body.companyOneGst;
    if (body.companyOneColor) config.companyOne.color = body.companyOneColor;
    
    // ✅ Added Bank & Pan Details for C1
    if (body.companyOnePan !== undefined) config.companyOne.panNo = body.companyOnePan;
    if (body.companyOneBankName !== undefined) config.companyOne.bankName = body.companyOneBankName;
    if (body.companyOneAccountNumber !== undefined) config.companyOne.accountNumber = body.companyOneAccountNumber;
    if (body.companyOneIfscCode !== undefined) config.companyOne.ifscCode = body.companyOneIfscCode;

    if (body.companyOneGstPercentage !== undefined) {
      config.companyOne.gstPercentage = Number(body.companyOneGstPercentage);
    }

    // Logo 1 Update
    if (filePaths.companyOneLogo) {
      config.companyOne.logo = await uploadHelper.mergeUploadedFiles({
        oldValue: config.companyOne.logo,
        newUploaded: filePaths.companyOneLogo,
        filesToReplace: config.companyOne.logo,
        outputDir,
      });
    }

    // --- Update Company Two ---
    if (body.companyTwoName) config.companyTwo.name = body.companyTwoName;
    if (body.companyTwoAddress) config.companyTwo.address = body.companyTwoAddress;
    if (body.companyTwoContact) config.companyTwo.contact = body.companyTwoContact;
    if (body.companyTwoEmail) config.companyTwo.email = body.companyTwoEmail;
    if (body.companyTwoGst !== undefined) config.companyTwo.gstin = body.companyTwoGst;
    if (body.companyTwoColor) config.companyTwo.color = body.companyTwoColor;

    // ✅ Added Bank & Pan Details for C2
    if (body.companyTwoPan !== undefined) config.companyTwo.panNo = body.companyTwoPan;
    if (body.companyTwoBankName !== undefined) config.companyTwo.bankName = body.companyTwoBankName;
    if (body.companyTwoAccountNumber !== undefined) config.companyTwo.accountNumber = body.companyTwoAccountNumber;
    if (body.companyTwoIfscCode !== undefined) config.companyTwo.ifscCode = body.companyTwoIfscCode;

    if (body.companyTwoGstPercentage !== undefined) {
      config.companyTwo.gstPercentage = Number(body.companyTwoGstPercentage);
    }

    // Logo 2 Update
    if (filePaths.companyTwoLogo) {
      config.companyTwo.logo = await uploadHelper.mergeUploadedFiles({
        oldValue: config.companyTwo.logo,
        newUploaded: filePaths.companyTwoLogo,
        filesToReplace: config.companyTwo.logo,
        outputDir,
      });
    }

    // --- Update Charges ---
    if (body.deliveryFee !== undefined)
      config.deliveryFee = Number(body.deliveryFee);
    if (body.handlingFee !== undefined)
      config.handlingFee = Number(body.handlingFee);
    if (body.minOrderValueForFreeDelivery !== undefined)
      config.minOrderValueForFreeDelivery = Number(
        body.minOrderValueForFreeDelivery,
      );

    config.updatedBy = req.user.id;
    await config.save();

    return res.status(200).json({
      success: true,
      message: 'Configuration updated successfully.',
      data: config,
    });
  } catch (error) {
    console.error('Update Config Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// --- Get Config ---
export const getCompanyConfig = async (req, res) => {
  try {
    const config = await CompanyConfig.findOne({ isDeleted: false });

    if (!config) {
      return res
        .status(404)
        .json({ success: false, message: 'No configuration found.' });
    }

    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};