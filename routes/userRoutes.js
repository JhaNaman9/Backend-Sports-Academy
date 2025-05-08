const express = require('express');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { uploadProfileImage } = require('../middlewares/uploadMiddleware');
const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Admin only routes
router.use(restrictTo('admin'));

// User management
router.route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router.route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

// Special admin operations
router.get('/pending-approval', userController.getPendingApprovals);
router.patch('/:id/approve', userController.approveUser);

// Assign coach to student
router.post('/:studentId/assign-coach/:coachId', userController.assignCoachToStudent);

module.exports = router; 