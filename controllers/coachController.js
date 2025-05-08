const User = require('../models/userModel');
const CoachProfile = require('../models/coachProfileModel');
const StudentProfile = require('../models/studentProfileModel');
const ExercisePlan = require('../models/exercisePlanModel');
const TrainingSession = require('../models/trainingSessionModel');
const ProgressReport = require('../models/progressReportModel');
const Attendance = require('../models/attendanceModel');

/**
 * @desc    Get all coaches
 * @route   GET /api/v1/coaches
 * @access  Private/Admin
 */
exports.getAllCoaches = async (req, res, next) => {
  try {
    const coaches = await CoachProfile.find();

    res.status(200).json({
      status: 'success',
      results: coaches.length,
      data: {
        coaches
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a coach profile
 * @route   POST /api/v1/coaches
 * @access  Private/Admin
 */
exports.createCoach = async (req, res, next) => {
  try {
    let user;
    const { name, email, password, phone, bio, expertise, experienceYears, sportsCategories, certifications } = req.body;
    
    // Check if we're creating a new user or using an existing one
    if (req.body.user) {
      // Using existing user - convert to coach
      user = await User.findById(req.body.user);
      
      if (!user) {
        return res.status(404).json({
          status: 'fail',
          message: 'User not found'
        });
      }
      
      // Update user role to coach
      user.role = 'coach';
      user.approved = true;  // Auto-approve coaches
      await user.save({ validateBeforeSave: false });
    } else {
      // Create new user with coach role
      if (!name || !email || !password) {
        return res.status(400).json({
          status: 'fail',
          message: 'Name, email and password are required to create a new coach'
        });
      }
      
      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          status: 'fail',
          message: 'Email already in use'
        });
      }
      
      // Create new user
      user = await User.create({
        name,
        email,
        password,
        passwordConfirm: password, // For validation purposes
        phone,
        role: 'coach',
        approved: true
      });
    }

    // Create coach profile with correct field names matching the model
    const newCoach = await CoachProfile.create({
      user: user._id,
      bio: bio || '',
      expertise: expertise || [],
      experienceYears: experienceYears || 0,
      sportsCategories: sportsCategories || [],
      certifications: certifications || []
    });

    // Fetch the fully populated coach - triggers the pre-find hook
    const populatedCoach = await CoachProfile.findById(newCoach._id);
    
    res.status(201).json({
      status: 'success',
      data: {
        coach: populatedCoach
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single coach
 * @route   GET /api/v1/coaches/:id
 * @access  Private
 */
exports.getCoach = async (req, res, next) => {
  try {
    const coach = await CoachProfile.findById(req.params.id);

    if (!coach) {
      return res.status(404).json({
        status: 'fail',
        message: 'Coach not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        coach
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update coach
 * @route   PATCH /api/v1/coaches/:id
 * @access  Private/Admin/Coach
 */
exports.updateCoach = async (req, res, next) => {
  try {
    // For coaches updating their own profile, restrict what fields can be updated
    if (req.user.role === 'coach' && req.user.id !== req.params.id) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only update your own profile'
      });
    }

    const coach = await CoachProfile.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!coach) {
      return res.status(404).json({
        status: 'fail',
        message: 'Coach not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        coach
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete coach
 * @route   DELETE /api/v1/coaches/:id
 * @access  Private/Admin
 */
exports.deleteCoach = async (req, res, next) => {
  try {
    const coach = await CoachProfile.findById(req.params.id);

    if (!coach) {
      return res.status(404).json({
        status: 'fail',
        message: 'Coach not found'
      });
    }

    // Get the user
    const user = await User.findById(coach.user);
    
    if (user) {
      // Option 1: Reset user role to student
      user.role = 'student';
      await user.save({ validateBeforeSave: false });
      
      // Option 2: Delete the user completely (uncomment if needed)
      // await User.findByIdAndDelete(coach.user);
    }

    // Delete coach profile
    await CoachProfile.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get coach schedule
 * @route   GET /api/v1/coaches/:id/schedule
 * @access  Private
 */
exports.getCoachSchedule = async (req, res, next) => {
  try {
    const sessions = await TrainingSession.find({ coach: req.params.id })
      .populate('sport', 'name')
      .sort({ startTime: 1 });

    res.status(200).json({
      status: 'success',
      results: sessions.length,
      data: {
        sessions
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update coach schedule
 * @route   POST /api/v1/coaches/:id/schedule
 * @access  Private/Admin/Coach
 */
exports.updateCoachSchedule = async (req, res, next) => {
  try {
    // For coaches updating their own schedule
    if (req.user.role === 'coach' && req.user.id !== req.params.id) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only update your own schedule'
      });
    }

    const sessions = await TrainingSession.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        sessions
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get exercise plans created by a coach
 * @route   GET /api/v1/coaches/:id/exercise-plans
 * @access  Private
 */
exports.getExercisePlans = async (req, res, next) => {
  try {
    const plans = await ExercisePlan.find({ createdBy: req.params.id })
      .populate('sport', 'name');

    res.status(200).json({
      status: 'success',
      results: plans.length,
      data: {
        plans
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a specific exercise plan
 * @route   GET /api/v1/coaches/:id/exercise-plans/:planId
 * @access  Private
 */
exports.getExercisePlan = async (req, res, next) => {
  try {
    const plan = await ExercisePlan.findOne({
      _id: req.params.planId,
      createdBy: req.params.id
    }).populate('sport', 'name');

    if (!plan) {
      return res.status(404).json({
        status: 'fail',
        message: 'Exercise plan not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        plan
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an exercise plan
 * @route   DELETE /api/v1/coaches/:id/exercise-plans/:planId
 * @access  Private/Coach/Admin
 */
exports.deleteExercisePlan = async (req, res, next) => {
  try {
    // For coaches deleting their own plans
    if (req.user.role === 'coach' && req.user.id !== req.params.id) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only delete your own plans'
      });
    }

    const plan = await ExercisePlan.findOne({
      _id: req.params.planId,
      createdBy: req.params.id
    });

    if (!plan) {
      return res.status(404).json({
        status: 'fail',
        message: 'Exercise plan not found'
      });
    }

    await plan.deleteOne();

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload a new exercise plan
 * @route   POST /api/v1/coaches/:id/exercise-plans
 * @access  Private/Coach
 */
exports.uploadExercisePlan = async (req, res, next) => {
  try {
    // Only allow coaches to upload for themselves
    if (req.user.role === 'coach' && req.user.id !== req.params.id) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only upload plans for your own profile'
      });
    }

    // Add file path if a file was uploaded
    if (req.file) {
      req.body.documentPath = req.file.path;
    }

    // Set the createdBy field
    req.body.createdBy = req.params.id;

    const plan = await ExercisePlan.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        plan
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get students assigned to a coach
 * @route   GET /api/v1/coaches/:id/students
 * @access  Private/Admin/Coach
 */
exports.getCoachStudents = async (req, res, next) => {
  try {
    // For coaches viewing their own students
    if (req.user.role === 'coach' && req.user.id !== req.params.id) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only view your own students'
      });
    }

    const students = await StudentProfile.find({ assignedCoach: req.params.id })
      .populate('user', 'name email')
      .populate('sport', 'name');

    res.status(200).json({
      status: 'success',
      results: students.length,
      data: {
        students
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Provide feedback to a student
 * @route   POST /api/v1/coaches/:id/students/:studentId/feedback
 * @access  Private/Coach
 */
exports.provideFeedback = async (req, res, next) => {
  try {
    // Only allow coaches to provide feedback for themselves
    if (req.user.role === 'coach' && req.user.id !== req.params.id) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only provide feedback as yourself'
      });
    }

    // Check if student exists and is assigned to this coach
    const student = await StudentProfile.findOne({
      _id: req.params.studentId,
      assignedCoach: req.params.id
    });

    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student not found or not assigned to you'
      });
    }

    // Create progress report with feedback
    const report = await ProgressReport.create({
      student: req.params.studentId,
      coach: req.params.id,
      feedback: req.body.feedback,
      performanceRating: req.body.performanceRating,
      recommendations: req.body.recommendations,
      areas: req.body.areas || []
    });

    res.status(201).json({
      status: 'success',
      data: {
        report
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record student attendance
 * @route   POST /api/v1/coaches/:id/students/:studentId/attendance
 * @access  Private/Coach
 */
exports.recordAttendance = async (req, res, next) => {
  try {
    // Only allow coaches to record attendance for themselves
    if (req.user.role === 'coach' && req.user.id !== req.params.id) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only record attendance as yourself'
      });
    }

    // Check if student exists and is assigned to this coach
    const student = await StudentProfile.findOne({
      _id: req.params.studentId,
      assignedCoach: req.params.id
    });

    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student not found or not assigned to you'
      });
    }

    // Create attendance record
    const attendance = await Attendance.create({
      student: req.params.studentId,
      session: req.body.session,
      coach: req.params.id,
      status: req.body.status,
      notes: req.body.notes
    });

    res.status(201).json({
      status: 'success',
      data: {
        attendance
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign student to coach
 * @route   POST /api/v1/coaches/:coachId/students/:studentId
 * @access  Private/Admin
 */
exports.assignStudentToCoach = async (req, res, next) => {
  try {
    const coach = await CoachProfile.findById(req.params.coachId);
    if (!coach) {
      return res.status(404).json({
        status: 'fail',
        message: 'Coach not found'
      });
    }

    const student = await StudentProfile.findOne({ user: req.params.studentId });
    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student not found'
      });
    }

    // Add student to coach's assignedStudents array if not already there
    if (!coach.assignedStudents.includes(req.params.studentId)) {
      coach.assignedStudents.push(req.params.studentId);
      await coach.save();
    }

    // Update student's assigned coach
    student.assignedCoach = req.params.coachId;
    await student.save();

    res.status(200).json({
      status: 'success',
      message: 'Student assigned to coach successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove student from coach
 * @route   DELETE /api/v1/coaches/:coachId/students/:studentId
 * @access  Private/Admin
 */
exports.removeStudentFromCoach = async (req, res, next) => {
  try {
    const coach = await CoachProfile.findById(req.params.coachId);
    if (!coach) {
      return res.status(404).json({
        status: 'fail',
        message: 'Coach not found'
      });
    }

    const student = await StudentProfile.findOne({ user: req.params.studentId });
    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student not found'
      });
    }

    // Remove student from coach's assignedStudents array
    coach.assignedStudents = coach.assignedStudents.filter(
      id => id.toString() !== req.params.studentId
    );
    await coach.save();

    // Unset student's assigned coach if it's this coach
    if (student.assignedCoach && student.assignedCoach.toString() === req.params.coachId) {
      student.assignedCoach = null;
      await student.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Student removed from coach successfully'
    });
  } catch (error) {
    next(error);
  }
}; 