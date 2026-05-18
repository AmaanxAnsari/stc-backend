import nodemailer from 'nodemailer';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com', // e.g., 'smtp.gmail.com' for Gmail, 'smtp.mail.yahoo.com' for Yahoo
    port: 587, // Common ports: 587 (TLS), 465 (SSL)
    secure: false, // true for 465, false for other ports (like 587)
    auth: {
      user: process.env.EMAIL_USERNAME, // Your email address (e.g., 'youremail@gmail.com')
      pass: process.env.EMAIL_PASSWORD, // Your email password or app-specific password
    },
    tls: {
      // Do not fail on invalid certificates. This is generally not recommended for production
      // but can be useful for development with self-signed certificates.
      // For production, remove this line or set it to true if your SMTP server uses a valid SSL certificate.
      rejectUnauthorized: false,
    },
  });
};




export const sendOtpEmail = async (toEmail, otp) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: 'Shree Trading Company <noreply@shreetradingcompany.com>',
    to: toEmail,
    subject: 'Your OTP for Verification - Shree Trading Company',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
          .otp-box { background: #f8f9fa; border: 2px dashed #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 25px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🔐 Verify Your Identity</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Shree Trading Company Account Verification</p>
          </div>
          
          <div class="content">
            <p style="font-size: 16px; margin-top: 0;">Hello,</p>
            
            <p>We received a request to verify your account. Please use the following One-Time Password (OTP) to complete your verification:</p>
            
            <div class="otp-box">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your OTP Code</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 15px 0 0 0; color: #666; font-size: 13px;">⏰ Valid for 1 minute</p>
            </div>
            
            <div class="warning">
              <p style="margin: 0; font-size: 14px;"><strong>⚠️ Security Notice:</strong></p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
                <li>Never share this OTP with anyone</li>
                <li>Shree Trading Company will never ask for your OTP via phone or email</li>
                <li>This code expires in 1 minute</li>
              </ul>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 25px;">
              If you didn't request this verification code, please ignore this email or contact our support team if you have concerns about your account security.
            </p>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <p style="margin: 0; font-size: 14px;">
                <strong>Need Help?</strong><br>
                Contact us at support@shreetradingcompany.com or call +91 1800-XXX-XXXX
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p style="margin: 0 0 10px 0;">This is an automated message from Shree Trading Company</p>
            <p style="margin: 0;">&copy; 2026 Shree Trading Company. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Shree Trading Company - OTP Verification

      Hello,

      Your One-Time Password (OTP) for verification is: ${otp}

      This OTP is valid for 1 minutes. Please do not share it with anyone.

      Security Notice:
      - Never share this OTP with anyone
      - Shree Trading Company will never ask for your OTP via phone or email
      - This code expires in 1 minutes

      If you didn't request this verification code, please ignore this email or contact our support team.

      Need Help?
      Contact us at support@shreetradingcompany.com or call +91 1800-XXX-XXXX

      © 2026 Shree Trading Company. All rights reserved.
    `,
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    throw new Error('Failed to send OTP email.');
  }
};
