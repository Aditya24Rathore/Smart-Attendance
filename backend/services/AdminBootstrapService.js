const { User } = require('../models');
const config = require('../config');

const ensureAdminAccount = async () => {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' }).select('_id username email');
    if (existingAdmin) {
      console.log(`✓ Admin account exists (${existingAdmin.username})`);
      return;
    }

    if (!config.admin.password) {
      console.warn('⚠️ ADMIN_PASSWORD is not set. Skipping admin bootstrap.');
      return;
    }

    const username = 'admin';
    const email = config.admin.email || 'admin@smartattendance.com';

    const usernameTaken = await User.findOne({ username }).select('_id');
    if (usernameTaken) {
      console.warn('⚠️ Username "admin" already exists but no admin role account found. Skipping admin bootstrap.');
      return;
    }

    const emailTaken = await User.findOne({ email }).select('_id');
    if (emailTaken) {
      console.warn(`⚠️ Email "${email}" already exists but no admin role account found. Skipping admin bootstrap.`);
      return;
    }

    const adminUser = new User({
      username,
      passwordHash: config.admin.password,
      role: 'admin',
      fullName: 'System Administrator',
      email,
      isActive: true,
      isVerified: true,
    });

    await adminUser.save();
    console.log(`✓ Admin account auto-created (${username})`);
  } catch (error) {
    console.error('✗ Failed to bootstrap admin account:', error.message);
  }
};

module.exports = {
  ensureAdminAccount,
};
