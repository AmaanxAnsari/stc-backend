// services/otpService.js

/**
 * OTP Service for Delivery Operations
 */

export const OTPService = {
  /**
   * Generate a 4-digit OTP
   */
  generate() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  },

  /**
   * Calculate expiry time (10 minutes from now)
   */
  getExpiryTime() {
    return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  },

  /**
   * Check if OTP is expired
   */
  isExpired(expiresAt) {
    return new Date() > new Date(expiresAt);
  },

  /**
   * Verify OTP
   */
  verify(inputOTP, storedOTP, expiresAt) {
    if (!storedOTP) {
      return { valid: false, error: 'No OTP generated for this order' };
    }

    if (this.isExpired(expiresAt)) {
      return { valid: false, error: 'OTP has expired' };
    }

    if (inputOTP !== storedOTP) {
      return { valid: false, error: 'Invalid OTP' };
    }

    return { valid: true };
  },

  /**
   * Format expiry time for display
   */
  formatExpiryTime(expiresAt) {
    return new Date(expiresAt).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
    });
  },
};
