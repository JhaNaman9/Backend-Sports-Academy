const express = require('express');
const notificationController = require('../controllers/notificationController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all routes
router.use(protect);

// Routes for all authenticated users
router.get('/', notificationController.getMyNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/mark-all-read', notificationController.markAllAsRead);
router.delete('/delete-read', notificationController.deleteReadNotifications);
router.get('/:id', notificationController.getNotification);
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

// Admin only routes
router.post(
  '/system',
  authorize('admin'),
  notificationController.createSystemNotification
);

module.exports = router; 