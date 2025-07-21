const express = require('express');
const router = express.Router();
const freeWalkController = require('../controllers/freewalkController');
const { authmiddleware } = require('../middlewares/authMiddleware');

// Get user's walk history and statistics
router.get('/history', authmiddleware, freeWalkController.getFreeWalkHistory);
router.get('/stats', authmiddleware, freeWalkController.getUserStats);

// Start a new walk session
router.post('/start', authmiddleware, freeWalkController.startSession);

// Update walk session progress (real-time updates)
router.put('/:sessionId/progress', authmiddleware, freeWalkController.updateProgress);

// Complete, pause, resume, or cancel a session
router.put('/:sessionId/complete', authmiddleware, freeWalkController.completeSession);
router.put('/:sessionId/pause', authmiddleware, freeWalkController.pauseSession);
router.put('/:sessionId/resume', authmiddleware, freeWalkController.resumeSession);
router.put('/:sessionId/cancel', authmiddleware, freeWalkController.cancelSession);

// Get a specific session
router.get('/:sessionId', authmiddleware, freeWalkController.getSession);

module.exports = router;