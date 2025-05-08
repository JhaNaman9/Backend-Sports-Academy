require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../models/userModel');

const adminUser = {
  name: 'Admin User',
  email: 'admin@sportsacademy.com',
  password: 'Admin@123',
  passwordConfirm: 'Admin@123',
  role: 'admin',
  approved: true,
  active: true
};

// Print the admin credentials
console.log('\nAdmin User Credentials:');
console.log('======================');
console.log(`Email: ${adminUser.email}`);
console.log(`Password: ${adminUser.password}`);
console.log('======================\n');

const connectDB = async () => {
  try {
    // Clean up MongoDB URI if it contains line breaks or spaces
    const mongoURI = process.env.MONGO_URI.replace(/\s+/g, '');
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error(`\nMongoDB connection error: ${error.message}`);
    console.log('\nFix your MongoDB connection issue:');
    console.log('1. Ensure your IP address is whitelisted in MongoDB Atlas');
    console.log('2. Check that your MongoDB connection string is correct in .env file');
    console.log('3. If your connection string includes line breaks or spaces, fix it in .env file');
    console.log('\nTo whitelist your IP in MongoDB Atlas:');
    console.log('1. Login to MongoDB Atlas (https://cloud.mongodb.com)');
    console.log('2. Navigate to your cluster');
    console.log('3. Click "Network Access" in the sidebar');
    console.log('4. Click "Add IP Address"');
    console.log('5. Click "Add Current IP Address" or enter your IP manually');
    console.log('6. Click "Confirm"');
    return false;
  }
};

const createAdminUser = async () => {
  // Attempt to connect to the database
  const isConnected = await connectDB();
  if (!isConnected) {
    console.log('\nCould not create admin user due to database connection issues.');
    console.log('Fix the connection issues listed above, then run this script again.');
    process.exit(1);
  }

  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: adminUser.email });
    if (existingAdmin) {
      console.log('\nAdmin user already exists.');
      console.log('You can login with the credentials shown above.');
      return;
    }

    // Create new admin user
    const admin = await User.create(adminUser);
    console.log('\nAdmin user created successfully!');
    console.log('You can now login to the admin panel with the credentials shown above.');
  } catch (error) {
    console.error('\nError creating admin user:', error.message);
    if (error.name === 'ValidationError') {
      // Print validation errors
      Object.keys(error.errors).forEach(field => {
        console.log(`- ${field}: ${error.errors[field].message}`);
      });
    }
  } finally {
    // Close the database connection
    await mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
};

createAdminUser(); 