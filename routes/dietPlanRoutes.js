const express = require('express');
const dietPlanController = require('../controllers/dietPlanController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Admin-specific route to get all diet plans regardless of coach - must come before more generic routes
router.get('/admin/all', authorize('admin'), async (req, res, next) => {
  try {
    // Remove coach filter for admin
    req.user.role = 'admin';
    next();
  } catch (error) {
    next(error);
  }
}, dietPlanController.getAllDietPlans);

// Routes accessible by coaches and admins
router.get('/', authorize('admin', 'coach'), dietPlanController.getAllDietPlans);
router.get('/:id', dietPlanController.getDietPlan);

// Allow both admins and coaches to create diet plans
router.post('/', authorize('admin', 'coach'), dietPlanController.createDietPlan);

// Allow both admins and coaches to update and delete their own diet plans
router.route('/:id')
  .patch(authorize('admin', 'coach'), dietPlanController.updateDietPlan)
  .delete(authorize('admin', 'coach'), dietPlanController.deleteDietPlan);

// Assign diet plan to students
router.patch('/:id/assign', authorize('admin', 'coach'), dietPlanController.assignDietPlan);

module.exports = router; 