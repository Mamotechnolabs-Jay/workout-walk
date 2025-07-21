const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const User = require('../models/User');
const generateCode = require('../utils/generateCode');
const { sendVerificationEmail } = require('../helpers/emailHelper');

// Google Auth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register new user
exports.register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  res.status(201).json(result);
});

// Initiate verification
exports.initiateVerification = asyncHandler(async (req, res) => {
  const { userId, verificationMethod } = req.body;
  const result = await authService.initiateVerification(userId, verificationMethod);
  res.json(result);
});

// Verify user
exports.verify = asyncHandler(async (req, res) => {
  const { userId, code } = req.body;
  const result = await authService.verifyUser(userId, code);
  const user = await authService.getUserById(userId);
  
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
  
  res.json({ 
    message: result.message,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      profilePicture: user.profilePicture
    }
  });
});

// Login user
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUser(email, password);
  
  // Create JWT token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
  
  res.json({ 
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      profilePicture: user.profilePicture
    }
  });
});

// Mobile Google login
exports.mobileGoogleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  
  if (!idToken) {
    return res.status(400).json({ message: 'ID token is required' });
  }
  
  try {
    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    
    // Process the user data from Google
    const userData = {
      googleId: payload.sub,
      name: payload.name,
      email: payload.email,
      profilePicture: payload.picture
    };
    
    // Find or create user with Google data
    const user = await authService.processGoogleAuth(userData);
    
    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });
    
    // Return token and user data
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile || '',
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ message: 'Invalid Google token' });
  }
});

// Mobile Facebook login
exports.mobileFacebookLogin = asyncHandler(async (req, res) => {
  const { accessToken } = req.body;
  
  if (!accessToken) {
    return res.status(400).json({ message: 'Access token is required' });
  }
  
  try {
    // Verify Facebook token by making a request to the Graph API
    const response = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
    );
    
    const fbUser = response.data;
    
    // Process the user data from Facebook
    const userData = {
      facebookId: fbUser.id,
      name: fbUser.name,
      email: fbUser.email,
      profilePicture: fbUser.picture?.data?.url
    };
    
    // Find or create user with Facebook data
    const user = await authService.processFacebookAuth(userData);
    
    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });
    
    // Return token and user data
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile || '',
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Facebook auth error:', error);
    res.status(401).json({ message: 'Invalid Facebook token' });
  }
});

// Request password reset (forgot password)
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  // Find user by email
  const user = await User.findOne({ email });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'No account found with this email'
    });
  }
  
  // Generate 6-digit verification code
  const verificationCode = generateCode();
  
  // Set verification data
  user.verificationCode = verificationCode;
  user.verificationExpires = new Date(Date.now() + 10 * 60000); // 10 minutes
  
  await user.save();
  
  // Send verification code via email
  try {
    await sendVerificationEmail(user.email, verificationCode);
    
    res.json({
      success: true,
      message: 'Password reset code sent to your email',
      userId: user._id
    });
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reset code. Please try again later.'
    });
  }
});

// Verify password reset code
exports.verifyResetCode = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  
  // Find user by email and verification code
  const user = await User.findOne({
    email,
    verificationCode: code,
    verificationExpires: { $gt: Date.now() }
  });
  
  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired verification code'
    });
  }
  
  // Generate reset token
  const resetToken = jwt.sign(
    { id: user._id, purpose: 'password_reset' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  res.json({
    success: true,
    message: 'Code verified successfully',
    resetToken,
    userId: user._id
  });
});

// Reset password (with token)
exports.resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;
  
  // Check if passwords match
  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Passwords do not match'
    });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    
    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }
    
    // Find user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update password
    user.password = newPassword;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

// Change password (for authenticated users)
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  
  // Check if passwords match
  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'New passwords do not match'
    });
  }
  
  // Get user from request (set by auth middleware)
  const user = await User.findById(req.user._id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  // Check if current password is correct
  const isMatch = await user.comparePassword(currentPassword);
  
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }
  
  // Update password
  user.password = newPassword;
  await user.save();
  
  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});