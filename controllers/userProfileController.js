const UserProfile = require('../models/UserProfile');
const User = require('../models/User');
const workoutController = require('./workoutController');

// Create/Update user profile
exports.createOrUpdateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const profileData = req.body;
    
    // Check if profile already exists
    let userProfile = await UserProfile.findOne({ userId });
    
    const isNewProfile = !userProfile;
    const oldProfile = userProfile ? { ...userProfile.toObject() } : null;
    
    if (userProfile) {
      // Update existing profile
      Object.keys(profileData).forEach(key => {
        userProfile[key] = profileData[key];
      });
      
      // Calculate BMI if weight and height are provided
      if (profileData.currentWeight && profileData.height) {
        const weightInKg = profileData.weightUnit === 'lbs' 
          ? profileData.currentWeight * 0.453592
          : profileData.currentWeight;
        
        const heightInM = profileData.heightUnit === 'cm'
          ? profileData.height / 100
          : profileData.height * 0.0254;
        
        userProfile.bmi = weightInKg / (heightInM * heightInM);
        
        // Set BMI category
        if (userProfile.bmi < 18.5) {
          userProfile.bmiCategory = 'underweight';
        } else if (userProfile.bmi < 25) {
          userProfile.bmiCategory = 'normal';
        } else if (userProfile.bmi < 30) {
          userProfile.bmiCategory = 'overweight';
        } else {
          userProfile.bmiCategory = 'obese';
        }
      }
      
      await userProfile.save();
      
      // Check if any significant fields were updated that would warrant a new workout plan
      if (hasSignificantProfileChanges(oldProfile, userProfile.toObject())) {
        // Regenerate workout plan in the background
        workoutController.regeneratePlanAfterProfileUpdate(userId)
          .then(newPlan => {
            console.log(`New workout plan generated for user ${userId} after profile update`);
          })
          .catch(error => {
            console.error(`Error generating new workout plan for user ${userId}:`, error);
          });
        
        // Notify that a new plan will be generated
        res.status(200).json({
          success: true,
          message: 'User profile updated. A new workout plan is being generated based on your updated profile.',
          data: userProfile,
          planUpdating: true
        });
      } else {
        // No significant changes, return normal response
        res.status(200).json({
          success: true,
          message: 'User profile updated successfully',
          data: userProfile
        });
      }
    } else {
      // Create new profile
      userProfile = new UserProfile({
        userId,
        ...profileData
      });
      
      // Calculate BMI if weight and height are provided
      if (profileData.currentWeight && profileData.height) {
        const weightInKg = profileData.weightUnit === 'lbs' 
          ? profileData.currentWeight * 0.453592
          : profileData.currentWeight;
        
        const heightInM = profileData.heightUnit === 'cm'
          ? profileData.height / 100
          : profileData.height * 0.0254;
        
        userProfile.bmi = weightInKg / (heightInM * heightInM);
        
        // Set BMI category
        if (userProfile.bmi < 18.5) {
          userProfile.bmiCategory = 'underweight';
        } else if (userProfile.bmi < 25) {
          userProfile.bmiCategory = 'normal';
        } else if (userProfile.bmi < 30) {
          userProfile.bmiCategory = 'overweight';
        } else {
          userProfile.bmiCategory = 'obese';
        }
      }
      
      await userProfile.save();
      
      res.status(201).json({
        success: true,
        message: 'User profile created successfully',
        data: userProfile
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create/update user profile',
      error: error.message
    });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const userProfile = await UserProfile.findOne({ userId });
    
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: userProfile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message
    });
  }
};

// Delete user profile
exports.deleteUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const userProfile = await UserProfile.findOneAndDelete({ userId });
    
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User profile deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete user profile',
      error: error.message
    });
  }
};

// Helper function to determine if significant profile changes were made
function hasSignificantProfileChanges(oldProfile, newProfile) {
  if (!oldProfile) return true;
  
  // Define fields that, when changed, would require a new workout plan
  const significantFields = [
    'fitnessLevel',
    'fitnessGoals',
    'bodyType',
    'targetBodyType',
    'currentWeight',
    'targetWeight',
    'activityLevel',
    'exerciseFrequency',
    'lifestyle',
    'dailyWalkingTime',
    'stepGoal'
  ];
  
  // Check for changes in significant fields
  for (const field of significantFields) {
    // Skip if field doesn't exist in either profile
    if (!oldProfile.hasOwnProperty(field) && !newProfile.hasOwnProperty(field)) {
      continue;
    }
    
    // Array comparison
    if (Array.isArray(oldProfile[field]) && Array.isArray(newProfile[field])) {
      if (oldProfile[field].length !== newProfile[field].length) {
        return true;
      }
      
      for (let i = 0; i < oldProfile[field].length; i++) {
        if (oldProfile[field][i] !== newProfile[field][i]) {
          return true;
        }
      }
    } 
    // Simple value comparison
    else if (oldProfile[field] !== newProfile[field]) {
      return true;
    }
  }
  
  return false;
}