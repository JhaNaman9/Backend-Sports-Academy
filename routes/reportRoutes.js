const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const router = express.Router();

// Import controller
const reportController = require('../controllers/reportController');

// Reporting and analytics routes
router.get('/students/total', protect, authorize('admin'), reportController.getTotalStudentsReport);
router.get('/students/engagement', protect, authorize('admin'), reportController.getStudentEngagementReport);

router.get('/coaches/performance', protect, authorize('admin'), reportController.getCoachPerformanceReport);

router.get('/subscriptions/active', protect, authorize('admin'), reportController.getActiveSubscriptionsReport);
router.get('/subscriptions/revenue', protect, authorize('admin'), reportController.getRevenueReport);

router.get('/sports/popularity', protect, authorize('admin'), reportController.getSportsPopularityReport);

router.get('/tournaments/participation', protect, authorize('admin'), reportController.getTournamentParticipationReport);

// Export dashboard summary data
router.get('/dashboard/summary', protect, authorize('admin'), reportController.getDashboardSummary);

module.exports = router; 