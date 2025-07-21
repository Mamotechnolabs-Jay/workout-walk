const express = require('express');
const router = express.Router();
const activityInsightController = require('../controllers/activityInsightController');
const {authmiddleware} = require('../middlewares/authMiddleware'); // Assuming you have auth middleware

// Get best results insights
router.get('/best-results', authmiddleware,activityInsightController.getBestResults);

// Get activity trends
router.get('/trends', authmiddleware,activityInsightController.getTrends);

// Get my day insights
router.get('/my-day', authmiddleware,activityInsightController.getMyDay);

module.exports = router;