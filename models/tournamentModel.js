const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tournament must have a name'],
      trim: true,
      maxlength: [100, 'Tournament name must have less than 100 characters'],
    },
    description: {
      type: String,
      trim: true,
    },
    sportCategory: {
      type: mongoose.Schema.ObjectId,
      ref: 'SportCategory',
      required: [true, 'Tournament must be associated with a sport category'],
    },
    startDate: {
      type: Date,
      required: [true, 'Tournament must have a start date'],
    },
    endDate: {
      type: Date,
      required: [true, 'Tournament must have an end date'],
      validate: {
        validator: function(endDate) {
          return endDate > this.startDate;
        },
        message: 'End date must be after start date',
      },
    },
    registrationDeadline: {
      type: Date,
      required: [true, 'Tournament must have a registration deadline'],
      validate: {
        validator: function(deadline) {
          return deadline < this.startDate;
        },
        message: 'Registration deadline must be before start date',
      },
    },
    location: {
      name: {
        type: String,
        required: [true, 'Tournament location name is required'],
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
    status: {
      type: String,
      enum: ['upcoming', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    maxParticipants: {
      type: Number,
      min: [2, 'Tournament must have at least 2 participants'],
    },
    entryFee: {
      amount: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: 'USD',
      },
    },
    prizes: [{
      rank: {
        type: String,
        required: [true, 'Prize rank is required'],
      },
      description: String,
      value: Number,
    }],
    ageGroups: [{
      minAge: {
        type: Number,
        required: [true, 'Age group must have a minimum age'],
        min: [0, 'Minimum age cannot be negative'],
      },
      maxAge: {
        type: Number,
        required: [true, 'Age group must have a maximum age'],
      },
      label: String,
    }],
    organizer: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Tournament must have an organizer'],
    },
    teams: [{
      name: {
        type: String,
        required: [true, 'Team must have a name'],
      },
      coach: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
      participants: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      }],
      status: {
        type: String,
        enum: ['registered', 'confirmed', 'withdrawn'],
        default: 'registered',
      },
    }],
    matches: [{
      round: {
        type: Number,
        required: [true, 'Match must have a round number'],
        min: [1, 'Round number must be at least 1'],
      },
      matchNumber: {
        type: Number,
        required: [true, 'Match must have a match number'],
        min: [1, 'Match number must be at least 1'],
      },
      team1: {
        teamId: mongoose.Schema.ObjectId,
        name: String,
        score: Number,
      },
      team2: {
        teamId: mongoose.Schema.ObjectId,
        name: String,
        score: Number,
      },
      startTime: Date,
      endTime: Date,
      location: String,
      status: {
        type: String,
        enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
        default: 'scheduled',
      },
      winner: mongoose.Schema.ObjectId,
      notes: String,
    }],
    rules: {
      type: String,
      trim: true,
    },
    tournamentImage: {
      type: String,  // URL to the uploaded image
      default: null
    },
    documents: [{
      name: String,
      fileUrl: String,
      fileType: String,
    }],
    formUrl: String, // Google Form URL for tournament registration
    isPublic: {
      type: Boolean,
      default: true,
    },
    tags: [String],
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
tournamentSchema.index({ sportCategory: 1 });
tournamentSchema.index({ startDate: 1, endDate: 1 });
tournamentSchema.index({ status: 1 });
tournamentSchema.index({ 'location.coordinates': '2dsphere' });
tournamentSchema.index({ organizer: 1 });
tournamentSchema.index(
  { name: 'text', description: 'text', tags: 'text' },
  { name: 'tournament_text_index', weights: { name: 3, description: 2, tags: 1 } }
);

// Populate references when the document is queried
tournamentSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'sportCategory',
    select: 'name slug',
  }).populate({
    path: 'organizer',
    select: 'name email',
  });
  next();
});

// Virtual field to check if registration is open
tournamentSchema.virtual('isRegistrationOpen').get(function() {
  const now = new Date();
  return (
    this.status === 'registration_open' &&
    now <= this.registrationDeadline
  );
});

// Virtual field to check if tournament is active
tournamentSchema.virtual('isActive').get(function() {
  const now = new Date();
  return (
    (this.status === 'in_progress' || this.status === 'registration_closed') &&
    now >= this.startDate &&
    now <= this.endDate
  );
});

// Virtual field to get registered team count
tournamentSchema.virtual('registeredTeamCount').get(function() {
  return this.teams ? this.teams.length : 0;
});

// Virtual field to get registered participant count
tournamentSchema.virtual('registeredParticipantCount').get(function() {
  if (!this.teams) return 0;
  
  return this.teams.reduce((count, team) => {
    return count + (team.participants ? team.participants.length : 0);
  }, 0);
});

// Static method to get upcoming tournaments
tournamentSchema.statics.getUpcomingTournaments = async function(limit = 5) {
  try {
    const now = new Date();
    
    return await this.find({
      startDate: { $gt: now },
      status: { $in: ['upcoming', 'registration_open'] },
      isPublic: true,
    })
      .sort({ startDate: 1 })
      .limit(limit);
  } catch (err) {
    throw err;
  }
};

// Static method to find tournaments by sport category
tournamentSchema.statics.findBySportCategory = async function(categoryId) {
  try {
    return await this.find({
      sportCategory: categoryId,
      isPublic: true,
    }).sort({ startDate: -1 });
  } catch (err) {
    throw err;
  }
};

// Method to check if tournament has available slots
tournamentSchema.methods.hasAvailableSlots = function() {
  if (!this.maxParticipants) return true; // No limit set
  return this.registeredParticipantCount < this.maxParticipants;
};

// Method to add a team to the tournament
tournamentSchema.methods.addTeam = async function(teamData) {
  if (!this.isRegistrationOpen) {
    throw new Error('Tournament registration is closed');
  }
  
  if (!this.hasAvailableSlots()) {
    throw new Error('Tournament has reached maximum participant limit');
  }
  
  this.teams.push(teamData);
  return await this.save();
};

// Method to update match results
tournamentSchema.methods.updateMatchResult = async function(matchId, team1Score, team2Score, winnerId) {
  const matchIndex = this.matches.findIndex(match => match._id.toString() === matchId);
  
  if (matchIndex === -1) {
    throw new Error('Match not found');
  }
  
  this.matches[matchIndex].team1.score = team1Score;
  this.matches[matchIndex].team2.score = team2Score;
  this.matches[matchIndex].winner = winnerId;
  this.matches[matchIndex].status = 'completed';
  
  return await this.save();
};

const Tournament = mongoose.model('Tournament', tournamentSchema);

module.exports = Tournament; 