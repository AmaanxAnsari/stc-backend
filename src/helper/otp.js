
import otpGenerator from "otp-generator"
export const generateOTP = () => {
    let otp=otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets:false});
    return otp;
};
export const generate4DigitOTP = () => {
    let otp=otpGenerator.generate(4, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets:false});
    return otp;
};

// Helper to calculate OTP expiration time
export const getOtpExpirationTime = () => {
    // OTP valid for 1 minutes (60,000 milliseconds)
    return new Date(Date.now() + 1 * 60 * 1000);
};



