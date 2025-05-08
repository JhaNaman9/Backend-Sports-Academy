const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const router = express.Router();

// Import controller
const aiAssistantController = require('../controllers/aiAssistantController');

// Query routes
router.post('/query', protect, aiAssistantController.querySportsAssistant);
router.get('/recent-queries', protect, aiAssistantController.getRecentQueries);

module.exports = router; 