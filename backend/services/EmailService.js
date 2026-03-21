const nodemailer = require('nodemailer');
const config = require('../config');

class EmailService {
  constructor() {
    if (config.smtp.host && config.smtp.user) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: true,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });
    }
  }

  async sendOTPEmail(email, otp) {
    try {
      if (!this.transporter) {
        console.warn('Email service not configured');
        return false;
      }

      const mailOptions = {
        from: config.smtp.user,
        to: email,
        subject: 'Your Smart Attendance OTP',
        html: `
          <h2>Smart Attendance System</h2>
          <p>Your OTP for authentication is:</p>
          <h1>${otp}</h1>
          <p>This OTP is valid for ${config.otpExpiry} minutes.</p>
          <p>Do not share this OTP with anyone.</p>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`OTP email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Email sending error:', error);
      return false;
    }
  }

  async sendWelcomeEmail(email, fullName) {
    try {
      if (!this.transporter) {
        console.warn('Email service not configured');
        return false;
      }

      const mailOptions = {
        from: config.smtp.user,
        to: email,
        subject: 'Welcome to Smart Attendance System',
        html: `
          <h2>Welcome, ${fullName}!</h2>
          <p>You have successfully registered in the Smart Attendance System.</p>
          <p>You can now use the application to mark your attendance.</p>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Email sending error:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
