const User = require('../models/userModel');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Default admin credentials
const DEFAULT_ADMIN = {
  name: 'Admin',
  email: 'admin@sportsacademy.com',
  password: 'Admin@123',
  passwordConfirm: 'Admin@123',
  role: 'admin',
  approved: true
};

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB for admin seeding...'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const seedAdmin = async () => {
  try {
    // Check if admin already exists
    const adminExists = await User.findOne({ email: DEFAULT_ADMIN.email });
    
    if (adminExists) {
      console.log('Admin user already exists, skipping seeding.');
    } else {
      // Create admin user
      await User.create(DEFAULT_ADMIN);
      console.log('Default admin user created successfully!');
      console.log('Email:', DEFAULT_ADMIN.email);
      console.log('Password:', DEFAULT_ADMIN.password);
    }
    
    process.exit();
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  }
};

// Execute the seeding
seedAdmin(); 