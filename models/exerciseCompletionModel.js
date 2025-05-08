const mongoose = require('mongoose');

const exerciseCompletionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Exercise completion must belong to a student'],
    },
    exercisePlan: {
      type: mongoose.Schema.ObjectId,
      ref: 'ExercisePlan',
      required: [true, 'Exercise completion must be associated with an exercise plan'],
    },
    completedDate: {
      type: Date,
      default: Date.now,
    },
    completionTime: {
      type: Number, // Duration in minutes
      required: [true, 'Exercise completion must have a completion time'],
      min: [1, 'Completion time must be positive'],
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot be more than 5'],
    },
    difficultyFeedback: {
      type: String,
      enum: ['too_easy', 'appropriate', 'too_difficult'],
    },
    feedback: {
      type: String,
      trim: true,
    },
    area: {
      type: String,
      trim: true,
    },
    caloriesBurned: {
      type: Number,
      min: [0, 'Calories burned cannot be negative'],
    },
    mood: {
      type: String,
      enum: ['great', 'good', 'okay', 'tired', 'exhausted'],
    },
    completedExercises: [{
      exerciseId: String, // Reference to the specific exercise in the plan
      name: String,
      completed: {
        type: Boolean,
        default: true,
      },
      sets: [{
        weight: Number,
        reps: Number,
        completed: Boolean,
      }],
      notes: String,
    }],
    metrics: {
      heartRate: {
        min: Number,
        max: Number,
        average: Number,
      },
      steps: Number,
      distance: Number, // in meters
      pace: Number, // in minutes per kilometer
    },
    photos: [String],
    isPrivate: {
      type: Boolean,
      default: false,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: function(arr) {
            return arr.length === 2;
          },
          message: 'Coordinates must be in the format [longitude, latitude]',
        },
      },
      name: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for better query performance
exerciseCompletionSchema.index({ student: 1 });
exerciseCompletionSchema.index({ exercisePlan: 1 });
exerciseCompletionSchema.index({ completedDate: -1 });
exerciseCompletionSchema.index({ 'location.coordinates': '2dsphere' });

// Populate references when the document is queried
exerciseCompletionSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'student',
    select: 'name email profileImage',
  }).populate({
    path: 'exercisePlan',
    select: 'title description coach sportCategory duration',
  });
  next();
});

// Virtual field for formatted completion time
exerciseCompletionSchema.virtual('formattedCompletionTime').get(function() {
  const hours = Math.floor(this.completionTime / 60);
  const minutes = this.completionTime % 60;
  
  if (hours === 0) {
    return `${minutes} min`;
  }
  
  return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;
});

// Virtual field for completion percentage
exerciseCompletionSchema.virtual('completionPercentage').get(function() {
  if (!this.completedExercises || this.completedExercises.length === 0) return 0;
  
  const totalExercises = this.completedExercises.length;
  const completedExercises = this.completedExercises.filter(ex => ex.completed).length;
  
  return Math.round((completedExercises / totalExercises) * 100);
});

// Static method to track user's progress over time
exerciseCompletionSchema.statics.getProgressOverTime = async function(studentId, startDate, endDate) {
  try {
    const query = { student: studentId };
    
    if (startDate || endDate) {
      query.completedDate = {};
      if (startDate) query.completedDate.$gte = new Date(startDate);
      if (endDate) query.completedDate.$lte = new Date(endDate);
    }
    
    return await this.find(query)
      .sort({ completedDate: 1 })
      .select('completedDate completionTime caloriesBurned exercisePlan metrics');
  } catch (err) {
    throw err;
  }
};

// Static method to get exercise summary statistics
exerciseCompletionSchema.statics.getExerciseSummary = async function(studentId, period = 'week') {
  try {
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }
    
    const completions = await this.find({
      student: studentId,
      completedDate: { $gte: startDate },
    });
    
    const totalWorkouts = completions.length;
    const totalDuration = completions.reduce((acc, curr) => acc + curr.completionTime, 0);
    const totalCalories = completions.reduce((acc, curr) => acc + (curr.caloriesBurned || 0), 0);
    
    return {
      totalWorkouts,
      totalDuration,
      totalCalories,
      averageDuration: totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0,
      averageCalories: totalWorkouts > 0 ? Math.round(totalCalories / totalWorkouts) : 0,
    };
  } catch (err) {
    throw err;
  }
};

const ExerciseCompletion = mongoose.model('ExerciseCompletion', exerciseCompletionSchema);

module.exports = ExerciseCompletion; 