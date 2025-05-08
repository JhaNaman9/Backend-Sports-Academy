const app = require('./app');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const seedAdminUser = require('./utils/seedAdmin');

// Load environment variables
dotenv.config();

// Set up global uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Connect to MongoDB and seed admin user
(async () => {
  try {
    const connection = await connectDB();
    if (connection && connection.connection) {
      // Database connected successfully, seed admin user
      await seedAdminUser();
    }
  } catch (error) {
    console.error('Failed to initialize application:', error);
  }
})();

// Start the server
const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port} in ${process.env.NODE_ENV} mode`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM signal
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
}); 