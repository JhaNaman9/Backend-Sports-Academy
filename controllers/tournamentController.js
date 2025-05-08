const Tournament = require('../models/tournamentModel');
const StudentProfile = require('../models/studentProfileModel');
const User = require('../models/userModel');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/imageUtils');

/**
 * @desc    Get all tournaments
 * @route   GET /api/v1/tournaments
 * @access  Public
 */
exports.getAllTournaments = async (req, res, next) => {
  try {
    let query = {};
    
    // Add filtering options
    if (req.query.sport) {
      query.sport = req.query.sport;
    }
    
    if (req.query.upcoming === 'true') {
      query.startDate = { $gte: new Date() };
    }
    
    if (req.query.registrationOpen === 'true') {
      query.registrationDeadline = { $gte: new Date() };
    }

    const tournaments = await Tournament.find(query).sort({ startDate: 1 });

    res.status(200).json({
      status: 'success',
      results: tournaments.length,
      data: {
        tournaments
      }
    });
  } catch (error) {
    console.error("Error in getAllTournaments controller:", error);
    next(error);
  }
};

/**
 * @desc    Create a tournament
 * @route   POST /api/v1/tournaments
 * @access  Private/Admin
 */
exports.createTournament = async (req, res, next) => {
  try {
    const tournamentData = { ...req.body };
    console.log('Creating tournament with data:', JSON.stringify(tournamentData, null, 2));

    // Handle tournamentImage upload to Cloudinary
    if (tournamentData.tournamentImage) {
      console.log('Image data received, attempting to upload to Cloudinary');
      const uploadResult = await uploadToCloudinary(tournamentData.tournamentImage, 'tournaments');
      
      if (uploadResult && uploadResult.secure_url) {
        console.log('Image uploaded successfully:', uploadResult.secure_url);
        tournamentData.tournamentImage = uploadResult.secure_url;
      } else {
        console.error('Failed to upload image to Cloudinary');
        tournamentData.tournamentImage = null;
      }
    } else {
      console.log('No image data received');
    }

    // Parse location if it's a JSON string
    if (tournamentData.location && typeof tournamentData.location === 'string') {
      try {
        tournamentData.location = JSON.parse(tournamentData.location);
      } catch (e) {
        console.error('Error parsing location JSON:', e);
        return next(new Error('Invalid location format provided.'));
      }
    }
    
    // Add the creator information
    if (!req.user || !req.user.id) {
        return next(new Error('User not authenticated or user ID missing.'));
    }
    tournamentData.createdBy = req.user.id;
    tournamentData.updatedBy = req.user.id;
    
    // Ensure organizer is present
    if (!tournamentData.organizer) {
        console.log("Setting organizer from user ID");
        tournamentData.organizer = req.user.id;
    }
    
    // Create the tournament
    const newTournament = await Tournament.create(tournamentData);
    console.log('Tournament created successfully:', newTournament._id);
    
    res.status(201).json({
      status: 'success',
      data: {
        tournament: newTournament
      }
    });
  } catch (error) {
    console.error("Error in createTournament controller:", error);
    next(error);
  }
};

/**
 * @desc    Get a single tournament
 * @route   GET /api/v1/tournaments/:id
 * @access  Public
 */
exports.getTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('sport', 'name description');

    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        tournament
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update tournament
 * @route   PATCH /api/v1/tournaments/:id
 * @access  Private/Admin
 */
exports.updateTournament = async (req, res, next) => {
  try {
    console.log('Updating tournament ID:', req.params.id);
    
    // First retrieve the tournament document
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      console.log('Tournament not found with ID:', req.params.id);
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }
    
    const tournamentData = { ...req.body };
    console.log('Update data received:', JSON.stringify(tournamentData, null, 2));

    // Handle tournamentImage
    if (tournamentData.tournamentImage) {
      // Check if it's a new image (base64 data)
      if (tournamentData.tournamentImage.includes('base64')) {
        console.log('New image received, uploading to Cloudinary');
        
        // Delete old image if it exists
        if (tournament.tournamentImage) {
          console.log('Deleting old image:', tournament.tournamentImage);
          await deleteFromCloudinary(tournament.tournamentImage);
        }
        
        // Upload new image
        const uploadResult = await uploadToCloudinary(tournamentData.tournamentImage, 'tournaments');
        
        if (uploadResult && uploadResult.secure_url) {
          console.log('Image uploaded successfully:', uploadResult.secure_url);
          tournamentData.tournamentImage = uploadResult.secure_url;
        } else {
          console.error('Failed to upload new image');
          tournamentData.tournamentImage = tournament.tournamentImage; // Keep old image
        }
      } else {
        console.log('Keeping existing image URL');
      }
    } else if (tournamentData.tournamentImage === null) {
      // Explicitly set to null, remove image
      console.log('Image explicitly removed');
      if (tournament.tournamentImage) {
        await deleteFromCloudinary(tournament.tournamentImage);
      }
      tournamentData.tournamentImage = null;
    }

    // Parse location if it's a JSON string
    if (tournamentData.location && typeof tournamentData.location === 'string') {
      try {
        tournamentData.location = JSON.parse(tournamentData.location);
      } catch (e) {
        console.error('Error parsing location JSON for update:', e);
        return next(new Error('Invalid location format for update.'));
      }
    }
    
    // Add updater info
    if (req.user && req.user.id) {
      tournamentData.updatedBy = req.user.id;
    }
    
    // Perform date validations
    const startDate = tournamentData.startDate ? new Date(tournamentData.startDate) : tournament.startDate;
    const endDate = tournamentData.endDate ? new Date(tournamentData.endDate) : tournament.endDate;
    const registrationDeadline = tournamentData.registrationDeadline ? new Date(tournamentData.registrationDeadline) : tournament.registrationDeadline;
    
    // Check dates are valid
    if (endDate < startDate) {
      return res.status(400).json({
        status: 'fail',
        message: 'End date must be after start date'
      });
    }
    
    if (registrationDeadline > startDate) {
      return res.status(400).json({
        status: 'fail',
        message: 'Registration deadline must be before start date'
      });
    }
    
    // Update the tournament
    const updatedTournament = await Tournament.findByIdAndUpdate(
      req.params.id, 
      tournamentData, 
      { new: true, runValidators: true }
    );

    console.log('Tournament updated successfully');
    res.status(200).json({
      status: 'success',
      data: {
        tournament: updatedTournament
      }
    });
  } catch (error) {
    console.error("Error in updateTournament controller:", error);
    next(error);
  }
};

/**
 * @desc    Delete tournament
 * @route   DELETE /api/v1/tournaments/:id
 * @access  Private/Admin
 */
exports.deleteTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    // Delete the image from Cloudinary if it exists
    if (tournament.tournamentImage) {
      await deleteFromCloudinary(tournament.tournamentImage);
    }

    await Tournament.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get tournament participants
 * @route   GET /api/v1/tournaments/:id/participants
 * @access  Public
 */
exports.getTournamentParticipants = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    const participants = await StudentProfile.find({
      _id: { $in: tournament.participants }
    })
      .populate('user', 'name')
      .populate('sport', 'name');

    res.status(200).json({
      status: 'success',
      results: participants.length,
      data: {
        participants
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add participant to tournament
 * @route   POST /api/v1/tournaments/:id/participants/:studentId
 * @access  Private/Admin
 */
exports.addParticipant = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    // Check if student exists
    const student = await StudentProfile.findById(req.params.studentId);
    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student not found'
      });
    }

    // Check if student is already registered
    if (tournament.participants.includes(req.params.studentId)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Student is already registered for this tournament'
      });
    }

    // Check if tournament has reached maximum participants
    if (tournament.maxParticipants && tournament.participants.length >= tournament.maxParticipants) {
      return res.status(400).json({
        status: 'fail',
        message: 'Tournament has reached maximum number of participants'
      });
    }

    // Add student to tournament participants
    tournament.participants.push(req.params.studentId);
    await tournament.save();

    res.status(200).json({
      status: 'success',
      data: {
        tournament
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove participant from tournament
 * @route   DELETE /api/v1/tournaments/:id/participants/:studentId
 * @access  Private/Admin
 */
exports.removeParticipant = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    // Check if student is registered
    if (!tournament.participants.includes(req.params.studentId)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Student is not registered for this tournament'
      });
    }

    // Remove student from tournament participants
    tournament.participants = tournament.participants.filter(
      id => id.toString() !== req.params.studentId
    );
    
    await tournament.save();

    res.status(200).json({
      status: 'success',
      data: {
        tournament
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Notify tournament participants
 * @route   POST /api/v1/tournaments/:id/notify
 * @access  Private/Admin
 */
exports.notifyParticipants = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    // Get all participants with their user information
    const participants = await StudentProfile.find({
      _id: { $in: tournament.participants }
    }).populate('user', 'email name');

    // In a real application, you would send emails here
    // For now, we'll just simulate the notification
    
    // Update notification status in tournament
    tournament.notificationsSent = true;
    tournament.lastNotificationDate = new Date();
    await tournament.save();

    res.status(200).json({
      status: 'success',
      message: `Notifications sent to ${participants.length} participants`,
      data: {
        tournament,
        notifiedParticipants: participants.map(p => ({
          id: p._id,
          name: p.user ? p.user.name : 'Unknown',
          email: p.user ? p.user.email : 'Unknown'
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get form responses for a tournament
 * @route   GET /api/v1/tournaments/:id/form-responses
 * @access  Private/Admin
 */
exports.getFormResponses = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    // Check if tournament has a Google Form URL
    if (!tournament.formUrl) {
      return res.status(400).json({
        status: 'fail',
        message: 'This tournament does not have a Google Form configured'
      });
    }

    // Get form responses (currently we're returning the Google Form URL as we don't
    // directly integrate with Google's API yet - this would require OAuth setup)
    res.status(200).json({
      status: 'success',
      data: {
        message: 'View responses directly in Google Forms',
        formUrl: tournament.formUrl,
        formEditUrl: tournament.formUrl.replace('viewform', 'edit'),
        formResponsesUrl: tournament.formUrl.replace('viewform', 'responses')
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit a form response for a tournament
 * @route   POST /api/v1/tournaments/:id/form-responses
 * @access  Private
 */
exports.submitFormResponse = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    // Check if tournament has a Google Form URL
    if (!tournament.formUrl) {
      return res.status(400).json({
        status: 'fail',
        message: 'This tournament does not have a Google Form configured'
      });
    }

    // For now, we'll just provide the form URL - the actual form submission would happen on the frontend
    // through Google's interfaces
    res.status(200).json({
      status: 'success',
      data: {
        message: 'Please use the Google Form URL to submit your response',
        formUrl: tournament.formUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update tournament schedule
 * @route   POST /api/v1/tournaments/:id/schedule
 * @access  Private/Admin
 */
exports.updateSchedule = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    // Update the tournament schedule
    tournament.schedule = req.body.schedule;
    await tournament.save();

    res.status(200).json({
      status: 'success',
      data: {
        tournament
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign teams for a tournament
 * @route   POST /api/v1/tournaments/:id/teams
 * @access  Private/Admin
 */
exports.assignTeams = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    // Update the tournament teams
    tournament.teams = req.body.teams;
    await tournament.save();

    res.status(200).json({
      status: 'success',
      data: {
        tournament
      }
    });
  } catch (error) {
    next(error);
  }
}; 