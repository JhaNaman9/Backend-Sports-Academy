const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Notification must have a recipient'],
    },
    sender: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      required: [true, 'Notification must have a type'],
      enum: [
        'tournament_invitation',
        'tournament_reminder',
        'tournament_update',
        'tournament_result',
        'diet_plan_assigned',
        'coach_assigned',
        'activity_feedback',
        'subscription_expiring',
        'system_announcement',
        'welcome',
        'other'
      ],
    },
    title: {
      type: String,
      required: [true, 'Notification must have a title'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification must have a message'],
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    actionLink: {
      type: String,
      trim: true,
    },
    related: {
      model: {
        type: String,
        enum: ['Tournament', 'DietPlan', 'Activity', 'Subscription', 'User', 'Content', null],
      },
      id: {
        type: mongoose.Schema.ObjectId,
      },
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ 'related.model': 1, 'related.id': 1 });

// Pre-find hooks to filter out expired notifications
notificationSchema.pre(/^find/, function(next) {
  // Only apply this filter if it hasn't been explicitly overridden
  if (!this._skipExpiredCheck) {
    this.find({
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });
  }
  next();
});

// Method to skip expired check
notificationSchema.query.includeExpired = function() {
  this._skipExpiredCheck = true;
  return this;
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification; 