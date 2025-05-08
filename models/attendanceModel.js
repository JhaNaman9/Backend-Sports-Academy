const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Attendance must belong to a student'],
    },
    coach: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Attendance must have a coach'],
    },
    session: {
      type: mongoose.Schema.ObjectId,
      ref: 'TrainingSession',
    },
    sessionDate: {
      type: Date,
      required: [true, 'Attendance must have a session date'],
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      required: [true, 'Attendance status is required'],
    },
    checkInTime: Date,
    checkOutTime: Date,
    duration: {
      type: Number, // Duration in minutes
      min: [0, 'Duration cannot be negative'],
    },
    notes: String,
    location: {
      type: String,
      trim: true,
    },
    sportCategory: {
      type: mongoose.Schema.ObjectId,
      ref: 'SportCategory',
    },
    lateReason: String,
    absenceReason: String,
    markedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    performance: {
      type: String,
      enum: ['excellent', 'good', 'average', 'needs_improvement', 'poor'],
    },
    performanceNotes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for better query performance
attendanceSchema.index({ student: 1 });
attendanceSchema.index({ coach: 1 });
attendanceSchema.index({ session: 1 });
attendanceSchema.index({ sessionDate: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ sportCategory: 1 });

// Populate references when the document is queried
attendanceSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'student',
    select: 'name email profileImage',
  }).populate({
    path: 'coach',
    select: 'name email profileImage',
  }).populate({
    path: 'sportCategory',
    select: 'name',
  });
  next();
});

// Virtual field to check if attendance is marked late
attendanceSchema.virtual('isLate').get(function() {
  return this.status === 'late';
});

// Update studentProfile attendance stats when saving attendance
attendanceSchema.post('save', async function() {
  try {
    const StudentProfile = mongoose.model('StudentProfile');
    const studentProfile = await StudentProfile.findOne({ user: this.student });
    
    if (!studentProfile) return;
    
    // Increment total sessions
    if (!studentProfile.attendanceStats.totalSessions) {
      studentProfile.attendanceStats.totalSessions = 0;
    }
    studentProfile.attendanceStats.totalSessions += 1;
    
    // Update attended or missed sessions based on status
    if (this.status === 'present' || this.status === 'late') {
      if (!studentProfile.attendanceStats.attendedSessions) {
        studentProfile.attendanceStats.attendedSessions = 0;
      }
      studentProfile.attendanceStats.attendedSessions += 1;
    } else {
      if (!studentProfile.attendanceStats.missedSessions) {
        studentProfile.attendanceStats.missedSessions = 0;
      }
      studentProfile.attendanceStats.missedSessions += 1;
    }
    
    await studentProfile.save();
  } catch (err) {
    console.error('Error updating student attendance stats:', err);
  }
});

// Static method to get attendance stats for a student
attendanceSchema.statics.getStudentAttendanceStats = async function(studentId, startDate, endDate) {
  try {
    const query = { student: studentId };
    
    if (startDate || endDate) {
      query.sessionDate = {};
      if (startDate) query.sessionDate.$gte = new Date(startDate);
      if (endDate) query.sessionDate.$lte = new Date(endDate);
    }
    
    const attendanceRecords = await this.find(query);
    
    const totalSessions = attendanceRecords.length;
    const presentSessions = attendanceRecords.filter(record => record.status === 'present').length;
    const lateSessions = attendanceRecords.filter(record => record.status === 'late').length;
    const absentSessions = attendanceRecords.filter(record => record.status === 'absent').length;
    const excusedSessions = attendanceRecords.filter(record => record.status === 'excused').length;
    
    const attendancePercentage = totalSessions > 0 
      ? Math.round(((presentSessions + lateSessions) / totalSessions) * 100) 
      : 0;
    
    return {
      totalSessions,
      presentSessions,
      lateSessions,
      absentSessions,
      excusedSessions,
      attendancePercentage,
    };
  } catch (err) {
    throw err;
  }
};

// Static method to get coach's class attendance
attendanceSchema.statics.getCoachClassAttendance = async function(coachId, sessionDate) {
  try {
    const startOfDay = new Date(sessionDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(sessionDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await this.find({
      coach: coachId,
      sessionDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    }).sort({ checkInTime: 1 });
  } catch (err) {
    throw err;
  }
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance; 