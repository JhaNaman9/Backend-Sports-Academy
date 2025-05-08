const mongoose = require('mongoose');

const progressReportSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Progress report must belong to a student'],
    },
    coach: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Progress report must be created by a coach'],
    },
    sportCategory: {
      type: mongoose.Schema.ObjectId,
      ref: 'SportCategory',
      required: [true, 'Progress report must be associated with a sport category'],
    },
    reportDate: {
      type: Date,
      default: Date.now,
    },
    period: {
      startDate: {
        type: Date,
        required: [true, 'Report period must have a start date'],
      },
      endDate: {
        type: Date,
        required: [true, 'Report period must have an end date'],
        validate: {
          validator: function(endDate) {
            return endDate > this.period.startDate;
          },
          message: 'End date must be after start date',
        },
      },
    },
    title: {
      type: String,
      required: [true, 'Progress report must have a title'],
      trim: true,
      maxlength: [100, 'Title must be less than 100 characters'],
    },
    summary: {
      type: String,
      required: [true, 'Progress report must have a summary'],
      trim: true,
    },
    physicalProgress: {
      type: String,
      trim: true,
    },
    technicalProgress: {
      type: String,
      trim: true,
    },
    tacticalProgress: {
      type: String,
      trim: true,
    },
    mentalProgress: {
      type: String,
      trim: true,
    },
    attendance: {
      totalSessions: {
        type: Number,
        default: 0,
      },
      attendedSessions: {
        type: Number,
        default: 0,
      },
      attendancePercentage: {
        type: Number,
        min: [0, 'Percentage cannot be negative'],
        max: [100, 'Percentage cannot exceed 100'],
      },
    },
    performance: {
      rating: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot be more than 5'],
      },
      strengths: [String],
      weaknesses: [String],
      improvementAreas: [String],
    },
    goals: {
      previousGoals: [{
        description: String,
        achieved: Boolean,
        comments: String,
      }],
      newGoals: [{
        description: String,
        targetDate: Date,
        priority: {
          type: String,
          enum: ['low', 'medium', 'high'],
          default: 'medium',
        },
      }],
    },
    metrics: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    recommendations: {
      type: String,
      trim: true,
    },
    feedback: {
      studentComments: String,
      parentComments: String,
      acknowledgement: {
        acknowledged: {
          type: Boolean,
          default: false,
        },
        date: Date,
        by: {
          type: mongoose.Schema.ObjectId,
          ref: 'User',
        },
      },
    },
    attachments: [{
      name: String,
      fileUrl: String,
      fileType: String,
    }],
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for better query performance
progressReportSchema.index({ student: 1 });
progressReportSchema.index({ coach: 1 });
progressReportSchema.index({ sportCategory: 1 });
progressReportSchema.index({ reportDate: -1 });
progressReportSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });
progressReportSchema.index({ isPublished: 1 });

// Populate references when the document is queried
progressReportSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'student',
    select: 'name email profileImage',
  }).populate({
    path: 'coach',
    select: 'name email profileImage',
  }).populate({
    path: 'sportCategory',
    select: 'name slug',
  });
  next();
});

// Calculate attendance percentage before saving if not provided
progressReportSchema.pre('save', function(next) {
  if (
    this.attendance &&
    this.attendance.totalSessions > 0 &&
    typeof this.attendance.attendancePercentage === 'undefined'
  ) {
    this.attendance.attendancePercentage = Math.round(
      (this.attendance.attendedSessions / this.attendance.totalSessions) * 100
    );
  }
  next();
});

// Virtual field to check if report is acknowledged
progressReportSchema.virtual('isAcknowledged').get(function() {
  return this.feedback && this.feedback.acknowledgement && this.feedback.acknowledgement.acknowledged;
});

// Virtual field to compute period duration in weeks
progressReportSchema.virtual('periodDurationWeeks').get(function() {
  if (!this.period || !this.period.startDate || !this.period.endDate) return 0;
  
  const startDate = new Date(this.period.startDate);
  const endDate = new Date(this.period.endDate);
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.round(diffDays / 7 * 10) / 10; // Round to 1 decimal place
});

// Static method to get latest report for a student
progressReportSchema.statics.getLatestReport = async function(studentId, sportCategoryId) {
  try {
    const query = { 
      student: studentId,
      isPublished: true,
    };
    
    if (sportCategoryId) {
      query.sportCategory = sportCategoryId;
    }
    
    return await this.findOne(query).sort({ reportDate: -1 });
  } catch (err) {
    throw err;
  }
};

// Static method to get reports for a period
progressReportSchema.statics.getReportsForPeriod = async function(studentId, startDate, endDate) {
  try {
    return await this.find({
      student: studentId,
      isPublished: true,
      reportDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).sort({ reportDate: -1 });
  } catch (err) {
    throw err;
  }
};

// Instance method to publish report
progressReportSchema.methods.publishReport = async function() {
  this.isPublished = true;
  return await this.save();
};

// Instance method to acknowledge report
progressReportSchema.methods.acknowledgeReport = async function(userId) {
  if (!this.feedback) {
    this.feedback = {};
  }
  
  if (!this.feedback.acknowledgement) {
    this.feedback.acknowledgement = {};
  }
  
  this.feedback.acknowledgement.acknowledged = true;
  this.feedback.acknowledgement.date = new Date();
  this.feedback.acknowledgement.by = userId;
  
  return await this.save();
};

const ProgressReport = mongoose.model('ProgressReport', progressReportSchema);

module.exports = ProgressReport; 