import Razorpay from 'razorpay';
import crypto from 'crypto';
import AppOrder from '../../models/admin/AppOrderModel.js';
import BulkOrder from '../../models/admin/BulkOrderModel.js';

const key_id = 'rzp_test_Rhz3GvWYg1ui4p';
const key_secret = '7jELy72LJZWulVjgtfBDMWhv';

// Initialize Razorpay instance
const razorpay = new Razorpay({ key_id, key_secret });

export const createRazorpayOrder = async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'orderId and amount are required',
      });
    }

    // Convert amount to paise (Razorpay requires paise)
    const options = {
      amount: amount * 100,
      currency: 'INR',
      receipt: orderId,
      notes: {
        appOrderId: orderId,
      },
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      order,
      orderId: order.id,
      key: key_id,
      amount: amount * 100,
      currency: 'INR',
    });
  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create Razorpay order',
      error: error.message,
    });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      orderId = null,
    } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification fields',
      });
    }

    // 1. Verify Signature
    const sign = crypto
      .createHmac('sha256', key_secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (sign !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
      });
    }

    // 2. Fetch Payment Details from Razorpay
    let paymentDetails = null;
    try {
      paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (fetchError) {
      console.error('Error fetching payment details:', fetchError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch payment details from Razorpay',
      });
    }

    // 3. Prepare Payment Details Object (to be sent back to frontend)
    const paymentDetailsObj = {
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpaySignature: razorpay_signature,
      paidAt: new Date(),
      paymentMethod: paymentDetails?.method || 'unknown',
      paymentMethodDetails: {
        method: paymentDetails?.method,
        bank: paymentDetails?.bank || null,
        wallet: paymentDetails?.wallet || null,
        vpa: paymentDetails?.vpa || null,
        cardId: paymentDetails?.card_id || null,
        cardNetwork: paymentDetails?.card?.network || null,
        cardType: paymentDetails?.card?.type || null,
        cardLast4: paymentDetails?.card?.last4 || null,
      },
      amount: paymentDetails?.amount ? paymentDetails.amount / 100 : null,
      currency: paymentDetails?.currency || 'INR',
      status: paymentDetails?.status || 'captured',
      email: paymentDetails?.email || null,
      contact: paymentDetails?.contact || null,
    };

    // 4. ✅ Handle Bulk Order Payment (Update in DB)
    if (orderId) {
      console.log('🔄 Updating bulk order payment:', orderId);

      const bulkOrder = await BulkOrder.findById(orderId);

      if (!bulkOrder) {
        return res.status(404).json({
          success: false,
          message: 'Bulk order not found',
        });
      }

      // Update bulk order with payment details
      bulkOrder.paymentMethod = 'Online';
      bulkOrder.paymentStatus = 'Completed';
      bulkOrder.paymentDetails = paymentDetailsObj;

      await bulkOrder.save();

      console.log('✅ Bulk order payment updated successfully');

      return res.status(200).json({
        success: true,
        message: 'Bulk order payment verified and updated successfully',
        orderType: 'BulkOrder',
        order: bulkOrder,
        paymentDetails: paymentDetailsObj,
      });
    }

    // 5. Return details to frontend 
    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      paymentDetails: paymentDetailsObj, // Frontend needs this!
      data: paymentDetailsObj, // Frontend needs this!
    });
  } catch (error) {
    console.error('Razorpay Verify Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message,
    });
  }
};

// Create Payment Link for Driver (Mobile App Version)
export const createPaymentLink = async (req, res) => {
  try {
    const {
      amount,
      driverId,
      orderId,
      driverName,
      driverEmail,
      driverContact,
      description = 'Driver Payment',
    } = req.body;

    if (!amount || !driverId || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'amount, driverId, and orderId are required',
      });
    }

    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      description: description,
      customer: {
        name: driverName,
        email: driverEmail,
        contact: driverContact,
      },
      notify: {
        sms: true,
        email: true,
      },
      reminder_enable: true,
      // ❌ Removed callback_url - not needed for mobile apps
      notes: {
        driverId: driverId,
        orderId: orderId,
        paymentType: 'driver_payment',
      },
    };

    const paymentLink = await razorpay.paymentLink.create(options);

    return res.status(200).json({
      success: true,
      paymentLink: {
        id: paymentLink.id,
        short_url: paymentLink.short_url,
        amount: amount,
        status: paymentLink.status,
      },
    });
  } catch (error) {
    console.error('Create Payment Link Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payment link',
      error: error.message,
    });
  }
};

// Create UPI QR Code for Driver
export const createUpiQrCode = async (req, res) => {
  try {
    const {
      amount,
      driverId,
      orderId,
      description = 'Driver Payment',
    } = req.body;

    if (!amount || !driverId || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'amount, driverId, and orderId are required',
      });
    }

    const options = {
      type: 'upi_qr',
      name: `Payment for Order ${orderId}`,
      usage: 'single_use',
      fixed_amount: true,
      payment_amount: amount * 100, // Convert to paise
      description: description,
      notes: {
        driverId: driverId,
        orderId: orderId,
        paymentType: 'driver_payment',
      },
    };

    const qrCode = await razorpay.qrCode.create(options);

    return res.status(200).json({
      success: true,
      qrCode: {
        id: qrCode.id,
        image_url: qrCode.image_url,
        amount: amount,
        status: qrCode.status,
      },
    });
  } catch (error) {
    console.error('Create QR Code Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create QR code',
      error: error.message,
    });
  }
};

// Get Payment Link Status (For polling from app)
// export const getPaymentLinkStatus = async (req, res) => {
//   try {
//     const { paymentLinkId } = req.params;

//     const paymentLink = await razorpay.paymentLink.fetch(paymentLinkId);

//     return res.status(200).json({
//       success: true,
//       paymentLink: {
//         id: paymentLink.id,
//         status: paymentLink.status, // 'created', 'partially_paid', 'paid', 'cancelled', 'expired'
//         amount: paymentLink.amount / 100,
//         amount_paid: paymentLink.amount_paid / 100,
//       },
//     });
//   } catch (error) {
//     console.error('Fetch Payment Link Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch payment link',
//       error: error.message,
//     });
//   }
// };

// Get Payment Link Status with Payment Details
export const getPaymentLinkStatus = async (req, res) => {
  try {
    const { paymentLinkId } = req.params;

    const paymentLink = await razorpay.paymentLink.fetch(paymentLinkId);

    // ✅ If payment link is paid, fetch payment details
    let paymentDetails = null;
    if (paymentLink.status === 'paid' && paymentLink.payments && paymentLink.payments.length > 0) {
      const paymentId = paymentLink.payments[0].payment_id;
      
      try {
        const payment = await razorpay.payments.fetch(paymentId);
        
        // ✅ Prepare payment details object
        paymentDetails = {
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id || null,
          paidAt: new Date(payment.created_at * 1000),
          paymentMethod: payment.method || 'unknown',
          paymentMethodDetails: {
            method: payment.method,
            bank: payment.bank || null,
            wallet: payment.wallet || null,
            vpa: payment.vpa || null,
            cardId: payment.card_id || null,
            cardNetwork: payment.card?.network || null,
            cardType: payment.card?.type || null,
            cardLast4: payment.card?.last4 || null,
          },
          amount: payment.amount ? payment.amount / 100 : null,
          currency: payment.currency || 'INR',
          status: payment.status || 'captured',
          email: payment.email || null,
          contact: payment.contact || null,
        };
      } catch (fetchError) {
        console.error('Error fetching payment details:', fetchError);
      }
    }

    return res.status(200).json({
      success: true,
      paymentLink: {
        id: paymentLink.id,
        status: paymentLink.status,
        amount: paymentLink.amount / 100,
        amount_paid: paymentLink.amount_paid / 100,
      },
      paymentDetails: paymentDetails, // ✅ Return payment details
    });
  } catch (error) {
    console.error('Fetch Payment Link Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment link',
      error: error.message,
    });
  }
};

export const simulateQrPayment = async (req, res) => {
  try {
    const { qrCodeId } = req.params;
    console.log('Data', qrCodeId);

    // In test mode, you can manually close the QR code to simulate payment
    const qrCode = await razorpay.qrCode.close(qrCodeId);

    return res.status(200).json({
      success: true,
      message: 'QR Code payment simulated',
      qrCode: {
        id: qrCode.id,
        status: qrCode.status,
        payments_amount_received: qrCode.payments_amount_received / 100,
      },
    });
  } catch (error) {
    console.error('Simulate QR Payment Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to simulate payment',
      error: error.message,
    });
  }
};

// Get QR Code Status (For polling from app)
// export const getQrCodeStatus = async (req, res) => {
//   try {
//     const { qrCodeId } = req.params;

//     const qrCode = await razorpay.qrCode.fetch(qrCodeId);

//     return res.status(200).json({
//       success: true,
//       qrCode: {
//         id: qrCode.id,
//         status: qrCode.status, // 'active', 'closed'
//         payments_amount_received: qrCode.payments_amount_received / 100,
//         payment_amount: qrCode.payment_amount / 100,
//       },
//     });
//   } catch (error) {
//     console.error('Fetch QR Code Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch QR code',
//       error: error.message,
//     });
//   }
// };


// Get QR Code Status with Payment Details
export const getQrCodeStatus = async (req, res) => {
  try {
    const { qrCodeId } = req.params;

    const qrCode = await razorpay.qrCode.fetch(qrCodeId);

    // ✅ If QR code is closed, fetch payment details
    let paymentDetails = null;
    if (qrCode.status === 'closed' && qrCode.payments && qrCode.payments.length > 0) {
      const paymentId = qrCode.payments[0].payment_id;
      
      try {
        const payment = await razorpay.payments.fetch(paymentId);
        
        // ✅ Prepare payment details object
        paymentDetails = {
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id || null,
          paidAt: new Date(payment.created_at * 1000),
          paymentMethod: payment.method || 'unknown',
          paymentMethodDetails: {
            method: payment.method,
            bank: payment.bank || null,
            wallet: payment.wallet || null,
            vpa: payment.vpa || null,
            cardId: payment.card_id || null,
            cardNetwork: payment.card?.network || null,
            cardType: payment.card?.type || null,
            cardLast4: payment.card?.last4 || null,
          },
          amount: payment.amount ? payment.amount / 100 : null,
          currency: payment.currency || 'INR',
          status: payment.status || 'captured',
          email: payment.email || null,
          contact: payment.contact || null,
        };
      } catch (fetchError) {
        console.error('Error fetching payment details:', fetchError);
      }
    }

    return res.status(200).json({
      success: true,
      qrCode: {
        id: qrCode.id,
        status: qrCode.status,
        payments_amount_received: qrCode.payments_amount_received / 100,
        payment_amount: qrCode.payment_amount / 100,
      },
      paymentDetails: paymentDetails, // ✅ Return payment details
    });
  } catch (error) {
    console.error('Fetch QR Code Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch QR code',
      error: error.message,
    });
  }
};

// export const verifyRazorpayPayment = async (req, res) => {
//   try {
//     const {
//       razorpay_payment_id,
//       razorpay_order_id,
//       razorpay_signature,
//       appOrderId,
//       orderType = 'normal', // 'normal' or 'bulk'
//     } = req.body;

//     if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing payment verification fields',
//       });
//     }

//     if (!appOrderId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Order ID is required',
//       });
//     }

//     // Generate expected signature
//     const sign = crypto
//       .createHmac('sha256', key_secret)
//       .update(razorpay_order_id + '|' + razorpay_payment_id)
//       .digest('hex');

//     // Signature mismatch
//     if (sign !== razorpay_signature) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid payment signature',
//       });
//     }

//     // Fetch payment details from Razorpay
//     let paymentDetails = null;
//     try {
//       paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
//       console.log('Payment Details:', paymentDetails);
//     } catch (fetchError) {
//       console.error('Error fetching payment details:', fetchError);
//       // Continue even if fetch fails - don't block verification
//     }

//     // Determine order type and fetch order
//     let order = null;
//     let orderModel = null;

//     // Try to find in AppOrders first
//     order = await AppOrder.findById(appOrderId);
//     if (order) {
//       orderModel = 'AppOrder';
//     } else {
//       // If not found, try BulkOrders
//       order = await BulkOrder.findById(appOrderId);
//       if (order) {
//         orderModel = 'BulkOrder';
//       }
//     }

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: 'Order not found in both AppOrders and BulkOrders',
//       });
//     }

//     console.log(`Order found in: ${orderModel}`);

//     // Prepare payment details object
//     const paymentDetailsObj = {
//       razorpayPaymentId: razorpay_payment_id,
//       razorpayOrderId: razorpay_order_id,
//       razorpaySignature: razorpay_signature,
//       paidAt: new Date(),
//       // Add payment method details
//       paymentMethod: paymentDetails?.method || 'unknown',
//       paymentMethodDetails: {
//         method: paymentDetails?.method,
//         bank: paymentDetails?.bank || null,
//         wallet: paymentDetails?.wallet || null,
//         vpa: paymentDetails?.vpa || null,
//         cardId: paymentDetails?.card_id || null,
//         cardNetwork: paymentDetails?.card?.network || null,
//         cardType: paymentDetails?.card?.type || null,
//         cardLast4: paymentDetails?.card?.last4 || null,
//       },
//       amount: paymentDetails?.amount ? paymentDetails.amount / 100 : null,
//       currency: paymentDetails?.currency || 'INR',
//       status: paymentDetails?.status || 'captured',
//       email: paymentDetails?.email || null,
//       contact: paymentDetails?.contact || null,
//     };

//     // Update payment status
//     order.paymentStatus = 'Completed';
//     order.paymentDetails = paymentDetailsObj;

//     await order.save();

//     return res.status(200).json({
//       success: true,
//       message: 'Payment verified successfully',
//       orderType: orderModel,
//       order,
//       paymentDetails: {
//         paymentId: razorpay_payment_id,
//         orderId: razorpay_order_id,
//         method: paymentDetails?.method,
//         amount: paymentDetails?.amount ? paymentDetails.amount / 100 : null,
//         currency: paymentDetails?.currency,
//         status: paymentDetails?.status,
//         email: paymentDetails?.email,
//         contact: paymentDetails?.contact,
//         // Method-specific details
//         bank: paymentDetails?.bank,
//         wallet: paymentDetails?.wallet,
//         vpa: paymentDetails?.vpa,
//         card: paymentDetails?.card
//           ? {
//               network: paymentDetails.card.network,
//               type: paymentDetails.card.type,
//               last4: paymentDetails.card.last4,
//             }
//           : null,
//       },
//     });
//   } catch (error) {
//     console.error('Razorpay Verify Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Payment verification failed',
//       error: error.message,
//     });
//   }
// };

// export const verifyRazorpayPayment = async (req, res) => {
//   try {
//     const {
//       razorpay_payment_id,
//       razorpay_order_id,
//       razorpay_signature,
//       appOrderId,
//     } = req.body;

//     if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing payment verification fields',
//       });
//     }

//     // Generate expected signature
//     const sign = crypto
//       .createHmac('sha256', key_secret)
//       .update(razorpay_order_id + '|' + razorpay_payment_id)
//       .digest('hex');

//     // Signature mismatch
//     if (sign !== razorpay_signature) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid payment signature',
//       });
//     }

//     // Fetch payment details from Razorpay
//     let paymentDetails = null;
//     try {
//       paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
//       console.log('Payment Details:', paymentDetails);
//     } catch (fetchError) {
//       console.error('Error fetching payment details:', fetchError);
//       // Continue even if fetch fails - don't block verification
//     }

//     // Fetch app order
//     const order = await AppOrder.findOne({ _id: appOrderId });

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: 'App order not found',
//       });
//     }

//     // Update payment status with full details
//     order.paymentStatus = 'Paid';
//     order.paymentDetails = {
//       razorpayPaymentId: razorpay_payment_id,
//       razorpayOrderId: razorpay_order_id,
//       razorpaySignature: razorpay_signature,
//       paidAt: new Date(),
//       // Add payment method details
//       paymentMethod: paymentDetails?.method || 'unknown', // card, upi, netbanking, wallet, etc.
//       paymentMethodDetails: {
//         method: paymentDetails?.method,
//         bank: paymentDetails?.bank || null,
//         wallet: paymentDetails?.wallet || null,
//         vpa: paymentDetails?.vpa || null, // UPI ID
//         cardId: paymentDetails?.card_id || null,
//         cardNetwork: paymentDetails?.card?.network || null, // Visa, Mastercard, etc.
//         cardType: paymentDetails?.card?.type || null, // credit, debit
//         cardLast4: paymentDetails?.card?.last4 || null,
//       },
//       amount: paymentDetails?.amount ? paymentDetails.amount / 100 : null,
//       currency: paymentDetails?.currency || 'INR',
//       status: paymentDetails?.status || 'captured',
//       email: paymentDetails?.email || null,
//       contact: paymentDetails?.contact || null,
//     };

//     // await order.save();

//     return res.status(200).json({
//       success: true,
//       message: 'Payment verified successfully',
//       order,
//       paymentDetails: {
//         paymentId: razorpay_payment_id,
//         orderId: razorpay_order_id,
//         method: paymentDetails?.method,
//         amount: paymentDetails?.amount ? paymentDetails.amount / 100 : null,
//         currency: paymentDetails?.currency,
//         status: paymentDetails?.status,
//         email: paymentDetails?.email,
//         contact: paymentDetails?.contact,
//         // Method-specific details
//         bank: paymentDetails?.bank,
//         wallet: paymentDetails?.wallet,
//         vpa: paymentDetails?.vpa, // UPI ID like user@paytm
//         card: paymentDetails?.card
//           ? {
//               network: paymentDetails.card.network,
//               type: paymentDetails.card.type,
//               last4: paymentDetails.card.last4,
//             }
//           : null,
//       },
//     });
//   } catch (error) {
//     console.error('Razorpay Verify Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Payment verification failed',
//       error: error.message,
//     });
//   }
// };
