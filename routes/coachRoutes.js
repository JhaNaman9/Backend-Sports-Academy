const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { validateBody } = require('../middlewares/validationMiddleware');
const { upload, uploadExercisePlan, handleUploadError } = require('../middlewares/uploadMiddleware');
const router = express.Router();

// Import controller (will create this next)
const coachController = require('../controllers/coachController');

// Coach profile routes
router.route('/')
  .get(protect, authorize('admin'), coachController.getAllCoaches)
  .post(protect, authorize('admin'), coachController.createCoach);

router.route('/:id')
  .get(protect, coachController.getCoach)
  .patch(protect, authorize('admin', 'coach'), coachController.updateCoach)
  .delete(protect, authorize('admin'), coachController.deleteCoach);

// Coach schedule management
router.route('/:id/schedule')
  .get(protect, coachController.getCoachSchedule)
  .post(protect, authorize('admin', 'coach'), coachController.updateCoachSchedule);

// Exercise & training plans
router.route('/:id/exercise-plans')
  .get(protect, coachController.getExercisePlans)
  .post(
    protect, 
    authorize('coach'), 
    uploadExercisePlan, 
    handleUploadError,
    coachController.uploadExercisePlan
  );

router.route('/:id/exercise-plans/:planId')
  .get(coachController.getExercisePlan)
  .delete(protect, authorize('coach', 'admin'), coachController.deleteExercisePlan);

// Student management for coaches
router.route('/:id/students')
  .get(protect, authorize('admin', 'coach'), coachController.getCoachStudents);

// Add routes for student assignment
router.route('/:coachId/students/:studentId')
  .post(protect, authorize('admin'), coachController.assignStudentToCoach)
  .delete(protect, authorize('admin'), coachController.removeStudentFromCoach);

module.exports = router; 