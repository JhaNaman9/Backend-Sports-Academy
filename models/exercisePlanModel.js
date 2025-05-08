const mongoose = require('mongoose');

const exercisePlanSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'An exercise plan must have a title'],
      trim: true,
      maxlength: [100, 'Title must be less than 100 characters'],
    },
    description: {
      type: String,
      trim: true,
    },
    coach: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Exercise plan must be created by a coach'],
    },
    sportCategory: {
      type: mongoose.Schema.ObjectId,
      ref: 'SportCategory',
      required: [true, 'Exercise plan must be associated with a sport category'],
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all'],
      default: 'all',
    },
    targetGroups: {
      ageRange: {
        min: {
          type: Number,
          min: [0, 'Minimum age cannot be negative'],
        },
        max: Number,
      },
      gender: {
        type: String,
        enum: ['male', 'female', 'all'],
        default: 'all',
      },
      fitnessLevel: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'all'],
        default: 'all',
      },
    },
    duration: {
      type: Number, // Duration in minutes
      required: [true, 'Exercise plan must have a duration'],
      min: [1, 'Duration must be positive'],
    },
    caloriesBurn: {
      type: Number,
      min: [0, 'Calories burned cannot be negative'],
    },
    exercises: [{
      name: {
        type: String,
        required: [true, 'Exercise must have a name'],
      },
      description: String,
      sets: {
        type: Number,
        min: [1, 'Sets must be at least 1'],
      },
      reps: String, // Can be a range like "10-12" or specific number
      duration: Number, // Duration in seconds
      restTime: Number, // Rest time in seconds
      image: String,
      video: String,
      instructions: [String],
      equipment: [String],
      targetMuscles: [String],
    }],
    warmup: {
      description: String,
      duration: Number, // Duration in minutes
      exercises: [{
        name: String,
        duration: Number, // Duration in seconds
        description: String,
      }],
    },
    cooldown: {
      description: String,
      duration: Number, // Duration in minutes
      exercises: [{
        name: String,
        duration: Number, // Duration in seconds
        description: String,
      }],
    },
    equipmentRequired: [{
      type: String,
      trim: true,
    }],
    isPublic: {
      type: Boolean,
      default: false,
    },
    attachments: [{
      name: String,
      fileUrl: String,
      fileType: String,
    }],
    tags: [String],
    assignedStudents: [{
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for better query performance
exercisePlanSchema.index({ coach: 1 });
exercisePlanSchema.index({ sportCategory: 1 });
exercisePlanSchema.index({ level: 1 });
exercisePlanSchema.index({ 'targetGroups.fitnessLevel': 1 });
exercisePlanSchema.index({ isPublic: 1 });
exercisePlanSchema.index({ tags: 1 });

// Text index for search
exercisePlanSchema.index(
  { title: 'text', description: 'text', tags: 'text', 'exercises.name': 'text' },
  { name: 'exercise_plan_text_index', weights: { title: 3, description: 2, tags: 1, 'exercises.name': 1 } }
);

// Populate references when the document is queried
exercisePlanSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'coach',
    select: 'name email profileImage',
  }).populate({
    path: 'sportCategory',
    select: 'name slug',
  });
  next();
});

// Virtual field for total exercise count
exercisePlanSchema.virtual('exerciseCount').get(function() {
  return this.exercises ? this.exercises.length : 0;
});

// Virtual field for formatted duration
exercisePlanSchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  
  if (hours === 0) {
    return `${minutes} min`;
  }
  
  return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;
});

// Virtual populate for exercise completions
exercisePlanSchema.virtual('completions', {
  ref: 'ExerciseCompletion',
  foreignField: 'exercisePlan',
  localField: '_id',
});

// Static method to find popular exercise plans
exercisePlanSchema.statics.findPopular = async function(limit = 5) {
  try {
    // This would be more sophisticated in a real application,
    // possibly using aggregation to count completions
    return await this.find({ isPublic: true })
      .sort({ createdAt: -1 })
      .limit(limit);
  } catch (err) {
    throw err;
  }
};

const ExercisePlan = mongoose.model('ExercisePlan', exercisePlanSchema);

module.exports = ExercisePlan; 