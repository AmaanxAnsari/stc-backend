import { messaging } from '../config/firebase-admin.js';
import FCMToken from '../models/admin/fcmTokenModel.js';
import Notification from '../models/admin/notificationModel.js';
import nodemailer from 'nodemailer';
import logger from '../logs/logger.js';
import { emailTemplates } from '../templates/emailTemplates.js';
import { notificationTemplates } from '../templates/notificationTemplates.js';
import { User } from '../models/app/user.js';

// ==================== EMAIL CONFIGURATION ====================

const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// ==================== EXISTING OTP EMAIL ====================

export const sendOtpEmail = async (toEmail, otp) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: 'Compumatrix Technologies',
    to: toEmail,
    subject: 'Your OTP for Verification',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #0056b3;">OTP Verification</h2>
        <p>Hello,</p>
        <p>Your One-Time Password (OTP) for verification is:</p>
        <h3 style="color: #0056b3; background-color: #f0f0f0; padding: 10px; border-radius: 5px; text-align: center; letter-spacing: 2px;">
          <strong>${otp}</strong>
        </h3>
        <p>This OTP is valid for a limited time. Please do not share it with anyone.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Thank you!</p>
      </div>
    `,
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    console.log('OTP Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    logger.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email.');
  }
};

// ==================== CORE FUNCTIONS ====================

/**
 * Send FCM push notification
 */
export const sendPushToUser = async (userId, notification) => {
  try {
    const tokens = await FCMToken.find({
      userId,
      isValid: true,
      isActive: true,
      isDeleted: false,
    }).select('fcmToken platform');

    if (!tokens.length) {
      console.log(`⚠️ No FCM tokens found for user: ${userId}`);
      return { success: false, message: 'No FCM tokens found' };
    }

    const fcmTokens = tokens.map((t) => t.fcmToken);

    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.imageUrl && { imageUrl: notification.imageUrl }),
      },
      data: {
        type: notification.type,
        ...(notification.orderId && {
          orderId: notification.orderId.toString(),
        }),
        ...(notification.productId && {
          productId: notification.productId.toString(),
        }),
        ...notification.data,
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const results = await Promise.allSettled(
      fcmTokens.map((token) => messaging.send({ ...message, token })),
    );

    const failedTokens = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`❌ Failed to send to token ${index}:`, result.reason);
        failedTokens.push(fcmTokens[index]);
      }
    });

    if (failedTokens.length > 0) {
      await FCMToken.updateMany(
        { fcmToken: { $in: failedTokens } },
        {
          $set: { isValid: false, lastFailedAt: new Date() },
          $inc: { failedAttempts: 1 },
        },
      );
    }

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    console.log(`✅ FCM sent: ${successCount}/${fcmTokens.length}`);

    return {
      success: true,
      sent: successCount,
      total: fcmTokens.length,
      failedTokens,
    };
  } catch (error) {
    console.error('❌ FCM error:', error);
    throw error;
  }
};

/**
 * Send broadcast notification
 */
export const sendBroadcastPush = async (userIds, notification) => {
  try {
    const results = await Promise.allSettled(
      userIds.map((userId) => sendPushToUser(userId, notification)),
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    console.log(`✅ Broadcast sent to ${successCount}/${userIds.length} users`);

    return {
      success: true,
      sent: successCount,
      total: userIds.length,
    };
  } catch (error) {
    console.error('❌ Broadcast error:', error);
    throw error;
  }
};

/**
 * Send email notification
 */
export const sendEmailNotification = async (userEmail, emailData) => {
  const transporter = createTransporter();

  try {
    const mailOptions = {
      from: '"Gavran" <' + process.env.EMAIL_USERNAME + '>',
      to: userEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${userEmail}:`, info.messageId);
    logger.info(`Email sent to ${userEmail}:`, info.messageId);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error);
    logger.error('Email error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save notification to DB
 */
export const createNotification = async (notificationData) => {
  try {
    const notification = new Notification(notificationData);
    await notification.save();
    console.log('✅ Notification saved to DB:', notification._id);
    return notification;
  } catch (error) {
    console.error('❌ DB save error:', error);
    throw error;
  }
};

// ==================== COMPLETE NOTIFICATION (OLD - STILL WORKS) ====================

export const sendCompleteNotification = async ({
  userId,
  type,
  title,
  body,
  imageUrl,
  orderId,
  productId,
  data = {},
  sendEmail = false,
  priority = 'normal',
  userEmail = null,
}) => {
  try {
    // 1. Save to DB
    const dbNotification = await createNotification({
      userId,
      type,
      title,
      body,
      imageUrl,
      orderId,
      productId,
      data,
      priority,
    });

    // 2. Send FCM
    const pushResult = await sendPushToUser(userId, {
      title,
      body,
      imageUrl,
      type,
      orderId,
      productId,
      data,
    });

    // 3. Send Email
    let emailResult = { success: false };
    if (sendEmail && userEmail) {
      emailResult = await sendEmailNotification(userEmail, {
        subject: title,
        html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>${title}</h2>
          <p>${body}</p>
        </div>`,
        text: body,
      });
    }

    // 4. Update DB
    await Notification.findByIdAndUpdate(dbNotification._id, {
      'channels.push.sent': pushResult.success,
      'channels.push.sentAt': new Date(),
      'channels.push.fcmResponse': JSON.stringify(pushResult),
      'channels.email.sent': emailResult.success,
      'channels.email.sentAt': emailResult.success ? new Date() : null,
      'channels.email.emailId': emailResult.messageId || null,
    });

    return {
      success: true,
      notificationId: dbNotification._id,
      pushResult,
      emailResult,
    };
  } catch (error) {
    console.error('❌ Complete notification error:', error);
    throw error;
  }
};

// ==================== TEMPLATE-BASED HELPERS ====================


export const notifyUser = async ({
  userId,
  userEmail,
  userName,
  templateKey,
  data,
  isDriver = false,
}) => {
  try {
    console.log(
      `📤 Notifying ${isDriver ? 'driver' : 'user'}: ${userId} | Template: ${templateKey}`,
    );

    // Select correct template source
    const templateSource = isDriver
      ? { fcm: notificationTemplates.driver, email: emailTemplates.driver }
      : { fcm: notificationTemplates.user, email: emailTemplates.user };

    const fcmTemplate = templateSource.fcm[templateKey]
      ? templateSource.fcm[templateKey](data)
      : null;

    const emailTemplate = templateSource.email[templateKey]
      ? templateSource.email[templateKey]({ ...data, userName })
      : null;

    if (!fcmTemplate && !emailTemplate) {
      throw new Error(
        `No template found for: ${isDriver ? 'driver' : 'user'}.${templateKey}`,
      );
    }

    // 🛠 FIX: Remove imageUrl if empty/invalid (NO LOGIC CHANGE)
    if (
      fcmTemplate &&
      (!fcmTemplate.imageUrl ||
        typeof fcmTemplate.imageUrl !== 'string' ||
        !fcmTemplate.imageUrl.startsWith('http'))
    ) {
      delete fcmTemplate.imageUrl;
    }

    let dbNotification = null;
    let fcmResult = { success: false };

    // Save to DB + Send Push only if FCM template exists
    if (fcmTemplate) {
      dbNotification = await createNotification({
        userId,
        type: fcmTemplate.type,
        title: fcmTemplate.title,
        body: fcmTemplate.body,
        imageUrl: fcmTemplate.imageUrl,
        data: fcmTemplate.data,
        orderId: data.orderMongoId || null,
        productId: data.productId || null,
      });

      fcmResult = await sendPushToUser(userId, fcmTemplate);
    } else {
      console.log(
        `⚠️ No FCM template for ${isDriver ? 'driver' : 'user'}, skipping push notification and DB save`,
      );
    }

    // Always try sending email
    let emailResult = { success: false };
    if (emailTemplate && userEmail) {
      emailResult = await sendEmailNotification(userEmail, emailTemplate);
    }

    // Update DB (only if notification exists)
    if (dbNotification) {
      await Notification.findByIdAndUpdate(dbNotification._id, {
        'channels.push.sent': fcmResult.success,
        'channels.push.sentAt': new Date(),
        'channels.email.sent': emailResult.success,
        'channels.email.sentAt': emailResult.success ? new Date() : null,
        'channels.email.emailId': emailResult.messageId || null,
      });
    }

    console.log(`✅ ${isDriver ? 'Driver' : 'User'} notification complete`);

    return {
      success: true,
      fcm: fcmResult,
      email: emailResult,
      db: dbNotification,
    };
  } catch (error) {
    console.error(`❌ notify${isDriver ? 'Driver' : 'User'} error:`, error);
    throw error;
  }
};


/**
 * Notify ADMIN with templates (Email + DB)
 * ✅ SIMPLE VERSION - Just stores in DB with admin userId
 */
export const notifyAdmin = async ({
  adminUserId, // ✅ Single admin user ID (required)
  adminEmail, // ✅ Single admin email (required)
  templateKey,
  data,
}) => {
  try {
    console.log(
      `📤 Notifying admin: ${adminUserId} | Template: ${templateKey}`,
    );

    const emailTemplate = emailTemplates.admin[templateKey]
      ? emailTemplates.admin[templateKey](data)
      : null;

    if (!emailTemplate) {
      throw new Error(`Template not found: admin.${templateKey}`);
    }

    // 1. Save to DB (using admin's userId)
    const dbNotification = await createNotification({
      userId: adminUserId, // ✅ Store with admin's user ID
      type: templateKey,
      title: emailTemplate.subject,
      body: data.body || emailTemplate.subject,
      imageUrl: null,
      data: data,
      orderId: data.orderMongoId || null,
      productId: data.productId || null,
    });

    // 2. Send Email
    const emailResult = await sendEmailNotification(adminEmail, emailTemplate);

    // 3. Update DB
    await Notification.findByIdAndUpdate(dbNotification._id, {
      'channels.email.sent': emailResult.success,
      'channels.email.sentAt': emailResult.success ? new Date() : null,
      'channels.email.emailId': emailResult.messageId || null,
    });

    console.log(`✅ Admin notification sent`);

    return {
      success: true,
      email: emailResult,
      db: dbNotification,
    };
  } catch (error) {
    console.error('❌ notifyAdmin error:', error);
    throw error;
  }
};

/**
 * Notify MULTIPLE ADMINS
 */
export const notifyAdmins = async ({
  admins, // Array of { userId, email }
  templateKey,
  data,
}) => {
  try {
    console.log(
      `📤 Notifying ${admins.length} admins | Template: ${templateKey}`,
    );

    const results = await Promise.allSettled(
      admins.map((admin) =>
        notifyAdmin({
          adminUserId: admin.userId,
          adminEmail: admin.email,
          templateKey,
          data,
        }),
      ),
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;

    console.log(`✅ Admins notified: ${successCount}/${admins.length}`);

    return {
      success: true,
      notified: successCount,
      total: admins.length,
    };
  } catch (error) {
    console.error('❌ notifyAdmins error:', error);
    throw error;
  }
};

// ==================== NEW: DELIVERY NOTIFICATION HELPERS ====================

/**
 * Send "Order Out for Delivery" notification to customer
 */
export const sendOutForDeliveryNotification = async (order, orderType) => {
  try {
    const user = await User.findById(order.createdBy);
    if (!user) {
      console.log(`⚠️ User not found for order: ${order.orderId || order.requestId}`);
      return;
    }

    const templateData = {
      orderId: order.orderId || order.requestId,
      orderMongoId: order._id.toString(),
      totalAmount: order.totalAmount || 0,
      products: order.products || [],
      estimatedDelivery: new Date(Date.now() + 60 * 60 * 1000).toLocaleString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    await notifyUser({
      userId: user._id.toString(),
      userEmail: user.email,
      userName: user.fullName || user.name,
      templateKey: 'orderOutForDelivery',
      data: templateData,
      isDriver: false,
    });

    console.log(`✅ Out for delivery notification sent for order: ${order.orderId || order.requestId}`);
  } catch (error) {
    console.error('❌ Failed to send out for delivery notification:', error);
  }
};

/**
 * Send OTP notification to customer
 */
export const sendDeliveryOTPNotification = async (order, orderType, otp, action) => {
  try {
    const user = await User.findById(order.createdBy);
    if (!user) {
      console.log(`⚠️ User not found for order: ${order.orderId || order.requestId}`);
      return;
    }

    const actionText = action === 'deliver' ? 'Delivery' : 'Cancellation';
    
    const templateData = {
      orderId: order.orderId || order.requestId,
      orderMongoId: order._id.toString(),
      otp: otp,
      action: actionText,
      expiryMinutes: 10,
    };

    await notifyUser({
      userId: user._id.toString(),
      userEmail: user.email,
      userName: user.fullName || user.name,
      templateKey: 'deliveryOTP',
      data: templateData,
      isDriver: false,
    });

    console.log(`✅ OTP sent for order: ${order.orderId || order.requestId} (Action: ${action})`);
  } catch (error) {
    console.error('❌ Failed to send OTP:', error);
  }
};

/**
 * Send "Order Delivered" notification to customer
 */
export const sendOrderDeliveredNotification = async (order, orderType) => {
  try {
    const user = await User.findById(order.createdBy);
    if (!user) {
      console.log(`⚠️ User not found for order: ${order.orderId || order.requestId}`);
      return;
    }

    const templateData = {
      orderId: order.orderId || order.requestId,
      orderMongoId: order._id.toString(),
      totalAmount: order.totalAmount || 0,
      deliveredAt: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      deliveryOfficer: order.deliveryProof?.deliveredBy?.name || 'Delivery Partner',
    };

    await notifyUser({
      userId: user._id.toString(),
      userEmail: user.email,
      userName: user.fullName || user.name,
      templateKey: 'orderDelivered',
      data: templateData,
      isDriver: false,
    });

    console.log(`✅ Delivered notification sent for order: ${order.orderId || order.requestId}`);
  } catch (error) {
    console.error('❌ Failed to send delivered notification:', error);
  }
};

/**
 * Send "Order Cancelled" notification to customer
 */
export const sendOrderCancelledNotification = async (order, orderType, reason) => {
  try {
    const user = await User.findById(order.createdBy);
    if (!user) {
      console.log(`⚠️ User not found for order: ${order.orderId || order.requestId}`);
      return;
    }

    const templateData = {
      orderId: order.orderId || order.requestId,
      orderMongoId: order._id.toString(),
      totalAmount: order.totalAmount || 0,
      cancellationReason: reason,
      cancelledAt: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      refundAmount: order.paymentStatus === 'Completed' ? order.totalAmount : 0,
    };

    await notifyUser({
      userId: user._id.toString(),
      userEmail: user.email,
      userName: user.fullName || user.name,
      templateKey: 'orderCancelled',
      data: templateData,
      isDriver: false,
    });

    console.log(`✅ Cancelled notification sent for order: ${order.orderId || order.requestId}`);
  } catch (error) {
    console.error('❌ Failed to send cancelled notification:', error);
  }
};

/**
 * Notify driver when route is assigned
 */
export const sendRouteAssignedNotification = async (route, driverId) => {
  try {
    const driver = await User.findById(driverId);
    if (!driver) {
      console.log(`⚠️ Driver not found: ${driverId}`);
      return;
    }

    const templateData = {
      routeId: route._id.toString(),
      routeName: route.routeName,
      area: route.area,
      totalStops: route.totalStops || 0,
      totalOrders: route.totalOrders || 0,
      deliveryDate: new Date(route.nextDeliveryDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      estimatedDuration: route.estimatedDuration || 'N/A',
    };

    await notifyUser({
      userId: driver._id.toString(),
      userEmail: driver.email,
      userName: driver.fullName || driver.name,
      templateKey: 'routeAssigned',
      data: templateData,
      isDriver: true,
    });

    console.log(`✅ Route assigned notification sent to driver: ${driver.fullName}`);
  } catch (error) {
    console.error('❌ Failed to send route assigned notification:', error);
  }
};

/**
 * Notify driver when route is started
 */
export const sendRouteStartedNotification = async (route, driverId) => {
  try {
    const driver = await User.findById(driverId);
    if (!driver) return;

    const templateData = {
      routeId: route._id.toString(),
      routeName: route.routeName,
      totalOrders: route.totalOrders || 0,
      startedAt: new Date().toLocaleString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    await notifyUser({
      userId: driver._id.toString(),
      userEmail: driver.email,
      userName: driver.fullName || driver.name,
      templateKey: 'routeStarted',
      data: templateData,
      isDriver: true,
    });

    console.log(`✅ Route started notification sent to driver`);
  } catch (error) {
    console.error('❌ Failed to send route started notification:', error);
  }
};

/**
 * Notify admin when route is completed
 */
export const sendRouteCompletedNotificationToAdmin = async (route, completionData) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gavran.com';
    const adminUserId = process.env.ADMIN_USER_ID;

    const templateData = {
      routeId: route._id.toString(),
      routeName: route.routeName,
      driverName: route.deliveryOfficer?.name || 'Unknown',
      totalOrders: completionData.totalOrders,
      completedOrders: completionData.completedOrders,
      deliveredCount: completionData.completedOrders - (completionData.cancelledCount || 0),
      cancelledCount: completionData.cancelledCount || 0,
      completedAt: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    if (adminUserId) {
      await notifyAdmin({
        adminUserId: adminUserId,
        adminEmail: adminEmail,
        templateKey: 'routeCompleted',
        data: templateData,
      });
    }

    console.log(`✅ Route completed notification sent to admin`);
  } catch (error) {
    console.error('❌ Failed to send route completed notification:', error);
  }
};

/**
 * Send Spot Order Receipt to Non-Registered Customer (Email Only)
 */
export const sendSpotOrderCustomerEmail = async (customerEmail, orderData) => {
  try {
    if (!customerEmail) {
      console.log('⚠️ No customer email provided for spot order receipt.');
      return;
    }

    const IMAGEBASEURL = process.env.IMAGE_BASE_URL || 'https://gavran-api.demohub.tech';

    // Construct the HTML manually here based on your template
    // This avoids dependency on the user/driver template files which might require userId
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background:#f5f5f5; padding:20px;">
        <div style="max-width:600px; margin:0 auto; background:white; border-radius:8px; overflow:hidden;">
          
          <!-- HEADER -->
          <div style="background:#4CAF50; color:white; padding:22px; text-align:center;">
            <h1 style="margin:0; font-size:24px;">✅ Order Delivered!</h1>
            <p style="margin:5px 0 0; font-size:14px;">Receipt for Order #${orderData.orderId}</p>
          </div>

          <div style="padding:20px;">
            <p style="font-size:15px;">Hi <strong>${orderData.customerName}</strong>,</p>
            <p style="color:#666;">Thank you for your order. Here is your receipt.</p>

            <!-- ORDER DETAILS -->
            <div style="background:white; border:1px solid #ddd; border-radius:5px; padding:15px; margin-bottom:20px;">
              <h3 style="margin:0 0 10px; color:#4CAF50;">Order Details</h3>
              <p style="margin:4px 0;"><strong>Order ID:</strong> ${orderData.orderId}</p>
              <p style="margin:4px 0;"><strong>Date:</strong> ${orderData.deliveredAt}</p>
              <p style="margin:4px 0;"><strong>Payment:</strong> <span style="color:#4CAF50; font-weight:bold;">${orderData.paymentStatus}</span> via ${orderData.paymentMethod}</p>
              ${orderData.transactionId ? `<p style="margin:4px 0;"><strong>Txn ID:</strong> ${orderData.transactionId}</p>` : ''}
            </div>

            <!-- PRODUCT LIST -->
            <div style="background:white; border-radius:5px; border:1px solid #ddd; padding:15px; margin-bottom:20px;">
              <h3 style="margin-top:0;">📦 Items Purchased</h3>
              ${orderData.products.map(p => `
                <div style="display:flex; align-items:center; padding:10px 0; border-bottom:1px solid #eee;">
                  ${p.image ? `<img src="${IMAGEBASEURL}/${p.image}" style="width:50px; height:50px; border-radius:5px; margin-right:15px; object-fit:cover;">` : ''}
                  <div style="flex:1;">
                    <strong>${p.name}</strong><br>
                    <span style="color:#666; font-size:12px;">Qty: ${p.orderQuantity}</span>
                  </div>
                  <div style="text-align:right;">
                    <strong>₹${(p.price * p.orderQuantity).toFixed(2)}</strong>
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- TOTALS -->
            <div style="text-align:right;">
              <p style="margin:5px 0;">Subtotal: ₹${orderData.itemTotal.toFixed(2)}</p>
              ${orderData.isGst && orderData.taxAmount > 0 ? `<p style="margin:5px 0;">Tax (GST): ₹${orderData.taxAmount.toFixed(2)}</p>` : ''}
              <h2 style="color:#4CAF50; margin:10px 0;">Total: ₹${orderData.totalAmount.toFixed(2)}</h2>
            </div>

            <!-- FOOTER -->
            <div style="margin-top:30px; border-top:1px solid #eee; padding-top:15px; text-align:center; color:#999; font-size:12px;">
              <p>Generated by Gavran Driver App</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Use the existing core email function
    const result = await sendEmailNotification(customerEmail, {
      subject: `🧾 Order Receipt - #${orderData.orderId}`,
      html: htmlContent,
      text: `Your order #${orderData.orderId} is completed. Total: ₹${orderData.totalAmount}`,
    });

    if (result.success) {
      console.log(`✅ Customer receipt sent to ${customerEmail}`);
    } else {
      console.error(`❌ Failed to send customer receipt: ${result.error}`);
    }

    return result;
  } catch (error) {
    console.error('❌ sendSpotOrderCustomerEmail error:', error);
    // Don't throw, just log, so we don't break the main flow
  }
};