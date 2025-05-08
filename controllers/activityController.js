const Activity = require('../models/activityModel');
const User = require('../models/userModel');
const AppError = require('../utils/appError');

/**
 * @desc    Get all activities (filtered by student or coach)
 * @route   GET /api/v1/activities
 * @access  Private
 */
exports.getAllActivities = async (req, res, next) => {
  try {
    let filter = {};

    // If student is requesting, show only their activities
    if (req.user.role === 'student') {
      filter.student = req.user._id;
    }

    // If coach is requesting, show activities for their students
    if (req.user.role === 'coach') {
      // Option 1: Show activities where the coach is explicitly assigned
      filter.coach = req.user._id;
      
      // Option 2: Show activities for all students assigned to this coach
      // This would require a more complex query joining with student-coach assignments
    }

    // Apply date filters if provided
    if (req.query.startDate) {
      filter.startTime = { $gte: new Date(req.query.startDate) };
    }
    
    if (req.query.endDate) {
      filter.endTime = { ...filter.endTime, $lte: new Date(req.query.endDate) };
    }

    // Apply activity type filter if provided
    if (req.query.activityType) {
      filter.activityType = req.query.activityType;
    }

    // Apply sport category filter if provided
    if (req.query.sportCategory) {
      filter.sportCategory = req.query.sportCategory;
    }

    const activities = await Activity.find(filter)
      .populate('student', 'name email')
      .populate('coach', 'name email')
      .populate('sportCategory', 'name')
      .sort({ startTime: -1 }); // Sort by latest activities first

    res.status(200).json({
      status: 'success',
      results: activities.length,
      data: {
        activities
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single activity
 * @route   GET /api/v1/activities/:id
 * @access  Private
 */
exports.getActivity = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('student', 'name email')
      .populate('coach', 'name email')
      .populate('sportCategory', 'name');

    if (!activity) {
      return next(new AppError('No activity found with that ID', 404));
    }

    // Check if user has permission to view this activity
    if (
      req.user.role === 'student' && 
      activity.student._id.toString() !== req.user._id.toString()
    ) {
      return next(new AppError('You do not have permission to view this activity', 403));
    }

    res.status(200).json({
      status: 'success',
      data: {
        activity
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new activity
 * @route   POST /api/v1/activities
 * @access  Private
 */
exports.createActivity = async (req, res, next) => {
  try {
    // If student is creating activity, set student to current user
    if (req.user.role === 'student') {
      req.body.student = req.user._id;
    }

    // If coach is creating activity, ensure student exists
    if (req.user.role === 'coach' && req.body.student) {
      const student = await User.findOne({ 
        _id: req.body.student,
        role: 'student'
      });
      
      if (!student) {
        return next(new AppError('No student found with that ID', 404));
      }
      
      // Set coach to current user
      req.body.coach = req.user._id;
    }

    const newActivity = await Activity.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        activity: newActivity
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an activity
 * @route   PATCH /api/v1/activities/:id
 * @access  Private
 */
exports.updateActivity = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return next(new AppError('No activity found with that ID', 404));
    }

    // Check if user has permission to update this activity
    if (
      req.user.role === 'student' && 
      activity.student.toString() !== req.user._id.toString()
    ) {
      return next(new AppError('You do not have permission to update this activity', 403));
    }

    if (
      req.user.role === 'coach' && 
      activity.coach && 
      activity.coach.toString() !== req.user._id.toString()
    ) {
      return next(new AppError('You can only update activities you are assigned to as a coach', 403));
    }

    const updatedActivity = await Activity.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('student', 'name email')
      .populate('coach', 'name email')
      .populate('sportCategory', 'name');

    res.status(200).json({
      status: 'success',
      data: {
        activity: updatedActivity
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an activity
 * @route   DELETE /api/v1/activities/:id
 * @access  Private
 */
exports.deleteActivity = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return next(new AppError('No activity found with that ID', 404));
    }

    // Check if user has permission to delete this activity
    if (
      req.user.role === 'student' && 
      activity.student.toString() !== req.user._id.toString()
    ) {
      return next(new AppError('You do not have permission to delete this activity', 403));
    }

    if (
      req.user.role === 'coach' && 
      activity.coach && 
      activity.coach.toString() !== req.user._id.toString()
    ) {
      return next(new AppError('You can only delete activities you are assigned to as a coach', 403));
    }

    await Activity.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get activity statistics
 * @route   GET /api/v1/activities/stats
 * @access  Private
 */
exports.getActivityStats = async (req, res, next) => {
  try {
    let filter = {};

    // If student is requesting, show only their stats
    if (req.user.role === 'student') {
      filter.student = req.user._id;
    }

    // Filter by date range if provided
    if (req.query.startDate) {
      filter.startTime = { $gte: new Date(req.query.startDate) };
    }
    
    if (req.query.endDate) {
      filter.endTime = { ...filter.endTime, $lte: new Date(req.query.endDate) };
    }

    const stats = await Activity.aggregate([
      {
        $match: filter
      },
      {
        $group: {
          _id: '$activityType',
          count: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          avgDuration: { $avg: '$duration' },
          totalCaloriesBurned: { $sum: '$caloriesBurned' },
          avgIntensity: { $avg: '$intensity' },
          avgPerformanceRating: { $avg: '$performance.rating' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get activities by student
 * @route   GET /api/v1/students/:id/activities
 * @access  Private/Coach/Admin
 */
exports.getStudentActivities = async (req, res, next) => {
  try {
    // Check if student exists
    const student = await User.findOne({ 
      _id: req.params.id,
      role: 'student'
    });
    
    if (!student) {
      return next(new AppError('No student found with that ID', 404));
    }

    // If coach is requesting, ensure they are assigned to this student
    // This would require a student-coach assignment model check
    // For now, allowing any coach to view any student's activities

    const activities = await Activity.find({ student: req.params.id })
      .populate('coach', 'name email')
      .populate('sportCategory', 'name')
      .sort({ startTime: -1 });

    res.status(200).json({
      status: 'success',
      results: activities.length,
      data: {
        activities
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Track student's area coverage during activity
 * @route   PATCH /api/v1/activities/:id/area
 * @access  Private
 */
exports.trackAreaCoverage = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return next(new AppError('No activity found with that ID', 404));
    }

    // Check if user has permission to update this activity
    if (
      req.user.role === 'student' && 
      activity.student.toString() !== req.user._id.toString()
    ) {
      return next(new AppError('You do not have permission to update this activity', 403));
    }

    // Update area coverage
    const { value, unit } = req.body;
    
    if (!value || !unit) {
      return next(new AppError('Please provide area value and unit', 400));
    }

    activity.areaCovered = {
      value,
      unit
    };

    await activity.save();

    res.status(200).json({
      status: 'success',
      data: {
        activity
      }
    });
  } catch (error) {
    next(error);
  }
}; 