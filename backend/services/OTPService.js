const crypto = require('crypto');
const config = require('../config');
const { OTP } = require('../models');

class OTPService {
  /**
   * Generate OTP code
   */
  generateOTP(length = config.otpLength) {
    return Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1)).toString();
  }

  /**
   * Send OTP via SMS (Firebase Admin SDK or Twilio)
   */
  async sendOTPviaSMS(phoneNumber, otpCode) {
    try {
      // TODO: Implement Firebase or Twilio SMS integration
      console.log(`OTP for ${phoneNumber}: ${otpCode}`);
      return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
      console.error('SMS sending error:', error);
      throw new Error('Failed to send OTP');
    }
  }

  /**
   * Send OTP via Email
   */
  async sendOTPviaEmail(email, otpCode) {
    try {
      // TODO: Implement Email service
      console.log(`OTP for ${email}: ${otpCode}`);
      return { success: true, message: 'OTP sent to email' };
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send OTP');
    }
  }

  /**
   * Create OTP record in database
   */
  async createOTP(phoneNumber, email = null, purpose = 'login', userId = null) {
    try {
      const otpCode = this.generateOTP();
      const otpHash = this.hashOTP(otpCode);
      const expiryTime = new Date(Date.now() + config.otpExpiry * 60 * 1000);

      const otp = new OTP({
        userId,
        phoneNumber,
        email,
        otpCode,
        otpHash,
        purpose,
        expiryTime,
      });

      await otp.save();

      // Send OTP
      if (phoneNumber) {
        await this.sendOTPviaSMS(phoneNumber, otpCode);
      } else if (email) {
        await this.sendOTPviaEmail(email, otpCode);
      }

      return {
        success: true,
        message: 'OTP sent successfully',
        otpId: otp._id,
      };
    } catch (error) {
      console.error('OTP creation error:', error);
      throw error;
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(phoneNumber, otpCode, otpId) {
    try {
      const otp = await OTP.findById(otpId);

      if (!otp) {
        return {
          isValid: false,
          error: 'OTP not found',
        };
      }

      if (otp.isUsed) {
        return {
          isValid: false,
          error: 'OTP already used',
        };
      }

      if (otp.attempts >= otp.maxAttempts) {
        await OTP.deleteOne({ _id: otpId });
        return {
          isValid: false,
          error: 'Maximum attempts exceeded',
        };
      }

      if (new Date() > otp.expiryTime) {
        return {
          isValid: false,
          error: 'OTP expired',
        };
      }

      const isValid = await this.compareOTP(otpCode, otp.otpHash);

      if (isValid) {
        otp.isUsed = true;
        otp.usedAt = new Date();
        await otp.save();
        return {
          isValid: true,
          message: 'OTP verified successfully',
        };
      } else {
        otp.attempts += 1;
        await otp.save();
        return {
          isValid: false,
          error: 'Invalid OTP',
          attemptsLeft: otp.maxAttempts - otp.attempts,
        };
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      throw error;
    }
  }

  /**
   * Hash OTP for security
   */
  hashOTP(otpCode) {
    return crypto.createHash('sha256').update(otpCode).digest('hex');
  }

  /**
   * Compare OTP with hash
   */
  async compareOTP(otpCode, otpHash) {
    return this.hashOTP(otpCode) === otpHash;
  }

  /**
   * Delete expired OTPs
   */
  async deleteExpiredOTPs() {
    try {
      await OTP.deleteMany({ expiryTime: { $lt: new Date() } });
      console.log('Expired OTPs cleaned up');
    } catch (error) {
      console.error('OTP cleanup error:', error);
    }
  }
}

module.exports = new OTPService();
