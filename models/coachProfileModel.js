const mongoose = require('mongoose');

const coachProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Coach profile must belong to a user'],
      unique: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    expertise: {
      type: [String],
      required: [true, 'Coach must have at least one expertise'],
    },
    experienceYears: {
      type: Number,
      required: [true, 'Experience years is required'],
      min: [0, 'Experience years cannot be negative'],
    },
    certifications: [{
      name: {
        type: String,
        required: [true, 'Certification name is required'],
      },
      issuedBy: String,
      year: Number,
      document: String, // Path to uploaded certificate document
    }],
    specializations: [String],
    availability: {
      monday: [{
        startTime: String,
        endTime: String,
      }],
      tuesday: [{
        startTime: String,
        endTime: String,
      }],
      wednesday: [{
        startTime: String,
        endTime: String,
      }],
      thursday: [{
        startTime: String,
        endTime: String,
      }],
      friday: [{
        startTime: String,
        endTime: String,
      }],
      saturday: [{
        startTime: String,
        endTime: String,
      }],
      sunday: [{
        startTime: String,
        endTime: String,
      }],
    },
    ratingAverage: {
      type: Number,
      default: 0,
      min: [0, 'Rating must be at least 0'],
      max: [5, 'Rating must be at most 5'],
      set: val => Math.round(val * 10) / 10, // Round to 1 decimal place
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    assignedStudents: [{
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    }],
    sportsCategories: [{
      type: mongoose.Schema.ObjectId,
      ref: 'SportCategory',
      required: [true, 'Coach must be associated with at least one sport category'],
    }],
    socialMedia: {
      linkedin: String,
      twitter: String,
      instagram: String,
      facebook: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create index for better query performance
coachProfileSchema.index({ user: 1 });
coachProfileSchema.index({ sportsCategories: 1 });

// Populate user reference with select fields when the document is queried
coachProfileSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name email profileImage',
  }).populate({
    path: 'sportsCategories',
    select: 'name description',
  });
  next();
});

// Virtual populate for training sessions
coachProfileSchema.virtual('trainingSessions', {
  ref: 'TrainingSession',
  foreignField: 'coach',
  localField: '_id',
});

// Virtual populate for exercise plans
coachProfileSchema.virtual('exercisePlans', {
  ref: 'ExercisePlan',
  foreignField: 'coach',
  localField: '_id',
});

const CoachProfile = mongoose.model('CoachProfile', coachProfileSchema);

module.exports = CoachProfile; 