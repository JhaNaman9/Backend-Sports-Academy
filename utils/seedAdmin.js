const User = require('../models/userModel');

/**
 * Creates a default admin user if no admin exists in the database
 * This function should be called after the database connection is established
 */
const seedAdminUser = async () => {
  try {
    // Check if any admin users exist
    const adminCount = await User.countDocuments({ role: 'admin' });
    
    if (adminCount === 0) {
      console.log('No admin users found. Creating default admin user...');
      
      // Default admin credentials
      const adminData = {
        name: 'Admin User',
        email: 'admin@sportsacademy.com',
        password: 'Admin@123',
        passwordConfirm: 'Admin@123',
        role: 'admin',
        approved: true,
        active: true
      };
      
      // Create the admin user
      await User.create(adminData);
      
      console.log('==============================================');
      console.log('Default admin user created with the following credentials:');
      console.log(`Email: ${adminData.email}`);
      console.log(`Password: ${adminData.password}`);
      console.log('==============================================');
    } else {
      console.log(`${adminCount} admin user(s) already exist in the database`);
    }
  } catch (error) {
    console.error('Error creating default admin user:', error.message);
  }
};

module.exports = seedAdminUser; 