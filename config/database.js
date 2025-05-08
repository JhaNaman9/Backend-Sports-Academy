const mongoose = require('mongoose');

/**
 * MongoDB connection utility
 * Handles connecting to MongoDB with proper options
 * and provides event listeners for connection status
 */
const connectDB = async () => {
  try {
    let DB_URI = process.env.MONGO_URI;
    
    if (!DB_URI) {
      throw new Error('MongoDB connection string (MONGO_URI) is not defined in .env file');
    }
    
    // Clean up the URI by removing any line breaks or extra spaces
    DB_URI = DB_URI.replace(/\s+/g, '');
    
    const options = {
      // useNewUrlParser and useUnifiedTopology are no longer needed in newer versions of mongoose
      // Auto index creation (can be disabled in production if needed)
      autoIndex: process.env.NODE_ENV === 'development',
    };
    
    const conn = await mongoose.connect(DB_URI, options);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Connection event listeners
    mongoose.connection.on('error', err => {
      console.error(`MongoDB connection error: ${err}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
    
    // Handle application termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    return error;
  }
};

module.exports = connectDB; 