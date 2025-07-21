const jwt = require('jsonwebtoken');

// Process Firebase authentication and return JWT for API use
exports.handleFirebaseAuth = async (req, res) => {
  try {
    // User has already been authenticated by middleware
    const user = req.user;
    
    // Generate JWT token for compatibility with existing API
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    
    // Return user data with JWT token
    res.json({
      success: true,
      _id: user._id,
      name: user.name,
      email: user.email,
      provider: user.provider || 'firebase',
      photoURL: user.photoURL || user.profilePicture || '',
      token
    });
  } catch (error) {
    console.error('Firebase auth handling error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error processing authentication',
      error: error.message 
    });
  }
};

// Get Firebase user profile
exports.getFirebaseUserProfile = async (req, res) => {
  try {
    // User is already authenticated via middleware
    res.json({
      success: true,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        profilePicture: req.user.profilePicture || req.user.photoURL || '',
        provider: req.user.provider || 'firebase'
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};