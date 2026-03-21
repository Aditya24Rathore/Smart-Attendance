require('dotenv').config();
const { connectDB } = require('../db');
const { OTP } = require('../models');

const clearExpiredOTPs = async () => {
  try {
    await connectDB();
    
    const result = await OTP.deleteMany({
      expiryTime: { $lt: new Date() },
    });

    console.log(`✓ Deleted ${result.deletedCount} expired OTP records`);
    process.exit(0);
  } catch (error) {
    console.error('✗ Error clearing expired OTPs:', error);
    process.exit(1);
  }
};

// Run every hour to clean up expired OTPs
setInterval(clearExpiredOTPs, 60 * 60 * 1000);

// Run immediately on start
clearExpiredOTPs();
