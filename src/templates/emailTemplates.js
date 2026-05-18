/**
 * All email templates for different notification types
 * Each template returns { subject, html, text }
 */

const IMAGEBASEURL = `https://gavran-api.demohub.tech/api/v1/uploads`;



export const emailTemplates = {
  // ==================== USER TEMPLATES ====================

  user: {
    partnerRegistrationSuccess: (data) => ({
      subject: `🎉 Welcome to Gavran - Registration Successful`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4CAF50; color: white; padding: 20px; text-align: center;">
              <h1>🎉 Registration Successful!</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <p>Dear <strong>${data.partnerName}</strong>,</p>
              <p>Thank you for registering as a <strong>${data.roleName}</strong> with Gavran!</p>
              
              <div style="background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #FF9800;">
                <h3 style="color: #FF9800; margin-top: 0;">⏳ Verification Pending</h3>
                <p>Your account and documents are currently under review by our team.</p>
                <p><strong>What happens next?</strong></p>
                <ul>
                  <li>Our team will verify your documents within 24-48 hours</li>
                  <li>Once verified, you'll receive a confirmation email</li>
                  <li>After approval, you can login and start using your account</li>
                </ul>
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3>Your Registration Details</h3>
                <p><strong>Role:</strong> ${data.roleName}</p>
                <p><strong>Full Name:</strong> ${data.partnerName}</p>
                <p><strong>Email:</strong> ${data.partnerEmail}</p>
                <p><strong>Mobile:</strong> ${data.partnerMobile}</p>
                <p><strong>Registration Date:</strong> ${data.registrationDate}</p>
              </div>

              <p>If you have any questions, feel free to contact our support team.</p>
              <p><strong>Support:</strong> support@gavran.com</p>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Registration Successful!

        Dear ${data.partnerName},

        Thank you for registering as a ${data.roleName} with Gavran!

        Your account is under review. We'll verify your documents within 24-48 hours.
        Once approved, you'll receive a confirmation email and can login to your account.

        Registration Details:
        - Role: ${data.roleName}
        - Name: ${data.partnerName}
        - Email: ${data.partnerEmail}
        - Mobile: ${data.partnerMobile}
        - Date: ${data.registrationDate}

        Support: support@gavran.com
      `,
    }),

    // ✅ Account Deactivated
    accountDeactivated: (data) => ({
      subject: '⚠️ Account Deactivated - Action Required',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #F44336; color: white; padding: 20px; text-align: center;">
              <h1>⚠️ Account Deactivated</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <p>Dear <strong>${data.userName}</strong>,</p>
              
              <div style="background: #ffebee; border-left: 4px solid #F44336; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Your account has been temporarily deactivated by our admin team.</strong></p>
              </div>

              <p>This may be due to one of the following reasons:</p>
              <ul>
                <li>Violation of terms and conditions</li>
                <li>Suspicious activity detected</li>
                <li>Pending verification or documentation</li>
                <li>Administrative review required</li>
              </ul>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3>What You Need to Do:</h3>
                <p>Please contact our support team immediately to resolve this issue and reactivate your account.</p>
                <p><strong>Support Email:</strong> support@gavran.com</p>
                <p><strong>Support Phone:</strong> +91 1800-XXX-XXXX</p>
              </div>

              <p>We apologize for any inconvenience caused.</p>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Account Deactivated

        Dear ${data.userName},

        Your account has been temporarily deactivated by our admin team.

        Please contact our support team to resolve this issue:
        Email: support@gavran.com
        Phone: +91 1800-XXX-XXXX

        We apologize for any inconvenience.
      `,
    }),
    // ✅ Account Reactivated
    accountReactivated: (data) => ({
      subject: '✅ Account Reactivated - Welcome Back!',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4CAF50; color: white; padding: 20px; text-align: center;">
              <h1>✅ Account Reactivated!</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <p>Dear <strong>${data.userName}</strong>,</p>
              
              <div style="background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px;"><strong>🎉 Great News! Your account has been reactivated.</strong></p>
              </div>

              <p>Your account is now fully active and you can resume using all features and services.</p>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3>You Can Now:</h3>
                <ul>
                  <li>Login to your account</li>
                  <li>Browse and place orders</li>
                  <li>Access all your previous data</li>
                  <li>Enjoy all premium features</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="#" 
                   style="display: inline-block; padding: 14px 28px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   Login to Your Account
                </a>
              </div>

              <div style="background: #e3f2fd; padding: 15px; border-radius: 5px;">
                <p style="margin: 0;"><strong>Questions?</strong></p>
                <p style="margin: 5px 0 0 0;">Contact us at support@gavran.com or call +91 1800-XXX-XXXX</p>
              </div>

              <p style="margin-top: 20px;">Thank you for being a valued member of Gavran!</p>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Account Reactivated!

        Dear ${data.userName},

        Great news! Your account has been reactivated.

        You can now:
        - Login to your account
        - Browse and place orders
        - Access all your data
        - Use all features

        Login here: ${data.loginUrl}

        Thank you for being with Gavran!

        Questions? Contact support@gavran.com
      `,
    }),

    // ✅ Documents Approved
    documentsApproved: (data) => ({
      subject: '✅ Account Verified - Welcome to Gavran!',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4CAF50; color: white; padding: 20px; text-align: center;">
              <h1>✅ Account Verified!</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <p>Dear <strong>${data.userName}</strong>,</p>
              
              <div style="background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px;"><strong>🎉 Great News! Your documents have been verified and approved.</strong></p>
              </div>

              <p>Your <strong>${data.roleName}</strong> account is now fully activated and ready to use!</p>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3>What's Next?</h3>
                <ul>
                  <li>Login to your account using your registered credentials</li>
                  <li>Complete your profile setup</li>
                  <li>Start browsing and placing orders</li>
                  <li>Explore exclusive partner benefits</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="#" 
                   style="display: inline-block; padding: 14px 28px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   Login to Your Account
                </a>
              </div>

              <div style="background: #e3f2fd; padding: 15px; border-radius: 5px;">
                <p style="margin: 0;"><strong>Need Help?</strong></p>
                <p style="margin: 5px 0 0 0;">Contact us at support@gavran.com or call +91 1800-XXX-XXXX</p>
              </div>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Account Verified!

        Dear ${data.userName},

        Great news! Your documents have been verified and approved.

        Your ${data.roleName} account is now fully activated.

        What's Next:
        - Login to your account
        - Complete your profile
        - Start placing orders

        Login here: ${data.loginUrl}

        Need help? Contact support@gavran.com
      `,
    }),

    // ✅ Documents Rejected
    documentsRejected: (data) => ({
      subject: '❌ Document Verification Failed',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #F44336; color: white; padding: 20px; text-align: center;">
              <h1>❌ Document Verification Failed</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <p>Dear <strong>${data.userName}</strong>,</p>
              
              <div style="background: #ffebee; border-left: 4px solid #F44336; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>We're sorry, but your documents could not be verified.</strong></p>
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3>Possible Reasons:</h3>
                <ul>
                  <li>Documents are unclear or illegible</li>
                  <li>Information mismatch between documents</li>
                  <li>Expired or invalid documents</li>
                  <li>Missing required documents</li>
                  <li>Documents don't meet quality standards</li>
                </ul>
              </div>

              <div style="background: #fff3cd; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0;">
                <h3 style="margin-top: 0;">📝 What You Need to Do:</h3>
                <p><strong>Please re-upload your documents with the following in mind:</strong></p>
                <ul>
                  <li>Ensure all documents are clear and readable</li>
                  <li>Upload valid and non-expired documents</li>
                  <li>Make sure information matches across all documents</li>
                  <li>Use high-quality scans or photos</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="#" 
                   style="display: inline-block; padding: 14px 28px; background: #FF9800; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   Re-upload Documents
                </a>
              </div>

              <div style="background: #e3f2fd; padding: 15px; border-radius: 5px;">
                <p style="margin: 0;"><strong>Need Assistance?</strong></p>
                <p style="margin: 5px 0 0 0;">Our support team is here to help you.</p>
                <p style="margin: 5px 0 0 0;"><strong>Email:</strong> support@gavran.com | <strong>Phone:</strong> +91 1800-XXX-XXXX</p>
              </div>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Document Verification Failed

        Dear ${data.userName},

        We're sorry, but your documents could not be verified.

        Possible Reasons:
        - Documents are unclear
        - Information mismatch
        - Expired documents
        - Missing required documents

        What to Do:
        Please re-upload your documents ensuring they are clear, valid, and match the required criteria.

        Re-upload here: ${data.reuploadUrl}

        Need help? Contact support@gavran.com or call +91 1800-XXX-XXXX
      `,
    }),

    // ✅ Normal Order Placed (User)
    // normalOrderPlaced: (data) => ({
    //   subject: `🛒 Order Placed Successfully - #${data.orderId}`,
    //   html: `
    //     <!DOCTYPE html>
    //     <html>
    //     <head>
    //       <style>
    //         body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    //         .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    //         .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
    //         .content { padding: 20px; background: #f9f9f9; }
    //         .order-box { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; border: 1px solid #ddd; }
    //         .product-item { padding: 10px 0; border-bottom: 1px solid #eee; }
    //         .product-item:last-child { border-bottom: none; }
    //         .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
    //         .total-row { font-weight: bold; font-size: 18px; padding-top: 10px; border-top: 2px solid #4CAF50; margin-top: 10px; }
    //         .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    //         .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    //       </style>
    //     </head>
    //     <body>
    //       <div class="container">
    //         <div class="header">
    //           <h1>🎉 Order Placed Successfully!</h1>
    //         </div>
    //         <div class="content">
    //           <p>Hi <strong>${data.userName}</strong>,</p>
    //           <p>Thank you for your order! We've received it and will start processing shortly.</p>

    //           <div class="order-box">
    //             <h3 style="margin-top: 0; color: #4CAF50;">Order Details</h3>
    //             <p><strong>Order ID:</strong> ${data.orderId}</p>
    //             <p><strong>Order Date:</strong> ${data.orderDate}</p>
    //             <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
    //             <p><strong>Payment Status:</strong> ${data.paymentStatus}</p>
    //           </div>

    //           <div class="order-box">
    //             <h3 style="margin-top: 0;">📦 Items Ordered (${data.productCount} items)</h3>
    //             ${data.products
    //               .map(
    //                 (product) => `
    //               <div class="product-item">
    //                 <div style="display: flex; align-items: center;">
    //                   ${product.image ? `<img src="${IMAGEBASEURL}/${product.image}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px; margin-right: 15px;" />` : ''}
    //                   <div style="flex: 1;">
    //                     <strong>${product.name}</strong><br>
    //                     <span style="color: #666;">Quantity: ${product.quantity} × ${product.orderQuantity}</span>
    //                   </div>
    //                   <div style="text-align: right;">
    //                     <strong>₹${(product.price * product.orderQuantity).toFixed(2)}</strong>
    //                     ${product.originalPrice > product.price ? `<br><span style="color: #999; text-decoration: line-through; font-size: 12px;">₹${(product.originalPrice * product.orderQuantity).toFixed(2)}</span>` : ''}
    //                   </div>
    //                 </div>
    //               </div>
    //             `,
    //               )
    //               .join('')}
    //           </div>

    //           <div class="order-box">
    //             <h3 style="margin-top: 0;">💰 Bill Summary</h3>
    //             <div class="summary-row">
    //               <span>Item Total:</span>
    //               <span>₹${data.billSummary.itemTotal.toFixed(2)}</span>
    //             </div>
    //             ${
    //               data.billSummary.originalItemTotal >
    //               data.billSummary.itemTotal
    //                 ? `
    //               <div class="summary-row" style="color: #999; font-size: 14px;">
    //                 <span>Original Price:</span>
    //                 <span style="text-decoration: line-through;">₹${data.billSummary.originalItemTotal.toFixed(2)}</span>
    //               </div>
    //             `
    //                 : ''
    //             }
    //             <div class="summary-row">
    //               <span>Delivery Fee:</span>
    //               <span>₹${data.billSummary.deliveryFee.toFixed(2)}</span>
    //             </div>
    //             <div class="summary-row">
    //               <span>Handling Fee:</span>
    //               <span>₹${data.billSummary.handlingFee.toFixed(2)}</span>
    //             </div>
    //             ${
    //               data.billSummary.discount > 0
    //                 ? `
    //               <div class="summary-row" style="color: #4CAF50;">
    //                 <span>Discount ${data.couponCode ? `(${data.couponCode})` : ''}:</span>
    //                 <span>- ₹${data.billSummary.discount.toFixed(2)}</span>
    //               </div>
    //             `
    //                 : ''
    //             }
    //             <div class="summary-row total-row" style="color: #4CAF50;">
    //               <span>Total Amount:</span>
    //               <span>₹${data.billSummary.totalAmount.toFixed(2)}</span>
    //             </div>
    //           </div>

    //           <div class="order-box">
    //             <h3 style="margin-top: 0;">📍 Delivery Address</h3>
    //             <p style="margin: 0;">
    //               <strong>${data.deliveryAddress.label || 'Address'}</strong><br>
    //               ${data.deliveryAddress.receiverDetails ? `${data.deliveryAddress.receiverDetails}<br>` : ''}
    //               ${data.deliveryAddress.fullAddress}
    //             </p>
    //           </div>

    //           <div style="text-align: center; margin: 30px 0;">
    //             <a href="${data.trackOrderUrl}" class="button">Track Your Order</a>
    //           </div>

    //           <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin-top: 20px;">
    //             <p style="margin: 0; font-size: 14px;">
    //               <strong>📞 Need Help?</strong><br>
    //               Contact us at support@gavran.com or call +91 1800-XXX-XXXX
    //             </p>
    //           </div>
    //         </div>
    //         <div class="footer">
    //           <p>Thank you for shopping with Gavran!</p>
    //           <p>&copy; 2025 Gavran. All rights reserved.</p>
    //         </div>
    //       </div>
    //     </body>
    //     </html>
    //   `,
    //   text: `
    //     Order Placed Successfully!

    //     Hi ${data.userName},

    //     Thank you for your order!

    //     Order Details:
    //     - Order ID: ${data.orderId}
    //     - Order Date: ${data.orderDate}
    //     - Payment Method: ${data.paymentMethod}
    //     - Total Amount: ₹${data.billSummary.totalAmount.toFixed(2)}

    //     Items: ${data.productCount} products

    //     Track your order: ${data.trackOrderUrl}

    //     Need help? Contact support@gavran.com
    //   `,
    // }),
    normalOrderPlaced: (data) => ({
      subject: `🛒 Order Placed Successfully - #${data.orderId}`,
      html: `
  <!DOCTYPE html>
  <html>
  <body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">

      <!-- HEADER -->
      <div style="background: #4CAF50; color: white; padding: 25px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🎉 Order Placed Successfully!</h1>
        <p style="margin: 5px 0 0; font-size: 14px;">Thank you for choosing Gavran</p>
      </div>

      <!-- CONTENT -->
      <div style="padding: 20px;">

        <p style="font-size: 15px;">Hi <strong>${data.userName}</strong>,<br>
        Thank you for your order! Here are your order details:</p>

        <!-- ORDER BOX -->
        <div style="background: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; border-radius: 5px; margin-bottom: 20px;">
          <p><strong>Order ID:</strong> ${data.orderId}</p>
          <p><strong>Order Date:</strong> ${data.orderDate}</p>
          <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
          <p><strong>Payment Status:</strong> ${data.paymentStatus}</p>
        </div>

        <!-- PRODUCTS -->
        <h3 style="margin-top: 0;">📦 Items Ordered (${data.productCount} items)</h3>
        <div style="background: white; border-radius: 5px; border: 1px solid #ddd; padding: 15px; margin-bottom: 20px;">
          ${data.products
            .map(
              (p) => `
            <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee;">
              
              ${p.image ? `<img src="${IMAGEBASEURL}/${p.image}" style="width:60px;height:60px;border-radius:5px;margin-right:15px;object-fit:cover;">` : ''}

              <div style="flex:1;">
                <strong>${p.name}</strong><br>
                <span style="color: #666; font-size: 14px;">${p.quantity} × ${p.orderQuantity}</span>
              </div>

              <div style="text-align:right;">
                <strong>₹${(p.price * p.orderQuantity).toFixed(2)}</strong><br>
                ${
                  p.originalPrice > p.price
                    ? `<span style="color:#999; text-decoration:line-through; font-size:12px;">₹${(p.originalPrice * p.orderQuantity).toFixed(2)}</span>`
                    : ''
                }
              </div>
            </div>
          `,
            )
            .join('')}
        </div>

        <!-- BILL SUMMARY -->
        <h3>💰 Bill Summary</h3>
        <table style="width:100%; background:white; border-radius:5px; border:1px solid #ddd;">
          <tr>
            <td style="padding:10px;">Item Total:</td>
            <td style="padding:10px; text-align:right;">₹${data.billSummary.itemTotal.toFixed(2)}</td>
          </tr>
          ${
            data.billSummary.originalItemTotal > data.billSummary.itemTotal
              ? `
            <tr>
              <td style="padding:10px; color:#999;">Original Price:</td>
              <td style="padding:10px; text-align:right; color:#999; text-decoration:line-through;">₹${data.billSummary.originalItemTotal.toFixed(2)}</td>
            </tr>
          `
              : ''
          }
          <tr>
            <td style="padding:10px;">Delivery Fee:</td>
            <td style="padding:10px; text-align:right;">₹${data.billSummary.deliveryFee.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:10px;">Handling Fee:</td>
            <td style="padding:10px; text-align:right;">₹${data.billSummary.handlingFee.toFixed(2)}</td>
          </tr>
          ${
            data.billSummary.discount > 0
              ? `
            <tr>
              <td style="padding:10px; color:#4CAF50;">Discount:</td>
              <td style="padding:10px; text-align:right; color:#4CAF50;">- ₹${data.billSummary.discount.toFixed(2)}</td>
            </tr>
          `
              : ''
          }
          <tr style="background:#e8f5e9; font-weight:bold; font-size:16px;">
            <td style="padding:12px;">Total Amount:</td>
            <td style="padding:12px; text-align:right; color:#4CAF50;">₹${data.billSummary.totalAmount.toFixed(2)}</td>
          </tr>
        </table>

        <!-- DELIVERY ADDRESS -->
        <h3 style="margin-top:20px;">📍 Delivery Address</h3>
        <div style="background:white; padding:15px; border-radius:5px; border:1px solid #ddd;">
          <strong>${data.deliveryAddress.label}</strong><br>
          ${data.deliveryAddress.receiverDetails ? `${data.deliveryAddress.receiverDetails}<br>` : ''}
          ${data.deliveryAddress.fullAddress}
        </div>

        <!-- TRACK ORDER BUTTON -->
        <!-- <div style="text-align:center; margin:30px 0;">
          <a href="${data.trackOrderUrl}" 
             style="display:inline-block; padding:12px 30px; background:#4CAF50; color:white; font-weight:bold; text-decoration:none; border-radius:5px;">
             Track Your Order
          </a>
        </div> -->

        <!-- SUPPORT BOX -->
        <div style="background:#e3f2fd; padding:15px; border-radius:5px;">
          <p style="margin:0; color:#1976d2; font-size:14px;">
            <strong>📞 Need Help?</strong><br>
            Contact us at support@gavran.com or call +91 1800-XXX-XXXX
          </p>
        </div>

      </div>

      <!-- FOOTER -->
      <div style="background:#fafafa; padding:15px; text-align:center; color:#777; font-size:12px;">
        © 2025 Gavran. All rights reserved.
      </div>

    </div>
  </body>
  </html>
  `,
    }),
    // ✅ Order Cancelled by User (Confirmation)
    orderCancelledByUser: (data) => ({
      subject: `Order Cancelled - #${data.orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #F44336; color: white; padding: 20px; text-align: center;">
              <h1>❌ Order Cancelled</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <p>Hi <strong>${data.userName}</strong>,</p>
              
              <div style="background: #ffebee; border-left: 4px solid #F44336; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Your order has been successfully cancelled.</strong></p>
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">Cancellation Details</h3>
                <p><strong>Order ID:</strong> ${data.orderId}</p>
                <p><strong>Order Date:</strong> ${data.orderDate}</p>
                <p><strong>Cancelled On:</strong> ${data.cancelledDate}</p>
                <p><strong>Reason:</strong> ${data.reason}</p>
                ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">💰 Refund Information</h3>
                <p><strong>Order Amount:</strong> ₹${data.totalAmount.toFixed(2)}</p>
                ${
                  data.paymentMethod !== 'Credit' &&
                  data.paymentStatus === 'Paid'
                    ? `
                  <div style="background: #e8f5e9; padding: 10px; border-radius: 5px; margin-top: 10px;">
                    <p style="margin: 0;"><strong>✅ Refund Status:</strong> Your refund of ₹${data.totalAmount.toFixed(2)} will be processed within 5-7 business days to your original payment method.</p>
                  </div>
                `
                    : `
                  <p style="color: #666;">Since payment was not completed, no refund is applicable.</p>
                `
                }
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">📦 Cancelled Items (${data.productCount} items)</h3>
                ${data.products
                  .slice(0, 3)
                  .map(
                    (product) => `
                  <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                    <strong>${product.name}</strong><br>
                    <span style="color: #666; font-size: 14px;">Quantity: ${product.quantity} × ${product.orderQuantity}</span>
                  </div>
                `,
                  )
                  .join('')}
                ${data.products.length > 3 ? `<p style="color: #666; font-size: 14px;">...and ${data.products.length - 3} more items</p>` : ''}
              </div>

              <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <p style="margin: 0;"><strong>📞 Need Help?</strong></p>
                <p style="margin: 5px 0 0 0;">If you have any questions about this cancellation, contact us at support@gavran.com or call +91 1800-XXX-XXXX</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.browseProductsUrl}" 
                   style="display: inline-block; padding: 14px 28px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   Continue Shopping
                </a>
              </div>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Thank you for shopping with Gavran!</p>
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Order Cancelled

        Hi ${data.userName},

        Your order has been successfully cancelled.

        Order ID: ${data.orderId}
        Cancelled On: ${data.cancelledDate}
        Reason: ${data.reason}
        Order Amount: ₹${data.totalAmount.toFixed(2)}

        ${
          data.paymentMethod !== 'Credit' && data.paymentStatus === 'Paid'
            ? `Refund of ₹${data.totalAmount.toFixed(2)} will be processed within 5-7 business days.`
            : 'No refund applicable as payment was not completed.'
        }

        Need help? Contact support@gavran.com

        Continue shopping: ${data.browseProductsUrl}
      `,
    }),
    // ✅ Bulk Order Placed (User - Pending Admin Review)
    bulkOrderPlaced: (data) => ({
      subject: `📦 Bulk Order Request Received - #${data.orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #FF9800; color: white; padding: 20px; text-align: center;">
              <h1>📦 Bulk Order Request Received</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <p>Hi <strong>${data.userName}</strong>,</p>
              
              <div style="background: #fff3cd; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>⏳ Your bulk order request has been received!</strong></p>
                <p style="margin: 10px 0 0 0;">Our team is reviewing your request and will add the products shortly.</p>
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">Order Information</h3>
                <p><strong>Order ID:</strong> ${data.orderId}</p>
                <p><strong>Order Date:</strong> ${data.orderDate}</p>
                <p><strong>Order Type:</strong> Bulk Order</p>
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">📝 Your Request Details</h3>
                <p><strong>Special Instructions:</strong></p>
                <p style="background: #f9f9f9; padding: 10px; border-radius: 5px; color: #666;">${data.specialInstructions}</p>
              </div>

              ${
                data.attachedImages && data.attachedImages.length > 0
                  ? `
                <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <h3 style="margin-top: 0;">📷 Attached Images (${data.attachedImages.length})</h3>
                  <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${data.attachedImages
                      .slice(0, 4)
                      .map(
                        (img) => `
                      <img src="${IMAGEBASEURL}/${img.uri}" alt="Order image" style="width: 120px; height: 120px; object-fit: cover; border-radius: 5px; border: 1px solid #ddd;" />
                    `,
                      )
                      .join('')}
                  </div>
                  ${data.attachedImages.length > 4 ? `<p style="color: #666; font-size: 14px; margin-top: 10px;">...and ${data.attachedImages.length - 4} more images</p>` : ''}
                </div>
              `
                  : ''
              }

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">📍 Delivery Address</h3>
                <p style="margin: 0;">
                  <strong>${data.deliveryAddress.label || 'Address'}</strong><br>
                  ${data.deliveryAddress.receiverDetails ? `${data.deliveryAddress.receiverDetails}<br>` : ''}
                  ${data.deliveryAddress.fullAddress}
                </p>
              </div>

              <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <h3 style="margin-top: 0; color: #1976d2;">What Happens Next?</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Our admin team will review your images and instructions</li>
                  <li>Products will be added to your order based on your requirements</li>
                  <li>You'll receive an email with the final product list and pricing</li>
                  <li>Once confirmed, your order will be processed for delivery</li>
                </ul>
              </div>

             <!-- <div style="text-align: center; margin: 30px 0;">
                <a href="${data.trackOrderUrl}" 
                   style="display: inline-block; padding: 14px 28px; background: #FF9800; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   Track Your Order
                </a>
              </div> -->

              <div style="background: #fff3cd; padding: 15px; border-radius: 5px;">
                <p style="margin: 0; font-size: 14px;">
                  <strong>💡 Note:</strong> The final price and product details will be updated once our team processes your bulk order request.
                </p>
              </div>

              <p style="margin-top: 20px; font-size: 14px; color: #666;">
                <strong>Need help?</strong> Contact us at support@gavran.com or call +91 1800-XXX-XXXX
              </p>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Thank you for choosing Gavran!</p>
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Bulk Order Request Received

        Hi ${data.userName},

        Your bulk order request has been received!

        Order ID: ${data.orderId}
        Order Date: ${data.orderDate}
        Order Type: Bulk Order

        Special Instructions: ${data.specialInstructions}

        What Happens Next:
        - Admin team will review your request
        - Products will be added based on your requirements
        - You'll receive an email with final pricing
        - Order will be processed for delivery

        
        Note: Final price and products will be updated after admin review.
        
        Need help? Contact support@gavran.com
        `,
      }),
      // Track your order: ${data.trackOrderUrl}

    // ✅ Bulk Order Confirmed (User - Admin Added Products)
    // bulkOrderConfirmed: (data) => ({
    //   subject: `✅ Bulk Order Confirmed with Products - #${data.orderId}`,
    //   html: `
    //     <!DOCTYPE html>
    //     <html>
    //     <head>
    //       <style>
    //         body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    //         .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    //         .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
    //         .content { padding: 20px; background: #f9f9f9; }
    //         .order-box { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; border: 1px solid #ddd; }
    //         .product-item { padding: 10px 0; border-bottom: 1px solid #eee; }
    //         .product-item:last-child { border-bottom: none; }
    //         .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
    //         .total-row { font-weight: bold; font-size: 18px; padding-top: 10px; border-top: 2px solid #4CAF50; margin-top: 10px; }
    //       </style>
    //     </head>
    //     <body>
    //       <div class="container">
    //         <div class="header">
    //           <h1>✅ Bulk Order Confirmed!</h1>
    //           <p style="margin: 0; font-size: 14px;">Products Added & Ready to Process</p>
    //         </div>
    //         <div class="content">
    //           <p>Hi <strong>${data.userName}</strong>,</p>

    //           <div style="background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
    //             <p style="margin: 0; font-size: 16px;"><strong>🎉 Great News! Your bulk order has been confirmed.</strong></p>
    //             <p style="margin: 10px 0 0 0;">Our admin team has reviewed your request and added all products to your order.</p>
    //           </div>

    //           <div class="order-box">
    //             <h3 style="margin-top: 0; color: #4CAF50;">Order Details</h3>
    //             <p><strong>Order ID:</strong> ${data.orderId}</p>
    //             <p><strong>Order Date:</strong> ${data.orderDate}</p>
    //             <p><strong>Order Type:</strong> Bulk Order</p>
    //             <p><strong>Status:</strong> <span style="background: #4CAF50; color: white; padding: 4px 8px; border-radius: 3px;">Confirmed</span></p>
    //           </div>

    //           <div class="order-box">
    //             <h3 style="margin-top: 0;">📦 Products in Your Order (${data.productCount} items)</h3>
    //             ${data.products
    //               .map(
    //                 (product) => `
    //               <div class="product-item">
    //                 <div style="display: flex; align-items: center;">
    //                   ${product.image ? `<img src="${IMAGEBASEURL}/${product.image}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px; margin-right: 15px;" />` : ''}
    //                   <div style="flex: 1;">
    //                     <strong>${product.name}</strong><br>
    //                     <span style="color: #666;">Quantity: ${product.quantity} × ${product.orderQuantity}</span>
    //                   </div>
    //                   <div style="text-align: right;">
    //                     <strong>₹${(product.price * product.orderQuantity).toFixed(2)}</strong>
    //                     ${product.originalPrice > product.price ? `<br><span style="color: #999; text-decoration: line-through; font-size: 12px;">₹${(product.originalPrice * product.orderQuantity).toFixed(2)}</span>` : ''}
    //                   </div>
    //                 </div>
    //               </div>
    //             `,
    //               )
    //               .join('')}
    //           </div>

    //           <div class="order-box">
    //             <h3 style="margin-top: 0;">💰 Final Bill Summary</h3>
    //             <div class="summary-row">
    //               <span>Item Total:</span>
    //               <span>₹${data.billSummary.itemTotal.toFixed(2)}</span>
    //             </div>
    //             ${
    //               data.billSummary.originalItemTotal >
    //               data.billSummary.itemTotal
    //                 ? `
    //               <div class="summary-row" style="color: #999; font-size: 14px;">
    //                 <span>Original Price:</span>
    //                 <span style="text-decoration: line-through;">₹${data.billSummary.originalItemTotal.toFixed(2)}</span>
    //               </div>
    //               <div class="summary-row" style="color: #4CAF50;">
    //                 <span>You Saved:</span>
    //                 <span>₹${(data.billSummary.originalItemTotal - data.billSummary.itemTotal).toFixed(2)}</span>
    //               </div>
    //             `
    //                 : ''
    //             }
    //             <div class="summary-row">
    //               <span>Delivery Fee:</span>
    //               <span>₹${data.billSummary.deliveryFee.toFixed(2)}</span>
    //             </div>
    //             <div class="summary-row">
    //               <span>Handling Fee:</span>
    //               <span>₹${data.billSummary.handlingFee.toFixed(2)}</span>
    //             </div>
    //             <div class="summary-row total-row" style="color: #4CAF50;">
    //               <span>Total Amount:</span>
    //               <span>₹${data.billSummary.totalAmount.toFixed(2)}</span>
    //             </div>
    //           </div>

    //           <div class="order-box">
    //             <h3 style="margin-top: 0;">📍 Delivery Address</h3>
    //             <p style="margin: 0;">
    //               <strong>${data.deliveryAddress.label || 'Address'}</strong><br>
    //               ${data.deliveryAddress.receiverDetails ? `${data.deliveryAddress.receiverDetails}<br>` : ''}
    //               ${data.deliveryAddress.fullAddress}
    //             </p>
    //           </div>

    //           <div style="text-align: center; margin: 30px 0;">
    //             <a href="${data.trackOrderUrl}"
    //                style="display: inline-block; padding: 14px 28px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
    //                View Full Order Details
    //             </a>
    //           </div>

    //           <div style="background: #e3f2fd; padding: 15px; border-radius: 5px;">
    //             <p style="margin: 0; font-size: 14px;">
    //               <strong>📞 Questions about your order?</strong><br>
    //               Contact us at support@gavran.com or call +91 1800-XXX-XXXX
    //             </p>
    //           </div>
    //         </div>
    //         <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
    //           <p>Thank you for your bulk order!</p>
    //           <p>&copy; 2025 Gavran. All rights reserved.</p>
    //         </div>
    //       </div>
    //     </body>
    //     </html>
    //   `,
    //   text: `
    //     Bulk Order Confirmed!

    //     Hi ${data.userName},

    //     Great news! Your bulk order has been confirmed with all products added.

    //     Order ID: ${data.orderId}
    //     Status: Confirmed
    //     Total Items: ${data.productCount}
    //     Total Amount: ₹${data.billSummary.totalAmount.toFixed(2)}

    //     Products: ${data.products.map((p) => `${p.name} (${p.orderQuantity})`).join(', ')}

    //     Track order: ${data.trackOrderUrl}

    //     Questions? Contact support@gavran.com
    //   `,
    // }),
    bulkOrderConfirmed: (data) => ({
      subject: `✅ Bulk Order Confirmed with Products - #${data.orderId}`,
      html: `
  <!DOCTYPE html>
  <html>
  <body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
    
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">

      <!-- HEADER -->
      <div style="background: #4CAF50; color: white; padding: 22px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">✅ Bulk Order Confirmed!</h1>
        <p style="margin: 5px 0 0; font-size: 14px;">Products Added & Ready for Processing</p>
      </div>

      <div style="padding: 20px;">

        <!-- GREETING -->
        <p style="font-size: 15px;">Hi <strong>${data.userName}</strong>,</p>

        <!-- SUCCESS BOX -->
        <div style="background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <p style="margin:0; font-size:16px;"><strong>🎉 Great News! Your bulk order has been confirmed.</strong></p>
          <p style="margin:10px 0 0;">Our admin team has reviewed your request and added all selected products to your order.</p>
        </div>

        <!-- ORDER DETAILS -->
        <div style="background:white; border:1px solid #ddd; border-radius:5px; padding:15px; margin-bottom:20px;">
          <h3 style="margin:0 0 10px; color:#4CAF50;">Order Details</h3>
          <p style="margin:4px 0;"><strong>Order ID:</strong> ${data.orderId}</p>
          <p style="margin:4px 0;"><strong>Order Date:</strong> ${data.orderDate}</p>
          <p style="margin:4px 0;"><strong>Order Type:</strong> Bulk Order</p>
          <p style="margin:4px 0;">
            <strong>Status:</strong> 
            <span style="background:#4CAF50; color:white; padding:4px 8px; border-radius:3px;">Confirmed</span>
          </p>
        </div>

        <!-- PRODUCT LIST -->
        <div style="background:white; border-radius:5px; border:1px solid #ddd; padding:15px; margin-bottom:20px;">
          <h3 style="margin-top:0;">📦 Products in Your Order (${data.productCount} items)</h3>

          ${data.products
            .map(
              (p) => `
            <div style="display:flex; align-items:center; padding:10px 0; border-bottom:1px solid #eee;">
              
              ${
                p.image
                  ? `
                <img src="${IMAGEBASEURL}/${p.image}" 
                style="width:60px;height:60px;border-radius:5px;margin-right:15px;object-fit:cover;">
              `
                  : ''
              }

              <div style="flex:1;">
                <strong>${p.name}</strong><br>
                <span style="color:#666;font-size:14px;">Quantity: ${p.quantity} × ${p.orderQuantity}</span>
              </div>

              <div style="text-align:right;">
                <strong>₹${(p.price * p.orderQuantity).toFixed(2)}</strong><br>
                ${
                  p.originalPrice > p.price
                    ? `
                  <span style="color:#999;text-decoration:line-through;font-size:12px;">
                    ₹${(p.originalPrice * p.orderQuantity).toFixed(2)}
                  </span>
                `
                    : ''
                }
              </div>

            </div>
          `,
            )
            .join('')}

        </div>

        <!-- BILL SUMMARY -->
        <div style="background:white; border-radius:5px; border:1px solid #ddd; padding:15px;">
          <h3 style="margin-top:0;">💰 Final Bill Summary</h3>

          <div style="display:flex; justify-content:space-between; padding:6px 0;">
            <span>Item Total:</span>
            <span>₹${data.billSummary.itemTotal.toFixed(2)}</span>
          </div>

          ${
            data.billSummary.originalItemTotal > data.billSummary.itemTotal
              ? `
            <div style="display:flex; justify-content:space-between; padding:6px 0; color:#999;">
              <span>Original Price:</span>
              <span style="text-decoration:line-through;">₹${data.billSummary.originalItemTotal.toFixed(2)}</span>
            </div>

            <div style="display:flex; justify-content:space-between; padding:6px 0; color:#4CAF50;">
              <span>You Saved:</span>
              <span>₹${(data.billSummary.originalItemTotal - data.billSummary.itemTotal).toFixed(2)}</span>
            </div>
          `
              : ''
          }

          <div style="display:flex; justify-content:space-between; padding:6px 0;">
            <span>Delivery Fee:</span>
            <span>₹${data.billSummary.deliveryFee.toFixed(2)}</span>
          </div>

          <div style="display:flex; justify-content:space-between; padding:6px 0;">
            <span>Handling Fee:</span>
            <span>₹${data.billSummary.handlingFee.toFixed(2)}</span>
          </div>

          <div style="
            display:flex; justify-content:space-between; 
            padding:12px 0; margin-top:10px; font-size:17px;
            font-weight:bold; color:#4CAF50; border-top:2px solid #4CAF50;
          ">
            <span>Total Amount:</span>
            <span>₹${data.billSummary.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <!-- DELIVERY ADDRESS -->
        <h3 style="margin-top:25px;">📍 Delivery Address</h3>
        <div style="background:white; border:1px solid #ddd; border-radius:5px; padding:15px;">
          <strong>${data.deliveryAddress.label || 'Address'}</strong><br>
          ${data.deliveryAddress.receiverDetails ? `${data.deliveryAddress.receiverDetails}<br>` : ''}
          ${data.deliveryAddress.fullAddress}
        </div>

        <!-- BUTTON -->
        <!-- <div style="text-align:center; margin:30px 0;">
          <a href="${data.trackOrderUrl}"
             style="display:inline-block; padding:14px 28px; background:#4CAF50; color:white; 
             text-decoration:none; border-radius:5px; font-weight:bold;">
              View Full Order Details
          </a>
        </div> -->

        <!-- SUPPORT -->
        <div style="background:#e3f2fd; padding:15px; border-radius:5px;">
          <p style="margin:0; font-size:14px; color:#1976d2;">
            <strong>📞 Need Help?</strong><br>
            Contact us at support@gavran.com or call +91 1800-XXX-XXXX
          </p>
        </div>

      </div>

      <!-- FOOTER -->
      <div style="background:#fafafa; padding:15px; text-align:center; color:#777; font-size:12px;">
        © 2025 Gavran. All rights reserved.
      </div>

    </div>

  </body>
  </html>
  `,
      text: `
    Bulk Order Confirmed!

    Hi ${data.userName},

    Your bulk order has been successfully confirmed.

    Order ID: ${data.orderId}
    Total Items: ${data.productCount}
    Total Amount: ₹${data.billSummary.totalAmount.toFixed(2)}

    
    Need help? Contact support@gavran.com
    `,
  }),
  // View Order: ${data.trackOrderUrl}

    // ✅ Bulk Order Cancelled by User (Confirmation)
    bulkOrderCancelledByUser: (data) => ({
      subject: `Bulk Order Cancelled - #${data.orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #F44336; color: white; padding: 20px; text-align: center;">
              <h1>❌ Bulk Order Cancelled</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <p>Hi <strong>${data.userName}</strong>,</p>
              
              <div style="background: #ffebee; border-left: 4px solid #F44336; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Your bulk order has been successfully cancelled.</strong></p>
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">Cancellation Details</h3>
                <p><strong>Order ID:</strong> ${data.orderId}</p>
                <p><strong>Order Type:</strong> Bulk Order</p>
                <p><strong>Order Date:</strong> ${data.orderDate}</p>
                <p><strong>Cancelled On:</strong> ${data.cancelledDate}</p>
                <p><strong>Reason:</strong> ${data.reason}</p>
                ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
              </div>

              ${
                data.productCount > 0
                  ? `
                <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <h3 style="margin-top: 0;">💰 Refund Information</h3>
                  <p><strong>Order Amount:</strong> ₹${data.totalAmount.toFixed(2)}</p>
                  ${
                    data.paymentStatus === 'Completed' ||
                    data.paymentStatus === 'Paid'
                      ? `
                    <div style="background: #e8f5e9; padding: 10px; border-radius: 5px; margin-top: 10px;">
                      <p style="margin: 0;"><strong>✅ Refund Status:</strong> Your refund of ₹${data.totalAmount.toFixed(2)} will be processed within 5-7 business days.</p>
                    </div>
                  `
                      : `
                    <p style="color: #666;">Since payment was not completed, no refund is applicable.</p>
                  `
                  }
                </div>

                <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <h3 style="margin-top: 0;">📦 Cancelled Items (${data.productCount} items)</h3>
                  ${data.products
                    .slice(0, 3)
                    .map(
                      (product) => `
                    <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                      <strong>${product.name}</strong><br>
                      <span style="color: #666; font-size: 14px;">Quantity: ${product.quantity} × ${product.orderQuantity}</span>
                    </div>
                  `,
                    )
                    .join('')}
                  ${data.products.length > 3 ? `<p style="color: #666; font-size: 14px;">...and ${data.products.length - 3} more items</p>` : ''}
                </div>
              `
                  : `
                <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <p style="margin: 0; color: #666;">This bulk order request was cancelled before products were added by admin.</p>
                </div>
              `
              }

              ${
                data.specialInstructions
                  ? `
                <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <h3 style="margin-top: 0;">📝 Original Request</h3>
                  <p style="background: #f9f9f9; padding: 10px; border-radius: 5px; color: #666; margin: 0;">${data.specialInstructions}</p>
                </div>
              `
                  : ''
              }

              <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <p style="margin: 0;"><strong>📞 Need Help?</strong></p>
                <p style="margin: 5px 0 0 0;">If you have any questions about this cancellation, contact us at support@gavran.com or call +91 1800-XXX-XXXX</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.browseProductsUrl}" 
                   style="display: inline-block; padding: 14px 28px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   Place New Bulk Order
                </a>
              </div>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Thank you for choosing Gavran!</p>
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Bulk Order Cancelled

        Hi ${data.userName},

        Your bulk order has been successfully cancelled.

        Order ID: ${data.orderId}
        Order Type: Bulk Order
        Cancelled On: ${data.cancelledDate}
        Reason: ${data.reason}

        ${
          data.productCount > 0
            ? `
        Order Amount: ₹${data.totalAmount.toFixed(2)}
        ${
          data.paymentStatus === 'Completed' || data.paymentStatus === 'Paid'
            ? `Refund of ₹${data.totalAmount.toFixed(2)} will be processed within 5-7 business days.`
            : 'No refund applicable as payment was not completed.'
        }
        `
            : 'Order was cancelled before products were added.'
        }

        Need help? Contact support@gavran.com

        Place new order: ${data.browseProductsUrl}
      `,
    }),
    // ✅ Replacement Request Submitted (User)
    replacementRequestSubmitted: (data) => ({
      subject: `🔄 Replacement Request Submitted - #${data.requestId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #2196F3; color: white; padding: 20px; text-align: center;">
              <h1>🔄 Replacement Request Submitted</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <p>Hi <strong>${data.userName}</strong>,</p>
              
              <div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>✅ Your replacement request has been submitted successfully!</strong></p>
                <p style="margin: 10px 0 0 0;">Our team will review your request within 24-48 hours.</p>
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">Request Details</h3>
                <p><strong>Request ID:</strong> ${data.requestId}</p>
                <p><strong>Original Order ID:</strong> ${data.originalOrderId}</p>
                <p><strong>Submitted On:</strong> ${data.submittedDate}</p>
                <p><strong>Status:</strong> <span style="background: #FF9800; color: white; padding: 4px 8px; border-radius: 3px;">Pending Review</span></p>
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">📦 Items for Replacement (${data.itemCount} items)</h3>
                ${data.replacementItems
                  .map(
                    (item) => `
                  <div style="padding: 15px 0; border-bottom: 1px solid #eee;">
                    <div style="display: flex; align-items: center;">
                      ${item.originalItem.image ? `<img src="${IMAGEBASEURL}/${item.originalItem.image}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px; margin-right: 15px;" />` : ''}
                      <div style="flex: 1;">
                        <strong>${item.originalItem.name}</strong><br>
                        <span style="color: #666; font-size: 14px;">
                          Quantity: ${item.originalItem.quantity}<br>
                          Replacement Qty: ${item.replacementQuantity}
                        </span>
                      </div>
                    </div>
                    <div style="margin-top: 10px; background: #f9f9f9; padding: 10px; border-radius: 5px;">
                      <strong style="color: #F44336;">Reason:</strong> 
                      <span style="text-transform: capitalize;">${item.reason.replace('_', ' ')}</span>
                      ${item.reasonDescription ? `<br><span style="color: #666; font-size: 14px;">${item.reasonDescription}</span>` : ''}
                    </div>
                    ${
                      item.images && item.images.length > 0
                        ? `
                      <div style="margin-top: 10px;">
                        <strong style="font-size: 14px;">Images Uploaded:</strong>
                        <div style="display: flex; gap: 5px; margin-top: 5px;">
                          ${item.images
                            .slice(0, 3)
                            .map(
                              (img) => `
                            <img src="${IMAGEBASEURL}/${img.uri}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 3px; border: 1px solid #ddd;" />
                          `,
                            )
                            .join('')}
                          ${item.images.length > 3 ? `<span style="color: #666; font-size: 12px;">+${item.images.length - 3} more</span>` : ''}
                        </div>
                      </div>
                    `
                        : ''
                    }
                  </div>
                `,
                  )
                  .join('')}
              </div>

              ${
                data.notes
                  ? `
                <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <h3 style="margin-top: 0;">📝 Additional Notes</h3>
                  <p style="background: #f9f9f9; padding: 10px; border-radius: 5px; color: #666; margin: 0;">${data.notes}</p>
                </div>
              `
                  : ''
              }

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">📍 Delivery Address</h3>
                <p style="margin: 0;">
                  <strong>${data.deliveryAddress.label || 'Address'}</strong><br>
                  ${data.deliveryAddress.receiverDetails ? `${data.deliveryAddress.receiverDetails}<br>` : ''}
                  ${data.deliveryAddress.fullAddress}
                </p>
              </div>

              <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <h3 style="margin-top: 0; color: #FF9800;">⏳ What Happens Next?</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Our team will review your request and uploaded images</li>
                  <li>We'll verify the replacement eligibility</li>
                  <li>You'll receive an email once approved or if we need more information</li>
                  <li>Approved replacements will be shipped within 2-3 business days</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.trackReplacementUrl}" 
                   style="display: inline-block; padding: 14px 28px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   Track Replacement Request
                </a>
              </div>

              <p style="margin-top: 20px; font-size: 14px; color: #666;">
                <strong>Need help?</strong> Contact us at support@gavran.com or call +91 1800-XXX-XXXX
              </p>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Thank you for your patience!</p>
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Replacement Request Submitted

        Hi ${data.userName},

        Your replacement request has been submitted successfully!

        Request ID: ${data.requestId}
        Original Order: ${data.originalOrderId}
        Submitted: ${data.submittedDate}
        Status: Pending Review

        Items for Replacement: ${data.itemCount} items

        What's Next:
        - Team will review within 24-48 hours
        - You'll receive email once decision is made
        - Approved replacements ship within 2-3 days

        Track request: ${data.trackReplacementUrl}

        Need help? Contact support@gavran.com
      `,
    }),

    // ✅ Replacement Request Approved (User)
    replacementRequestApproved: (data) => ({
      subject: `✅ Replacement Approved - #${data.requestId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4CAF50; color: white; padding: 20px; text-align: center;">
              <h1>✅ Replacement Request Approved!</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <p>Hi <strong>${data.userName}</strong>,</p>
              
              <div style="background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px;"><strong>🎉 Great News! Your replacement request has been approved.</strong></p>
                <p style="margin: 10px 0 0 0;">We're preparing your replacement items for shipment.</p>
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0; color: #4CAF50;">Request Information</h3>
                <p><strong>Request ID:</strong> ${data.requestId}</p>
                <p><strong>Approved On:</strong> ${data.approvedDate}</p>
                <p><strong>Status:</strong> <span style="background: #4CAF50; color: white; padding: 4px 8px; border-radius: 3px;">Approved - Preparing Shipment</span></p>
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">📦 Approved Replacement Items (${data.itemCount} items)</h3>
                ${data.replacementItems
                  .map(
                    (item) => `
                  <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                    <div style="display: flex; align-items: center;">
                      ${item.originalItem.image ? `<img src="${IMAGEBASEURL}/${item.originalItem.image}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px; margin-right: 10px;" />` : ''}
                      <div style="flex: 1;">
                        <strong>${item.originalItem.name}</strong><br>
                        <span style="color: #666; font-size: 14px;">
                          Quantity: ${item.originalItem.quantity} × ${item.replacementQuantity}
                        </span>
                      </div>
                      <span style="color: #4CAF50; font-weight: bold;">✓</span>
                    </div>
                  </div>
                `,
                  )
                  .join('')}
              </div>

              ${
                data.adminNotes
                  ? `
                <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <h3 style="margin-top: 0;">💬 Admin Notes</h3>
                  <p style="background: #f9f9f9; padding: 10px; border-radius: 5px; color: #666; margin: 0;">${data.adminNotes}</p>
                </div>
              `
                  : ''
              }

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">📍 Shipping To</h3>
                <p style="margin: 0;">
                  <strong>${data.deliveryAddress.label || 'Address'}</strong><br>
                  ${data.deliveryAddress.receiverDetails ? `${data.deliveryAddress.receiverDetails}<br>` : ''}
                  ${data.deliveryAddress.fullAddress}
                </p>
              </div>

              <div style="background: #e3f2fd; padding: 15px; border-radius: 5px;">
                <h3 style="margin-top: 0; color: #1976d2;">📦 What's Next?</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>We're preparing your replacement items for shipment</li>
                  <li>You'll receive tracking details once dispatched</li>
                  <li>Expected delivery: 3-5 business days after dispatch</li>
                  <li>You can track your replacement in real-time</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.trackReplacementUrl}" 
                   style="display: inline-block; padding: 14px 28px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   Track Your Replacement
                </a>
              </div>

              <p style="margin-top: 20px; font-size: 14px; color: #666;">
                <strong>Questions?</strong> Contact us at support@gavran.com or call +91 1800-XXX-XXXX
              </p>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Thank you for your patience!</p>
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Replacement Request Approved!

        Hi ${data.userName},

        Great news! Your replacement request has been approved.

        Request ID: ${data.requestId}
        Approved On: ${data.approvedDate}
        Status: Preparing Shipment

        Approved Items: ${data.itemCount} items

        What's Next:
        - Preparing replacement for shipment
        - You'll receive tracking details soon
        - Expected delivery: 3-5 business days

        Track replacement: ${data.trackReplacementUrl}

        Questions? Contact support@gavran.com
      `,
    }),

    // ✅ Replacement Request Rejected (User)
    replacementRequestRejected: (data) => ({
      subject: `❌ Replacement Request Update - #${data.requestId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #F44336; color: white; padding: 20px; text-align: center;">
              <h1>❌ Replacement Request ${data.wasApproved ? 'Cancelled' : 'Not Approved'}</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <p>Hi <strong>${data.userName}</strong>,</p>
              
              <div style="background: #ffebee; border-left: 4px solid #F44336; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>We're sorry, but your replacement request has been ${data.wasApproved ? 'cancelled' : 'declined'}.</strong></p>
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">Request Details</h3>
                <p><strong>Request ID:</strong> ${data.requestId}</p>
                <p><strong>Original Order:</strong> ${data.originalOrderId}</p>
                <p><strong>Decision Date:</strong> ${data.decisionDate}</p>
                <p><strong>Status:</strong> <span style="background: #F44336; color: white; padding: 4px 8px; border-radius: 3px;">${data.wasApproved ? 'Cancelled' : 'Rejected'}</span></p>
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0; color: #F44336;">❌ Reason for ${data.wasApproved ? 'Cancellation' : 'Rejection'}</h3>
                <p style="background: #f9f9f9; padding: 15px; border-radius: 5px; color: #333; margin: 0;">${data.rejectionReason}</p>
                ${
                  data.adminNotes
                    ? `
                  <div style="margin-top: 10px;">
                    <strong>Admin Notes:</strong>
                    <p style="background: #fff3cd; padding: 10px; border-radius: 5px; color: #666; margin: 5px 0 0 0;">${data.adminNotes}</p>
                  </div>
                `
                    : ''
                }
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">📋 Replacement Policy</h3>
                <p style="color: #666; margin: 0; line-height: 1.6;">
                  ${data.policy || 'Replacements are only available for defective, damaged, or incorrect items. Please ensure your request meets these criteria.'}
                </p>
              </div>

              <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <h3 style="margin-top: 0; color: #1976d2;">💡 What You Can Do</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Review our replacement policy carefully</li>
                  <li>If you believe this is a mistake, contact our support team</li>
                  <li>Provide additional evidence if available</li>
                  <li>We're here to help resolve any genuine issues</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.supportUrl}" 
                   style="display: inline-block; padding: 14px 28px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">
                   Contact Support
                </a>
                <a href="${data.viewPolicyUrl}" 
                   style="display: inline-block; padding: 14px 28px; background: #666; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   View Policy
                </a>
              </div>

              <p style="margin-top: 20px; font-size: 14px; color: #666;">
                <strong>Need clarification?</strong> Contact us at support@gavran.com or call +91 1800-XXX-XXXX
              </p>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>We appreciate your understanding.</p>
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Replacement Request ${data.wasApproved ? 'Cancelled' : 'Not Approved'}

        Hi ${data.userName},

        Your replacement request has been ${data.wasApproved ? 'cancelled' : 'declined'}.

        Request ID: ${data.requestId}
        Decision Date: ${data.decisionDate}

        Reason: ${data.rejectionReason}

        ${data.adminNotes ? `Admin Notes: ${data.adminNotes}` : ''}

        What You Can Do:
        - Review our replacement policy
        - Contact support if you believe this is a mistake
        - Provide additional evidence if available

        Contact: support@gavran.com | +91 1800-XXX-XXXX
      `,
    }),
    // ✅ Spot Order Created (Driver Confirmation)
    // spotOrderCreated: (data) => ({
    //   subject: `✅ Spot Order Delivered - #${data.orderId}`,
    //   html: `
    //     <!DOCTYPE html>
    //     <html>
    //     <head>
    //       <style>
    //         body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    //         .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    //         .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
    //         .content { padding: 20px; background: #f9f9f9; }
    //         .order-box { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; border: 1px solid #ddd; }
    //         .product-item { padding: 10px 0; border-bottom: 1px solid #eee; }
    //         .product-item:last-child { border-bottom: none; }
    //         .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
    //         .total-row { font-weight: bold; font-size: 18px; padding-top: 10px; border-top: 2px solid #4CAF50; margin-top: 10px; }
    //       </style>
    //     </head>
    //     <body>
    //       <div class="container">
    //         <div class="header">
    //           <h1>✅ Spot Order Delivered!</h1>
    //           <p style="margin: 0; font-size: 14px;">Order Completed Successfully</p>
    //         </div>
    //         <div class="content">
    //           <p>Hi <strong>${data.driverName}</strong>,</p>

    //           <div style="background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
    //             <p style="margin: 0; font-size: 16px;"><strong>🎉 Your spot order has been recorded successfully!</strong></p>
    //             <p style="margin: 10px 0 0 0;">Order delivered and payment collected.</p>
    //           </div>

    //           <div class="order-box">
    //             <h3 style="margin-top: 0; color: #4CAF50;">Order Details</h3>
    //             <p><strong>Order ID:</strong> ${data.orderId}</p>
    //             <p><strong>Order Type:</strong> <span style="background: #FF9800; color: white; padding: 4px 8px; border-radius: 3px;">Spot Order</span></p>
    //             <p><strong>Delivered On:</strong> ${data.deliveredAt}</p>
    //             <p><strong>Vehicle:</strong> ${data.vehicleName || data.vehicleId}</p>
    //             <p><strong>Payment Status:</strong> <span style="background: #4CAF50; color: white; padding: 4px 8px; border-radius: 3px;">${data.paymentStatus}</span></p>
    //           </div>

    //           <div class="order-box">
    //             <h3 style="margin-top: 0;">👤 Customer Information</h3>
    //             <p><strong>Name:</strong> ${data.customerName}</p>
    //             <p><strong>Phone:</strong> ${data.customerPhone}</p>
    //             <p><strong>Type:</strong> ${data.customerType}</p>
    //             ${data.customerIsNew ? '<p><span style="background: #2196F3; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px;">New Customer</span></p>' : ''}
    //             <p><strong>Address:</strong> ${data.customerAddress}</p>
    //           </div>

    //           <div class="order-box">
    //             <h3 style="margin-top: 0;">📦 Products Delivered (${data.productCount} items)</h3>
    //             ${data.products
    //               .map(
    //                 (product) => `
    //               <div class="product-item">
    //                 <div style="display: flex; align-items: center;">
    //                   ${product.image ? `<img src="${IMAGEBASEURL}/${product.image}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px; margin-right: 15px;" />` : ''}
    //                   <div style="flex: 1;">
    //                     <strong>${product.name}</strong><br>
    //                     <span style="color: #666; font-size: 14px;">Quantity: ${product.quantity} × ${product.orderQuantity}</span>
    //                   </div>
    //                   <div style="text-align: right;">
    //                     <strong>₹${(product.price * product.orderQuantity).toFixed(2)}</strong>
    //                   </div>
    //                 </div>
    //               </div>
    //             `,
    //               )
    //               .join('')}
    //           </div>

    //           <div class="order-box">
    //             <h3 style="margin-top: 0;">💰 Payment Summary</h3>
    //             <div class="summary-row">
    //               <span>Payment Method:</span>
    //               <span><strong>${data.paymentMethod}</strong></span>
    //             </div>
    //             ${
    //               data.transactionId
    //                 ? `
    //               <div class="summary-row">
    //                 <span>Transaction ID:</span>
    //                 <span style="font-family: monospace; font-size: 12px;">${data.transactionId}</span>
    //               </div>
    //             `
    //                 : ''
    //             }
    //             ${
    //               data.chequeNumber
    //                 ? `
    //               <div class="summary-row">
    //                 <span>Cheque Number:</span>
    //                 <span style="font-family: monospace; font-size: 12px;">${data.chequeNumber}</span>
    //               </div>
    //             `
    //                 : ''
    //             }
    //             <div class="summary-row total-row" style="color: #4CAF50;">
    //               <span>Total Amount:</span>
    //               <span>₹${data.totalAmount.toFixed(2)}</span>
    //             </div>
    //             <div style="background: #e8f5e9; padding: 10px; border-radius: 5px; margin-top: 10px;">
    //               <p style="margin: 0; color: #2E7D32;"><strong>✓ Payment Received:</strong> ₹${data.totalAmount.toFixed(2)}</p>
    //             </div>
    //           </div>

    //           ${
    //             data.orderLocation &&
    //             (data.orderLocation.latitude || data.orderLocation.coordinates)
    //               ? `
    //             <div class="order-box">
    //               <h3 style="margin-top: 0;">📍 Order Location</h3>
    //               <p style="margin: 0; color: #666;">
    //                 ${data.orderLocation.address || 'Location recorded'}
    //                 ${data.orderLocation.latitude ? `<br><span style="font-size: 12px;">Lat: ${data.orderLocation.latitude}, Long: ${data.orderLocation.longitude}</span>` : ''}
    //               </p>
    //             </div>
    //           `
    //               : ''
    //           }

    //           ${
    //             data.orderNotes
    //               ? `
    //             <div class="order-box">
    //               <h3 style="margin-top: 0;">📝 Order Notes</h3>
    //               <p style="background: #f9f9f9; padding: 10px; border-radius: 5px; color: #666; margin: 0;">${data.orderNotes}</p>
    //             </div>
    //           `
    //               : ''
    //           }

    //           <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin-top: 20px;">
    //             <p style="margin: 0; font-size: 14px;">
    //               <strong>📊 Inventory Updated:</strong> Your van stock has been updated automatically. The sold items have been deducted from your inventory.
    //             </p>
    //           </div>

    //           <div style="text-align: center; margin: 30px 0;">
    //             <a href="${data.viewOrderUrl}"
    //                style="display: inline-block; padding: 14px 28px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
    //                View Order Details
    //             </a>
    //           </div>

    //           <p style="margin-top: 20px; font-size: 14px; color: #666;">
    //             Great job! Keep up the excellent work.
    //           </p>
    //         </div>
    //         <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
    //           <p>Gavran Driver App</p>
    //           <p>&copy; 2025 Gavran. All rights reserved.</p>
    //         </div>
    //       </div>
    //     </body>
    //     </html>
    //   `,
    //   text: `
    //     Spot Order Delivered!

    //     Hi ${data.driverName},

    //     Your spot order has been recorded successfully!

    //     Order ID: ${data.orderId}
    //     Delivered: ${data.deliveredAt}
    //     Vehicle: ${data.vehicleName || data.vehicleId}

    //     Customer: ${data.customerName}
    //     Phone: ${data.customerPhone}
    //     Type: ${data.customerType}

    //     Products: ${data.productCount} items
    //     Total Amount: ₹${data.totalAmount.toFixed(2)}
    //     Payment: ${data.paymentMethod} - ${data.paymentStatus}

    //     Inventory has been updated automatically.

    //     View order: ${data.viewOrderUrl}

    //     Great job!
    //   `,
    // }),
    spotOrderCreated: (data) => ({
      subject: `✅ Spot Order Delivered - #${data.orderId}`,
      html: `
  <!DOCTYPE html>
  <html>
  <body style="font-family: Arial, sans-serif; background:#f5f5f5; padding:20px;">

    <div style="max-width:600px; margin:0 auto; background:white; border-radius:8px; overflow:hidden;">

      <!-- HEADER -->
      <div style="background:#4CAF50; color:white; padding:22px; text-align:center;">
        <h1 style="margin:0; font-size:24px;">✅ Spot Order Delivered!</h1>
        <p style="margin:5px 0 0; font-size:14px;">Order Completed Successfully</p>
      </div>

      <div style="padding:20px;">

        <!-- GREETING -->
        <p style="font-size:15px;">Hi <strong>${data.driverName}</strong>,</p>

        <!-- SUCCESS BOX -->
        <div style="background:#e8f5e9; border-left:4px solid #4CAF50; padding:15px; border-radius:5px; margin-bottom:20px;">
          <p style="margin:0; font-size:16px;"><strong>🎉 Your spot order has been recorded successfully!</strong></p>
          <p style="margin:10px 0 0;">Order delivered and payment collected.</p>
        </div>

        <!-- ORDER DETAILS -->
        <div style="background:white; border:1px solid #ddd; border-radius:5px; padding:15px; margin-bottom:20px;">
          <h3 style="margin:0 0 10px; color:#4CAF50;">Order Details</h3>

          <p style="margin:4px 0;"><strong>Order ID:</strong> ${data.orderId}</p>
          <p style="margin:4px 0;">
            <strong>Order Type:</strong> 
            <span style="background:#FF9800; color:white; padding:4px 8px; border-radius:3px;">Spot Order</span>
          </p>
          <p style="margin:4px 0;"><strong>Delivered On:</strong> ${data.deliveredAt}</p>
          <p style="margin:4px 0;"><strong>Vehicle:</strong> ${data.vehicleName || data.vehicleId}</p>
          <p style="margin:4px 0;">
            <strong>Payment Status:</strong> 
            <span style="background:#4CAF50; color:white; padding:4px 8px; border-radius:3px;">${data.paymentStatus}</span>
          </p>
        </div>

        <!-- CUSTOMER DETAILS -->
        <div style="background:white; border:1px solid #ddd; border-radius:5px; padding:15px; margin-bottom:20px;">
          <h3 style="margin:0 0 10px;">👤 Customer Information</h3>

          <p style="margin:4px 0;"><strong>Name:</strong> ${data.customerName}</p>
          <p style="margin:4px 0;"><strong>Phone:</strong> ${data.customerPhone}</p>
          <p style="margin:4px 0;"><strong>Type:</strong> ${data.customerType}</p>

          ${
            data.customerIsNew
              ? `
            <p style="margin:4px 0;">
              <span style="background:#2196F3; color:white; padding:4px 8px; border-radius:3px; font-size:12px;">
                New Customer
              </span>
            </p>
          `
              : ''
          }

          <p style="margin:4px 0;"><strong>Address:</strong> ${data.customerAddress}</p>
        </div>

        <!-- PRODUCT LIST -->
        <div style="background:white; border-radius:5px; border:1px solid #ddd; padding:15px; margin-bottom:20px;">
          <h3 style="margin-top:0;">📦 Products Delivered (${data.productCount} items)</h3>

          ${data.products
            .map(
              (p) => `
              <div style="display:flex; align-items:center; padding:10px 0; border-bottom:1px solid #eee;">
                
                ${
                  p.image
                    ? `
                  <img src="${IMAGEBASEURL}/${p.image}" 
                    style="width:50px; height:50px; border-radius:5px; margin-right:15px; object-fit:cover;">
                `
                    : ''
                }

                <div style="flex:1;">
                  <strong>${p.name}</strong><br>
                  <span style="color:#666; font-size:14px;">Quantity: ${p.quantity} × ${p.orderQuantity}</span>
                </div>

                <div style="text-align:right;">
                  <strong>₹${(p.price * p.orderQuantity).toFixed(2)}</strong>
                </div>

              </div>
            `,
            )
            .join('')}
        </div>

        <!-- PAYMENT SUMMARY -->
        <div style="background:white; border-radius:5px; border:1px solid #ddd; padding:15px; margin-bottom:20px;">
          <h3 style="margin-top:0;">💰 Payment Summary</h3>

          <div style="display:flex; justify-content:space-between; padding:6px 0;">
            <span>Payment Method:</span>
            <span><strong>${data.paymentMethod}</strong></span>
          </div>

          ${
            data.transactionId
              ? `
            <div style="display:flex; justify-content:space-between; padding:6px 0;">
              <span>Transaction ID:</span>
              <span style="font-family:monospace; font-size:12px;">${data.transactionId}</span>
            </div>
          `
              : ''
          }

          ${
            data.chequeNumber
              ? `
            <div style="display:flex; justify-content:space-between; padding:6px 0;">
              <span>Cheque Number:</span>
              <span style="font-family:monospace; font-size:12px;">${data.chequeNumber}</span>
            </div>
          `
              : ''
          }

          <div style="display:flex; justify-content:space-between; padding:12px 0; font-size:17px; font-weight:bold; color:#4CAF50; border-top:2px solid #4CAF50; margin-top:10px;">
            <span>Total Amount:</span>
            <span>₹${data.totalAmount.toFixed(2)}</span>
          </div>

          <div style="background:#e8f5e9; padding:10px; border-radius:5px; margin-top:10px;">
            <p style="margin:0; color:#2E7D32;"><strong>✓ Payment Received:</strong> ₹${data.totalAmount.toFixed(2)}</p>
          </div>
        </div>

        <!-- ORDER LOCATION -->
        ${
          data.orderLocation &&
          (data.orderLocation.latitude || data.orderLocation.coordinates)
            ? `
          <div style="background:white; border-radius:5px; border:1px solid #ddd; padding:15px; margin-bottom:20px;">
            <h3 style="margin-top:0;">📍 Order Location</h3>
            <p style="margin:0; color:#666;">
              ${data.orderLocation.address || 'Location Recorded'}
              ${
                data.orderLocation.latitude
                  ? `<br><span style="font-size:12px;">Lat: ${data.orderLocation.latitude}, Long: ${data.orderLocation.longitude}</span>`
                  : ''
              }
            </p>
          </div>
        `
            : ''
        }

        <!-- ORDER NOTES -->
        ${
          data.orderNotes
            ? `
          <div style="background:white; border-radius:5px; border:1px solid #ddd; padding:15px; margin-bottom:20px;">
            <h3 style="margin-top:0;">📝 Order Notes</h3>
            <p style="background:#f9f9f9; padding:10px; border-radius:5px; margin:0; color:#666;">${data.orderNotes}</p>
          </div>
        `
            : ''
        }

        <!-- INVENTORY INFO -->
        <div style="background:#e3f2fd; padding:15px; border-radius:5px; margin-top:20px;">
          <p style="margin:0; font-size:14px; color:#1976d2;">
            <strong>📊 Inventory Updated:</strong> Van stock updated automatically.
          </p>
        </div>

        <!-- BUTTON -->
        <!-- <div style="text-align:center; margin:30px 0;">
          <a href="${data.viewOrderUrl}"
             style="display:inline-block; padding:14px 28px; background:#4CAF50; color:white; text-decoration:none; border-radius:5px; font-weight:bold;">
            View Order Details
          </a>
        </div> -->

        <p style="margin-top:20px; font-size:14px; color:#666;">Great job! Keep up the excellent work.</p>

      </div>

      <!-- FOOTER -->
      <div style="background:#fafafa; padding:15px; text-align:center; color:#777; font-size:12px;">
        Gavran Driver App<br>© 2025 Gavran. All rights reserved.
      </div>

    </div>

  </body>
  </html>
  `,
      text: `
    Spot Order Delivered!

    Hi ${data.driverName},
    Your spot order has been completed.

    Order ID: ${data.orderId}
    Delivered: ${data.deliveredAt}
    Customer: ${data.customerName}
    Total Amount: ₹${data.totalAmount.toFixed(2)}

    `,
    }),
    // View Order: ${data.viewOrderUrl}
    // ✅ Order Delivered Confirmation (Customer)
    orderDelivered: (data) => ({
      subject: `✅ Order Delivered - #${data.orderId}`,
      html: `
  <!DOCTYPE html>
  <html>
  <body style="font-family: Arial, sans-serif; background:#f5f5f5; padding:20px;">

    <div style="max-width:600px; margin:0 auto; background:white; border-radius:8px; overflow:hidden;">

      <!-- HEADER -->
      <div style="background:#4CAF50; color:white; padding:22px; text-align:center;">
        <h1 style="margin:0; font-size:24px;">✅ Order Delivered Successfully!</h1>
        <p style="margin:6px 0 0; font-size:14px;">Your Order Has Been Delivered</p>
      </div>

      <div style="padding:20px;">

        <p style="font-size:15px;">Hi <strong>${data.customerName}</strong>,</p>

        <!-- SUCCESS BOX -->
        <div style="background:#e8f5e9; border-left:4px solid #4CAF50; padding:15px; border-radius:5px; margin:20px 0;">
          <p style="margin:0; font-size:16px;"><strong>🎉 Great News! Your order has been delivered successfully.</strong></p>
          <p style="margin:10px 0 0;">We hope you enjoy your purchase!</p>
        </div>

        <!-- ORDER DETAILS -->
        <div style="background:white; border:1px solid #ddd; border-radius:5px; padding:15px; margin-bottom:20px;">
          <h3 style="margin-top:0; color:#4CAF50;">Order Details</h3>

          <p style="margin:4px 0;"><strong>Order ID:</strong> ${data.orderId}</p>

          <p style="margin:4px 0;">
            <strong>Order Type:</strong> 
            <span style="background:#2196F3; color:white; padding:4px 8px; border-radius:3px;">
              ${data.orderTypeLabel}
            </span>
          </p>

          <p style="margin:4px 0;"><strong>Delivered On:</strong> ${data.deliveredAt}</p>

          <p style="margin:4px 0;">
            <strong>Status:</strong> 
            <span style="background:#4CAF50; color:white; padding:4px 8px; border-radius:3px;">Delivered</span>
          </p>
        </div>

        <!-- ITEMS -->
        <div style="background:white; border:1px solid #ddd; border-radius:5px; padding:15px; margin-bottom:20px;">
          <h3 style="margin-top:0;">📦 Delivered Items (${data.productCount} items)</h3>

          ${data.products
            .slice(0, 5)
            .map(
              (product) => `
            <div style="display:flex; align-items:center; padding:10px 0; border-bottom:1px solid #eee;">

              ${
                product.image
                  ? `
                <img src="${IMAGEBASEURL}/${product.image}" 
                     style="width:50px; height:50px; border-radius:5px; object-fit:cover; margin-right:15px;">
              `
                  : ''
              }

              <div style="flex:1;">
                <strong>${product.name}</strong><br>
                <span style="font-size:14px; color:#666;">
                  Quantity: ${product.quantity} × ${product.orderQuantity}
                </span>
              </div>

              <strong>₹${(product.price * product.orderQuantity).toFixed(2)}</strong>

            </div>
          `,
            )
            .join('')}

          ${
            data.products.length > 5
              ? `
            <p style="text-align:center; color:#666; margin-top:10px; font-size:14px;">
              ...and ${data.products.length - 5} more items
            </p>
          `
              : ''
          }
        </div>

        <!-- ORDER SUMMARY -->
        <div style="background:white; border:1px solid #ddd; border-radius:5px; padding:15px; margin-bottom:20px;">
          <h3 style="margin-top:0;">💰 Order Summary</h3>

          <div style="display:flex; justify-content:space-between; padding:12px 0; font-size:18px; font-weight:bold; color:#4CAF50; border-top:2px solid #4CAF50;">
            <span>Total Amount:</span>
            <span>₹${data.totalAmount.toFixed(2)}</span>
          </div>

          <p style="margin:8px 0;"><strong>Payment Method:</strong> ${data.paymentMethod}</p>

          <p style="margin:8px 0;">
            <strong>Payment Status:</strong> 
            <span style="color:${data.paymentStatus === 'Completed' || data.paymentStatus === 'Paid' ? '#4CAF50' : '#FF9800'};">
              ${data.paymentStatus}
            </span>
          </p>
        </div>

        <!-- DELIVERY INFO -->
        <div style="background:white; border:1px solid #ddd; border-radius:5px; padding:15px; margin-bottom:20px;">
          <h3 style="margin-top:0;">🚚 Delivery Information</h3>

          <p style="margin:4px 0;"><strong>Delivered By:</strong> ${data.deliveredByName}</p>
          ${data.deliveredByPhone ? `<p style="margin:4px 0;"><strong>Contact:</strong> ${data.deliveredByPhone}</p>` : ''}

          <p style="margin:8px 0;"><strong>Delivered To:</strong></p>

          <p style="margin:0; color:#666;">
            ${data.deliveryAddress.label ? `<strong>${data.deliveryAddress.label}</strong><br>` : ''}
            ${data.deliveryAddress.receiverDetails ? `${data.deliveryAddress.receiverDetails}<br>` : ''}
            ${data.deliveryAddress.fullAddress}
          </p>
        </div>

        <!-- DELIVERY PHOTO -->
        ${
          data.hasDeliveryPhoto
            ? `
          <div style="background:white; border:1px solid #ddd; border-radius:5px; padding:15px; margin-bottom:20px;">
            <h3 style="margin-top:0;">📷 Delivery Proof</h3>
            <img src="${IMAGEBASEURL}/${data.deliveryPhotoUrl}"
                 style="width:100%; max-width:400px; border-radius:8px; border:2px solid #ddd;">
            <p style="font-size:12px; color:#666; margin-top:10px;">Photo captured at time of delivery</p>
          </div>
        `
            : ''
        }

        <!-- RATE ORDER -->
        <!-- <div style="background:#e3f2fd; padding:15px; border-radius:5px; margin-top:20px;">
          <h3 style="margin:0; color:#1976d2;">💬 How Was Your Experience?</h3>
          <p style="margin:5px 0;">We’d love to hear your feedback!</p>

          <div style="text-align:center; margin-top:15px;">
            <a href="${data.rateOrderUrl}"
               style="background:#FF9800; color:white; padding:12px 24px; border-radius:5px; font-weight:bold; text-decoration:none;">
              ⭐ Rate Your Order
            </a>
          </div>
        </div> -->

        <!-- BUTTONS -->
        <!-- <div style="text-align:center; margin:30px 0;">
          <a href="${data.viewOrderUrl}"
             style="background:#4CAF50; color:white; padding:14px 28px; border-radius:5px; font-weight:bold; text-decoration:none; margin-right:10px;">
            View Order Details
          </a>

          <a href="${data.shopMoreUrl}"
             style="background:#2196F3; color:white; padding:14px 28px; border-radius:5px; font-weight:bold; text-decoration:none;">
            Shop More
          </a>
        </div> -->

        <!-- HELP BOX -->
        <div style="background:#fff3cd; padding:15px; border-radius:5px;">
          <p style="margin:0; font-size:14px;">
            <strong>📞 Need Help?</strong> Contact us at support@gavran.com or +91 1800-XXX-XXXX
          </p>
        </div>

      </div>

      <!-- FOOTER -->
      <div style="background:#fafafa; padding:15px; text-align:center; font-size:12px; color:#666;">
        Thank you for shopping with Gavran!<br>
        © 2025 Gavran. All rights reserved.
      </div>

    </div>

  </body>
  </html>
  `,

      text: `
    Order Delivered Successfully!

    Hi ${data.customerName},

    Order ID: ${data.orderId}
    Delivered On: ${data.deliveredAt}
    Total Amount: ₹${data.totalAmount.toFixed(2)}

    `,
    }),
    // Rate Order: ${data.rateOrderUrl}
    // View Order: ${data.viewOrderUrl}

    // ✅ Order Cancelled Confirmation (Customer)
    orderCancelled: (data) => ({
      subject: `Order Cancelled - #${data.orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #F44336; color: white; padding: 20px; text-align: center;">
              <h1>❌ Order Cancelled</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <p>Hi <strong>${data.customerName}</strong>,</p>
              
              <div style="background: #ffebee; border-left: 4px solid #F44336; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Your order has been cancelled as requested.</strong></p>
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">Cancellation Details</h3>
                <p><strong>Order ID:</strong> ${data.orderId}</p>
                <p><strong>Order Type:</strong> ${data.orderTypeLabel}</p>
                <p><strong>Order Date:</strong> ${data.orderPlacedAt || 'N/A'}</p>
                <p><strong>Cancelled On:</strong> ${data.cancelledAt}</p>
                <p><strong>Cancelled By:</strong> ${data.cancelledByName} (${data.cancelledByRole})</p>
                <p><strong>Reason:</strong> ${data.reason}</p>
                ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
              </div>

              ${
                data.productCount > 0
                  ? `
                <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <h3 style="margin-top: 0;">💰 Refund Information</h3>
                  <p><strong>Order Amount:</strong> ₹${data.totalAmount.toFixed(2)}</p>
                  ${
                    data.paymentStatus === 'Completed' ||
                    data.paymentStatus === 'Paid'
                      ? `
                    <div style="background: #e8f5e9; padding: 10px; border-radius: 5px; margin-top: 10px;">
                      <p style="margin: 0;"><strong>✅ Refund Status:</strong> Your refund of ₹${data.totalAmount.toFixed(2)} will be processed within 5-7 business days to your original payment method.</p>
                    </div>
                  `
                      : `
                    <p style="color: #666;">Since payment was not completed, no refund is applicable.</p>
                  `
                  }
                </div>

                <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <h3 style="margin-top: 0;">📦 Cancelled Items (${data.productCount} items)</h3>
                  ${data.products
                    .slice(0, 5)
                    .map(
                      (product) => `
                    <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                      <div style="display: flex; align-items: center;">
                        ${product.image ? `<img src="${IMAGEBASEURL}/${product.image}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px; margin-right: 10px;" />` : ''}
                        <div style="flex: 1;">
                          <strong>${product.name}</strong><br>
                          <span style="color: #666; font-size: 14px;">Quantity: ${product.quantity} × ${product.orderQuantity}</span>
                        </div>
                      </div>
                    </div>
                  `,
                    )
                    .join('')}
                  ${data.products.length > 5 ? `<p style="color: #666; font-size: 14px;">...and ${data.products.length - 5} more items</p>` : ''}
                </div>
              `
                  : ''
              }

              <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <p style="margin: 0;"><strong>📞 Need Help?</strong></p>
                <p style="margin: 5px 0 0 0;">If you have any questions about this cancellation, contact us at support@gavran.com or call +91 1800-XXX-XXXX</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.shopMoreUrl}" 
                   style="display: inline-block; padding: 14px 28px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   Shop Again
                </a>
              </div>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>We hope to serve you again soon!</p>
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Order Cancelled

        Hi ${data.customerName},

        Your order has been cancelled as requested.

        Order ID: ${data.orderId}
        Cancelled On: ${data.cancelledAt}
        Cancelled By: ${data.cancelledByName}
        Reason: ${data.reason}

        ${
          data.productCount > 0
            ? `
        Order Amount: ₹${data.totalAmount.toFixed(2)}
        ${
          data.paymentStatus === 'Completed' || data.paymentStatus === 'Paid'
            ? `Refund will be processed within 5-7 business days.`
            : 'No refund applicable as payment was not completed.'
        }
        `
            : ''
        }

        Need help? Contact support@gavran.com

        Shop again: ${data.shopMoreUrl}
      `,
    }),

    // Order out for delivery
    orderOutForDelivery: (data) => ({
      subject: `🚚 Order #${data.orderId} is Out for Delivery`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #2196F3; color: white; padding: 20px; text-align: center;">
              <h1>🚚 Order Out for Delivery</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <p>Dear <strong>${data.userName}</strong>,</p>
              <p>Good news! Your order is on the way.</p>
              
              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3>Order Details</h3>
                <p><strong>Order ID:</strong> ${data.orderId}</p>
                <p><strong>Total Amount:</strong> ₹${data.totalAmount.toFixed(2)}</p>
                <p><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</p>
              </div>

              <p>Our delivery partner will contact you shortly.</p>
              <p><strong>Note:</strong> You'll receive an OTP when the delivery partner arrives.</p>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Order #${data.orderId} is out for delivery. Estimated delivery: ${data.estimatedDelivery}`,
    }),

    // OTP Email
    deliveryOTP: (data) => ({
      subject: `🔐 OTP for Order ${data.action} - #${data.orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #FF9800; color: white; padding: 20px; text-align: center;">
              <h1>🔐 Delivery OTP</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <p>Dear <strong>${data.userName}</strong>,</p>
              <p>Your OTP for order ${data.action.toLowerCase()}:</p>
              
              <div style="background: white; padding: 30px; margin: 20px 0; text-align: center; border-radius: 5px;">
                <h1 style="color: #FF9800; font-size: 48px; letter-spacing: 10px; margin: 0;">
                  ${data.otp}
                </h1>
              </div>

              <div style="background: #fff3e0; padding: 15px; margin: 20px 0; border-left: 4px solid #FF9800;">
                <p><strong>⚠️ Important:</strong></p>
                <ul>
                  <li>Share this OTP only with your delivery partner</li>
                  <li>Valid for ${data.expiryMinutes} minutes only</li>
                  <li>Do not share with anyone else</li>
                </ul>
              </div>

              <p><strong>Order ID:</strong> ${data.orderId}</p>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your OTP for order ${data.action}: ${data.otp}. Valid for ${data.expiryMinutes} minutes.`,
    }),

    // Order notifications
    orderPlaced: (data) => ({
      subject: `Order Confirmation - #${data.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #FF1744; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .order-details { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .button { display: inline-block; padding: 12px 24px; background: #FF1744; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Order Placed Successfully!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.userName},</p>
              <p>Thank you for your order. We've received your order and will begin processing it shortly.</p>
              
              <div class="order-details">
                <h3>Order Details</h3>
                <p><strong>Order Number:</strong> #${data.orderNumber}</p>
                <p><strong>Order Date:</strong> ${data.orderDate}</p>
                <p><strong>Total Amount:</strong> ₹${data.totalAmount}</p>
                <p><strong>Items:</strong> ${data.itemCount} items</p>
              </div>
              
              <!-- <a href="${data.trackOrderUrl}" class="button">Track Your Order</a> -->
              
              <p>We'll send you another email when your order is confirmed.</p>
            </div>
            <div class="footer">
              <p>Need help? Contact us at support@gavran.com</p>
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Order Placed Successfully!
        
        Hi ${data.userName},
        
        Order Number: #${data.orderNumber}
        Order Date: ${data.orderDate}
        Total: ₹${data.totalAmount}
        Items: ${data.itemCount}
        
        `,
      }),
      // Track your order: ${data.trackOrderUrl}

    orderConfirmed: (data) => ({
      subject: `Order Confirmed - #${data.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4CAF50; color: white; padding: 20px; text-align: center;">
              <h1>✅ Order Confirmed!</h1>
            </div>
            <div style="padding: 20px;">
              <p>Hi ${data.userName},</p>
              <p>Great news! Your order #${data.orderNumber} has been confirmed and is being prepared for shipment.</p>
              <p><strong>Expected Delivery:</strong> ${data.expectedDelivery}</p>
             <!-- <p><a href="${data.trackOrderUrl}" style="display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Track Order</a></p> -->
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Order #${data.orderNumber} confirmed! Expected delivery: ${data.expectedDelivery}`,
    }),

    orderShipped: (data) => ({
      subject: `Order Shipped - #${data.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto;">
            <div style="background: #2196F3; color: white; padding: 20px; text-align: center;">
              <h1>📦 Your Order is on the Way!</h1>
            </div>
            <div style="padding: 20px;">
              <p>Hi ${data.userName},</p>
              <p>Your order #${data.orderNumber} has been shipped!</p>
              <p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
              <p><strong>Carrier:</strong> ${data.carrier}</p>
              <p><strong>Expected Delivery:</strong> ${data.expectedDelivery}</p>
              <p><a href="${data.trackingUrl}" style="display: inline-block; padding: 12px 24px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px;">Track Shipment</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your order #${data.orderNumber} is shipped! Track: ${data.trackingUrl}`,
    }),

    // orderDelivered: (data) => ({
    //   subject: `Order Delivered - #${data.orderNumber}`,
    //   html: `
    //     <!DOCTYPE html>
    //     <html>
    //     <body style="font-family: Arial, sans-serif;">
    //       <div style="max-width: 600px; margin: 0 auto;">
    //         <div style="background: #4CAF50; color: white; padding: 20px; text-align: center;">
    //           <h1>🎉 Order Delivered!</h1>
    //         </div>
    //         <div style="padding: 20px;">
    //           <p>Hi ${data.userName},</p>
    //           <p>Your order #${data.orderNumber} has been successfully delivered!</p>
    //           <p>We hope you love your purchase. Please take a moment to rate your experience.</p>
    //           <p><a href="${data.reviewUrl}" style="display: inline-block; padding: 12px 24px; background: #FF9800; color: white; text-decoration: none; border-radius: 5px;">Rate Your Order</a></p>
    //         </div>
    //       </div>
    //     </body>
    //     </html>
    //   `,
    //   text: `Your order #${data.orderNumber} is delivered! Rate it: ${data.reviewUrl}`,
    // }),

    // orderCancelled: (data) => ({
    //   subject: `Order Cancelled - #${data.orderNumber}`,
    //   html: `
    //     <!DOCTYPE html>
    //     <html>
    //     <body style="font-family: Arial, sans-serif;">
    //       <div style="max-width: 600px; margin: 0 auto;">
    //         <div style="background: #F44336; color: white; padding: 20px; text-align: center;">
    //           <h1>Order Cancelled</h1>
    //         </div>
    //         <div style="padding: 20px;">
    //           <p>Hi ${data.userName},</p>
    //           <p>Your order #${data.orderNumber} has been cancelled as per your request.</p>
    //           <p><strong>Reason:</strong> ${data.cancellationReason}</p>
    //           <p><strong>Refund Amount:</strong> ₹${data.refundAmount}</p>
    //           <p>The refund will be processed within 5-7 business days.</p>
    //         </div>
    //       </div>
    //     </body>
    //     </html>
    //   `,
    //   text: `Order #${data.orderNumber} cancelled. Refund: ₹${data.refundAmount}`,
    // }),

    // Payment notifications
    paymentSuccess: (data) => ({
      subject: `Payment Successful - ₹${data.amount}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>✅ Payment Successful</h2>
            <p>Hi ${data.userName},</p>
            <p>Your payment of <strong>₹${data.amount}</strong> has been received successfully.</p>
            <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
            <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
            <p><strong>Date:</strong> ${data.paymentDate}</p>
          </div>
        </body>
        </html>
      `,
      text: `Payment of ₹${data.amount} successful. Transaction ID: ${data.transactionId}`,
    }),
  },

  // ==================== DRIVER TEMPLATES ====================

  driver: {
    // ✅ Delivery Confirmation (Driver)
    orderDeliveryConfirmation: (data) => ({
      subject: `✅ Delivery Confirmed - #${data.orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4CAF50; color: white; padding: 20px; text-align: center;">
              <h1>✅ Delivery Confirmed!</h1>
              <p style="margin: 0; font-size: 14px;">Order Successfully Delivered</p>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <p>Hi <strong>${data.driverName}</strong>,</p>
              
              <div style="background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px;"><strong>🎉 Great job! Delivery confirmed successfully.</strong></p>
                <p style="margin: 10px 0 0 0;">Customer has been notified about the delivery.</p>
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0; color: #4CAF50;">Delivery Details</h3>
                <p><strong>Order ID:</strong> ${data.orderId}</p>
                <p><strong>Order Type:</strong> ${data.orderTypeLabel}</p>
                <p><strong>Delivered At:</strong> ${data.deliveredAt}</p>
                <p><strong>Status:</strong> <span style="background: #4CAF50; color: white; padding: 4px 8px; border-radius: 3px;">Delivered</span></p>
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">👤 Customer Information</h3>
                <p><strong>Name:</strong> ${data.customerName}</p>
                ${data.customerPhone ? `<p><strong>Phone:</strong> ${data.customerPhone}</p>` : ''}
                <p><strong>Delivery Address:</strong></p>
                <p style="color: #666; margin: 0;">
                  ${data.deliveryAddress.fullAddress}
                </p>
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">📦 Delivered Items</h3>
                <p><strong>Total Items:</strong> ${data.productCount} items</p>
                <p><strong>Order Value:</strong> ₹${data.totalAmount.toFixed(2)}</p>
                <p><strong>Payment:</strong> ${data.paymentMethod} - ${data.paymentStatus}</p>
              </div>

              ${
                data.hasDeliveryPhoto
                  ? `
                <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <h3 style="margin-top: 0;">📷 Delivery Proof Captured</h3>
                  <img src="${IMAGEBASEURL}/${data.deliveryPhotoUrl}" style="width: 100%; max-width: 300px; border-radius: 8px; border: 2px solid #ddd;" alt="Delivery Photo" />
                </div>
              `
                  : ''
              }

              ${
                data.hasSignature
                  ? `
                <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <h3 style="margin-top: 0;">✍️ Customer Signature Captured</h3>
                  <img src="${IMAGEBASEURL}/${data.signatureUrl}" style="width: 100%; max-width: 300px; border: 1px solid #ddd; background: white; border-radius: 5px;" alt="Signature" />
                </div>
              `
                  : ''
              }

              <!-- <div style="text-align: center; margin: 30px 0;">
                <a href="${data.viewOrderUrl}" 
                   style="display: inline-block; padding: 14px 28px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   View Order Details
                </a>
              </div> -->

              <div style="background: #e3f2fd; padding: 15px; border-radius: 5px;">
                <p style="margin: 0; font-size: 14px;">
                  <strong>💡 Keep it up!</strong> Your delivery has been recorded and the customer has been notified. Continue delivering excellence!
                </p>
              </div>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Gavran Driver App</p>
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Delivery Confirmed!

        Hi ${data.driverName},

        Great job! Delivery confirmed successfully.

        Order ID: ${data.orderId}
        Delivered At: ${data.deliveredAt}
        Customer: ${data.customerName}

        Items: ${data.productCount} items
        Amount: ₹${data.totalAmount.toFixed(2)}

        ${data.hasDeliveryPhoto ? 'Delivery photo captured ✓' : ''}
        ${data.hasSignature ? 'Signature captured ✓' : ''}

        
        Keep up the great work!
        `,
    }),
    // View order: ${data.viewOrderUrl}

    // ✅ Order Cancellation Confirmation (Driver)
    orderCancellationConfirmation: (data) => ({
      subject: `Order Cancellation Confirmed - #${data.orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #FF9800; color: white; padding: 20px; text-align: center;">
              <h1>⚠️ Order Cancellation Confirmed</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <p>Hi <strong>${data.driverName}</strong>,</p>
              
              <div style="background: #fff3cd; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>✓ Cancellation Confirmed:</strong> Order has been successfully cancelled. Customer and admin have been notified.</p>
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">Cancellation Details</h3>
                <p><strong>Order ID:</strong> ${data.orderId}</p>
                <p><strong>Order Type:</strong> ${data.orderTypeLabel}</p>
                <p><strong>Cancelled On:</strong> ${data.cancelledAt}</p>
                <p><strong>Status:</strong> <span style="background: #F44336; color: white; padding: 4px 8px; border-radius: 3px;">Cancelled</span></p>
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">🔄 Cancellation Reason</h3>
                <p style="background: #f9f9f9; padding: 15px; border-radius: 5px; color: #333; margin: 0;"><strong>Reason:</strong> ${data.reason}</p>
                ${data.notes ? `<p style="background: #f9f9f9; padding: 15px; border-radius: 5px; color: #666; margin: 10px 0 0 0;"><strong>Notes:</strong> ${data.notes}</p>` : ''}
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">👤 Customer Information</h3>
                <p><strong>Name:</strong> ${data.customerName}</p>
                ${data.customerPhone ? `<p><strong>Phone:</strong> ${data.customerPhone}</p>` : ''}
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0;">📦 Cancelled Items</h3>
                <p><strong>Total Items:</strong> ${data.productCount} items</p>
                <p><strong>Order Value:</strong> ₹${data.totalAmount.toFixed(2)}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <!--<a href="${data.viewOrderUrl}" 
                   style="display: inline-block; padding: 14px 28px; background: #FF9800; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   View Cancellation Details
                </a> -->
              </div>

              <div style="background: #e3f2fd; padding: 15px; border-radius: 5px;">
                <p style="margin: 0; font-size: 14px;">
                  <strong>💡 Note:</strong> This cancellation has been recorded. Customer has been notified and refund (if applicable) will be processed.
                </p>
              </div>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Gavran Driver App</p>
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Order Cancellation Confirmed

        Hi ${data.driverName},

        Order has been successfully cancelled.

        Order ID: ${data.orderId}
        Cancelled On: ${data.cancelledAt}
        Reason: ${data.reason}

        Customer: ${data.customerName}
        Order Value: ₹${data.totalAmount.toFixed(2)}

        Customer and admin have been notified.

        `,
    }),
    // View details: ${data.viewOrderUrl}
    // Route assigned
    routeAssigned: (data) => ({
      subject: `📋 New Route Assigned - ${data.routeName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #2196F3; color: white; padding: 20px; text-align: center;">
              <h1>📋 New Route Assigned</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <p>Dear <strong>${data.userName}</strong>,</p>
              <p>A new delivery route has been assigned to you.</p>
              
              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3>Route Details</h3>
                <p><strong>Route Name:</strong> ${data.routeName}</p>
                <p><strong>Area:</strong> ${data.area}</p>
                <p><strong>Total Stops:</strong> ${data.totalStops}</p>
                <p><strong>Total Orders:</strong> ${data.totalOrders}</p>
                <p><strong>Delivery Date:</strong> ${data.deliveryDate}</p>
                <p><strong>Estimated Duration:</strong> ${data.estimatedDuration}</p>
              </div>

              <p>Please ensure you're ready for the assigned delivery date.</p>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `New route assigned: ${data.routeName}. ${data.totalOrders} orders on ${data.deliveryDate}`,
    }),

    // Route started
    routeStarted: (data) => ({
      subject: `🚀 Route Started - ${data.routeName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4CAF50; color: white; padding: 20px; text-align: center;">
              <h1>🚀 Route Started</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <p>Dear <strong>${data.userName}</strong>,</p>
              <p>Your route has been started successfully.</p>
              
              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3>Active Route</h3>
                <p><strong>Route:</strong> ${data.routeName}</p>
                <p><strong>Started At:</strong> ${data.startedAt}</p>
                <p><strong>Orders to Deliver:</strong> ${data.totalOrders}</p>
              </div>

              <p>All orders have been marked as "Out for Delivery".</p>
              <p>Safe driving! 🚗</p>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Route ${data.routeName} started at ${data.startedAt}. ${data.totalOrders} orders to deliver.`,
    }),
  },

  // ==================== ADMIN TEMPLATES ====================
  admin: {
    newConsumerRegistration: (data) => ({
      subject: `🎉 New Consumer Registration - ${data.consumerName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4CAF50; color: white; padding: 20px; text-align: center;">
              <h1>🎉 New Consumer Registered</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <h3>Consumer Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Full Name:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.consumerName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.consumerEmail || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Mobile:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.consumerMobile}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Registration Date:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.registrationDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>User ID:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.userId}</td>
                </tr>
              </table>
              <div style="margin-top: 20px; text-align: center;">
                <a href="${data.adminUserUrl}" 
                   style="display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
                   View User in Admin Panel
                </a>
              </div>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>This is an automated notification from Gavran Admin System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `New Consumer Registered
      
Name: ${data.consumerName}
Email: ${data.consumerEmail || 'Not provided'}
Mobile: ${data.consumerMobile}
Date: ${data.registrationDate}
User ID: ${data.userId}

View in admin panel: ${data.adminUserUrl}`,
    }),
    newPartnerRegistration: (data) => ({
      subject: `🔔 New ${data.roleName} Registration - ${data.partnerName}`,
      html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #FF9800; color: white; padding: 20px; text-align: center;">
            <h1>🔔 New ${data.roleName} Registration</h1>
            <p style="margin: 0; font-size: 14px;">Action Required: Document Verification</p>
          </div>
          <div style="padding: 20px; background: #f5f5f5;">
            
            <div style="background: #fff3cd; border-left: 4px solid #FF9800; padding: 15px; margin-bottom: 20px;">
              <strong>⚠️ Action Required:</strong> Please verify the uploaded documents and approve/reject this registration.
            </div>

            <h3>Partner Details</h3>
            <table style="width: 100%; border-collapse: collapse; background: white;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Role:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.roleName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Full Name:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.partnerName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.partnerEmail || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Mobile:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.partnerMobile}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Registration Date:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.registrationDate}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>User ID:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.userId}</td>
              </tr>
            </table>

            <div style="background: white; padding: 15px; margin-top: 20px; border-radius: 5px;">
              <h4 style="margin-top: 0;">📄 Documents Uploaded</h4>
              <p style="color: #666; font-size: 14px;">Review all documents in the admin panel before approval</p>
              <p style="color: #666;">${data.documentsUploaded}</p>
            </div>

            <div style="margin-top: 20px; text-align: center;">
              <a href="${data.adminPartnerUrl}" 
                 style="display: inline-block; padding: 14px 28px; background: #FF9800; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                 Review & Verify Partner
              </a>
            </div>

            <div style="background: #e3f2fd; padding: 15px; margin-top: 20px; border-radius: 5px;">
              <p style="margin: 0; color: #1976d2; font-size: 14px;">
                <strong>💡 Next Steps:</strong> Verify documents → Approve/Reject → Partner receives confirmation email
              </p>
            </div>

          </div>
          <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>This is an automated notification from Gavran Admin System</p>
          </div>
        </div>
      </body>
      </html>
    `,
      text: `
      New ${data.roleName} Registration - Action Required

      Partner Details:
      - Role: ${data.roleName}
      - Name: ${data.partnerName}
      - Email: ${data.partnerEmail || 'Not provided'}
      - Mobile: ${data.partnerMobile}
      - Registration Date: ${data.registrationDate}
      - User ID: ${data.userId}

      Documents Uploaded: ${data.documentsUploaded}

      Action Required: Please verify the documents and approve/reject this registration.

      Review in admin panel: ${data.adminPartnerUrl}
    `,
    }),
    // ✅ Normal Order Placed (Admin)
    normalOrderReceived: (data) => ({
      subject: `🔔 New Order Received - #${data.orderId} (${data.customerName})`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #2196F3; color: white; padding: 20px; text-align: center;">
              <h1>🔔 New Order Received</h1>
              <p style="margin: 0; font-size: 14px;">Order Type: Normal Order</p>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              
              <div style="background: #fff3cd; border-left: 4px solid #FF9800; padding: 15px; margin-bottom: 20px;">
                <strong>⚡ Action Required:</strong> Process this order and update inventory
              </div>

              <h3>Order Information</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order ID:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.orderId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order Date:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.orderDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer Name:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer Role:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerRole}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Mobile:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerMobile || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerEmail || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Method:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.paymentMethod}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Status:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><span style="background: #fff3cd; padding: 4px 8px; border-radius: 3px;">${data.paymentStatus}</span></td>
                </tr>
              </table>

              <h3>📦 Order Items (${data.productCount} items)</h3>
              <div style="background: white; padding: 15px; border-radius: 5px;">
                ${data.products
                  .map(
                    (product) => `
                  <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                    <strong>${product.name}</strong><br>
                    <span style="color: #666; font-size: 14px;">
                      Quantity: ${product.quantity} × ${product.orderQuantity} = ₹${(product.price * product.orderQuantity).toFixed(2)}
                      ${product.category ? ` | Category: ${product.category}` : ''}
                    </span>
                  </div>
                `,
                  )
                  .join('')}
              </div>

              <h3 style="margin-top: 20px;">💰 Bill Summary</h3>
              <table style="width: 100%; border-collapse: collapse; background: white;">
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">Item Total:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${data.billSummary.itemTotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">Delivery Fee:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${data.billSummary.deliveryFee.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">Handling Fee:</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${data.billSummary.handlingFee.toFixed(2)}</td>
                </tr>
                ${
                  data.billSummary.discount > 0
                    ? `
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; color: #4CAF50;">Discount:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #4CAF50;">- ₹${data.billSummary.discount.toFixed(2)}</td>
                  </tr>
                `
                    : ''
                }
                <tr style="font-weight: bold; font-size: 16px; background: #f0f0f0;">
                  <td style="padding: 12px;">Total Amount:</td>
                  <td style="padding: 12px; text-align: right; color: #2196F3;">₹${data.billSummary.totalAmount.toFixed(2)}</td>
                </tr>
              </table>

              <h3 style="margin-top: 20px;">📍 Delivery Address</h3>
              <div style="background: white; padding: 15px; border-radius: 5px;">
                <strong>${data.deliveryAddress.label || 'Address'}</strong><br>
                ${data.deliveryAddress.receiverDetails ? `${data.deliveryAddress.receiverDetails}<br>` : ''}
                ${data.deliveryAddress.fullAddress}
              </div>

              ${
                data.deliveryNotes
                  ? `
                <h3 style="margin-top: 20px;">📝 Delivery Notes</h3>
                <div style="background: white; padding: 15px; border-radius: 5px;">
                  ${data.deliveryNotes}
                </div>
              `
                  : ''
              }

              <div style="margin-top: 20px; text-align: center;">
                <a href="${data.adminOrderUrl}" 
                   style="display: inline-block; padding: 14px 28px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   View Order in Admin Panel
                </a>
              </div>

              <div style="background: #e3f2fd; padding: 15px; margin-top: 20px; border-radius: 5px;">
                <p style="margin: 0; color: #1976d2; font-size: 14px;">
                  <strong>💡 Next Steps:</strong> Verify inventory → Process payment → Prepare for dispatch
                </p>
              </div>

            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Gavran Admin Notification System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        New Order Received - ${data.orderId}

        Order Type: Normal Order

        Customer: ${data.customerName} (${data.customerRole})
        Order Date: ${data.orderDate}
        Payment: ${data.paymentMethod} - ${data.paymentStatus}

        Items: ${data.productCount} products
        Total Amount: ₹${data.billSummary.totalAmount.toFixed(2)}

        Delivery Address:
        ${data.deliveryAddress.label}
        ${data.deliveryAddress.fullAddress}

        View order: ${data.adminOrderUrl}
      `,
    }),
    // ✅ Order Cancelled by User (Admin Notification)
    orderCancelledByUser: (data) => ({
      subject: `⚠️ Order Cancelled - #${data.orderId} (${data.customerName})`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #FF9800; color: white; padding: 20px; text-align: center;">
              <h1>⚠️ Order Cancelled</h1>
              <p style="margin: 0; font-size: 14px;">Stock Released Back to Inventory</p>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              
              <div style="background: #fff3cd; border-left: 4px solid #FF9800; padding: 15px; margin-bottom: 20px;">
                <strong>📊 Notice:</strong> Customer cancelled order. Stock has been released back to inventory.
              </div>

              <h3>Order Information</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order ID:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.orderId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order Date:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.orderDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Cancelled On:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.cancelledDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer Name:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer Role:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerRole}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Mobile:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerMobile || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Cancelled By:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.cancelledBy.name} (${data.cancelledBy.role})</td>
                </tr>
              </table>

              <h3>🔄 Cancellation Details</h3>
              <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <p><strong>Reason:</strong> ${data.reason}</p>
                ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
              </div>

              <h3>💰 Financial Information</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order Amount:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${data.totalAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Method:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${data.paymentMethod}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Status:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${data.paymentStatus}</td>
                </tr>
                ${
                  data.paymentMethod !== 'Credit' &&
                  data.paymentStatus === 'Paid'
                    ? `
                  <tr style="background: #fff3cd;">
                    <td style="padding: 10px;"><strong>Refund Required:</strong></td>
                    <td style="padding: 10px; text-align: right;"><strong>₹${data.totalAmount.toFixed(2)}</strong></td>
                  </tr>
                `
                    : ''
                }
              </table>

              <h3>📦 Cancelled Items (${data.productCount} items)</h3>
              <div style="background: white; padding: 15px; border-radius: 5px;">
                ${data.products
                  .map(
                    (product) => `
                  <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                    <strong>${product.name}</strong><br>
                    <span style="color: #666; font-size: 14px;">
                      Quantity: ${product.quantity} × ${product.orderQuantity} = ₹${(product.price * product.orderQuantity).toFixed(2)}
                      <br>✅ Stock Released: ${product.orderQuantity} units
                    </span>
                  </div>
                `,
                  )
                  .join('')}
              </div>

              <div style="margin-top: 20px; text-align: center;">
                <a href="${data.adminOrderUrl}" 
                   style="display: inline-block; padding: 14px 28px; background: #FF9800; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   View Order Details
                </a>
              </div>

              <div style="background: #e3f2fd; padding: 15px; margin-top: 20px; border-radius: 5px;">
                <p style="margin: 0; color: #1976d2; font-size: 14px;">
                  <strong>💡 Action Required:</strong> ${
                    data.paymentMethod !== 'Credit' &&
                    data.paymentStatus === 'Paid'
                      ? 'Process refund within 5-7 business days'
                      : 'No refund action required. Monitor inventory levels.'
                  }
                </p>
              </div>

            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Gavran Admin Notification System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Order Cancelled - ${data.orderId}

        Customer: ${data.customerName} (${data.customerRole})
        Cancelled By: ${data.cancelledBy.name}
        Cancelled On: ${data.cancelledDate}

        Reason: ${data.reason}
        ${data.notes ? `Notes: ${data.notes}` : ''}

        Order Amount: ₹${data.totalAmount.toFixed(2)}
        Payment: ${data.paymentMethod} - ${data.paymentStatus}
        ${
          data.paymentMethod !== 'Credit' && data.paymentStatus === 'Paid'
            ? `Refund Required: ₹${data.totalAmount.toFixed(2)}`
            : 'No refund required'
        }

        Items: ${data.productCount} products (Stock released back to inventory)

        View order: ${data.adminOrderUrl}
      `,
    }),

    // ✅ Bulk Order Received (Admin - Urgent Action Needed)
    bulkOrderReceived: (data) => ({
      subject: `🚨 URGENT: New Bulk Order Request - #${data.orderId} (${data.customerName})`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #F44336; color: white; padding: 20px; text-align: center;">
              <h1>🚨 NEW BULK ORDER REQUEST</h1>
              <p style="margin: 0; font-size: 16px; font-weight: bold;">URGENT ACTION REQUIRED</p>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              
              <div style="background: #ffebee; border: 2px solid #F44336; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                <strong style="color: #F44336; font-size: 16px;">⚡ ACTION REQUIRED:</strong> 
                <p style="margin: 10px 0 0 0;">Review customer images and instructions, then add products to this bulk order immediately.</p>
              </div>

              <h3>Order Information</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order ID:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.orderId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order Date:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.orderDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order Type:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><span style="background: #FF9800; color: white; padding: 4px 8px; border-radius: 3px;">Bulk Order</span></td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer Name:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer Role:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerRole}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Mobile:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerMobile || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerEmail || 'N/A'}</td>
                </tr>
              </table>

              <h3>📝 Special Instructions from Customer</h3>
              <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <p style="background: #f9f9f9; padding: 15px; border-radius: 5px; color: #333; margin: 0; white-space: pre-wrap;">${data.specialInstructions}</p>
              </div>

              ${
                data.attachedImages && data.attachedImages.length > 0
                  ? `
                <h3>📷 Customer Uploaded Images (${data.attachedImages.length})</h3>
                <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                  <p style="color: #666; margin: 0 0 10px 0;">Review these images to identify products for the order:</p>
                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    ${data.attachedImages
                      .map(
                        (img, index) => `
                      <div style="text-align: center;">
                        <img src="${IMAGEBASEURL}/${img.uri}" alt="Order image ${index + 1}" style="width: 100%; max-width: 250px; height: 200px; object-fit: cover; border-radius: 5px; border: 2px solid #ddd;" />
                        <p style="font-size: 12px; color: #666; margin: 5px 0;">Image ${index + 1}</p>
                      </div>
                    `,
                      )
                      .join('')}
                  </div>
                </div>
              `
                  : ''
              }

              <h3>📍 Delivery Address</h3>
              <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <strong>${data.deliveryAddress.label || 'Address'}</strong><br>
                ${data.deliveryAddress.receiverDetails ? `${data.deliveryAddress.receiverDetails}<br>` : ''}
                ${data.deliveryAddress.fullAddress}
              </div>

              <div style="margin-top: 20px; text-align: center;">
                <a href="${data.adminOrderUrl}" 
                   style="display: inline-block; padding: 16px 32px; background: #F44336; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                   🚨 ADD PRODUCTS NOW
                </a>
              </div>

              <div style="background: #fff3cd; padding: 15px; margin-top: 20px; border-radius: 5px; border-left: 4px solid #FF9800;">
                <p style="margin: 0; font-size: 14px;">
                  <strong>💡 Next Steps:</strong><br>
                  1. Review customer images and instructions<br>
                  2. Add appropriate products to the order<br>
                  3. Confirm pricing and quantities<br>
                  4. System will automatically notify customer once products are added
                </p>
              </div>

            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Gavran Admin Notification System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        🚨 URGENT: New Bulk Order Request

        Order ID: ${data.orderId}
        Customer: ${data.customerName} (${data.customerRole})
        Order Date: ${data.orderDate}

        Special Instructions:
        ${data.specialInstructions}

        Attached Images: ${data.attachedImages ? data.attachedImages.length : 0}

        Delivery Address:
        ${data.deliveryAddress.label}
        ${data.deliveryAddress.fullAddress}

        ACTION REQUIRED: Add products to this order immediately

        View order: ${data.adminOrderUrl}
      `,
    }),

    // ✅ Bulk Order Products Added (Admin Confirmation)
    bulkOrderProductsAdded: (data) => ({
      subject: `✅ Bulk Order Updated - Products Added #${data.orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4CAF50; color: white; padding: 20px; text-align: center;">
              <h1>✅ Products Added Successfully</h1>
              <p style="margin: 0; font-size: 14px;">Bulk Order Confirmed</p>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              
              <div style="background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin-bottom: 20px;">
                <strong style="color: #4CAF50;">✅ Success:</strong> Products have been added to bulk order #${data.orderId}. Customer has been notified automatically.
              </div>

              <h3>Order Summary</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order ID:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.orderId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerName} (${data.customerRole})</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total Items:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.productCount} products</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total Amount:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong style="color: #4CAF50; font-size: 18px;">₹${data.billSummary.totalAmount.toFixed(2)}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Status:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><span style="background: #4CAF50; color: white; padding: 4px 8px; border-radius: 3px;">Confirmed</span></td>
                </tr>
              </table>

              <h3>📦 Products Added</h3>
              <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                ${data.products
                  .map(
                    (product) => `
                  <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                    <strong>${product.name}</strong><br>
                    <span style="color: #666; font-size: 14px;">
                      Quantity: ${product.quantity} × ${product.orderQuantity} = ₹${(product.price * product.orderQuantity).toFixed(2)}
                    </span>
                  </div>
                `,
                  )
                  .join('')}
              </div>

              <div style="margin-top: 20px; text-align: center;">
                <a href="${data.adminOrderUrl}" 
                   style="display: inline-block; padding: 14px 28px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   View Complete Order
                </a>
              </div>

              <div style="background: #e3f2fd; padding: 15px; margin-top: 20px; border-radius: 5px;">
                <p style="margin: 0; color: #1976d2; font-size: 14px;">
                  <strong>💡 Customer Notified:</strong> An email with complete product list and pricing has been sent to ${data.customerEmail}
                </p>
              </div>

            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Gavran Admin Notification System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Products Added Successfully

        Bulk Order: ${data.orderId}
        Customer: ${data.customerName}
        Items: ${data.productCount} products
        Total: ₹${data.billSummary.totalAmount.toFixed(2)}
        Status: Confirmed

        Customer has been notified automatically.

        View order: ${data.adminOrderUrl}
      `,
    }),
    // ✅ Bulk Order Cancelled by User (Admin Notification)
    bulkOrderCancelledByUser: (data) => ({
      subject: `⚠️ Bulk Order Cancelled - #${data.orderId} (${data.customerName})`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #FF9800; color: white; padding: 20px; text-align: center;">
              <h1>⚠️ Bulk Order Cancelled</h1>
              <p style="margin: 0; font-size: 14px;">Customer Cancelled Order</p>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              
              <div style="background: #fff3cd; border-left: 4px solid #FF9800; padding: 15px; margin-bottom: 20px;">
                <strong>📊 Notice:</strong> Customer cancelled bulk order #${data.orderId}. ${data.productCount > 0 ? 'Stock has been released back to inventory.' : 'No stock impact as products were not yet added.'}
              </div>

              <h3>Order Information</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order ID:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.orderId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order Type:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><span style="background: #FF9800; color: white; padding: 4px 8px; border-radius: 3px;">Bulk Order</span></td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order Date:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.orderDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Cancelled On:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.cancelledDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer Name:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer Role:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerRole}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Mobile:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerMobile || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Cancelled By:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.cancelledBy.name} (${data.cancelledBy.role})</td>
                </tr>
              </table>

              <h3>🔄 Cancellation Details</h3>
              <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <p><strong>Reason:</strong> ${data.reason}</p>
                ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
              </div>

              ${
                data.specialInstructions
                  ? `
                <h3>📝 Original Customer Request</h3>
                <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                  <p style="background: #f9f9f9; padding: 15px; border-radius: 5px; color: #333; margin: 0; white-space: pre-wrap;">${data.specialInstructions}</p>
                </div>
              `
                  : ''
              }

              ${
                data.productCount > 0
                  ? `
                <h3>💰 Financial Information</h3>
                <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order Amount:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${data.totalAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Method:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${data.paymentMethod}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Status:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${data.paymentStatus}</td>
                  </tr>
                  ${
                    data.paymentStatus === 'Completed' ||
                    data.paymentStatus === 'Paid'
                      ? `
                    <tr style="background: #fff3cd;">
                      <td style="padding: 10px;"><strong>Refund Required:</strong></td>
                      <td style="padding: 10px; text-align: right;"><strong>₹${data.totalAmount.toFixed(2)}</strong></td>
                    </tr>
                  `
                      : ''
                  }
                </table>

                <h3>📦 Cancelled Products (${data.productCount} items)</h3>
                <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                  ${data.products
                    .map(
                      (product) => `
                    <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                      <strong>${product.name}</strong><br>
                      <span style="color: #666; font-size: 14px;">
                        Quantity: ${product.quantity} × ${product.orderQuantity} = ₹${(product.price * product.orderQuantity).toFixed(2)}
                        <br>✅ Stock Released: ${product.orderQuantity} units
                      </span>
                    </div>
                  `,
                    )
                    .join('')}
                </div>
              `
                  : `
                <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                  <p style="margin: 0; color: #2E7D32;">
                    <strong>✅ No Stock Impact:</strong> This bulk order was cancelled before products were added to the order.
                  </p>
                </div>
              `
              }

              ${
                data.attachedImages && data.attachedImages.length > 0
                  ? `
                <h3>📷 Customer Images (${data.attachedImages.length})</h3>
                <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    ${data.attachedImages
                      .slice(0, 4)
                      .map(
                        (img, index) => `
                      <img src="${IMAGEBASEURL}/${img.uri}" alt="Order image ${index + 1}" style="width: 100%; max-width: 200px; height: 150px; object-fit: cover; border-radius: 5px; border: 1px solid #ddd;" />
                    `,
                      )
                      .join('')}
                  </div>
                </div>
              `
                  : ''
              }

              <div style="margin-top: 20px; text-align: center;">
                <a href="${data.adminOrderUrl}" 
                   style="display: inline-block; padding: 14px 28px; background: #FF9800; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   View Order Details
                </a>
              </div>

              <div style="background: #e3f2fd; padding: 15px; margin-top: 20px; border-radius: 5px;">
                <p style="margin: 0; color: #1976d2; font-size: 14px;">
                  <strong>💡 Action Required:</strong> 
                  ${
                    data.productCount > 0
                      ? data.paymentStatus === 'Completed' ||
                        data.paymentStatus === 'Paid'
                        ? 'Process refund within 5-7 business days. Stock has been released.'
                        : 'No refund required. Stock has been released back to inventory.'
                      : 'No action required. Order was cancelled before products were added.'
                  }
                </p>
              </div>

            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Gavran Admin Notification System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Bulk Order Cancelled - ${data.orderId}

        Customer: ${data.customerName} (${data.customerRole})
        Cancelled By: ${data.cancelledBy.name}
        Cancelled On: ${data.cancelledDate}

        Reason: ${data.reason}
        ${data.notes ? `Notes: ${data.notes}` : ''}

        ${
          data.productCount > 0
            ? `
        Order Amount: ₹${data.totalAmount.toFixed(2)}
        Payment: ${data.paymentMethod} - ${data.paymentStatus}
        ${
          data.paymentStatus === 'Completed' || data.paymentStatus === 'Paid'
            ? `Refund Required: ₹${data.totalAmount.toFixed(2)}`
            : 'No refund required'
        }

        Products: ${data.productCount} items (Stock released back to inventory)
        `
            : 'No stock impact - Order cancelled before products were added.'
        }

        View order: ${data.adminOrderUrl}
      `,
    }),
    // ✅ Replacement Request Received (Admin)
    replacementRequestReceived: (data) => ({
      subject: `🔄 New Replacement Request - #${data.requestId} (${data.customerName})`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #FF9800; color: white; padding: 20px; text-align: center;">
              <h1>🔄 New Replacement Request</h1>
              <p style="margin: 0; font-size: 14px;">Review & Take Action</p>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              
              <div style="background: #fff3cd; border-left: 4px solid #FF9800; padding: 15px; margin-bottom: 20px;">
                <strong>⚡ ACTION REQUIRED:</strong> Review replacement request and approve/reject based on policy.
              </div>

              <h3>Request Information</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Request ID:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.requestId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Original Order:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.originalOrderId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Submitted On:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.submittedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer Name:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer Role:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerRole}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Mobile:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerMobile || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerEmail || 'N/A'}</td>
                </tr>
              </table>

              <h3>📦 Items Requested for Replacement (${data.itemCount} items)</h3>
              <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                ${data.replacementItems
                  .map(
                    (item) => `
                  <div style="padding: 15px 0; border-bottom: 1px solid #eee;">
                    <div style="display: flex; align-items: flex-start;">
                      ${item.originalItem.image ? `<img src="${IMAGEBASEURL}/${item.originalItem.image}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 5px; margin-right: 15px;" />` : ''}
                      <div style="flex: 1;">
                        <strong style="font-size: 16px;">${item.originalItem.name}</strong><br>
                        <span style="color: #666; font-size: 14px;">
                          Original Quantity: ${item.originalItem.quantity}<br>
                          Replacement Quantity: ${item.replacementQuantity}
                        </span>
                        <div style="margin-top: 10px; background: #fff3cd; padding: 10px; border-radius: 5px;">
                          <strong style="color: #F44336;">Reason:</strong> 
                          <span style="text-transform: capitalize;">${item.reason.replace('_', ' ')}</span>
                          ${item.reasonDescription ? `<br><span style="color: #666; font-size: 14px; margin-top: 5px; display: block;">"${item.reasonDescription}"</span>` : ''}
                        </div>
                        ${
                          item.images && item.images.length > 0
                            ? `
                          <div style="margin-top: 10px;">
                            <strong style="font-size: 14px;">Customer Images:</strong>
                            <div style="display: flex; gap: 5px; margin-top: 5px; flex-wrap: wrap;">
                              ${item.images
                                .map(
                                  (img) => `
                                <img src="${IMAGEBASEURL}/${img.uri}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 5px; border: 2px solid #ddd;" />
                              `,
                                )
                                .join('')}
                            </div>
                          </div>
                        `
                            : ''
                        }
                      </div>
                    </div>
                  </div>
                `,
                  )
                  .join('')}
              </div>

              ${
                data.notes
                  ? `
                <h3>📝 Customer Notes</h3>
                <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                  <p style="background: #f9f9f9; padding: 15px; border-radius: 5px; color: #333; margin: 0; white-space: pre-wrap;">${data.notes}</p>
                </div>
              `
                  : ''
              }

              <h3>📍 Delivery Address</h3>
              <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <strong>${data.deliveryAddress.label || 'Address'}</strong><br>
                ${data.deliveryAddress.receiverDetails ? `${data.deliveryAddress.receiverDetails}<br>` : ''}
                ${data.deliveryAddress.fullAddress}
              </div>

              <div style="margin-top: 20px; text-align: center;">
                <a href="${data.adminReplacementUrl}" 
                   style="display: inline-block; padding: 16px 32px; background: #FF9800; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                   🔍 REVIEW & TAKE ACTION
                </a>
              </div>

              <div style="background: #e3f2fd; padding: 15px; margin-top: 20px; border-radius: 5px;">
                <p style="margin: 0; color: #1976d2; font-size: 14px;">
                  <strong>💡 Next Steps:</strong><br>
                  1. Review customer images and reason<br>
                  2. Verify against replacement policy<br>
                  3. Check inventory availability<br>
                  4. Approve or reject with appropriate reason
                </p>
              </div>

            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Gavran Admin Notification System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        New Replacement Request

        Request ID: ${data.requestId}
        Original Order: ${data.originalOrderId}
        Customer: ${data.customerName} (${data.customerRole})
        Submitted: ${data.submittedDate}

        Items: ${data.itemCount} items requested for replacement

        ${data.notes ? `Customer Notes: ${data.notes}` : ''}

        ACTION REQUIRED: Review and approve/reject this request

        View request: ${data.adminReplacementUrl}
      `,
    }),

    // ✅ Replacement Approved Confirmation (Admin)
    replacementApprovedConfirmation: (data) => ({
      subject: `✅ Replacement Approved - #${data.requestId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4CAF50; color: white; padding: 20px; text-align: center;">
              <h1>✅ Replacement Approved</h1>
              <p style="margin: 0; font-size: 14px;">Customer Notified & Inventory Reserved</p>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              
              <div style="background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin-bottom: 20px;">
                <strong style="color: #4CAF50;">✅ Success:</strong> Replacement request approved. Customer has been notified automatically.
              </div>

              <h3>Request Summary</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Request ID:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.requestId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Approved On:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.approvedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total Items:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.itemCount} items</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Status:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><span style="background: #4CAF50; color: white; padding: 4px 8px; border-radius: 3px;">Approved - Preparing</span></td>
                </tr>
              </table>

              <h3>✅ Inventory Reserved</h3>
              <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <p style="color: #666; margin: 0 0 10px 0;">The following items have been reserved for replacement:</p>
                ${data.replacementItems
                  .map(
                    (item) => `
                  <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                    <strong>${item.originalItem.name}</strong><br>
                    <span style="color: #666; font-size: 14px;">
                      Quantity Reserved: ${item.replacementQuantity} units
                    </span>
                  </div>
                `,
                  )
                  .join('')}
              </div>

              <div style="margin-top: 20px; text-align: center;">
                <a href="${data.adminReplacementUrl}" 
                   style="display: inline-block; padding: 14px 28px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   View Replacement Details
                </a>
              </div>

              <div style="background: #e3f2fd; padding: 15px; margin-top: 20px; border-radius: 5px;">
                <p style="margin: 0; color: #1976d2; font-size: 14px;">
                  <strong>💡 Next Steps:</strong> Prepare shipment → Update tracking → Mark as dispatched
                </p>
              </div>

            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Gavran Admin Notification System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Replacement Approved

        Request ID: ${data.requestId}
        Customer: ${data.customerName}
        Approved: ${data.approvedDate}
        Items: ${data.itemCount} items

        Inventory has been reserved. Customer notified automatically.

        View details: ${data.adminReplacementUrl}
      `,
    }),

    // ✅ Replacement Rejected Confirmation (Admin)
    replacementRejectedConfirmation: (data) => ({
      subject: `❌ Replacement ${data.wasApproved ? 'Cancelled' : 'Rejected'} - #${data.requestId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #F44336; color: white; padding: 20px; text-align: center;">
              <h1>❌ Replacement ${data.wasApproved ? 'Cancelled' : 'Rejected'}</h1>
              <p style="margin: 0; font-size: 14px;">Customer Notified${data.wasApproved ? ' & Stock Released' : ''}</p>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              
              <div style="background: #ffebee; border-left: 4px solid #F44336; padding: 15px; margin-bottom: 20px;">
                <strong style="color: #F44336;">❌ ${data.wasApproved ? 'Cancelled' : 'Rejected'}:</strong> Replacement request has been ${data.wasApproved ? 'cancelled' : 'rejected'}. Customer has been notified.${data.wasApproved ? ' Reserved stock has been released.' : ''}
              </div>

              <h3>Request Summary</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Request ID:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.requestId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Decision Date:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.decisionDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Reason:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.rejectionReason}</td>
                </tr>
              </table>

              ${
                data.wasApproved
                  ? `
                <h3>🔄 Stock Released</h3>
                <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                  <p style="color: #666; margin: 0 0 10px 0;">The following reserved items have been released back to inventory:</p>
                  ${data.replacementItems
                    .map(
                      (item) => `
                    <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                      <strong>${item.originalItem.name}</strong><br>
                      <span style="color: #666; font-size: 14px;">
                        Quantity Released: ${item.replacementQuantity} units
                      </span>
                    </div>
                  `,
                    )
                    .join('')}
                </div>
              `
                  : ''
              }

              <div style="margin-top: 20px; text-align: center;">
                <a href="${data.adminReplacementUrl}" 
                   style="display: inline-block; padding: 14px 28px; background: #666; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   View Request Details
                </a>
              </div>

            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Gavran Admin Notification System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Replacement ${data.wasApproved ? 'Cancelled' : 'Rejected'}

        Request ID: ${data.requestId}
        Customer: ${data.customerName}
        Decision: ${data.decisionDate}
        Reason: ${data.rejectionReason}

        Customer has been notified.${data.wasApproved ? ' Reserved stock released.' : ''}

        View details: ${data.adminReplacementUrl}
      `,
    }),
    // ✅ Spot Order Created (Admin Notification)
    spotOrderCreated: (data) => ({
      subject: `🚚 New Spot Order - #${data.orderId} by ${data.driverName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #2196F3; color: white; padding: 20px; text-align: center;">
              <h1>🚚 New Spot Order</h1>
              <p style="margin: 0; font-size: 14px;">On-the-Spot Sale Recorded</p>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              
              <div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin-bottom: 20px;">
                <strong>📊 Notice:</strong> Driver ${data.driverName} completed a spot order. Inventory updated automatically.
              </div>

              <h3>Order Information</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order ID:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.orderId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order Type:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><span style="background: #FF9800; color: white; padding: 4px 8px; border-radius: 3px;">Spot Order</span></td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Delivered On:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.deliveredAt}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Driver Name:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.driverName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Driver Phone:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.driverPhone || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Vehicle:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.vehicleName || data.vehicleId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Inventory Source:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.inventorySource === 'van_stock' ? 'Van Stock' : 'Other'}</td>
                </tr>
              </table>

              <h3>👤 Customer Information</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer Name:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer Phone:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerPhone}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer Type:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerType}${data.customerIsNew ? ' <span style="background: #2196F3; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">NEW</span>' : ''}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Address:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerAddress}</td>
                </tr>
              </table>

              <h3>📦 Products Sold (${data.productCount} items)</h3>
              <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                ${data.products
                  .map(
                    (product) => `
                  <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                    <strong>${product.name}</strong><br>
                    <span style="color: #666; font-size: 14px;">
                      Quantity: ${product.quantity} × ${product.orderQuantity} = ₹${(product.price * product.orderQuantity).toFixed(2)}
                      ${product.category ? ` | Category: ${product.category}` : ''}
                    </span>
                  </div>
                `,
                  )
                  .join('')}
              </div>

              <h3>💰 Payment Details</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Method:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.paymentMethod}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Status:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><span style="background: #4CAF50; color: white; padding: 4px 8px; border-radius: 3px;">${data.paymentStatus}</span></td>
                </tr>
                ${
                  data.transactionId
                    ? `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Transaction ID:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; font-family: monospace;">${data.transactionId}</td>
                  </tr>
                `
                    : ''
                }
                ${
                  data.chequeNumber
                    ? `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Cheque Number:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; font-family: monospace;">${data.chequeNumber}</td>
                  </tr>
                `
                    : ''
                }
                <tr style="font-weight: bold; font-size: 16px; background: #f0f0f0;">
                  <td style="padding: 12px;"><strong>Total Amount:</strong></td>
                  <td style="padding: 12px; text-align: right; color: #2196F3;">₹${data.totalAmount.toFixed(2)}</td>
                </tr>
              </table>

              ${
                data.orderLocation &&
                (data.orderLocation.latitude || data.orderLocation.coordinates)
                  ? `
                <h3>📍 Order Location</h3>
                <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                  <p style="margin: 0; color: #666;">
                    ${data.orderLocation.address || 'Location recorded'}
                    ${data.orderLocation.latitude ? `<br><span style="font-size: 12px; color: #999;">Coordinates: ${data.orderLocation.latitude}, ${data.orderLocation.longitude}</span>` : ''}
                  </p>
                </div>
              `
                  : ''
              }

              ${
                data.orderNotes
                  ? `
                <h3>📝 Order Notes</h3>
                <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                  <p style="background: #f9f9f9; padding: 15px; border-radius: 5px; color: #333; margin: 0; white-space: pre-wrap;">${data.orderNotes}</p>
                </div>
              `
                  : ''
              }

              <div style="margin-top: 20px; text-align: center;">
                <a href="${data.adminOrderUrl}" 
                   style="display: inline-block; padding: 14px 28px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   View Order Details
                </a>
              </div>

              <div style="background: #e8f5e9; padding: 15px; margin-top: 20px; border-radius: 5px;">
                <p style="margin: 0; color: #2E7D32; font-size: 14px;">
                  <strong>✅ Inventory Automatically Updated:</strong> Van stock for vehicle ${data.vehicleName || data.vehicleId} has been updated. Sold items deducted from inventory.
                </p>
              </div>

            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Gavran Admin Notification System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        New Spot Order - ${data.orderId}

        Driver: ${data.driverName}
        Vehicle: ${data.vehicleName || data.vehicleId}
        Delivered: ${data.deliveredAt}

        Customer: ${data.customerName} (${data.customerType})
        Phone: ${data.customerPhone}
        Address: ${data.customerAddress}

        Products: ${data.productCount} items
        Total Amount: ₹${data.totalAmount.toFixed(2)}
        Payment: ${data.paymentMethod} - ${data.paymentStatus}

        Inventory has been updated automatically.

        View order: ${data.adminOrderUrl}
      `,
    }),
    // ✅ Order Delivered Notification (Admin)
    orderDelivered: (data) => ({
      subject: `✅ Order Delivered - #${data.orderId} by ${data.driverName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4CAF50; color: white; padding: 20px; text-align: center;">
              <h1>✅ Order Delivered</h1>
              <p style="margin: 0; font-size: 14px;">Delivery Completed Successfully</p>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              
              <div style="background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin-bottom: 20px;">
                <strong style="color: #4CAF50;">✅ Delivery Confirmed:</strong> Order #${data.orderId} delivered by ${data.driverName}. Customer has been notified.
              </div>

              <h3>Order Information</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order ID:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.orderId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order Type:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><span style="background: #2196F3; color: white; padding: 4px 8px; border-radius: 3px;">${data.orderTypeLabel}</span></td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Placed On:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.orderPlacedAt || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Delivered On:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.deliveredAt}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Status:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><span style="background: #4CAF50; color: white; padding: 4px 8px; border-radius: 3px;">Delivered</span></td>
                </tr>
              </table>

              <h3>🚚 Delivery Officer</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Name:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.driverName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Role:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.driverRole}</td>
                </tr>
                ${
                  data.driverPhone
                    ? `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Phone:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.driverPhone}</td>
                  </tr>
                `
                    : ''
                }
                ${
                  data.vehicleInfo
                    ? `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Vehicle:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.vehicleInfo}</td>
                  </tr>
                `
                    : ''
                }
              </table>

              <h3>👤 Customer Information</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Name:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerName}</td>
                </tr>
                ${
                  data.customerPhone
                    ? `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Phone:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerPhone}</td>
                  </tr>
                `
                    : ''
                }
                ${
                  data.customerRole
                    ? `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer Type:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerRole}</td>
                  </tr>
                `
                    : ''
                }
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Delivery Address:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.deliveryAddress.fullAddress}</td>
                </tr>
              </table>

              <h3>📦 Order Summary</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total Items:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.productCount} items</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order Value:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">₹${data.totalAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Method:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.paymentMethod}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Status:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><span style="color: ${data.paymentStatus === 'Completed' || data.paymentStatus === 'Paid' ? '#4CAF50' : '#FF9800'};">${data.paymentStatus}</span></td>
                </tr>
              </table>

              ${
                data.hasDeliveryPhoto || data.hasSignature
                  ? `
                <h3>📋 Delivery Proof</h3>
                <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                  ${
                    data.hasDeliveryPhoto
                      ? `
                    <div style="margin-bottom: 15px;">
                      <strong>📷 Delivery Photo:</strong><br>
                      <img src="${IMAGEBASEURL}/${data.deliveryPhotoUrl}" style="width: 100%; max-width: 300px; border-radius: 8px; border: 2px solid #ddd; margin-top: 10px;" alt="Delivery Photo" />
                    </div>
                  `
                      : ''
                  }
                  ${
                    data.hasSignature
                      ? `
                    <div>
                      <strong>✍️ Customer Signature:</strong><br>
                      <img src="${IMAGEBASEURL}/${data.signatureUrl}" style="width: 100%; max-width: 300px; border: 1px solid #ddd; background: white; border-radius: 5px; margin-top: 10px;" alt="Signature" />
                    </div>
                  `
                      : ''
                  }
                </div>
              `
                  : ''
              }

              <div style="margin-top: 20px; text-align: center;">
                <a href="${data.adminOrderUrl}" 
                   style="display: inline-block; padding: 14px 28px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   View Full Order Details
                </a>
              </div>

              <div style="background: #e3f2fd; padding: 15px; margin-top: 20px; border-radius: 5px;">
                <p style="margin: 0; color: #1976d2; font-size: 14px;">
                  <strong>✅ Actions Completed:</strong> Order marked as delivered, customer notified, delivery proof recorded.
                </p>
              </div>

            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Gavran Admin Notification System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Order Delivered

        Order ID: ${data.orderId}
        Delivered On: ${data.deliveredAt}
        Delivered By: ${data.driverName} (${data.driverRole})

        Customer: ${data.customerName}
        Address: ${data.deliveryAddress.fullAddress}

        Order Value: ₹${data.totalAmount.toFixed(2)}
        Payment: ${data.paymentMethod} - ${data.paymentStatus}

        ${data.hasDeliveryPhoto ? 'Delivery photo captured ✓' : ''}
        ${data.hasSignature ? 'Signature captured ✓' : ''}

        View order: ${data.adminOrderUrl}
      `,
    }),
    // ✅ Order Cancelled Notification (Admin)
    orderCancelled: (data) => ({
      subject: `⚠️ Order Cancelled - #${data.orderId} by ${data.cancelledByName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #FF9800; color: white; padding: 20px; text-align: center;">
              <h1>⚠️ Order Cancelled</h1>
              <p style="margin: 0; font-size: 14px;">Cancellation Notification</p>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              
              <div style="background: #fff3cd; border-left: 4px solid #FF9800; padding: 15px; margin-bottom: 20px;">
                <strong>📊 Notice:</strong> Order #${data.orderId} cancelled by ${data.cancelledByName} (${data.cancelledByRole}). Customer has been notified.
              </div>

              <h3>Order Information</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order ID:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.orderId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order Type:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><span style="background: #2196F3; color: white; padding: 4px 8px; border-radius: 3px;">${data.orderTypeLabel}</span></td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order Placed:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.orderPlacedAt || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Cancelled On:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.cancelledAt}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Status:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><span style="background: #F44336; color: white; padding: 4px 8px; border-radius: 3px;">Cancelled</span></td>
                </tr>
              </table>

              <h3>🔄 Cancellation Details</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Cancelled By:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.cancelledByName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Role:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.cancelledByRole}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Reason:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.reason}</td>
                </tr>
                ${
                  data.notes
                    ? `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Notes:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.notes}</td>
                  </tr>
                `
                    : ''
                }
              </table>

              <h3>👤 Customer Information</h3>
              <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Name:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerName}</td>
                </tr>
                ${
                  data.customerPhone
                    ? `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Phone:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerPhone}</td>
                  </tr>
                `
                    : ''
                }
                ${
                  data.customerRole
                    ? `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer Type:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.customerRole}</td>
                  </tr>
                `
                    : ''
                }
              </table>

              ${
                data.productCount > 0
                  ? `
                <h3>💰 Financial Impact</h3>
                <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Order Amount:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${data.totalAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total Items:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${data.productCount} items</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Method:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${data.paymentMethod}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Status:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${data.paymentStatus}</td>
                  </tr>
                  ${
                    data.paymentStatus === 'Completed' ||
                    data.paymentStatus === 'Paid'
                      ? `
                    <tr style="background: #fff3cd;">
                      <td style="padding: 12px;"><strong>⚠️ Refund Required:</strong></td>
                      <td style="padding: 12px; text-align: right;"><strong>₹${data.totalAmount.toFixed(2)}</strong></td>
                    </tr>
                  `
                      : ''
                  }
                </table>

                <h3>📦 Cancelled Products (${data.productCount} items)</h3>
                <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                  ${data.products
                    .slice(0, 10)
                    .map(
                      (product) => `
                    <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                      <strong>${product.name}</strong><br>
                      <span style="color: #666; font-size: 14px;">
                        Quantity: ${product.quantity} × ${product.orderQuantity} = ₹${(product.price * product.orderQuantity).toFixed(2)}
                      </span>
                    </div>
                  `,
                    )
                    .join('')}
                  ${data.products.length > 10 ? `<p style="color: #666; font-size: 14px; text-align: center;">...and ${data.products.length - 10} more items</p>` : ''}
                </div>
              `
                  : ''
              }

              ${
                data.driverName && data.driverName !== data.cancelledByName
                  ? `
                <h3>🚚 Assigned Driver</h3>
                <table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;">
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Driver Name:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.driverName}</td>
                  </tr>
                  ${
                    data.driverPhone
                      ? `
                    <tr>
                      <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Driver Phone:</strong></td>
                      <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.driverPhone}</td>
                    </tr>
                  `
                      : ''
                  }
                </table>
              `
                  : ''
              }

              <div style="margin-top: 20px; text-align: center;">
                <a href="${data.adminOrderUrl}" 
                   style="display: inline-block; padding: 14px 28px; background: #FF9800; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   View Order Details
                </a>
              </div>

              <div style="background: #ffebee; padding: 15px; margin-top: 20px; border-radius: 5px;">
                <p style="margin: 0; color: #C62828; font-size: 14px;">
                  <strong>⚠️ Action Required:</strong> 
                  ${
                    data.paymentStatus === 'Completed' ||
                    data.paymentStatus === 'Paid'
                      ? `Process refund of ₹${data.totalAmount.toFixed(2)} within 5-7 business days. ${data.inventoryReserved ? 'Stock has been released back to inventory.' : ''}`
                      : `No refund required. ${data.inventoryReserved ? 'Stock has been released back to inventory.' : 'No inventory impact.'}`
                  }
                </p>
              </div>

            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Gavran Admin Notification System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Order Cancelled - ${data.orderId}

        Order Type: ${data.orderTypeLabel}
        Cancelled On: ${data.cancelledAt}
        Cancelled By: ${data.cancelledByName} (${data.cancelledByRole})

        Reason: ${data.reason}
        ${data.notes ? `Notes: ${data.notes}` : ''}

        Customer: ${data.customerName}
        ${data.customerPhone ? `Phone: ${data.customerPhone}` : ''}

        ${
          data.productCount > 0
            ? `
        Order Amount: ₹${data.totalAmount.toFixed(2)}
        Items: ${data.productCount}
        Payment: ${data.paymentMethod} - ${data.paymentStatus}
        ${
          data.paymentStatus === 'Completed' || data.paymentStatus === 'Paid'
            ? `Refund Required: ₹${data.totalAmount.toFixed(2)}`
            : 'No refund required'
        }
        `
            : ''
        }

        View order: ${data.adminOrderUrl}
      `,
    }),
    // Route completed
    routeCompleted: (data) => ({
      subject: `✅ Route Completed - ${data.routeName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4CAF50; color: white; padding: 20px; text-align: center;">
              <h1>✅ Route Completed</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <p>Dear Admin,</p>
              <p>A delivery route has been completed.</p>
              
              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3>Route Summary</h3>
                <p><strong>Route:</strong> ${data.routeName}</p>
                <p><strong>Driver:</strong> ${data.driverName}</p>
                <p><strong>Completed At:</strong> ${data.completedAt}</p>
              </div>

              <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3>Delivery Statistics</h3>
                <p><strong>Total Orders:</strong> ${data.totalOrders}</p>
                <p><strong>✅ Delivered:</strong> ${data.deliveredCount}</p>
                <p><strong>❌ Cancelled:</strong> ${data.cancelledCount}</p>
                <p><strong>Completion Rate:</strong> ${((data.deliveredCount / data.totalOrders) * 100).toFixed(1)}%</p>
              </div>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>&copy; 2025 Gavran. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Route ${data.routeName} completed. ${data.deliveredCount} delivered, ${data.cancelledCount} cancelled.`,
    }),

    newOrder: (data) => ({
      subject: `🔔 New Order Received - #${data.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #FF1744; color: white; padding: 20px;">
              <h1>New Order Received</h1>
            </div>
            <div style="padding: 20px; background: #f5f5f5;">
              <h3>Order Details</h3>
              <p><strong>Order Number:</strong> #${data.orderNumber}</p>
              <p><strong>Customer:</strong> ${data.customerName}</p>
              <p><strong>Phone:</strong> ${data.customerPhone}</p>
              <p><strong>Email:</strong> ${data.customerEmail}</p>
              <p><strong>Total Amount:</strong> ₹${data.totalAmount}</p>
              <p><strong>Items:</strong> ${data.itemCount}</p>
              <p><strong>Payment Status:</strong> ${data.paymentStatus}</p>
              <p><strong>Delivery Address:</strong> ${data.deliveryAddress}</p>
              <hr>
              <h3>Items</h3>
              ${data.items
                .map(
                  (item) => `
                <p>- ${item.name} x ${item.quantity} = ₹${item.total}</p>
              `,
                )
                .join('')}
              <hr>
              <p><a href="${data.adminOrderUrl}" style="display: inline-block; padding: 12px 24px; background: #FF1744; color: white; text-decoration: none; border-radius: 5px;">View in Admin Panel</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `New order #${data.orderNumber} from ${data.customerName}. Total: ₹${data.totalAmount}`,
    }),

    lowStock: (data) => ({
      subject: `⚠️ Low Stock Alert - ${data.productName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #FF9800; color: white; padding: 20px;">
              <h1>⚠️ Low Stock Alert</h1>
            </div>
            <div style="padding: 20px;">
              <p><strong>Product:</strong> ${data.productName}</p>
              <p><strong>SKU:</strong> ${data.sku}</p>
              <p><strong>Current Stock:</strong> ${data.currentStock} units</p>
              <p><strong>Threshold:</strong> ${data.threshold} units</p>
              <p>Please reorder stock immediately to avoid stockouts.</p>
              <p><a href="${data.productUrl}" style="display: inline-block; padding: 12px 24px; background: #FF9800; color: white; text-decoration: none; border-radius: 5px;">View Product</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Low stock alert: ${data.productName} (${data.currentStock} units remaining)`,
    }),

    dailySalesReport: (data) => ({
      subject: `📊 Daily Sales Report - ${data.date}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #2196F3; color: white; padding: 20px;">
              <h1>Daily Sales Report</h1>
              <p>${data.date}</p>
            </div>
            <div style="padding: 20px;">
              <h3>Sales Summary</h3>
              <p><strong>Total Orders:</strong> ${data.totalOrders}</p>
              <p><strong>Total Revenue:</strong> ₹${data.totalRevenue}</p>
              <p><strong>Average Order Value:</strong> ₹${data.avgOrderValue}</p>
              <p><strong>New Customers:</strong> ${data.newCustomers}</p>
              <p><strong>Pending Orders:</strong> ${data.pendingOrders}</p>
              <p><strong>Delivered Orders:</strong> ${data.deliveredOrders}</p>
              <p><a href="${data.dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px;">View Dashboard</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Daily Report ${data.date}: ${data.totalOrders} orders, ₹${data.totalRevenue} revenue`,
    }),
  },
};
