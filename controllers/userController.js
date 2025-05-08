const User = require('../models/userModel');
const StudentProfile = require('../models/studentProfileModel');
const CoachProfile = require('../models/coachProfileModel');
const { catchAsync } = require('../middlewares/errorMiddleware');

/**
 * Get all users with filtering and pagination
 * @route GET /api/v1/users
 * @access Private/Admin
 */
exports.getAllUsers = catchAsync(async (req, res) => {
  // Build query
  const queryObj = { ...req.query };
  
  // Fields to exclude from filtering
  const excludedFields = ['page', 'sort', 'limit', 'fields'];
  excludedFields.forEach(field => delete queryObj[field]);
  
  // Filter by role if provided
  if (req.query.role) {
    queryObj.role = req.query.role;
  }
  
  // Filter by approval status if provided
  if (req.query.approved) {
    queryObj.approved = req.query.approved === 'true';
  }

  // Create query
  let query = User.find(queryObj);
  
  // Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Field limiting
  if (req.query.fields) {
    const fields = req.query.fields.split(',').join(' ');
    query = query.select(fields);
  } else {
    query = query.select('-__v');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const totalUsers = await User.countDocuments(queryObj);
  
  query = query.skip(skip).limit(limit);

  // Execute query
  const users = await query;

  res.status(200).json({
    status: 'success',
    results: users.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      totalResults: totalUsers,
      limit,
    },
    data: {
      users,
    },
  });
});

/**
 * Get single user by ID
 * @route GET /api/v1/users/:id
 * @access Private/Admin
 */
exports.getUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found',
    });
  }

  // Populate profile based on role
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
 * Create a new user (admin only)
 * @route POST /api/v1/users
 * @access Private/Admin
 */
exports.createUser = catchAsync(async (req, res) => {
  // Create new user
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role || 'student',
    phone: req.body.phone,
    approved: true, // Admin-created users are auto-approved
  });

  // Remove password from output
  user.password = undefined;

  res.status(201).json({
    status: 'success',
    message: 'User created successfully',
    data: {
      user,
    },
  });
});

/**
 * Update user
 * @route PATCH /api/v1/users/:id
 * @access Private/Admin
 */
exports.updateUser = catchAsync(async (req, res) => {
  // Check if trying to update password
  if (req.body.password || req.body.passwordConfirm) {
    return res.status(400).json({
      status: 'error',
      message: 'This route is not for password updates. Please use /auth/update-password',
    });
  }

  // Filter out unwanted fields
  const filteredBody = filterObj(
    req.body,
    'name',
    'email',
    'phone',
    'approved',
    'role',
    'active',
    'profileImage'
  );

  // Update user
  const updatedUser = await User.findByIdAndUpdate(req.params.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found',
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
    data: {
      user: updatedUser,
    },
  });
});

/**
 * Delete user (soft delete)
 * @route DELETE /api/v1/users/:id
 * @access Private/Admin
 */
exports.deleteUser = catchAsync(async (req, res) => {
  // Soft delete by setting active to false
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { active: false },
    { new: true }
  );

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found',
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'User deleted successfully',
    data: null,
  });
});

/**
 * Approve student registration
 * @route PATCH /api/v1/users/:id/approve
 * @access Private/Admin
 */
exports.approveUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found',
    });
  }

  // Update approval status
  user.approved = true;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'User approved successfully',
    data: {
      user,
    },
  });
});

/**
 * Get pending approval requests
 * @route GET /api/v1/users/pending-approval
 * @access Private/Admin
 */
exports.getPendingApprovals = catchAsync(async (req, res) => {
  const users = await User.find({ approved: false });

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

/**
 * Assign coach to student
 * @route POST /api/v1/users/:studentId/assign-coach/:coachId
 * @access Private/Admin
 */
exports.assignCoachToStudent = catchAsync(async (req, res) => {
  const { studentId, coachId } = req.params;

  // Check if student exists
  const student = await User.findById(studentId);
  if (!student || student.role !== 'student') {
    return res.status(404).json({
      status: 'error',
      message: 'Student not found',
    });
  }

  // Check if coach exists
  const coach = await User.findById(coachId);
  if (!coach || coach.role !== 'coach') {
    return res.status(404).json({
      status: 'error',
      message: 'Coach not found',
    });
  }

  // Update student profile
  const studentProfile = await StudentProfile.findOne({ user: studentId });
  if (!studentProfile) {
    return res.status(404).json({
      status: 'error',
      message: 'Student profile not found',
    });
  }

  // Check if coach is already assigned
  if (studentProfile.assignedCoaches.includes(coachId)) {
    return res.status(400).json({
      status: 'error',
      message: 'Coach is already assigned to this student',
    });
  }

  // Add coach to student
  studentProfile.assignedCoaches.push(coachId);
  await studentProfile.save();

  // Update coach profile
  const coachProfile = await CoachProfile.findOne({ user: coachId });
  if (coachProfile) {
    // Add student to coach if not already added
    if (!coachProfile.assignedStudents.includes(studentId)) {
      coachProfile.assignedStudents.push(studentId);
      await coachProfile.save();
    }
  }

  res.status(200).json({
    status: 'success',
    message: 'Coach assigned to student successfully',
    data: {
      studentProfile,
    },
  });
});

// Helper function to filter object
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
}; 