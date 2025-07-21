const UserProfile = require('../models/UserProfile');

const calculateBMI = (weight, height, weightUnit, heightUnit) => {
  // Convert to kg and meters if needed
  let weightInKg = weight;
  let heightInM = height / 100; // Convert cm to meters
  
  if (weightUnit === 'lb') {
    weightInKg = weight * 0.453592; // Convert pounds to kg
  }
  
  if (heightUnit === 'in') {
    heightInM = height * 0.0254; // Convert inches to meters
  }
  
  // Calculate BMI
  const bmi = weightInKg / (heightInM * heightInM);
  
  // Determine BMI category
  let bmiCategory;
  if (bmi < 18.5) bmiCategory = 'underweight';
  else if (bmi < 25) bmiCategory = 'normal';
  else if (bmi < 30) bmiCategory = 'overweight';
  else bmiCategory = 'obese';
  
  return { bmi: parseFloat(bmi.toFixed(1)), bmiCategory };
};

exports.createOrUpdateProfile = async (userId, profileData) => {
  try {
    // Calculate BMI if weight and height are provided
    if (profileData.currentWeight && profileData.height) {
      const { bmi, bmiCategory } = calculateBMI(
        profileData.currentWeight,
        profileData.height,
        profileData.weightUnit || 'kg',
        profileData.heightUnit || 'cm'
      );
      
      profileData.bmi = bmi;
      profileData.bmiCategory = bmiCategory;
    }

    // Set the update timestamp
    profileData.updatedAt = Date.now();

    // Check if profile already exists
    let userProfile = await UserProfile.findOne({ userId });
    
    if (userProfile) {
      // Update existing profile
      userProfile = await UserProfile.findOneAndUpdate(
        { userId },
        { $set: profileData },
        { new: true }
      );
      return { profile: userProfile, isNew: false };
    } else {
      // Create new profile
      profileData.userId = userId;
      userProfile = new UserProfile(profileData);
      await userProfile.save();
      return { profile: userProfile, isNew: true };
    }
  } catch (error) {
    throw error;
  }
};

exports.getProfileByUserId = async (userId) => {
  try {
    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      throw new Error('Profile not found');
    }
    return profile;
  } catch (error) {
    throw error;
  }
};

exports.deleteProfile = async (userId) => {
  try {
    const result = await UserProfile.findOneAndDelete({ userId });
    if (!result) {
      throw new Error('Profile not found');
    }
    return { message: 'Profile deleted successfully' };
  } catch (error) {
    throw error;
  }
};