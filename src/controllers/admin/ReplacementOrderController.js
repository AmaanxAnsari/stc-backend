import mongoose from 'mongoose';
import ReplacementRequest from '../../models/admin/ReplacementOrderModel.js';
import AdminInventory from '../../models/admin/InventoryModel.js';
import { createRepository } from '../../utils/repository.js';
import { User } from '../../models/app/user.js';
import { notifyAdmins, notifyUser } from '../../utils/notificationService.js';
import AdminUser from '../../models/admin/adminUser.js';
import AppOrder from '../../models/admin/AppOrderModel.js';

const replacementOrderRepo = createRepository(ReplacementRequest);

// Approve replacement and reserve inventory
// export const approveReplacementRequest = async (req, res) => {
//   try {
//     const adminId = req.user?.id;
//     if (!adminId) {
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     const { replacementId } = req.params;
//     const { notes } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(replacementId)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid replacementId',
//       });
//     }

//     const replacement = await ReplacementRequest.findById(replacementId);
//     if (!replacement) {
//       return res.status(404).json({
//         success: false,
//         message: 'Replacement request not found',
//       });
//     }

//     if (replacement.status === 'approved') {
//       return res.status(400).json({
//         success: false,
//         message: 'Already approved',
//       });
//     }

//     if (replacement.status === 'rejected') {
//       return res.status(400).json({
//         success: false,
//         message: 'Cannot approve rejected request',
//       });
//     }

//     // Check and reserve inventory for all replacement items
//     for (const item of replacement.replacementItems) {
//       const inventory = await AdminInventory.findById(
//         item.originalItem.inventoryId,
//       );

//       if (!inventory) {
//         return res.status(404).json({
//           success: false,
//           message: `Inventory not found for ${item.originalItem.name}`,
//         });
//       }

//       const variant = inventory.variants[item.originalItem.variantIndex];
//       if (!variant) {
//         return res.status(404).json({
//           success: false,
//           message: `Variant not found for ${item.originalItem.name}`,
//         });
//       }

//       if (variant.onHand < item.replacementQuantity) {
//         return res.status(400).json({
//           success: false,
//           message: `Insufficient stock for ${item.originalItem.name}. Only ${variant.onHand} available, ${item.replacementQuantity} needed for replacement.`,
//         });
//       }
//     }

//     // All validations passed, now reserve inventory
//     for (const item of replacement.replacementItems) {
//       const inventory = await AdminInventory.findById(
//         item.originalItem.inventoryId,
//       );
//       const variant = inventory.variants[item.originalItem.variantIndex];

//       variant.onHand -= item.replacementQuantity;
//       variant.reserved += item.replacementQuantity;
//       variant.inStock = variant.onHand > 0;

//       await inventory.save();
//     }

//     const now = new Date();
//     replacement.timeline.push({
//       id: 'admin_decision',
//       label: 'Admin Decision: Approved',
//       status: 'completed',
//       timestamp: now,
//       displayTime: now.toLocaleString('en-IN', {
//         day: '2-digit',
//         month: 'short',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: true,
//         timeZone: 'Asia/Kolkata',
//       }),
//       icon: '✅',
//       color: '#4CAF50',
//       notes: notes || 'Replacement approved. Processing shipment.',
//     });

//     replacement.status = 'approved';
//     replacement.inventoryReserved = true;
//     replacement.inventoryReservedAt = now;
//     replacement.updatedBy = adminId;
//     replacement.updatedAt = now;

//     replacement.replacementTracking = [
//       {
//         id: 'confirmed',
//         label: 'Confirmed',
//         status: 'completed',
//         timestamp: now,
//         displayTime: now.toLocaleString('en-IN', {
//           day: '2-digit',
//           month: 'short',
//           year: 'numeric',
//           hour: '2-digit',
//           minute: '2-digit',
//           hour12: true,
//           timeZone: 'Asia/Kolkata',
//         }),
//         icon: '✓',
//         color: '#4CAF50',
//       },
//       {
//         id: 'preparing',
//         label: 'Preparing Shipment',
//         status: 'active',
//         timestamp: null,
//         displayTime: 'In progress',
//         icon: '📦',
//         color: '#2196F3',
//       },
//     ];

//     await replacement.save();

//     // ✅ Get user details for notifications
//     const user = await User.findById(replacement.customerInfo.id).select(
//       'fullName email mobile',
//     );

//     const roleNameMap = {
//       retailer: 'Retailer',
//       wholesaler: 'Wholesaler',
//       super_stocker: 'Super Stocker',
//       distributor: 'Distributor',
//       consumer: 'Consumer',
//     };

//     const notificationData = {
//       requestId: replacement.requestId,
//       replacementMongoId: replacement._id.toString(),
//       orderMongoId: replacement._id.toString(),
//       approvedDate:
//         replacement.timeline[replacement.timeline.length - 1].displayTime,
//       userName: user?.fullName || replacement.customerInfo.name || 'Customer',
//       customerName:
//         user?.fullName || replacement.customerInfo.name || 'Customer',
//       customerRole: roleNameMap[user?.role] || 'Consumer',
//       customerMobile: user?.mobile || replacement.customerInfo.phone || 'N/A',
//       customerEmail: user?.email || replacement.customerInfo.email || 'N/A',
//       itemCount: replacement.replacementItems.length,
//       replacementItems: replacement.replacementItems,
//       adminNotes: notes || '',
//       deliveryAddress: replacement.deliveryAddress,
//       trackReplacementUrl: `${process.env.APP_URL || 'https://gavran.com'}/replacements/${replacement._id}`,
//       adminReplacementUrl: `${process.env.ADMIN_URL || 'https://gavran-admin.demohub.tech'}/replacements/${replacement._id}`,
//     };

//     // ✅ 1. Notify USER (Email + FCM + DB)
//     if (user?.email) {
//       notifyUser({
//         userId: replacement.customerInfo.id.toString(),
//         userEmail: user.email,
//         userName: user.fullName,
//         templateKey: 'replacementRequestApproved',
//         data: notificationData,
//       }).catch((err) => {
//         console.error('❌ User replacement approval notification failed:', err);
//       });
//     }

//     // ✅ 2. Notify ADMINS (Email + DB) - Confirmation
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
//         templateKey: 'replacementApprovedConfirmation',
//         data: notificationData,
//       }).catch((err) => {
//         console.error(
//           '❌ Admin replacement approval notification failed:',
//           err,
//         );
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message:
//         'Replacement request approved and inventory reserved successfully',
//       replacement,
//     });
//   } catch (error) {
//     console.error('Approve replacement error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Something went wrong',
//       error: error.message,
//     });
//   }
// };
export const approveReplacementRequest = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { replacementId } = req.params;
    const { notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(replacementId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid replacementId',
      });
    }

    const replacement = await ReplacementRequest.findById(replacementId);
    if (!replacement) {
      return res.status(404).json({
        success: false,
        message: 'Replacement request not found',
      });
    }

    if (replacement.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Already approved',
      });
    }

    if (replacement.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve rejected request',
      });
    }

    // Check and reserve inventory for all replacement items
    for (const item of replacement.replacementItems) {
      const inventory = await AdminInventory.findById(
        item.originalItem.inventoryId,
      );

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: `Inventory not found for ${item.originalItem.name}`,
        });
      }

      const variant = inventory.variants[item.originalItem.variantIndex];
      if (!variant) {
        return res.status(404).json({
          success: false,
          message: `Variant not found for ${item.originalItem.name}`,
        });
      }

      if (variant.onHand < item.replacementQuantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.originalItem.name}. Only ${variant.onHand} available, ${item.replacementQuantity} needed for replacement.`,
        });
      }
    }

    // All validations passed, now reserve inventory
    for (const item of replacement.replacementItems) {
      const inventory = await AdminInventory.findById(
        item.originalItem.inventoryId,
      );
      const variant = inventory.variants[item.originalItem.variantIndex];

      variant.onHand -= item.replacementQuantity;
      variant.reserved += item.replacementQuantity;
      variant.inStock = variant.onHand > 0;

      await inventory.save();
    }

    const now = new Date();

    // ✅ 1. Mark 'Under Review' as Completed in Timeline
    const reviewStageIndex = replacement.timeline.findIndex(
      (t) => t.id === 'under_review',
    );
    if (reviewStageIndex !== -1) {
      replacement.timeline[reviewStageIndex].status = 'completed';
      replacement.timeline[reviewStageIndex].timestamp = now;
      replacement.timeline[reviewStageIndex].displayTime = now.toLocaleString(
        'en-IN',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata',
        },
      );
    }

    // Add Admin Decision to timeline
    replacement.timeline.push({
      id: 'admin_decision',
      label: 'Admin Decision: Approved',
      status: 'completed',
      timestamp: now,
      displayTime: now.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      }),
      icon: '✅',
      color: '#4CAF50',
      notes: notes || 'Replacement approved. Processing shipment.',
    });

    replacement.status = 'approved';
    replacement.inventoryReserved = true;
    replacement.inventoryReservedAt = now;
    replacement.updatedBy = adminId;
    replacement.updatedAt = now;

    // ✅ 2. Initialize Standard Stages in replacementTracking
    const stageDate = new Date();
    const stageDisplayTime = stageDate.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });

    // Populate replacementTracking with 5 standard stages
    replacement.replacementTracking = [
      {
        id: 'pending',
        label: 'Request Placed',
        status: 'completed', // Request was submitted previously
        timestamp: replacement.requestSubmittedAt || stageDate,
        displayTime: (
          replacement.requestSubmittedAt || stageDate
        ).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata',
        }),
        icon: 'doc_text',
        color: '#4CAF50',
      },
      {
        id: 'confirmed',
        label: 'Approved',
        status: 'completed', // Just approved
        timestamp: stageDate,
        displayTime: stageDisplayTime,
        icon: 'check_circle',
        color: '#4CAF50',
      },
      {
        id: 'out_for_delivery',
        label: 'Out for Delivery',
        status: 'pending',
        timestamp: null,
        displayTime: 'Pending',
        icon: 'truck',
        color: '#E0E0E0',
      },
      {
        id: 'delivered',
        label: 'Delivered',
        status: 'pending',
        timestamp: null,
        displayTime: 'Pending',
        icon: 'box',
        color: '#E0E0E0',
      },
      {
        id: 'cancelled',
        label: 'Cancelled',
        status: 'pending',
        timestamp: null,
        displayTime: 'Pending',
        icon: 'x_circle',
        color: '#E0E0E0',
      },
    ];

    await replacement.save();

    // ✅ Get user details for notifications
    const user = await User.findById(replacement.customerInfo.id).select(
      'fullName email mobile',
    );

    const roleNameMap = {
      retailer: 'Retailer',
      wholesaler: 'Wholesaler',
      super_stocker: 'Super Stocker',
      distributor: 'Distributor',
      consumer: 'Consumer',
    };

    const notificationData = {
      requestId: replacement.requestId,
      replacementMongoId: replacement._id.toString(),
      orderMongoId: replacement._id.toString(),
      approvedDate:
        replacement.timeline[replacement.timeline.length - 1].displayTime,
      userName: user?.fullName || replacement.customerInfo.name || 'Customer',
      customerName:
        user?.fullName || replacement.customerInfo.name || 'Customer',
      customerRole: roleNameMap[user?.role] || 'Consumer',
      customerMobile: user?.mobile || replacement.customerInfo.phone || 'N/A',
      customerEmail: user?.email || replacement.customerInfo.email || 'N/A',
      itemCount: replacement.replacementItems.length,
      replacementItems: replacement.replacementItems,
      adminNotes: notes || '',
      deliveryAddress: replacement.deliveryAddress,
      trackReplacementUrl: `${process.env.APP_URL || 'https://gavran.com'}/replacements/${replacement._id}`,
      adminReplacementUrl: `${process.env.ADMIN_URL || 'https://gavran-admin.demohub.tech'}/replacements/${replacement._id}`,
    };

    // ✅ 1. Notify USER (Email + FCM + DB)
    if (user?.email) {
      notifyUser({
        userId: replacement.customerInfo.id.toString(),
        userEmail: user.email,
        userName: user.fullName,
        templateKey: 'replacementRequestApproved',
        data: notificationData,
      }).catch((err) => {
        console.error('❌ User replacement approval notification failed:', err);
      });
    }

    // ✅ 2. Notify ADMINS (Email + DB) - Confirmation
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
        templateKey: 'replacementApprovedConfirmation',
        data: notificationData,
      }).catch((err) => {
        console.error(
          '❌ Admin replacement approval notification failed:',
          err,
        );
      });
    }

    return res.status(200).json({
      success: true,
      message:
        'Replacement request approved and inventory reserved successfully',
      replacement,
    });
  } catch (error) {
    console.error('Approve replacement error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: error.message,
    });
  }
};



// Reject replacement - handles both pending and approved requests
// export const rejectReplacementRequest = async (req, res) => {
//   try {
//     const adminId = req.user?.id;
//     if (!adminId) {
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     const { replacementId } = req.params;
//     const { reason, notes } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(replacementId)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid replacementId',
//       });
//     }

//     if (!reason || !reason.trim()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Rejection reason required',
//       });
//     }

//     const replacement = await ReplacementRequest.findById(replacementId);
//     if (!replacement) {
//       return res.status(404).json({
//         success: false,
//         message: 'Replacement request not found',
//       });
//     }

//     if (replacement.status === 'rejected') {
//       return res.status(400).json({
//         success: false,
//         message: 'Already rejected',
//       });
//     }

//     if (
//       replacement.status === 'dispatched' ||
//       replacement.status === 'completed'
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: `Cannot reject ${replacement.status} replacement`,
//       });
//     }

//     // If replacement was approved, release reserved inventory
//     if (replacement.status === 'approved' && replacement.inventoryReserved) {
//       for (const item of replacement.replacementItems) {
//         const inventory = await AdminInventory.findById(
//           item.originalItem.inventoryId,
//         );

//         if (inventory) {
//           const variant = inventory.variants[item.originalItem.variantIndex];
//           if (variant) {
//             variant.reserved -= item.replacementQuantity;
//             variant.onHand += item.replacementQuantity;
//             variant.inStock = variant.onHand > 0;
//             await inventory.save();
//           }
//         }
//       }
//     }

//     const now = new Date();
//     const rejectionLabel =
//       replacement.status === 'approved'
//         ? 'Approved Request Cancelled'
//         : 'Request Rejected';

//     replacement.timeline.push({
//       id: 'admin_decision',
//       label: `Admin Decision: ${rejectionLabel}`,
//       status: 'completed',
//       timestamp: now,
//       displayTime: now.toLocaleString('en-IN', {
//         day: '2-digit',
//         month: 'short',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: true,
//         timeZone: 'Asia/Kolkata',
//       }),
//       icon: '❌',
//       color: '#F44336',
//       notes: notes || `Replacement ${rejectionLabel.toLowerCase()} by admin.`,
//       rejectionReason: reason,
//     });

//     replacement.status = 'rejected';
//     replacement.inventoryReserved = false;
//     replacement.rejectionDetails = {
//       reason,
//       adminNotes: notes || '',
//       policy:
//         'Replacements are only available for defective, damaged, or incorrect items.',
//     };
//     replacement.updatedBy = adminId;
//     replacement.updatedAt = now;

//     await replacement.save();
//     // ✅ Get user details for notifications
//     const user = await User.findById(replacement.customerInfo.id).select(
//       'fullName email mobile',
//     );

//     const roleNameMap = {
//       retailer: 'Retailer',
//       wholesaler: 'Wholesaler',
//       super_stocker: 'Super Stocker',
//       distributor: 'Distributor',
//       consumer: 'Consumer',
//     };

//     const order = await AppOrder.findById(replacement.orderId);

//     const notificationData = {
//       requestId: replacement.requestId,
//       replacementMongoId: replacement._id.toString(),
//       orderMongoId: replacement._id.toString(),
//       originalOrderId: order?.orderId || replacement.orderId,
//       decisionDate:
//         replacement.timeline[replacement.timeline.length - 1].displayTime,
//       userName: user?.fullName || replacement.customerInfo.name || 'Customer',
//       customerName:
//         user?.fullName || replacement.customerInfo.name || 'Customer',
//       customerRole: roleNameMap[user?.role] || 'Consumer',
//       customerMobile: user?.mobile || replacement.customerInfo.phone || 'N/A',
//       customerEmail: user?.email || replacement.customerInfo.email || 'N/A',
//       rejectionReason: reason,
//       adminNotes: notes || '',
//       policy: replacement.rejectionDetails.policy,
//       itemCount: replacement.replacementItems.length,
//       replacementItems: replacement.replacementItems,
//       supportUrl: `${process.env.APP_URL || 'https://gavran.com'}/support`,
//       viewPolicyUrl: `${process.env.APP_URL || 'https://gavran.com'}/replacement-policy`,
//       adminReplacementUrl: `${process.env.ADMIN_URL || 'https://gavran-admin.demohub.tech'}/replacements/${replacement._id}`,
//     };

//     // ✅ 1. Notify USER (Email + FCM + DB)
//     if (user?.email) {
//       notifyUser({
//         userId: replacement.customerInfo.id.toString(),
//         userEmail: user.email,
//         userName: user.fullName,
//         templateKey: 'replacementRequestRejected',
//         data: notificationData,
//       }).catch((err) => {
//         console.error(
//           '❌ User replacement rejection notification failed:',
//           err,
//         );
//       });
//     }

//     // ✅ 2. Notify ADMINS (Email + DB) - Confirmation
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
//         templateKey: 'replacementRejectedConfirmation',
//         data: notificationData,
//       }).catch((err) => {
//         console.error(
//           '❌ Admin replacement rejection notification failed:',
//           err,
//         );
//       });
//     }

//     const message =
//       replacement.status === 'approved'
//         ? 'Replacement request rejected and reserved stock released successfully'
//         : 'Replacement request rejected successfully';

//     return res.status(200).json({
//       success: true,
//       message,
//       replacement,
//     });
//   } catch (error) {
//     console.error('Reject replacement error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Something went wrong',
//       error: error.message,
//     });
//   }
// };

export const rejectReplacementRequest = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { replacementId } = req.params;
    const { reason, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(replacementId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid replacementId',
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason required',
      });
    }

    const replacement = await ReplacementRequest.findById(replacementId);
    if (!replacement) {
      return res.status(404).json({
        success: false,
        message: 'Replacement request not found',
      });
    }

    if (replacement.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Already rejected',
      });
    }

    if (
      replacement.status === 'dispatched' ||
      replacement.status === 'completed'
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot reject ${replacement.status} replacement`,
      });
    }

    // If replacement was approved, release reserved inventory
    if (replacement.status === 'approved' && replacement.inventoryReserved) {
      for (const item of replacement.replacementItems) {
        const inventory = await AdminInventory.findById(
          item.originalItem.inventoryId,
        );

        if (inventory) {
          const variant = inventory.variants[item.originalItem.variantIndex];
          if (variant) {
            variant.reserved -= item.replacementQuantity;
            variant.onHand += item.replacementQuantity;
            variant.inStock = variant.onHand > 0;
            await inventory.save();
          }
        }
      }
    }

    const now = new Date();

    // ✅ 1. Mark 'Under Review' as Completed in Timeline
    const reviewStageIndex = replacement.timeline.findIndex(
      (t) => t.id === 'under_review',
    );
    if (reviewStageIndex !== -1) {
      replacement.timeline[reviewStageIndex].status = 'completed';
      replacement.timeline[reviewStageIndex].timestamp = now;
      replacement.timeline[reviewStageIndex].displayTime = now.toLocaleString(
        'en-IN',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata',
        },
      );
    }

    const rejectionLabel =
      replacement.status === 'approved'
        ? 'Approved Request Cancelled'
        : 'Request Rejected';

    replacement.timeline.push({
      id: 'admin_decision',
      label: `Admin Decision: ${rejectionLabel}`,
      status: 'completed',
      timestamp: now,
      displayTime: now.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      }),
      icon: '❌',
      color: '#F44336',
      notes: notes || `Replacement ${rejectionLabel.toLowerCase()} by admin.`,
      rejectionReason: reason,
    });

    replacement.status = 'rejected';
    replacement.inventoryReserved = false;
    replacement.rejectionDetails = {
      reason,
      adminNotes: notes || '',
      policy:
        'Replacements are only available for defective, damaged, or incorrect items.',
    };
    replacement.updatedBy = adminId;
    replacement.updatedAt = now;

    // ✅ 2. Initialize Standard Stages in replacementTracking (Marked Cancelled)
    const stageDate = new Date();
    const stageDisplayTime = stageDate.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });

    replacement.replacementTracking = [
      {
        id: 'pending',
        label: 'Request Placed',
        status: 'completed',
        timestamp: replacement.requestSubmittedAt || stageDate,
        displayTime: (
          replacement.requestSubmittedAt || stageDate
        ).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata',
        }),
        icon: 'doc_text',
        color: '#4CAF50',
      },
      {
        id: 'confirmed',
        label: 'Approved',
        status: 'pending', // Rejected means it was never confirmed/approved successfully
        timestamp: null,
        displayTime: 'Pending',
        icon: 'check_circle',
        color: '#E0E0E0',
      },
      {
        id: 'out_for_delivery',
        label: 'Out for Delivery',
        status: 'pending',
        timestamp: null,
        displayTime: 'Pending',
        icon: 'truck',
        color: '#E0E0E0',
      },
      {
        id: 'delivered',
        label: 'Delivered',
        status: 'pending',
        timestamp: null,
        displayTime: 'Pending',
        icon: 'box',
        color: '#E0E0E0',
      },
      {
        id: 'cancelled',
        label: 'Cancelled', // Rejected maps to Cancelled in tracking UI
        status: 'completed',
        timestamp: stageDate,
        displayTime: stageDisplayTime,
        icon: 'x_circle',
        color: '#F44336',
      },
    ];

    await replacement.save();

    // ✅ Get user details for notifications
    const user = await User.findById(replacement.customerInfo.id).select(
      'fullName email mobile',
    );

    const roleNameMap = {
      retailer: 'Retailer',
      wholesaler: 'Wholesaler',
      super_stocker: 'Super Stocker',
      distributor: 'Distributor',
      consumer: 'Consumer',
    };

    const order = await AppOrder.findById(replacement.orderId);

    const notificationData = {
      requestId: replacement.requestId,
      replacementMongoId: replacement._id.toString(),
      orderMongoId: replacement._id.toString(),
      originalOrderId: order?.orderId || replacement.orderId,
      decisionDate:
        replacement.timeline[replacement.timeline.length - 1].displayTime,
      userName: user?.fullName || replacement.customerInfo.name || 'Customer',
      customerName:
        user?.fullName || replacement.customerInfo.name || 'Customer',
      customerRole: roleNameMap[user?.role] || 'Consumer',
      customerMobile: user?.mobile || replacement.customerInfo.phone || 'N/A',
      customerEmail: user?.email || replacement.customerInfo.email || 'N/A',
      rejectionReason: reason,
      adminNotes: notes || '',
      policy: replacement.rejectionDetails.policy,
      itemCount: replacement.replacementItems.length,
      replacementItems: replacement.replacementItems,
      supportUrl: `${process.env.APP_URL || 'https://gavran.com'}/support`,
      viewPolicyUrl: `${process.env.APP_URL || 'https://gavran.com'}/replacement-policy`,
      adminReplacementUrl: `${process.env.ADMIN_URL || 'https://gavran-admin.demohub.tech'}/replacements/${replacement._id}`,
    };

    // ✅ 1. Notify USER (Email + FCM + DB)
    if (user?.email) {
      notifyUser({
        userId: replacement.customerInfo.id.toString(),
        userEmail: user.email,
        userName: user.fullName,
        templateKey: 'replacementRequestRejected',
        data: notificationData,
      }).catch((err) => {
        console.error(
          '❌ User replacement rejection notification failed:',
          err,
        );
      });
    }

    // ✅ 2. Notify ADMINS (Email + DB) - Confirmation
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
        templateKey: 'replacementRejectedConfirmation',
        data: notificationData,
      }).catch((err) => {
        console.error(
          '❌ Admin replacement rejection notification failed:',
          err,
        );
      });
    }

    const message =
      replacement.status === 'approved'
        ? 'Replacement request rejected and reserved stock released successfully'
        : 'Replacement request rejected successfully';

    return res.status(200).json({
      success: true,
      message,
      replacement,
    });
  } catch (error) {
    console.error('Reject replacement error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: error.message,
    });
  }
};


// Dispatch replacement - move reserved to sold
export const dispatchReplacement = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { replacementId } = req.params;

    const replacement = await ReplacementRequest.findById(replacementId);
    if (!replacement) {
      return res.status(404).json({
        success: false,
        message: 'Replacement request not found',
      });
    }

    if (replacement.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved replacements can be dispatched',
      });
    }

    // Move reserved stock to sold
    for (const item of replacement.replacementItems) {
      const inventory = await AdminInventory.findById(
        item.originalItem.inventoryId,
      );

      if (inventory) {
        const variant = inventory.variants[item.originalItem.variantIndex];
        if (variant) {
          variant.reserved -= item.replacementQuantity;
          variant.sold += item.replacementQuantity;
          await inventory.save();
        }
      }
    }

    const now = new Date();
    replacement.status = 'dispatched';
    replacement.updatedBy = adminId;
    replacement.updatedAt = now;

    replacement.replacementTracking.push({
      id: 'dispatched',
      label: 'Dispatched',
      status: 'completed',
      timestamp: now,
      displayTime: now.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      }),
      icon: '🚚',
      color: '#4CAF50',
    });

    await replacement.save();

    return res.status(200).json({
      success: true,
      message: 'Replacement dispatched successfully',
      replacement,
    });
  } catch (error) {
    console.error('Dispatch replacement error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to dispatch replacement',
      error: error.message,
    });
  }
};

export const getAllReplacementOrders = async (req, res) => {
  try {
    const { page, limit, sort, q, status } = req.query;

    const filter = {};
    if (q) {
      filter.$or = [
        { requestId: { $regex: q, $options: 'i' } },
        { 'customerInfo.name': { $regex: q, $options: 'i' } },
        { 'customerInfo.email': { $regex: q, $options: 'i' } },
        { 'customerInfo.phone': { $regex: q, $options: 'i' } },
      ];
    }
    if (status) filter.status = status;

    const result = await replacementOrderRepo.getAll({
      filter,
      sort: sort ? JSON.parse(sort) : { createdAt: -1 },
      page,
      limit,
      projection: {},
      collation: { locale: 'en', strength: 2 },
    });

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


export const getReplacementOrderById = async (req, res) => {
  try {
    const result = await replacementOrderRepo.getById(req.params.id, {
      projection: {},
    });

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

// import mongoose from 'mongoose';
// import ReplacementRequest from '../../models/admin/ReplacementOrderModel.js';
// import { createRepository } from '../../utils/repository.js';

// const replacementOrderRepo = createRepository(ReplacementRequest);

// // ------------------ Approve Replacement Request ------------------
// export const approveReplacementRequest = async (req, res) => {
//   try {
//     const adminId = req.user?.id;
//     if (!adminId) {
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     const { replacementId } = req.params;
//     const { notes } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(replacementId)) {
//       return res
//         .status(400)
//         .json({ success: false, message: 'Invalid replacementId' });
//     }

//     const replacement = await ReplacementRequest.findById(replacementId);
//     if (!replacement) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'Replacement request not found' });
//     }

//     if (replacement.status === 'approved') {
//       return res
//         .status(400)
//         .json({ success: false, message: 'Already approved' });
//     }

//     // Update timeline
//     replacement.timeline.push({
//       id: 'admin_decision',
//       label: 'Admin Decision: Approved',
//       status: 'completed',
//       timestamp: new Date(),
//       displayTime: new Date().toLocaleString('en-IN', {
//         day: '2-digit',
//         month: 'short',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: true,
//       }),
//       icon: '✅',
//       color: '#4CAF50',
//       notes: notes || 'Replacement approved. Processing shipment.',
//     });

//     replacement.status = 'approved';
//     replacement.updatedBy = adminId;
//     replacement.updatedAt = new Date();

//     // Optional: initialize replacementTracking for approved request
//     replacement.replacementTracking = [
//       {
//         id: 'confirmed',
//         label: 'Confirmed',
//         status: 'completed',
//         timestamp: new Date(),
//         displayTime: new Date().toLocaleString('en-IN', {
//           day: '2-digit',
//           month: 'short',
//           year: 'numeric',
//           hour: '2-digit',
//           minute: '2-digit',
//           hour12: true,
//         }),
//         icon: '✓',
//         color: '#4CAF50',
//       },
//     ];

//     await replacement.save();

//     return res.status(200).json({
//       success: true,
//       message: 'Replacement request approved successfully',
//       replacement,
//     });
//   } catch (error) {
//     console.error('Approve replacement error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Something went wrong',
//       error: error.message,
//     });
//   }
// };

// // ------------------ Reject Replacement Request ------------------
// export const rejectReplacementRequest = async (req, res) => {
//   try {
//     const adminId = req.user?.id;
//     if (!adminId) {
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     const { replacementId } = req.params;
//     const { reason, notes } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(replacementId)) {
//       return res
//         .status(400)
//         .json({ success: false, message: 'Invalid replacementId' });
//     }

//     if (!reason || !reason.trim()) {
//       return res
//         .status(400)
//         .json({ success: false, message: 'Rejection reason required' });
//     }

//     const replacement = await ReplacementRequest.findById(replacementId);
//     if (!replacement) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'Replacement request not found' });
//     }

//     if (replacement.status === 'rejected') {
//       return res
//         .status(400)
//         .json({ success: false, message: 'Already rejected' });
//     }

//     // Update timeline
//     replacement.timeline.push({
//       id: 'admin_decision',
//       label: 'Admin Decision: Rejected',
//       status: 'completed',
//       timestamp: new Date(),
//       displayTime: new Date().toLocaleString('en-IN', {
//         day: '2-digit',
//         month: 'short',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: true,
//       }),
//       icon: '❌',
//       color: '#F44336',
//       notes: notes || 'Replacement request rejected by admin.',
//       rejectionReason: reason,
//     });

//     replacement.status = 'rejected';
//     replacement.rejectionDetails = {
//       reason,
//       adminNotes: notes || '',
//       policy:
//         'Replacements are only available for defective, damaged, or incorrect items.',
//     };
//     replacement.updatedBy = adminId;
//     replacement.updatedAt = new Date();

//     await replacement.save();

//     return res.status(200).json({
//       success: true,
//       message: 'Replacement request rejected successfully',
//       replacement,
//     });
//   } catch (error) {
//     console.error('Reject replacement error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Something went wrong',
//       error: error.message,
//     });
//   }
// };

// export const getAllReplacementOrders = async (req, res) => {
//   try {
//     const { page, limit, sort, q, isActive } = req.query;

//     const filter = {};
//     if (q) {
//       filter.$or = [
//         { fullName: { $regex: q, $options: 'i' } },
//         { email: { $regex: q, $options: 'i' } },
//         { mobile: { $regex: q, $options: 'i' } },
//       ];
//     }
//     if (isActive != null) filter.isActive = isActive === 'true';

//     const result = await replacementOrderRepo.getAll({
//       filter,
//       sort: sort ? JSON.parse(sort) : undefined,
//       page,
//       limit,
//       projection: {},
//       collation: { locale: 'en', strength: 2 },
//     });

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
