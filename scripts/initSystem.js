const mongoose = require('mongoose');
const User = require('../models/userModel');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

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
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for system initialization...');
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    return false;
  }
};

// Seed admin user if not exists
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
    return true;
  } catch (error) {
    console.error('Error seeding admin user:', error);
    return false;
  }
};

// Check if .env file exists, if not create with default values
const checkEnvFile = () => {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('Creating default .env file...');
    
    const envContent = `NODE_ENV=development
PORT=5000

# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/sports-academy

# JWT Authentication
JWT_SECRET=default_jwt_secret_please_change_in_production
REFRESH_TOKEN_SECRET=default_refresh_token_secret_please_change_in_production
JWT_EXPIRES_IN=30d
JWT_COOKIE_EXPIRES_IN=30

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Upload Limits
MAX_FILE_UPLOAD_SIZE=5000000
UPLOAD_PATH=./public/uploads
`;
    
    try {
      fs.writeFileSync(envPath, envContent);
      console.log('.env file created successfully!');
      return true;
    } catch (error) {
      console.error('Error creating .env file:', error);
      return false;
    }
  }
  
  console.log('.env file already exists.');
  return true;
};

// Main initialization function
const initSystem = async () => {
  console.log('Starting system initialization...');
  
  // Check/create .env file
  const envCheck = checkEnvFile();
  if (!envCheck) {
    console.log('Failed to initialize system: .env file issue');
    process.exit(1);
  }
  
  // Connect to database
  const dbConnected = await connectDB();
  if (!dbConnected) {
    console.log('Failed to initialize system: database connection issue');
    process.exit(1);
  }
  
  // Seed admin user
  const adminSeeded = await seedAdmin();
  if (!adminSeeded) {
    console.log('Failed to initialize system: admin user creation issue');
    process.exit(1);
  }
  
  console.log('System initialization completed successfully!');
  process.exit(0);
};

// Run initialization
initSystem(); 