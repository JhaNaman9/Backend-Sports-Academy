const jwt = require('jsonwebtoken');
const { catchAsync } = require('./errorMiddleware');
const User = require('../models/userModel');

/**
 * Middleware to check if user is authenticated with a valid JWT token
 */
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get token from header
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    const error = new Error('You are not logged in! Please log in to get access.');
    error.statusCode = 401;
    error.isOperational = true;
    return next(error);
  }

  try {
    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      const error = new Error('The user belonging to this token no longer exists.');
      error.statusCode = 401;
      error.isOperational = true;
      return next(error);
    }

    // 4) Check if user changed password after token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      const error = new Error('User recently changed password! Please log in again.');
      error.statusCode = 401;
      error.isOperational = true;
      return next(error);
    }

    // 5) Grant access to protected route
    req.user = currentUser;
    next();
  } catch (err) {
    const error = new Error('Authentication failed! Please log in again.');
    error.statusCode = 401;
    error.isOperational = true;
    return next(error);
  }
});

/**
 * Middleware to restrict access to specific roles
 * @param  {...String} roles - Roles allowed to access the route
 * @returns {Function} - Express middleware function
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      const error = new Error('You do not have permission to perform this action');
      error.statusCode = 403;
      error.isOperational = true;
      return next(error);
    }
    next();
  };
};

/**
 * Alias for restrictTo to maintain consistent naming in route files
 * @param  {...String} roles - Roles allowed to access the route
 * @returns {Function} - Express middleware function
 */
exports.authorize = (...roles) => {
  return exports.restrictTo(...roles);
};

/**
 * Check if user is admin
 */
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    const error = new Error('Access denied. Admin only.');
    error.statusCode = 403;
    error.isOperational = true;
    return next(error);
  }
  next();
};

/**
 * Check if user is coach
 */
exports.isCoach = (req, res, next) => {
  if (req.user.role !== 'coach') {
    const error = new Error('Access denied. Coach only.');
    error.statusCode = 403;
    error.isOperational = true;
    return next(error);
  }
  next();
};

/**
 * Check if user is student
 */
exports.isStudent = (req, res, next) => {
  if (req.user.role !== 'student') {
    const error = new Error('Access denied. Student only.');
    error.statusCode = 403;
    error.isOperational = true;
    return next(error);
  }
  next();
}; 