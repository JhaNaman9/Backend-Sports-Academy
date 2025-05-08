const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Subscription must belong to a student'],
    },
    plan: {
      type: mongoose.Schema.ObjectId,
      ref: 'SubscriptionPlan',
      required: [true, 'Subscription must be based on a plan'],
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: [true, 'Subscription must have an end date'],
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'pending'],
      default: 'pending',
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash', 'other'],
      required: [true, 'Payment method is required'],
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'failed', 'refunded'],
      default: 'pending',
    },
    amountPaid: {
      type: Number,
      required: [true, 'Amount paid is required'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'USD',
    },
    discountApplied: {
      code: String,
      percentage: Number,
      amountSaved: Number,
    },
    invoiceId: String,
    remainingSessions: {
      type: Number,
      default: null, // null means unlimited
    },
    notes: String,
    cancelledAt: Date,
    cancelReason: String,
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for better query performance
subscriptionSchema.index({ student: 1 });
subscriptionSchema.index({ plan: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ startDate: 1, endDate: 1 });

// Pre-save hook to calculate end date based on plan duration if not provided
subscriptionSchema.pre('save', async function(next) {
  if (this.isNew && !this.endDate) {
    try {
      const plan = await this.model('SubscriptionPlan').findById(this.plan);
      
      if (!plan) {
        return next(new Error('Subscription plan not found'));
      }
      
      const startDate = this.startDate || new Date();
      let endDate = new Date(startDate);
      
      // Calculate end date based on plan duration
      switch(plan.duration.unit) {
        case 'days':
          endDate.setDate(endDate.getDate() + plan.duration.value);
          break;
        case 'weeks':
          endDate.setDate(endDate.getDate() + (plan.duration.value * 7));
          break;
        case 'months':
          endDate.setMonth(endDate.getMonth() + plan.duration.value);
          break;
        case 'years':
          endDate.setFullYear(endDate.getFullYear() + plan.duration.value);
          break;
      }
      
      this.endDate = endDate;
      
      // Set remaining sessions based on plan
      if (plan.maxSessions) {
        this.remainingSessions = plan.maxSessions;
      }
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Populate references when the document is queried
subscriptionSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'student',
    select: 'name email',
  }).populate({
    path: 'plan',
    select: 'name description price duration features',
  });
  next();
});

// Virtual populate for transactions
subscriptionSchema.virtual('transactions', {
  ref: 'Transaction',
  foreignField: 'subscription',
  localField: '_id',
});

// Virtual field to check if subscription is active
subscriptionSchema.virtual('isActive').get(function() {
  const now = new Date();
  return (
    this.status === 'active' &&
    now >= this.startDate &&
    now <= this.endDate &&
    (this.remainingSessions === null || this.remainingSessions > 0)
  );
});

// Virtual field to get days remaining
subscriptionSchema.virtual('daysRemaining').get(function() {
  if (this.status !== 'active') return 0;
  
  const now = new Date();
  if (now > this.endDate) return 0;
  
  const diffTime = Math.abs(this.endDate - now);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance method to check if a subscription can be cancelled
subscriptionSchema.methods.canBeCancelled = function() {
  return this.status === 'active';
};

// Instance method to check if a subscription can be renewed
subscriptionSchema.methods.canBeRenewed = function() {
  const now = new Date();
  return (
    (this.status === 'active' || this.status === 'expired') &&
    now > this.endDate.setDate(this.endDate.getDate() - 30) // Can renew 30 days before expiry
  );
};

// Instance method to deduct a session
subscriptionSchema.methods.deductSession = async function() {
  if (this.remainingSessions === null) return true; // Unlimited sessions
  if (this.remainingSessions <= 0) return false;
  
  this.remainingSessions -= 1;
  await this.save();
  return true;
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription; 