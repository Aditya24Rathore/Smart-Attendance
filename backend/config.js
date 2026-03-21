require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MongoDB
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_attendance',
  mongodbUser: process.env.MONGODB_USER,
  mongodbPassword: process.env.MONGODB_PASSWORD,
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  
  // QR Code
  qrRefreshInterval: parseInt(process.env.QR_REFRESH_INTERVAL) || 30000,
  qrEncryptionKey: process.env.QR_ENCRYPTION_KEY || 'your_qr_encryption_key',
  
  // Firebase
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY,
    projectId: process.env.FIREBASE_PROJECT_ID,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  },
  
  // OTP
  otpLength: parseInt(process.env.OTP_LENGTH) || 6,
  otpExpiry: parseInt(process.env.OTP_EXPIRY) || 10, // minutes
  
  // Email (SMTP)
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  
  // Admin
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@smartattendance.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123456',
  },
};
