const express = require('express');
const sportCategoryController = require('../controllers/sportCategoryController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes (no protection)
router.get('/', sportCategoryController.getAllSportCategories);
router.get('/:id', sportCategoryController.getSportCategory);

// Protected routes
router.use(protect);
router.use(authorize('admin')); // Only admin can create/update/delete sport categories

router.post('/', sportCategoryController.createSportCategory);
router.patch('/:id', sportCategoryController.updateSportCategory);
router.delete('/:id', sportCategoryController.deleteSportCategory);

module.exports = router; 