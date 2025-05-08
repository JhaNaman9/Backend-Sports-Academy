const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Activity must belong to a student'],
    },
    activityType: {
      type: String,
      required: [true, 'Activity type is required'],
      enum: ['training', 'match', 'practice', 'fitness', 'recovery', 'other'],
    },
    title: {
      type: String,
      required: [true, 'Activity must have a title'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Activity must have a start time'],
    },
    endTime: {
      type: Date,
      required: [true, 'Activity must have an end time'],
    },
    duration: {
      type: Number, // Duration in minutes, calculated
    },
    location: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
      name: String,
      address: String,
    },
    distance: {
      value: Number,
      unit: {
        type: String,
        enum: ['meters', 'kilometers', 'miles'],
        default: 'kilometers',
      },
    },
    areaCovered: {
      value: Number, // Area covered in square meters or similar unit
      unit: {
        type: String,
        enum: ['sq_meters', 'sq_kilometers', 'sq_miles', 'acres', 'hectares'],
        default: 'sq_meters',
      },
    },
    performance: {
      rating: {
        type: Number,
        min: 1,
        max: 10,
      },
      notes: String,
    },
    intensity: {
      type: Number,
      min: 1,
      max: 10,
    },
    caloriesBurned: Number,
    heartRate: {
      average: Number,
      max: Number,
      min: Number,
    },
    coach: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    sportCategory: {
      type: mongoose.Schema.ObjectId,
      ref: 'SportCategory',
    },
    status: {
      type: String,
      enum: ['planned', 'in-progress', 'completed', 'canceled'],
      default: 'planned',
    },
    attachments: [
      {
        name: String,
        fileUrl: String,
        fileType: String,
      },
    ],
    tags: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
activitySchema.index({ student: 1, startTime: -1 });
activitySchema.index({ coach: 1 });
activitySchema.index({ sportCategory: 1 });
activitySchema.index({ location: '2dsphere' });

// Virtual field for formatted duration
activitySchema.virtual('formattedDuration').get(function() {
  if (!this.duration) return 'Not available';
  
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  
  if (hours === 0) return `${minutes} minutes`;
  return `${hours}h ${minutes}m`;
});

// Pre-save middleware to calculate duration
activitySchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    const durationMs = this.endTime - this.startTime;
    this.duration = Math.round(durationMs / 60000); // Convert to minutes
  }
  next();
});

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity; 