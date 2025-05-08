const express = require('express');
const activityController = require('../controllers/activityController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Routes for all authenticated users
router.get('/', activityController.getAllActivities);
router.get('/stats', activityController.getActivityStats);
router.get('/:id', activityController.getActivity);

// Routes for creating and managing activities
router.post('/', authorize('student', 'coach', 'admin'), activityController.createActivity);
router.patch('/:id', authorize('student', 'coach', 'admin'), activityController.updateActivity);
router.delete('/:id', authorize('student', 'coach', 'admin'), activityController.deleteActivity);

// Special route for tracking area coverage
router.patch('/:id/area', authorize('student', 'coach'), activityController.trackAreaCoverage);

module.exports = router; 