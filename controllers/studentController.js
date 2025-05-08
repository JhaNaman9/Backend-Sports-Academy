const User = require('../models/userModel');
const StudentProfile = require('../models/studentProfileModel');
const CoachProfile = require('../models/coachProfileModel');
const Subscription = require('../models/subscriptionModel');
const SubscriptionPlan = require('../models/subscriptionPlanModel');
const TrainingSession = require('../models/trainingSessionModel');
const ExercisePlan = require('../models/exercisePlanModel');
const ProgressReport = require('../models/progressReportModel');
const ExerciseCompletion = require('../models/exerciseCompletionModel');
const Tournament = require('../models/tournamentModel');

/**
 * @desc    Get all students
 * @route   GET /api/v1/students
 * @access  Private/Admin
 */
exports.getAllStudents = async (req, res, next) => {
  try {
    // Add debugging to see what's happening
    console.log('Fetching all students');
    
    const students = await StudentProfile.find()
      .populate({
        path: 'user',
        select: 'name email role approved profileImage'
      })
      .populate({
        path: 'sportPreferences',
        select: 'name description'
      });

    console.log(`Found ${students.length} students`);
    
    // Return the data in the format expected by the admin panel
    res.status(200).json({
      status: 'success',
      results: students.length,
      data: {
        students
      }
    });
  } catch (error) {
    console.error('Error in getAllStudents:', error);
    next(error);
  }
};

/**
 * @desc    Create a student profile
 * @route   POST /api/v1/students
 * @access  Private/Admin
 */
exports.createStudent = async (req, res, next) => {
  try {
    // Check if user exists
    const user = await User.findById(req.body.user);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Update user role to student
    user.role = 'student';
    await user.save();

    // Create student profile
    const newStudent = await StudentProfile.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        student: newStudent
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single student
 * @route   GET /api/v1/students/:id
 * @access  Private
 */
exports.getStudent = async (req, res, next) => {
  try {
    const student = await StudentProfile.findById(req.params.id)
      .populate('user', 'name email role')
      .populate('sport', 'name description')
      .populate({
        path: 'assignedCoach',
        populate: {
          path: 'user',
          select: 'name email'
        }
      });

    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student not found'
      });
    }

    // Check permissions - admins can view any student, students can only view themselves
    if (req.user.role === 'student' && req.user.id !== student.user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only view your own profile'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        student
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update student
 * @route   PATCH /api/v1/students/:id
 * @access  Private/Admin/Student
 */
exports.updateStudent = async (req, res, next) => {
  try {
    const student = await StudentProfile.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student not found'
      });
    }

    // Check permissions
    if (req.user.role === 'student' && req.user.id !== student.user.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only update your own profile'
      });
    }

    // If student is updating, restrict what fields can be updated
    if (req.user.role === 'student') {
      const allowedFields = ['emergencyContact', 'medicalInformation', 'preferences'];
      Object.keys(req.body).forEach(key => {
        if (!allowedFields.includes(key)) {
          delete req.body[key];
        }
      });
    }

    const updatedStudent = await StudentProfile.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        student: updatedStudent
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete student
 * @route   DELETE /api/v1/students/:id
 * @access  Private/Admin
 */
exports.deleteStudent = async (req, res, next) => {
  try {
    const student = await StudentProfile.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student not found'
      });
    }

    // Reset user role
    await User.findByIdAndUpdate(student.user, { role: 'user' });

    // Delete student profile
    await student.remove();

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student subscriptions
 * @route   GET /api/v1/students/:id/subscriptions
 * @access  Private
 */
exports.getStudentSubscriptions = async (req, res, next) => {
  try {
    const student = await StudentProfile.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student not found'
      });
    }

    // Check permissions
    if (req.user.role === 'student' && req.user.id !== student.user.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only view your own subscriptions'
      });
    }

    const subscriptions = await Subscription.find({ student: req.params.id })
      .populate('plan', 'name description price duration')
      .populate('sport', 'name description')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: subscriptions.length,
      data: {
        subscriptions
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a subscription for a student
 * @route   POST /api/v1/students/:id/subscriptions
 * @access  Private/Admin/Student
 */
exports.createSubscription = async (req, res, next) => {
  try {
    const student = await StudentProfile.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student not found'
      });
    }

    // Check permissions
    if (req.user.role === 'student' && req.user.id !== student.user.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only create subscriptions for yourself'
      });
    }

    // Validate plan
    const plan = await SubscriptionPlan.findById(req.body.plan);
    if (!plan) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subscription plan not found'
      });
    }

    // Set the student ID in the request body
    req.body.student = req.params.id;

    // Calculate end date based on plan duration
    const startDate = new Date(req.body.startDate || Date.now());
    let endDate = new Date(startDate);
    
    if (plan.durationType === 'days') {
      endDate.setDate(endDate.getDate() + plan.duration);
    } else if (plan.durationType === 'months') {
      endDate.setMonth(endDate.getMonth() + plan.duration);
    } else if (plan.durationType === 'years') {
      endDate.setFullYear(endDate.getFullYear() + plan.duration);
    }
    
    req.body.endDate = endDate;
    req.body.status = 'active';

    // Create subscription
    const subscription = await Subscription.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        subscription
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student training sessions
 * @route   GET /api/v1/students/:id/training-sessions
 * @access  Private
 */
exports.getStudentTrainingSessions = async (req, res, next) => {
  try {
    const student = await StudentProfile.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student not found'
      });
    }

    // Check permissions
    if (req.user.role === 'student' && req.user.id !== student.user.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only view your own training sessions'
      });
    }

    const sessions = await TrainingSession.find({ students: req.params.id })
      .populate('coach', 'user')
      .populate('sport', 'name description')
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
 * @desc    Get student exercise plans
 * @route   GET /api/v1/students/:id/exercise-plans
 * @access  Private
 */
exports.getStudentExercisePlans = async (req, res, next) => {
  try {
    const student = await StudentProfile.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student not found'
      });
    }

    // Check permissions
    if (req.user.role === 'student' && req.user.id !== student.user.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only view your own exercise plans'
      });
    }

    // Get exercise plans assigned to the student
    const plans = await ExercisePlan.find({ 
      $or: [
        { assignedTo: req.params.id },
        { assignedToAll: true, sport: student.sport }
      ]
    })
      .populate('createdBy', 'user')
      .populate('sport', 'name description')
      .sort({ createdAt: -1 });

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
 * @desc    Get student progress
 * @route   GET /api/v1/students/:id/progress
 * @access  Private
 */
exports.getStudentProgress = async (req, res, next) => {
  try {
    const student = await StudentProfile.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student not found'
      });
    }

    // Check permissions
    if (req.user.role === 'student' && req.user.id !== student.user.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only view your own progress'
      });
    }

    // Get progress reports for the student
    const reports = await ProgressReport.find({ student: req.params.id })
      .populate('coach', 'user')
      .sort({ createdAt: -1 });

    // Get completed exercises
    const completedExercises = await ExerciseCompletion.find({ student: req.params.id })
      .populate('exercise', 'title description')
      .sort({ completedAt: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        reports,
        completedExercises
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark an exercise as complete
 * @route   POST /api/v1/students/:id/exercises/complete
 * @access  Private/Student
 */
exports.markExerciseComplete = async (req, res, next) => {
  try {
    const student = await StudentProfile.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student not found'
      });
    }

    // Check permissions
    if (req.user.id !== student.user.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only mark your own exercises as complete'
      });
    }

    // Set the student ID in the request body
    req.body.student = req.params.id;
    req.body.completedAt = new Date();

    // Create exercise completion record
    const completion = await ExerciseCompletion.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        completion
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit a task with time spent and area
 * @route   POST /api/v1/students/:id/tasks
 * @access  Private/Student
 */
exports.submitTask = async (req, res, next) => {
  try {
    const student = await StudentProfile.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student not found'
      });
    }

    // Check permissions
    if (req.user.id !== student.user.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only submit tasks for yourself'
      });
    }

    // Validate required fields
    if (!req.body.timeSpent || !req.body.area || !req.body.exerciseId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide timeSpent, area, and exerciseId'
      });
    }

    // Set the student ID in the request body
    req.body.student = req.params.id;
    req.body.completedAt = new Date();

    // Create exercise completion record with additional fields
    const completion = await ExerciseCompletion.create({
      student: req.params.id,
      exercise: req.body.exerciseId,
      completedAt: new Date(),
      timeSpent: req.body.timeSpent,
      area: req.body.area,
      notes: req.body.notes
    });

    res.status(201).json({
      status: 'success',
      data: {
        completion
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign a coach to a student
 * @route   PATCH /api/v1/students/:id/assign-coach/:coachId
 * @access  Private/Admin
 */
exports.assignCoach = async (req, res, next) => {
  try {
    // Check if student exists
    const student = await StudentProfile.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student not found'
      });
    }

    // Check if coach exists
    const coach = await CoachProfile.findById(req.params.coachId);
    if (!coach) {
      return res.status(404).json({
        status: 'fail',
        message: 'Coach not found'
      });
    }

    // Update student profile with assigned coach
    student.assignedCoach = req.params.coachId;
    await student.save();

    res.status(200).json({
      status: 'success',
      data: {
        student
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get tournaments student is registered for
 * @route   GET /api/v1/students/:id/tournaments
 * @access  Private
 */
exports.getStudentTournaments = async (req, res, next) => {
  try {
    const student = await StudentProfile.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student not found'
      });
    }

    // Check permissions
    if (req.user.role === 'student' && req.user.id !== student.user.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only view your own tournaments'
      });
    }

    const tournaments = await Tournament.find({ participants: req.params.id })
      .populate('sport', 'name description')
      .sort({ startDate: 1 });

    res.status(200).json({
      status: 'success',
      results: tournaments.length,
      data: {
        tournaments
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register for a tournament
 * @route   POST /api/v1/students/:id/tournaments/:tournamentId/register
 * @access  Private/Student
 */
exports.registerForTournament = async (req, res, next) => {
  try {
    // Check if student exists
    const student = await StudentProfile.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student not found'
      });
    }

    // Check permissions
    if (req.user.id !== student.user.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only register yourself for tournaments'
      });
    }

    // Check if tournament exists
    const tournament = await Tournament.findById(req.params.tournamentId);
    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    // Check if student is already registered
    if (tournament.participants.includes(req.params.id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'You are already registered for this tournament'
      });
    }

    // Check if tournament has reached maximum participants
    if (tournament.maxParticipants && tournament.participants.length >= tournament.maxParticipants) {
      return res.status(400).json({
        status: 'fail',
        message: 'Tournament has reached maximum number of participants'
      });
    }

    // Check if tournament has closed registrations
    if (tournament.registrationEndDate && new Date(tournament.registrationEndDate) < new Date()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Tournament registrations have closed'
      });
    }

    // Add student to tournament participants
    tournament.participants.push(req.params.id);
    await tournament.save();

    res.status(200).json({
      status: 'success',
      data: {
        tournament
      }
    });
  } catch (error) {
    next(error);
  }
}; 