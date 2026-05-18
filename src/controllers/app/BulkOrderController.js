import { generateUniqueOrderId } from "../../helper/orderIdHelper.js";
import AdminUser from "../../models/admin/adminUser.js";
import BulkOrder from "../../models/admin/BulkOrderModel.js";
import { User } from "../../models/app/user.js";
import { notifyAdmins, notifyUser } from "../../utils/notificationService.js";
import { createRepository } from "../../utils/repository.js";
import { autoAssignOrderToStop } from "../../utils/stopMatcher.js";
import { TrackingService } from "../../utils/trackingService.js";
import uploadHelper from "../../utils/uploadHelper.js";


const bulkOrderRepo = createRepository(BulkOrder, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});



// export const createBulkOrder = async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     const userRole = req.user?.role || 'consumer';

//     if (!userId) {
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     const { specialInstructions, deliveryAddress } = req.body;

//     // Parse deliveryAddress if it comes as JSON string from form-data
//     let parsedDeliveryAddress = deliveryAddress;
//     if (typeof deliveryAddress === 'string') {
//       try {
//         parsedDeliveryAddress = JSON.parse(deliveryAddress);
//       } catch (parseError) {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid delivery address format',
//         });
//       }
//     }

//     // Validate required fields
//     if (!specialInstructions || !specialInstructions.trim()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Special instructions are required for bulk orders',
//       });
//     }

//     if (!parsedDeliveryAddress) {
//       return res.status(400).json({
//         success: false,
//         message: 'Delivery address is required for bulk orders',
//       });
//     }

//     // Generate order ID
//     const orderId = `BULK-${Date.now()}`;
//     const outputDir = `bulk-orders/${orderId}`;

//     // Extract file paths using uploadHelper (same as category)
//     const filePaths = uploadHelper.extractFilePaths(req.files);
//     const imageFiles = filePaths.images || [];

//     if (imageFiles.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'At least one image is required for bulk orders',
//       });
//     }

//     // Optimize images using uploadHelper (pass all files at once)
//     let optimizedImageUrls = [];
//     try {
//       optimizedImageUrls = await uploadHelper.optimizeImage(imageFiles, {
//         outputDir,
//       });
//     } catch (optimizeError) {
//       console.error('Error optimizing images:', optimizeError);
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to process uploaded images',
//       });
//     }

//     // Format attached images with metadata
//     const attachedImages = imageFiles.map((file, index) => ({
//       id: `img_${Date.now()}_${index}`,
//       uri: Array.isArray(optimizedImageUrls)
//         ? optimizedImageUrls[index]
//         : optimizedImageUrls,
//       fileName: file.originalname || `bulk_order_image_${index + 1}.jpg`,
//       fileSize: file.size || 0,
//       uploadedAt: new Date(),
//     }));

//     // Format delivery address
//     const formattedDeliveryAddress = {
//       label: parsedDeliveryAddress.label || 'Home',
//       receiverDetails: parsedDeliveryAddress.receiverDetails || '',
//       fullAddress: parsedDeliveryAddress.fullAddress || '',
//     };

//     // Create bulk order
//     const newBulkOrder = new BulkOrder({
//       orderId,
//       status: 'pending',
//       statusLabel: 'Order Pending',
//       statusColor: '#FFC107',
//       orderType: 'bulk',
//       orderPlacedDate: new Date(),
//       orderPlacedAt: new Date().toLocaleString('en-IN', {
//         day: '2-digit',
//         month: 'short',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: true,
//         timeZone: 'Asia/Kolkata',
//       }),
//       specialInstructions: specialInstructions.trim(),
//       attachedImages,
//       deliveryAddress: formattedDeliveryAddress,
//       totalAmount: 0, // Will be calculated by admin
//       originalAmount: 0,
//       currency: '₹',
//       productCount: 0,
//       products: [],
//       deliveryStatus: {
//         stages: [
//           {
//             id: 'confirmed',
//             label: 'Confirmed',
//             status: 'pending',
//             timestamp: null,
//             displayTime: 'Pending',
//           },
//           {
//             id: 'packed',
//             label: 'Packed',
//             status: 'pending',
//             timestamp: null,
//             displayTime: 'Pending',
//           },
//           {
//             id: 'out_for_delivery',
//             label: 'Out for Delivery',
//             status: 'pending',
//             timestamp: null,
//             displayTime: 'Pending',
//           },
//           {
//             id: 'delivered',
//             label: 'Delivered',
//             status: 'pending',
//             timestamp: null,
//             displayTime: 'Pending',
//           },
//         ],
//         deliveryOfficer: null,
//       },
//       paymentMethod: 'Cash',
//       paymentStatus: 'Pending',
//       createdBy: userId,
//       createdByRole: userRole,
//     });

//     await newBulkOrder.save();

//     return res.status(201).json({
//       success: true,
//       message:
//         'Bulk order request submitted successfully. Admin will review and process your order.',
//       order: newBulkOrder,
//     });
//   } catch (error) {
//     console.error('Create bulk order error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Something went wrong while creating bulk order',
//       error: error.message,
//     });
//   }
// };

// Get Bulk Orders by User ID

export const createBulkOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || 'consumer';

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { specialInstructions, deliveryAddress, isGst, companyName } =
      req.body;
    
    console.log("Bulk Body",req.body)

    // Parse deliveryAddress if it comes as JSON string from form-data
    let parsedDeliveryAddress = deliveryAddress;
    if (typeof deliveryAddress === 'string') {
      try {
        parsedDeliveryAddress = JSON.parse(deliveryAddress);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid delivery address format',
        });
      }
    }

    // Validate required fields
    if (!specialInstructions || !specialInstructions.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Special instructions are required for bulk orders',
      });
    }

    if (!parsedDeliveryAddress) {
      return res.status(400).json({
        success: false,
        message: 'Delivery address is required for bulk orders',
      });
    }

    // Generate order ID
    const orderId = await generateUniqueOrderId(BulkOrder, 'BULK');
    const outputDir = `bulk-orders/${orderId}`;

    // Extract file paths using uploadHelper (same as category)
    const filePaths = uploadHelper.extractFilePaths(req.files);

    // HANDLE BOTH ARRAY AND SINGLE FILE CASES
    let imageFiles = filePaths.images || [];

    // If images is not an array, convert it to array
    if (!Array.isArray(imageFiles)) {
      imageFiles = imageFiles ? [imageFiles] : [];
    }

    if (imageFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one image is required for bulk orders',
      });
    }

    // Optimize images using uploadHelper (pass all files at once)
    let optimizedImageUrls = [];
    try {
      optimizedImageUrls = await uploadHelper.optimizeImage(imageFiles, {
        outputDir,
      });
    } catch (optimizeError) {
      console.error('Error optimizing images:', optimizeError);
      return res.status(500).json({
        success: false,
        message: 'Failed to process uploaded images',
      });
    }

    // Format attached images with metadata
    const attachedImages = imageFiles.map((file, index) => ({
      id: `img_${Date.now()}_${index}`,
      uri: Array.isArray(optimizedImageUrls)
        ? optimizedImageUrls[index]
        : optimizedImageUrls,
      fileName: file.originalname || `bulk_order_image_${index + 1}.jpg`,
      fileSize: file.size || 0,
      uploadedAt: new Date(),
    }));

    // Format delivery address
    const formattedDeliveryAddress = {
      label: parsedDeliveryAddress.label || 'Home',
      receiverDetails: parsedDeliveryAddress.receiverDetails || '',
      fullAddress: parsedDeliveryAddress.fullAddress || '',
      raw: parsedDeliveryAddress.raw || '',
    };

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

    // Create bulk order
    const newBulkOrder = new BulkOrder({
      orderId,
      status: 'pending',
      statusLabel: 'Order Pending',
      statusColor: '#FFC107',
      orderType: 'bulk',
      orderPlacedDate: new Date(),
      orderPlacedAt: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      }),
      specialInstructions: specialInstructions.trim(),
      attachedImages,
      deliveryAddress: formattedDeliveryAddress,
      totalAmount: 0, // Will be calculated by admin
      originalAmount: 0,
      currency: '₹',
      isGst,
      companyName,
      productCount: 0,
      products: [],
      deliveryStatus: {
        stages: [
          {
            id: 'pending',
            label: 'Order Placed', // Standardized label
            status: 'completed', // ✅ Mark as completed initially
            timestamp: stageDate, // ✅ Set current timestamp
            displayTime: stageDisplayTime, // ✅ Set display time
          },
          {
            id: 'confirmed',
            label: 'Confirmed',
            status: 'pending',
            timestamp: null,
            displayTime: 'Pending',
          },
          {
            id: 'out_for_delivery',
            label: 'Out for Delivery',
            status: 'pending',
            timestamp: null,
            displayTime: 'Pending',
          },
          {
            id: 'delivered',
            label: 'Delivered',
            status: 'pending',
            timestamp: null,
            displayTime: 'Pending',
          },
          {
            id: 'cancelled',
            label: 'Cancelled',
            status: 'pending',
            timestamp: null,
            displayTime: 'Pending',
          },
        ],
        deliveryOfficer: null,
      },
      paymentMethod: 'Cash',
      paymentStatus: 'Pending',
      createdBy: userId,
      createdByRole: userRole,
    });

    await newBulkOrder.save();
    // ✅ Get user details for notifications
    const user = await User.findById(userId).select('fullName email mobile');

    const roleNameMap = {
      retailer: 'Retailer',
      wholesaler: 'Wholesaler',
      super_stocker: 'Super Stocker',
      distributor: 'Distributor',
      consumer: 'Consumer',
    };

    const notificationData = {
      orderId: newBulkOrder.orderId,
      orderMongoId: newBulkOrder._id.toString(),
      orderDate: newBulkOrder.orderPlacedAt,
      userName: user?.fullName || 'Customer',
      customerName: user?.fullName || 'Customer',
      customerRole: roleNameMap[userRole] || userRole,
      customerMobile: user?.mobile || 'N/A',
      customerEmail: user?.email || 'N/A',
      specialInstructions: newBulkOrder.specialInstructions,
      attachedImages: newBulkOrder.attachedImages,
      deliveryAddress: newBulkOrder.deliveryAddress,
      trackOrderUrl: `${process.env.HOST_URL || 'https://gavran-admin.demohub.tech'}/order-management/bulk-orders/details/${newBulkOrder._id}`,
      adminOrderUrl: `${process.env.HOST_URL || 'https://gavran-admin.demohub.tech'}/order-management/bulk-orders/details/${newBulkOrder._id}`,
    };

    // ✅ 1. Notify USER (Email + FCM + DB)
    if (user?.email) {
      notifyUser({
        userId: userId,
        userEmail: user.email,
        userName: user.fullName,
        templateKey: 'bulkOrderPlaced',
        data: notificationData,
      }).catch((err) => {
        console.error('❌ User bulk order notification failed:', err);
      });
    }

    // ✅ 2. Notify ADMINS (Email + DB) - URGENT
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
        templateKey: 'bulkOrderReceived',
        data: notificationData,
      }).catch((err) => {
        console.error('❌ Admin bulk order notification failed:', err);
      });
    }

    // Auto-assign to stop
    // const assignmentResult = await autoAssignOrderToStop(
    //   newBulkOrder._id,
    //   'bulk',
    //   newBulkOrder.deliveryAddress,
    // );

    // let assignment_message = 'Order created successfully';
    // if (assignmentResult) {
    //   assignment_message += ` and auto-assigned to stop: ${assignmentResult.stop.stopName}`;
    // } else {
    //   assignment_message +=
    //     '. No matching stop found - pending manual assignment.';
    // }

    return res.status(201).json({
      success: true,
      message:
        'Bulk order request submitted successfully. Admin will review and process your order.',
      // assignment_message,
      order: newBulkOrder,
    });
  } catch (error) {
    console.error('Create bulk order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while creating bulk order',
      error: error.message,
    });
  }
};

export const getBulkOrdersByUserId = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await bulkOrderRepo.getAll({
      filter: { createdBy: userId },
      projection: {},
      sort: { createdAt: -1 },
    });

    if (
      !result.success ||
      !Array.isArray(result.data) ||
      result.data.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message: 'No bulk orders found for this user.',
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('Error fetching bulk orders by user ID:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};

// Get Single Bulk Order by ID
export const getBulkOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required',
      });
    }

    const result = await bulkOrderRepo.getById(id);

    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        message: 'Bulk order not found',
      });
    }

    // Verify order belongs to user
    if (result.data.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this order',
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('Error fetching bulk order by ID:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};

// Cancel Bulk Order
export const cancelBulkOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const userName = req.user?.fullName;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { reason, notes } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required',
      });
    }

    const bulkOrder = await BulkOrder.findById(id);

    if (!bulkOrder) {
      return res.status(404).json({
        success: false,
        message: 'Bulk order not found',
      });
    }

    // Verify order belongs to user
    if (bulkOrder.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to cancel this order',
      });
    }

    if (bulkOrder.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled',
      });
    }

    if (bulkOrder.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Delivered orders cannot be cancelled',
      });
    }

    // Update order status
    bulkOrder.status = 'cancelled';
    bulkOrder.statusLabel = 'Order Cancelled';
    bulkOrder.statusColor = '#F44336';
    bulkOrder.cancellationDetails = {
      cancelledAt: new Date(),
      cancelledDate: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      cancelledBy: {
        id: userId,
        name: userName,
        role: userRole,
      },
      cancelledByModel: 'User',
      reason: reason || 'No reason provided',
      notes: notes || '',
    };

    // ============================================================
    // ✅ NEW: Update Delivery Stage (Cancelled) - SAME AS DRIVER FLOW
    // ============================================================
    const cancelledEvent = TrackingService.createEvent(
      'cancelled',
      notes || reason || 'Order cancelled',
      reason || 'No reason provided',
    );

    if (
      bulkOrder.deliveryStatus &&
      Array.isArray(bulkOrder.deliveryStatus.stages)
    ) {
      const stageIndex = bulkOrder.deliveryStatus.stages.findIndex(
        (s) => s.id === 'cancelled',
      );

      if (stageIndex !== -1) {
        bulkOrder.deliveryStatus.stages[stageIndex].status = 'completed';
        bulkOrder.deliveryStatus.stages[stageIndex].timestamp =
          cancelledEvent.timestamp;
        bulkOrder.deliveryStatus.stages[stageIndex].displayTime =
          cancelledEvent.displayTime;
        bulkOrder.deliveryStatus.stages[stageIndex].reason =
          reason || 'No reason provided';
      } else {
        bulkOrder.deliveryStatus.stages.push(cancelledEvent);
      }
    }

    await bulkOrder.save();
    // ✅ Get user details for notifications
    const user = await User.findById(userId).select('fullName email mobile');

    const roleNameMap = {
      retailer: 'Retailer',
      wholesaler: 'Wholesaler',
      super_stocker: 'Super Stocker',
      distributor: 'Distributor',
      consumer: 'Consumer',
    };

    const notificationData = {
      orderId: bulkOrder.orderId,
      orderMongoId: bulkOrder._id.toString(),
      orderDate: bulkOrder.orderPlacedAt,
      cancelledDate: bulkOrder.cancellationDetails.cancelledDate,
      userName: user?.fullName || 'Customer',
      customerName: user?.fullName || 'Customer',
      customerRole: roleNameMap[userRole] || userRole,
      customerMobile: user?.mobile || 'N/A',
      customerEmail: user?.email || 'N/A',
      cancelledBy: {
        name: userName,
        role: roleNameMap[userRole] || userRole,
      },
      reason: bulkOrder.cancellationDetails.reason,
      notes: bulkOrder.cancellationDetails.notes,
      totalAmount: bulkOrder.totalAmount || 0,
      paymentMethod: bulkOrder.paymentMethod,
      paymentStatus: bulkOrder.paymentStatus,
      productCount: bulkOrder.productCount || 0,
      products: bulkOrder.products || [],
      specialInstructions: bulkOrder.specialInstructions,
      attachedImages: bulkOrder.attachedImages,
      browseProductsUrl: `${process.env.APP_URL || 'https://gavran.com'}/bulk-order`,
      adminOrderUrl: `${process.env.ADMIN_URL || 'https://gavran-admin.demohub.tech'}/orders/${bulkOrder._id}`,
    };

    // ✅ 1. Notify USER (Email + FCM + DB)
    if (user?.email) {
      notifyUser({
        userId: userId,
        userEmail: user.email,
        userName: user.fullName,
        templateKey: 'bulkOrderCancelledByUser',
        data: notificationData,
      }).catch((err) => {
        console.error(
          '❌ User bulk order cancellation notification failed:',
          err,
        );
      });
    }

    // ✅ 2. Notify ADMINS (Email + DB)
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
        templateKey: 'bulkOrderCancelledByUser',
        data: notificationData,
      }).catch((err) => {
        console.error(
          '❌ Admin bulk order cancellation notification failed:',
          err,
        );
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Bulk order cancelled successfully',
      order: bulkOrder,
    });
  } catch (error) {
    console.error('Cancel bulk order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while cancelling the bulk order',
      error: error.message,
    });
  }
};
