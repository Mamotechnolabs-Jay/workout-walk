const jwt = require('jsonwebtoken');
const User = require('../models/User');
const admin = require('../config/firebase'); // You'll need to create this file

const authmiddleware = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      
      // Check auth type from headers
      const authType = req.headers['x-auth-type'] || 'jwt';
      
      if (authType === 'firebase') {
        // FIREBASE AUTHENTICATION FLOW
        
        // Verify Firebase token
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Find user by Firebase UID
        let user = await User.findOne({ firebaseUid: decodedToken.uid });
        
        if (!user) {
          // If user not found by Firebase UID, try to find by email
          if (decodedToken.email) {
            user = await User.findOne({ email: decodedToken.email });
            
            if (user) {
              // User exists with this email, update with Firebase info
              user.firebaseUid = decodedToken.uid;
              user.provider = decodedToken.firebase.sign_in_provider;
              user.isVerified = true;
              
              // If using Google via Firebase, update googleId
              if (decodedToken.firebase.sign_in_provider === 'google.com' && !user.googleId) {
                user.googleId = decodedToken.uid;
              }
              
              // If using Facebook via Firebase, update facebookId
              if (decodedToken.firebase.sign_in_provider === 'facebook.com' && !user.facebookId) {
                user.facebookId = decodedToken.uid;
              }
              
              await user.save();
            }
          }
          
          // If still no user, create a new one
          if (!user) {
            user = await User.create({
              name: decodedToken.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'Firebase User'),
              email: decodedToken.email || `firebase_${decodedToken.uid}@example.com`,
              firebaseUid: decodedToken.uid,
              provider: decodedToken.firebase.sign_in_provider,
              photoURL: decodedToken.picture || '',
              profilePicture: decodedToken.picture || '',
              isVerified: true,
              verificationMethod: 'firebase'
            });
          }
        }
        
        // Set user in request
        req.user = user;
        req.authType = 'firebase';
        
      } else {
        // REGULAR JWT AUTHENTICATION FLOW (your existing code)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from token
        req.user = await User.findById(decoded.id).select('-password');
        req.authType = 'jwt';
        
        if (!req.user) {
          return res.status(401).json({ message: 'User not found' });
        }
      }
      
      next();
    } catch (error) {
      console.error('Auth error:', error);
      
      // Determine error type for better error messages
      if (error.name === 'FirebaseError') {
        return res.status(401).json({ 
          success: false,
          message: 'Firebase authentication failed', 
          error: error.message 
        });
      } else {
        return res.status(401).json({ 
          success: false,
          message: 'Not authorized, token failed', 
          error: error.message 
        });
      }
    }
  } else {
    return res.status(401).json({ 
      success: false,
      message: 'Not authorized, no token' 
    });
  }
};

module.exports = { authmiddleware };