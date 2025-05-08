const Notification = require('../models/notificationModel');
const Tournament = require('../models/tournamentModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

/**
 * @desc    Get all notifications for the current user
 * @route   GET /api/v1/notifications
 * @access  Private
 */
exports.getMyNotifications = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;

  // Filter only for current user
  const filter = { recipient: req.user._id };

  // Add read filter if provided
  if (req.query.read !== undefined) {
    filter.read = req.query.read === 'true';
  }

  // Add type filter if provided
  if (req.query.type) {
    filter.type = req.query.type;
  }

  // Get notifications
  const notifications = await Notification.find(filter)
    .populate('sender', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Get total count
  const total = await Notification.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: notifications.length,
    total,
    pagination: {
      page,
      limit,
      pages: Math.ceil(total / limit)
    },
    data: {
      notifications
    }
  });
});

/**
 * @desc    Get a single notification
 * @route   GET /api/v1/notifications/:id
 * @access  Private
 */
exports.getNotification = catchAsync(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id)
    .populate('sender', 'name email');

  if (!notification) {
    return next(new AppError('No notification found with that ID', 404));
  }

  // Check if user is the recipient
  if (notification.recipient.toString() !== req.user._id.toString()) {
    return next(new AppError('You are not authorized to view this notification', 403));
  }

  res.status(200).json({
    status: 'success',
    data: {
      notification
    }
  });
});

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/v1/notifications/:id/read
 * @access  Private
 */
exports.markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(new AppError('No notification found with that ID', 404));
  }

  // Check if user is the recipient
  if (notification.recipient.toString() !== req.user._id.toString()) {
    return next(new AppError('You are not authorized to update this notification', 403));
  }

  notification.read = true;
  await notification.save();

  res.status(200).json({
    status: 'success',
    data: {
      notification
    }
  });
});

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/v1/notifications/mark-all-read
 * @access  Private
 */
exports.markAllAsRead = catchAsync(async (req, res, next) => {
  await Notification.updateMany(
    { recipient: req.user._id, read: false },
    { read: true }
  );

  res.status(200).json({
    status: 'success',
    message: 'All notifications marked as read'
  });
});

/**
 * @desc    Delete a notification
 * @route   DELETE /api/v1/notifications/:id
 * @access  Private
 */
exports.deleteNotification = catchAsync(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(new AppError('No notification found with that ID', 404));
  }

  // Check if user is the recipient
  if (notification.recipient.toString() !== req.user._id.toString()) {
    return next(new AppError('You are not authorized to delete this notification', 403));
  }

  await notification.deleteOne();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

/**
 * @desc    Delete all read notifications
 * @route   DELETE /api/v1/notifications/delete-read
 * @access  Private
 */
exports.deleteReadNotifications = catchAsync(async (req, res, next) => {
  await Notification.deleteMany({ recipient: req.user._id, read: true });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

/**
 * @desc    Get unread notification count
 * @route   GET /api/v1/notifications/unread-count
 * @access  Private
 */
exports.getUnreadCount = catchAsync(async (req, res, next) => {
  const count = await Notification.countDocuments({
    recipient: req.user._id,
    read: false
  });

  res.status(200).json({
    status: 'success',
    data: {
      count
    }
  });
});

/**
 * @desc    Create tournament notifications (ADMIN/COACH only)
 * @route   POST /api/v1/tournaments/:id/notify
 * @access  Private/Admin/Coach
 */
exports.createTournamentNotifications = catchAsync(async (req, res, next) => {
  const tournament = await Tournament.findById(req.params.id);

  if (!tournament) {
    return next(new AppError('No tournament found with that ID', 404));
  }

  const { notificationType, message, recipientType } = req.body;

  if (!notificationType || !message) {
    return next(new AppError('Please provide notification type and message', 400));
  }

  let recipients = [];

  // Determine recipients based on recipientType
  if (recipientType === 'participants') {
    // Get participant IDs from tournament
    recipients = tournament.participants || [];
  } else if (recipientType === 'coaches') {
    // Get all coaches
    const coaches = await User.find({ role: 'coach' }).select('_id');
    recipients = coaches.map(coach => coach._id);
  } else if (recipientType === 'all_students') {
    // Get all students
    const students = await User.find({ role: 'student' }).select('_id');
    recipients = students.map(student => student._id);
  } else if (recipientType === 'specific_users' && req.body.recipientIds) {
    // Use specific user IDs provided
    recipients = req.body.recipientIds;
  }

  if (recipients.length === 0) {
    return next(new AppError('No recipients found for notification', 400));
  }

  // Prepare notification data
  const notificationData = {
    type: `tournament_${notificationType}`,
    title: `Tournament: ${tournament.name}`,
    message,
    sender: req.user._id,
    related: {
      model: 'Tournament',
      id: tournament._id
    },
    actionLink: `/tournaments/${tournament._id}`,
    priority: req.body.priority || 'medium'
  };

  // Set expiry date if provided
  if (req.body.expiresAt) {
    notificationData.expiresAt = new Date(req.body.expiresAt);
  }

  // Create notifications for each recipient
  const notifications = await Promise.all(
    recipients.map(recipient =>
      Notification.create({
        ...notificationData,
        recipient
      })
    )
  );

  res.status(201).json({
    status: 'success',
    results: notifications.length,
    data: {
      notifications
    }
  });
});

/**
 * @desc    Create a system notification (Admin only)
 * @route   POST /api/v1/notifications/system
 * @access  Private/Admin
 */
exports.createSystemNotification = catchAsync(async (req, res, next) => {
  const { title, message, recipientType, recipientIds, priority, expiresAt } = req.body;

  if (!title || !message || !recipientType) {
    return next(new AppError('Please provide title, message and recipient type', 400));
  }

  let recipients = [];

  // Determine recipients based on recipientType
  if (recipientType === 'all') {
    const users = await User.find().select('_id');
    recipients = users.map(user => user._id);
  } else if (recipientType === 'students') {
    const students = await User.find({ role: 'student' }).select('_id');
    recipients = students.map(student => student._id);
  } else if (recipientType === 'coaches') {
    const coaches = await User.find({ role: 'coach' }).select('_id');
    recipients = coaches.map(coach => coach._id);
  } else if (recipientType === 'specific' && recipientIds) {
    recipients = recipientIds;
  }

  if (recipients.length === 0) {
    return next(new AppError('No recipients found for notification', 400));
  }

  // Prepare notification data
  const notificationData = {
    type: 'system_announcement',
    title,
    message,
    sender: req.user._id,
    priority: priority || 'medium'
  };

  // Set expiry date if provided
  if (expiresAt) {
    notificationData.expiresAt = new Date(expiresAt);
  }

  // Create notifications for each recipient
  const notifications = await Promise.all(
    recipients.map(recipient =>
      Notification.create({
        ...notificationData,
        recipient
      })
    )
  );

  res.status(201).json({
    status: 'success',
    results: notifications.length,
    data: {
      notifications
    }
  });
}); 