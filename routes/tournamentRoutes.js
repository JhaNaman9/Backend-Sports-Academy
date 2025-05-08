const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { validateBody } = require('../middlewares/validationMiddleware');
const router = express.Router();

// Import controllers
const tournamentController = require('../controllers/tournamentController');
const notificationController = require('../controllers/notificationController');

// Tournament routes
router.route('/')
  .get(tournamentController.getAllTournaments)
  .post(
    protect, 
    authorize('admin'), 
    tournamentController.createTournament
  );

router.route('/:id')
  .get(tournamentController.getTournament)
  .patch(
    protect, 
    authorize('admin'), 
    tournamentController.updateTournament
  )
  .delete(protect, authorize('admin'), tournamentController.deleteTournament);

// Participant management
router.get('/:id/participants', tournamentController.getTournamentParticipants);
router.post('/:id/participants/:studentId', protect, authorize('admin'), tournamentController.addParticipant);
router.delete('/:id/participants/:studentId', protect, authorize('admin'), tournamentController.removeParticipant);

// Notification routes
router.post(
  '/:id/notify',
  protect,
  authorize('admin', 'coach'),
  notificationController.createTournamentNotifications
);

// Google Form management
router.get('/:id/form-responses', protect, authorize('admin'), tournamentController.getFormResponses);
router.post('/:id/form-responses', protect, tournamentController.submitFormResponse);

// Schedule and team assignment
router.post('/:id/schedule', protect, authorize('admin'), tournamentController.updateSchedule);
router.post('/:id/teams', protect, authorize('admin'), tournamentController.assignTeams);

// Tournament notification routes
router.route('/:id/notifications')
  .post(
    protect, 
    authorize('admin'), 
    notificationController.createTournamentNotifications
  );

module.exports = router; 