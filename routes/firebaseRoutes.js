const express = require('express');
const router = express.Router();
const { authmiddleware } = require('../middlewares/authMiddleware');
const firebaseAuthController = require('../controllers/firebaseauthentication');

// Firebase auth endpoint - gets JWT token after Firebase authentication
router.post('/auth', 
  (req, res, next) => {
    // Set header for middleware to recognize Firebase auth
    req.headers['x-auth-type'] = 'firebase';
    next();
  },
  authmiddleware, 
  firebaseAuthController.handleFirebaseAuth
);

// Get user profile
router.get('/profile',
  (req, res, next) => {
    req.headers['x-auth-type'] = 'firebase';
    next();
  },
  authmiddleware,
  firebaseAuthController.getFirebaseUserProfile
);

module.exports = router;