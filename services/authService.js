const User = require('../models/User');
const generateCode = require('../utils/generateCode');
const { sendVerificationEmail } = require('../helpers/emailHelper');
const { sendVerificationSMS } = require('../helpers/smsHelper');

exports.registerUser = async (userData) => {
  const { name, email, mobile, password } = userData;
  
  // Check if user exists
  let user = await User.findOne({ $or: [{ email }, { mobile }] });
  if (user) {
    // If user exists but is not verified, we can let them try again
    if (!user.isVerified) {
    
      user.name = name;
      user.password = password;
      await user.save();
      
      return { 
        message: 'User already registered but not verified. Please verify your account.',
        userId: user._id,
        email: user.email,
        mobile: user.mobile
      };
    }
    throw new Error('User already exists');
  }
  
  // Create new user without verification method yet
  user = new User({
    name,
    email,
    mobile,
    password
  });
  
  await user.save();
  
  return { 
    message: 'Registration successful. Please verify your account.',
    userId: user._id,
    email: user.email,
    mobile: user.mobile
  };
};

exports.initiateVerification = async (userId, verificationMethod) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  
  // Generate and save verification code
  const verificationCode = generateCode();
  user.verificationCode = verificationCode;
  user.verificationExpires = new Date(Date.now() + 10 * 60000);
  user.verificationMethod = verificationMethod;
  
  await user.save();
  
  // Send verification code based on method
  if (verificationMethod === 'email') {
    await sendVerificationEmail(user.email, verificationCode);
    return { 
      message: `Verification code sent to your email: ${user.email}`,
      userId: user._id 
    };
  } else if (verificationMethod === 'mobile') {
    await sendVerificationSMS(user.mobile, verificationCode);
    return { 
      message: `Verification code sent to your mobile: ${user.mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}`,
      userId: user._id 
    };
  }
  
  throw new Error('Invalid verification method');
};

exports.verifyUser = async (userId, code) => {
  const user = await User.findOne({
    _id: userId,
    verificationCode: code,
    verificationExpires: { $gt: Date.now() }
  });
  
  if (!user) throw new Error('Invalid or expired verification code');
  
  user.isVerified = true;
  user.verificationCode = undefined;
  user.verificationExpires = undefined;
  
  await user.save();
  
  return { message: 'Account verified successfully' };
};

exports.loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid credentials');
  
  if (!user.isVerified) throw new Error('Account not verified');
  
  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new Error('Invalid credentials');
  
  return user;
};

exports.getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  return user;
};

// Google Authentication Processing
exports.processGoogleAuth = async (userData) => {
  const { googleId, name, email, profilePicture } = userData;
  
  // First check if user exists with this googleId
  let user = await User.findOne({ googleId });
  
  // If not found by googleId, try to find by email
  if (!user && email) {
    user = await User.findOne({ email });
    
    // If user exists but doesn't have googleId, link the accounts
    if (user) {
      user.googleId = googleId;
      user.isVerified = true; // Ensure user is marked as verified
      
      // Update profile picture if not already set
      if (!user.profilePicture && profilePicture) {
        user.profilePicture = profilePicture;
      }
      
      await user.save();
    }
  }
  
  // If still no user found, create a new one
  if (!user) {
    user = new User({
      name: name || 'Google User',
      email: email || `${googleId}@gmail.com`,
      googleId,
      isVerified: true,
      verificationMethod: 'google',
      profilePicture: profilePicture || ''
    });
    
    await user.save();
  }
  
  return user;
};

// Facebook Authentication Processing
exports.processFacebookAuth = async (userData) => {
  const { facebookId, name, email, profilePicture } = userData;
  
  // First check if user exists with this facebookId
  let user = await User.findOne({ facebookId });
  
  // If not found by facebookId, try to find by email
  if (!user && email) {
    user = await User.findOne({ email });
    
    // If user exists but doesn't have facebookId, link the accounts
    if (user) {
      user.facebookId = facebookId;
      user.isVerified = true; // Ensure user is marked as verified
      
      // Update profile picture if not already set
      if (!user.profilePicture && profilePicture) {
        user.profilePicture = profilePicture;
      }
      
      await user.save();
    }
  }
  
  // If still no user found, create a new one
  if (!user) {
    user = new User({
      name: name || 'Facebook User',
      email: email || `${facebookId}@facebook.com`,
      facebookId,
      isVerified: true,
      verificationMethod: 'facebook',
      profilePicture: profilePicture || ''
    });
    
    await user.save();
  }
  
  return user;
};