const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Student profile must belong to a user'],
      unique: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer not to say'],
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },
    medicalInformation: {
      conditions: [String],
      allergies: [String],
      medications: [String],
      notes: String,
    },
    sportPreferences: [{
      type: mongoose.Schema.ObjectId,
      ref: 'SportCategory',
      get: v => v,
      set: v => {
        if (mongoose.isValidObjectId(v)) {
          return v;
        }
        console.log(`Invalid ObjectId for sportPreference: ${v}`);
        return null;
      }
    }],
    currentSubscription: {
      type: mongoose.Schema.ObjectId,
      ref: 'Subscription',
    },
    assignedCoaches: [{
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    }],
    trainingSlots: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      },
      startTime: String,
      endTime: String,
      coach: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    }],
    attendanceStats: {
      totalSessions: {
        type: Number,
        default: 0,
      },
      attendedSessions: {
        type: Number,
        default: 0,
      },
      missedSessions: {
        type: Number,
        default: 0,
      },
    },
    progressMetrics: {
      startingWeight: Number,
      currentWeight: Number,
      weightUnit: {
        type: String,
        enum: ['kg', 'lb'],
        default: 'kg',
      },
      startingHeight: Number,
      currentHeight: Number,
      heightUnit: {
        type: String,
        enum: ['cm', 'in'],
        default: 'cm',
      },
      bodyFatPercentage: Number,
      notes: String,
    },
    goals: [String],
    achievements: [{
      title: String,
      description: String,
      date: Date,
    }],
    registrationDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create index for better query performance
studentProfileSchema.index({ user: 1 });
studentProfileSchema.index({ sportPreferences: 1 });
studentProfileSchema.index({ assignedCoaches: 1 });

// Populate user reference with select fields when the document is queried
studentProfileSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name email profileImage',
  }).populate({
    path: 'sportPreferences',
    select: 'name description',
  });
  next();
});

// Virtual populate for attendance records
studentProfileSchema.virtual('attendanceRecords', {
  ref: 'Attendance',
  foreignField: 'student',
  localField: '_id',
});

// Virtual populate for progress reports
studentProfileSchema.virtual('progressReports', {
  ref: 'ProgressReport',
  foreignField: 'student',
  localField: '_id',
});

// Virtual populate for payment transactions
studentProfileSchema.virtual('transactions', {
  ref: 'Transaction',
  foreignField: 'student',
  localField: '_id',
});

// Virtual populate for exercise completions
studentProfileSchema.virtual('exerciseCompletions', {
  ref: 'ExerciseCompletion',
  foreignField: 'student',
  localField: '_id',
});

// Calculate attendance percentage
studentProfileSchema.virtual('attendancePercentage').get(function() {
  if (this.attendanceStats.totalSessions === 0) return 0;
  return Math.round((this.attendanceStats.attendedSessions / this.attendanceStats.totalSessions) * 100);
});

// Calculate age from date of birth
studentProfileSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);

module.exports = StudentProfile; 