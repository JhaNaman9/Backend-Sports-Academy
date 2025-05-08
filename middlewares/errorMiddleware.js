/**
 * Central error middleware for handling all errors in the application
 */

// Handle MongoDB duplicate key error (code 11000)
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  return {
    message: `Duplicate field value: ${field}. Please use another value!`,
    statusCode: 400,
  };
};

// Handle Mongoose validation error
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  return {
    message: `Invalid input data: ${errors.join('. ')}`,
    statusCode: 400,
  };
};

// Handle JWT errors
const handleJWTError = () => ({
  message: 'Invalid token. Please log in again!',
  statusCode: 401,
});

const handleJWTExpiredError = () => ({
  message: 'Your token has expired! Please log in again.',
  statusCode: 401,
});

// Send error response in development mode
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

// Send error response in production mode (clean up sensitive info)
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
    });
  }
};

/**
 * Main error handler middleware
 */
exports.errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.code === 11000) error = handleDuplicateKeyError(error);
    if (error.name === 'ValidationError') error = handleValidationError(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

/**
 * Async error handler wrapper to avoid try-catch blocks in controllers
 * @param {Function} fn - Controller function
 * @returns {Function} - Express middleware function
 */
exports.catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}; 