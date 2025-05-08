const User = require('../models/userModel');
const StudentProfile = require('../models/studentProfileModel');
const { catchAsync } = require('../middlewares/errorMiddleware');
const { createTokens, verifyRefreshToken } = require('../utils/jwtUtils');
const { comparePassword, hashToken } = require('../utils/passwordUtils');
const { processSportCategories } = require('../utils/sportCategoryUtils');

/**
 * Register a new user
 * @route POST /api/v1/auth/register
 * @access Public
 */
exports.register = catchAsync(async (req, res) => {
  // Prevent admin creation through the API
  if (req.body.role === 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Admin accounts cannot be created through the API',
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: req.body.email });
  if (existingUser) {
    return res.status(400).json({
      status: 'error',
      message: 'Email already in use',
    });
  }

  // Set user role from request or default to student
  // Mobile app will send userType as "student"
  const role = req.body.role || req.body.userType || 'student';

  // Create new user
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.password, // Use the same password for confirmation
    role: role,
    phone: req.body.phone || req.body.contactNumber,
    approved: role === 'coach' ? false : true, // Coaches need approval, students are auto-approved.
  });

  // If registering as a student, create student profile
  if (role === 'student') {
    // Extract age from the request
    const age = req.body.age ? parseInt(req.body.age) : null;
    
    // Process sport categories - convert names to IDs if needed
    console.log('Processing sport categories:', req.body.sportsCategories || req.body.sportPreferences || []);
    const sportCategoryInput = req.body.sportsCategories || req.body.sportPreferences || [];
    const sportPreferences = await processSportCategories(sportCategoryInput);
    console.log('Processed sport preferences:', sportPreferences);
    
    // Create student profile with the processed sport preferences
    const studentData = {
      user: user._id,
      // Set date of birth based on age if provided
      dateOfBirth: age ? new Date(new Date().getFullYear() - age, 0, 1) : undefined,
      // Use processed sport preferences
      sportPreferences,
      // Other basic info
      gender: req.body.gender || 'prefer not to say',
    };
    
    console.log('Creating student profile with data:', JSON.stringify(studentData));
    const studentProfile = await StudentProfile.create(studentData);
    console.log('Student profile created:', studentProfile._id);
    
    // Fetch the complete profile to verify population
    const completeProfile = await StudentProfile.findById(studentProfile._id)
      .populate({
        path: 'user',
        select: 'name email role approved'
      })
      .populate({
        path: 'sportPreferences',
        select: 'name description'
      });
    
    console.log('Complete student profile:', JSON.stringify(completeProfile));
  }

  // Generate tokens
  const tokens = createTokens({ id: user._id, role: user.role });

  // Remove password from output
  user.password = undefined;

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: {
      user,
      ...tokens,
    },
  });
});

/**
 * Login user
 * @route POST /api/v1/auth/login
 * @access Public
 */
exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  // Check if user exists
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid email or password',
    });
  }

  // Check if password is correct
  const isPasswordValid = await user.correctPassword(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid email or password',
    });
  }

  // Generate tokens
  const tokens = createTokens({ id: user._id, role: user.role });

  // Remove password from output
  user.password = undefined;

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: {
      user,
      ...tokens,
    },
  });
});

/**
 * Refresh access token using refresh token
 * @route POST /api/v1/auth/refresh-token
 * @access Public
 */
exports.refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  // Verify refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired refresh token',
    });
  }

  // Check if user still exists
  const user = await User.findById(decoded.id);
  if (!user) {
    return res.status(401).json({
      status: 'error',
      message: 'The user belonging to this token no longer exists',
    });
  }

  // Generate new tokens
  const tokens = createTokens({ id: user._id, role: user.role });

  res.status(200).json({
    status: 'success',
    message: 'Token refreshed successfully',
    data: tokens,
  });
});

/**
 * Forgot password - send reset token
 * @route POST /api/v1/auth/forgot-password
 * @access Public
 */
exports.forgotPassword = catchAsync(async (req, res) => {
  // Find user by email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'No user found with that email address',
    });
  }

  // Generate reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // In a real app, you would send an email with the token
  // For development, we'll just return it in the response
  
  // Note: In production, you'd use an email service like SendGrid, Mailgun, etc.
  // const resetURL = `${req.protocol}://${req.get('host')}/api/v1/auth/reset-password/${resetToken}`;
  
  try {
    // For now, just return the token
    res.status(200).json({
      status: 'success',
      message: 'Password reset token sent successfully',
      data: {
        resetToken, // In production, you'd not include this in the response
      },
    });
  } catch (err) {
    // If sending email fails, clear the token
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(500).json({
      status: 'error',
      message: 'There was an error sending the password reset email. Please try again later.',
    });
  }
});

/**
 * Reset password using token
 * @route POST /api/v1/auth/reset-password
 * @access Public
 */
exports.resetPassword = catchAsync(async (req, res) => {
  // Get user by reset token
  const hashedToken = hashToken(req.body.token);

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // Check if user exists and token is valid
  if (!user) {
    return res.status(400).json({
      status: 'error',
      message: 'Token is invalid or has expired',
    });
  }

  // Set new password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Log the user in, send JWT
  const tokens = createTokens({ id: user._id, role: user.role });

  res.status(200).json({
    status: 'success',
    message: 'Password reset successful',
    data: {
      user,
      ...tokens,
    },
  });
});

/**
 * Verify email using token
 * @route GET /api/v1/auth/verify-email/:token
 * @access Public
 */
exports.verifyEmail = catchAsync(async (req, res) => {
  // Implementation depends on how you store and handle email verification tokens
  // For example, you might have a verificationToken field in the User model

  // This is a placeholder - adapt to your specific implementation
  const { token } = req.params;
  // Find user by token and mark as verified

  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully (placeholder)',
  });
});

/**
 * Change password for logged-in user
 * @route PATCH /api/v1/auth/change-password
 * @access Private
 */
exports.changePassword = catchAsync(async (req, res) => {
  // Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return res.status(401).json({
      status: 'error',
      message: 'Your current password is incorrect',
    });
  }

  // If so, update password
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPasswordConfirm;
  await user.save();

  // Log user in, send JWT
  const tokens = createTokens({ id: user._id, role: user.role });

  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully',
    data: {
      user,
      ...tokens,
    },
  });
});

/**
 * Get current user profile
 * @route GET /api/v1/auth/me
 * @access Private
 */
exports.getMe = catchAsync(async (req, res) => {
  // Get current user
  const user = await User.findById(req.user.id);

  // Populate virtual fields based on role
  if (user.role === 'coach') {
    await user.populate('coachProfile');
  } else if (user.role === 'student') {
    await user.populate('studentProfile');
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

/**
 * Log out (client-side only)
 * @route POST /api/v1/auth/logout
 * @access Public
 */
exports.logout = (req, res) => {
  // JWT is stateless, no server-side logout needed
  // Client should delete tokens from local storage
  
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
}; 