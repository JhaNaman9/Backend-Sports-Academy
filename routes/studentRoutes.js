const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { validateBody } = require('../middlewares/validationMiddleware');
const router = express.Router();

// Import controller (will create this next)
const studentController = require('../controllers/studentController');

// Test route for debugging - no auth required
router.get('/test', async (req, res) => {
  try {
    const StudentProfile = require('../models/studentProfileModel');
    const students = await StudentProfile.find()
      .populate({
        path: 'user',
        select: 'name email role approved profileImage'
      })
      .populate({
        path: 'sportPreferences',
        select: 'name description'
      });
    
    console.log('Test route found students:', students.length);
    
    res.status(200).json({
      status: 'success',
      message: 'This is a test route for debugging',
      count: students.length,
      data: {
        students
      }
    });
  } catch (err) {
    console.error('Test route error:', err);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

// Student profile routes
router.route('/')
  .get(protect, authorize('admin'), studentController.getAllStudents)
  .post(protect, authorize('admin'), studentController.createStudent);

router.route('/:id')
  .get(protect, studentController.getStudent)
  .patch(protect, authorize('admin', 'student'), studentController.updateStudent)
  .delete(protect, authorize('admin'), studentController.deleteStudent);

// Subscription related routes
router.get('/:id/subscriptions', protect, studentController.getStudentSubscriptions);
router.post('/:id/subscriptions', protect, authorize('admin', 'student'), studentController.createSubscription);

// Training and progress
router.get('/:id/training-sessions', protect, studentController.getStudentTrainingSessions);
router.get('/:id/exercise-plans', protect, studentController.getStudentExercisePlans);
router.get('/:id/progress', protect, studentController.getStudentProgress);

// Activity tracking
router.post('/:id/exercises/complete', protect, authorize('student'), studentController.markExerciseComplete);
router.post('/:id/tasks', protect, authorize('student'), studentController.submitTask);

// Coach assignment
router.patch('/:id/assign-coach/:coachId', protect, authorize('admin'), studentController.assignCoach);

// Tournaments
router.get('/:id/tournaments', protect, studentController.getStudentTournaments);
router.post('/:id/tournaments/:tournamentId/register', protect, authorize('student'), studentController.registerForTournament);

module.exports = router; 