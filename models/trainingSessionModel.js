const mongoose = require('mongoose');

const trainingSessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Training session must have a title'],
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
      required: [true, 'Training session must have a coach'],
    },
    sportCategory: {
      type: mongoose.Schema.ObjectId,
      ref: 'SportCategory',
      required: [true, 'Training session must be associated with a sport category'],
    },
    sessionDate: {
      type: Date,
      required: [true, 'Training session must have a date'],
    },
    startTime: {
      type: String,
      required: [true, 'Training session must have a start time'],
      validate: {
        validator: function(v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: props => `${props.value} is not a valid time format! Use HH:MM (24-hour format)`,
      },
    },
    endTime: {
      type: String,
      required: [true, 'Training session must have an end time'],
      validate: {
        validator: function(v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: props => `${props.value} is not a valid time format! Use HH:MM (24-hour format)`,
      },
    },
    duration: {
      type: Number, // Duration in minutes
      min: [1, 'Duration must be positive'],
    },
    location: {
      name: {
        type: String,
        required: [true, 'Location name is required'],
      },
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
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
    },
    capacity: {
      type: Number,
      required: [true, 'Training session must have a capacity'],
      min: [1, 'Capacity must be at least 1'],
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all'],
      default: 'all',
    },
    equipment: [{
      type: String,
      trim: true,
    }],
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrencePattern: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
      },
      interval: {
        type: Number,
        min: [1, 'Interval must be at least 1'],
      },
      endDate: Date,
      daysOfWeek: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      }],
    },
    notes: String,
    attendees: [{
      student: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
      status: {
        type: String,
        enum: ['registered', 'attended', 'absent', 'cancelled'],
        default: 'registered',
      },
      checkInTime: Date,
      checkOutTime: Date,
    }],
    exercisePlan: {
      type: mongoose.Schema.ObjectId,
      ref: 'ExercisePlan',
    },
    feedback: [{
      student: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
      rating: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot be more than 5'],
      },
      comment: String,
      timestamp: {
        type: Date,
        default: Date.now,
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
trainingSessionSchema.index({ coach: 1 });
trainingSessionSchema.index({ sportCategory: 1 });
trainingSessionSchema.index({ sessionDate: 1 });
trainingSessionSchema.index({ status: 1 });
trainingSessionSchema.index({ 'location.coordinates': '2dsphere' });
trainingSessionSchema.index({ level: 1 });

// Calculate duration from start and end time before saving
trainingSessionSchema.pre('save', function(next) {
  if (this.startTime && this.endTime && !this.duration) {
    const [startHour, startMinute] = this.startTime.split(':').map(Number);
    const [endHour, endMinute] = this.endTime.split(':').map(Number);
    
    let durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    
    // Handle case where session ends on the next day
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60;
    }
    
    this.duration = durationMinutes;
  }
  next();
});

// Populate references when the document is queried
trainingSessionSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'coach',
    select: 'name email profileImage',
  }).populate({
    path: 'sportCategory',
    select: 'name slug',
  }).populate({
    path: 'exercisePlan',
    select: 'title description level',
  });
  next();
});

// Virtual field for current attendance count
trainingSessionSchema.virtual('attendanceCount').get(function() {
  if (!this.attendees) return 0;
  return this.attendees.filter(attendee => 
    attendee.status === 'registered' || attendee.status === 'attended'
  ).length;
});

// Virtual field to check if session is full
trainingSessionSchema.virtual('isFull').get(function() {
  return this.attendanceCount >= this.capacity;
});

// Virtual field to check if session is active
trainingSessionSchema.virtual('isActive').get(function() {
  const now = new Date();
  const sessionDate = new Date(this.sessionDate);
  sessionDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return (
    this.status === 'scheduled' &&
    sessionDate.getTime() === today.getTime()
  );
});

// Virtual field for formatted time range
trainingSessionSchema.virtual('timeRange').get(function() {
  return `${this.startTime} - ${this.endTime}`;
});

// Virtual field for average rating
trainingSessionSchema.virtual('averageRating').get(function() {
  if (!this.feedback || this.feedback.length === 0) return 0;
  
  const sum = this.feedback.reduce((acc, curr) => acc + curr.rating, 0);
  return Math.round((sum / this.feedback.length) * 10) / 10; // Round to 1 decimal place
});

// Instance method to register a student for the session
trainingSessionSchema.methods.registerStudent = async function(studentId) {
  if (this.isFull) {
    throw new Error('Training session is full');
  }
  
  if (this.attendees.some(attendee => attendee.student.toString() === studentId.toString())) {
    throw new Error('Student is already registered for this session');
  }
  
  this.attendees.push({
    student: studentId,
    status: 'registered',
  });
  
  return await this.save();
};

// Instance method to mark attendance for a student
trainingSessionSchema.methods.markAttendance = async function(studentId, attended) {
  const attendeeIndex = this.attendees.findIndex(
    attendee => attendee.student.toString() === studentId.toString()
  );
  
  if (attendeeIndex === -1) {
    throw new Error('Student is not registered for this session');
  }
  
  this.attendees[attendeeIndex].status = attended ? 'attended' : 'absent';
  
  if (attended) {
    this.attendees[attendeeIndex].checkInTime = new Date();
  }
  
  return await this.save();
};

// Instance method to add feedback from a student
trainingSessionSchema.methods.addFeedback = async function(studentId, rating, comment) {
  const attendeeIndex = this.attendees.findIndex(
    attendee => attendee.student.toString() === studentId.toString() &&
                attendee.status === 'attended'
  );
  
  if (attendeeIndex === -1) {
    throw new Error('Only students who attended the session can provide feedback');
  }
  
  // Check if student has already given feedback
  const existingFeedbackIndex = this.feedback.findIndex(
    f => f.student.toString() === studentId.toString()
  );
  
  if (existingFeedbackIndex !== -1) {
    // Update existing feedback
    this.feedback[existingFeedbackIndex].rating = rating;
    this.feedback[existingFeedbackIndex].comment = comment;
    this.feedback[existingFeedbackIndex].timestamp = new Date();
  } else {
    // Add new feedback
    this.feedback.push({
      student: studentId,
      rating,
      comment,
      timestamp: new Date(),
    });
  }
  
  return await this.save();
};

// Static method to find upcoming sessions
trainingSessionSchema.statics.findUpcomingSessions = async function(limit = 10) {
  try {
    const now = new Date();
    
    return await this.find({
      sessionDate: { $gte: now },
      status: 'scheduled',
    })
      .sort({ sessionDate: 1, startTime: 1 })
      .limit(limit);
  } catch (err) {
    throw err;
  }
};

const TrainingSession = mongoose.model('TrainingSession', trainingSessionSchema);

module.exports = TrainingSession; 