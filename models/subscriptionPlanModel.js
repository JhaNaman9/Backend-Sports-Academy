const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A subscription plan must have a name'],
      unique: true,
      trim: true,
      maxlength: [100, 'A plan name must have less or equal to 100 characters'],
    },
    description: {
      type: String,
      trim: true,
    },
    duration: {
      value: {
        type: Number,
        required: [true, 'A subscription plan must have a duration value'],
        min: [1, 'Duration must be at least 1'],
      },
      unit: {
        type: String,
        required: [true, 'A subscription plan must have a duration unit'],
        enum: ['days', 'weeks', 'months', 'years'],
      },
    },
    price: {
      amount: {
        type: Number,
        required: [true, 'A subscription plan must have a price'],
        min: [0, 'Price must be positive'],
      },
      currency: {
        type: String,
        required: [true, 'Currency is required'],
        default: 'USD',
      },
    },
    features: [{
      type: String,
      trim: true,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    maxSessions: {
      type: Number,
      default: null, // null means unlimited
    },
    trialPeriod: {
      value: {
        type: Number,
        default: 0,
      },
      unit: {
        type: String,
        enum: ['days', 'weeks', 'months'],
        default: 'days',
      },
    },
    sportCategories: [{
      type: mongoose.Schema.ObjectId,
      ref: 'SportCategory',
      required: [true, 'Subscription plan must be associated with at least one sport category'],
    }],
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'pro', 'all'],
      default: 'all',
    },
    allowedCoachSessions: {
      type: Number,
      default: 0, // 0 means no coach sessions included
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    cancellationPolicy: {
      type: String,
      trim: true,
    },
    refundPolicy: {
      type: String,
      trim: true,
    },
    discounts: [{
      code: {
        type: String,
        trim: true,
      },
      percentage: {
        type: Number,
        min: [0, 'Discount percentage must be positive'],
        max: [100, 'Discount percentage cannot exceed 100'],
      },
      validUntil: Date,
      maxUses: Number,
      currentUses: {
        type: Number,
        default: 0,
      },
    }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for better query performance
subscriptionPlanSchema.index({ name: 1 });
subscriptionPlanSchema.index({ price: 1 });
subscriptionPlanSchema.index({ sportCategories: 1 });
subscriptionPlanSchema.index({ isActive: 1 });

// Populate sport categories when the document is queried
subscriptionPlanSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'sportCategories',
    select: 'name slug description image',
  });
  next();
});

// Virtual populate for active subscriptions (instances of this plan)
subscriptionPlanSchema.virtual('activeSubscriptions', {
  ref: 'Subscription',
  foreignField: 'plan',
  localField: '_id',
  // Only count active subscriptions
  match: { status: 'active' },
});

// Virtual field for formatted price
subscriptionPlanSchema.virtual('formattedPrice').get(function() {
  return `${this.price.amount} ${this.price.currency}`;
});

// Virtual field for formatted duration
subscriptionPlanSchema.virtual('formattedDuration').get(function() {
  return `${this.duration.value} ${this.duration.unit}`;
});

// Method to check if a discount code is valid
subscriptionPlanSchema.methods.isDiscountValid = function(code) {
  if (!this.discounts || this.discounts.length === 0) return false;

  const discount = this.discounts.find(d => d.code === code);
  if (!discount) return false;

  // Check if discount is expired
  if (discount.validUntil && new Date() > discount.validUntil) return false;

  // Check if max uses reached
  if (discount.maxUses && discount.currentUses >= discount.maxUses) return false;

  return true;
};

// Method to apply a discount and get discounted price
subscriptionPlanSchema.methods.getDiscountedPrice = function(code) {
  if (!this.isDiscountValid(code)) return this.price.amount;

  const discount = this.discounts.find(d => d.code === code);
  const discountAmount = (discount.percentage / 100) * this.price.amount;
  return parseFloat((this.price.amount - discountAmount).toFixed(2));
};

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

module.exports = SubscriptionPlan; 