const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { validateBody } = require('../middlewares/validationMiddleware');
const router = express.Router();

// Import controller
const subscriptionController = require('../controllers/subscriptionController');

// Subscription plan routes
router.route('/plans')
  .get(subscriptionController.getAllPlans)
  .post(protect, authorize('admin'), subscriptionController.createPlan);

router.route('/plans/:id')
  .get(subscriptionController.getPlan)
  .patch(protect, authorize('admin'), subscriptionController.updatePlan)
  .delete(protect, authorize('admin'), subscriptionController.deletePlan);

// Active subscriptions routes
router.route('/')
  .get(protect, authorize('admin'), subscriptionController.getAllSubscriptions);

router.route('/:id')
  .get(protect, subscriptionController.getSubscription)
  .patch(protect, authorize('admin'), subscriptionController.updateSubscription)
  .delete(protect, authorize('admin'), subscriptionController.deleteSubscription);

// Transactions routes
router.get('/transactions', protect, authorize('admin'), subscriptionController.getAllTransactions);
router.get('/transactions/:id', protect, subscriptionController.getTransaction);
router.post('/transactions/:subscriptionId', protect, subscriptionController.createTransaction);

// Reports
router.get('/reports/revenue', protect, authorize('admin'), subscriptionController.getRevenueReport);
router.get('/reports/active', protect, authorize('admin'), subscriptionController.getActiveSubscriptionsReport);

module.exports = router; 