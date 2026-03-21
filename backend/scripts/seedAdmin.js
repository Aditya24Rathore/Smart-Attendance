require('dotenv').config();
const { connectDB } = require('../db');
const { User } = require('../models');
const config = require('../config');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
  try {
    await connectDB();
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: config.admin.email });
    if (existingAdmin) {
      console.log('✓ Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      username: 'admin',
      passwordHash: config.admin.password, // Will be hashed by mongoose pre-save hook
      role: 'admin',
      fullName: 'System Administrator',
      email: config.admin.email,
      isActive: true,
      isVerified: true,
    });

    await adminUser.save();
    console.log('✓ Admin user created successfully');
    console.log(`  Email: ${config.admin.email}`);
    console.log(`  Password: ${config.admin.password}`);
    console.log('  Please change this password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
