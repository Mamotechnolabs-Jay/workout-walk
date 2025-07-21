const express = require('express');
// Make sure you're using express.Router(), not just router
const router = express.Router();
const ActivityController = require('../controllers/activityController');
const { authmiddleware } = require('../middlewares/authMiddleware');

// Use the correct route handler
router.get('/statistics', authmiddleware, ActivityController.getActivityStatistics);

module.exports = router;