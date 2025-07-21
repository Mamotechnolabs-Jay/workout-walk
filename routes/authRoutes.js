const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authmiddleware } = require('../middlewares/authMiddleware');

// Traditional auth routes
router.post('/register', authController.register);
router.post('/initiate-verification', authController.initiateVerification);
router.post('/verify', authController.verify);
router.post('/login', authController.login);

// Mobile OAuth routes
router.post('/mobile/google', authController.mobileGoogleLogin);
router.post('/mobile/facebook', authController.mobileFacebookLogin);

// Password management routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', authmiddleware, authController.changePassword);

module.exports = router;