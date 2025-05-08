const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { validateBody } = require('../middlewares/validationMiddleware');
const { upload, handleUploadError } = require('../middlewares/uploadMiddleware');
const router = express.Router();

// Import controller (will create this next)
const contentController = require('../controllers/contentController');

// Announcements
router.route('/announcements')
  .get(contentController.getAllAnnouncements)
  .post(
    protect, 
    authorize('admin'), 
    upload.single('image'), 
    handleUploadError,
    contentController.createAnnouncement
  );

router.route('/announcements/:id')
  .get(contentController.getAnnouncement)
  .patch(
    protect, 
    authorize('admin'), 
    upload.single('image'), 
    handleUploadError,
    contentController.updateAnnouncement
  )
  .delete(protect, authorize('admin'), contentController.deleteAnnouncement);

// Sports Categories
router.route('/sports')
  .get(contentController.getAllSportsCategories)
  .post(
    protect, 
    authorize('admin'), 
    contentController.createSportsCategory
  );

router.route('/sports/:id')
  .get(contentController.getSportsCategory)
  .patch(
    protect, 
    authorize('admin'), 
    contentController.updateSportsCategory
  )
  .delete(protect, authorize('admin'), contentController.deleteSportsCategory);

// Terms & Policies
router.route('/policies')
  .get(contentController.getAllPolicies)
  .post(protect, authorize('admin'), contentController.createPolicy);

router.route('/policies/:id')
  .get(contentController.getPolicy)
  .patch(protect, authorize('admin'), contentController.updatePolicy)
  .delete(protect, authorize('admin'), contentController.deletePolicy);

module.exports = router; 