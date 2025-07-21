const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const UserChallengeEnrollment = require('../models/UserChallengeEnrollement');
const ChallengeProgress = require('../models/challengeProgression.model');
const ChallengeAchievement = require('../models/challengeAchievement.model');
const moment = require('moment');

class ChallengeService {
  constructor() {
    // Base path for challenge images
    this.challengeImageBasePath = 'http://ec2-16-171-15-0.eu-north-1.compute.amazonaws.com:9000/images/challenge';
    // Base path for challenge badges
    this.badgeImageBasePath = 'http://ec2-16-171-15-0.eu-north-1.compute.amazonaws.com:9000/images/badges';
  }

  // Get full image path
  getFullImagePath(imageName) {
    if (!imageName) return '';
    return `${this.challengeImageBasePath}/${imageName}`;
  }

  // Get full badge path
  getFullBadgePath(badgeName) {
    if (!badgeName) return '';
    return `${this.badgeImageBasePath}/${badgeName}`;
  }

  // Get all challenges with enrollment status for a user
  async getAllUserChallenges(userId) {
    // First, make sure standard challenges exist
    await this.ensureStandardChallengesExist();
    
    // Update challenge images if needed
    await this.updateExistingChallengeImages();
    
    // Get all active challenges and user enrollments
    const allChallenges = await Challenge.find({ isActive: true });
    const userEnrollments = await UserChallengeEnrollment.find({ userId });
    
    // Create a map for quick lookup
    const enrollmentMap = {};
    userEnrollments.forEach(enrollment => {
      enrollmentMap[enrollment.challenge.toString()] = enrollment;
    });
    
    // Format response for frontend
    const result = [];
    
    // Process by challenge category
    const introductoryChallenges = [];
    const weeklyChallenges = [];
    const monthlyChallenges = [];
    
    for (const challenge of allChallenges) {
      const enrollment = enrollmentMap[challenge._id.toString()];
      
      // Convert challenge to a plain object so we can modify it
      const challengeObj = challenge.toObject ? challenge.toObject() : { ...challenge };
      
      // Add full image path if image exists
      if (challengeObj.imageUrl) {
        challengeObj.imageUrl = this.getFullImagePath(challengeObj.imageUrl);
      }
      
      const displayChallenge = {
        challenge: challengeObj,
        enrollment: enrollment || null,
        enrollmentStatus: enrollment ? enrollment.status : 'not-enrolled',
        progress: enrollment ? enrollment.completionPercentage : 0,
        daysRemaining: enrollment ? this.calculateDaysRemaining(enrollment) : challenge.duration,
        isCompleted: enrollment ? enrollment.status === 'completed' : false
      };
      
      // Categorize challenges
      if (challenge.difficulty === 'easy' && challenge.duration <= 3) {
        introductoryChallenges.push(displayChallenge);
      } else if (challenge.duration <= 7) {
        weeklyChallenges.push(displayChallenge);
      } else {
        monthlyChallenges.push(displayChallenge);
      }
    }
    
    // Add all categories to results
    if (introductoryChallenges.length > 0) {
      result.push({
        category: 'Intro Challenge',
        challenges: introductoryChallenges
      });
    }
    
    if (weeklyChallenges.length > 0) {
      result.push({
        category: 'Weekly Challenges',
        challenges: weeklyChallenges
      });
    }
    
    if (monthlyChallenges.length > 0) {
      result.push({
        category: 'Make It Habit Challenge',
        challenges: monthlyChallenges
      });
    }
    
    return result;
  }

  // Calculate days remaining for a challenge
  calculateDaysRemaining(enrollment) {
    if (enrollment.status === 'completed') return 0;
    const today = moment().startOf('day');
    const endDate = moment(enrollment.endDate).startOf('day');
    return Math.max(0, endDate.diff(today, 'days'));
  }

  // Get details about a specific challenge
  async getChallengeDetails(challengeId, userId = null) {
    let challenge;
    
    // Try to find by challengeId string first
    challenge = await Challenge.findOne({ 
      challengeId: challengeId,
      isActive: true 
    });
    
    // If not found, try to find by MongoDB _id
    if (!challenge && mongoose.Types.ObjectId.isValid(challengeId)) {
      challenge = await Challenge.findOne({ 
        _id: challengeId,
        isActive: true 
      });
    }
    
    if (!challenge) throw new Error('Challenge not found');
    
    // Convert challenge to a plain object so we can modify it
    const challengeObj = challenge.toObject ? challenge.toObject() : { ...challenge };
    
    // Add full image path if image exists
    if (challengeObj.imageUrl) {
      challengeObj.imageUrl = this.getFullImagePath(challengeObj.imageUrl);
    }
    
    // If userId is provided, include enrollment info
    let enrollment = null;
    let achievement = null;
    
    if (userId) {
      enrollment = await UserChallengeEnrollment.findOne({
        userId,
        challenge: challenge._id
      }).sort({ createdAt: -1 }); // Get the most recent enrollment
      
      // Check if user has achieved this challenge
      if (enrollment && enrollment.status === 'completed') {
        achievement = await ChallengeAchievement.findOne({
          userId,
          challenge: challenge._id
        });
        
        // If achievement exists, add full badge path
        if (achievement) {
          const achievementObj = achievement.toObject ? achievement.toObject() : { ...achievement };
          if (achievementObj.achievementBadge) {
            achievementObj.achievementBadge = this.getFullBadgePath(achievementObj.achievementBadge);
          }
          achievement = achievementObj;
        }
      }
    }
    
    // Format benefits for display
    const benefits = [
      {
        title: 'Reach your goals faster',
        description: 'Challenges will help you achieve your main goal sooner'
      },
      {
        title: 'Improve your well-being',
        description: 'Being more active during the day will have a positive effect on your health'
      }
    ];
    
    return {
      challenge: challengeObj,
      enrollment: enrollment || null,
      enrollmentStatus: enrollment ? enrollment.status : 'not-enrolled',
      progress: enrollment ? enrollment.completionPercentage : 0,
      daysRemaining: enrollment ? this.calculateDaysRemaining(enrollment) : challenge.duration,
      benefits: benefits,
      isCompleted: enrollment ? enrollment.status === 'completed' : false,
      achievement: achievement || null
    };
  }

  // Get challenge progress for a specific enrollment
  async getChallengeProgress(userId, challengeId) {
    let challenge;
    
    // Try to find by challengeId string first
    challenge = await Challenge.findOne({ challengeId });
    
    // If not found, try to find by MongoDB _id
    if (!challenge && mongoose.Types.ObjectId.isValid(challengeId)) {
      challenge = await Challenge.findById(challengeId);
    }
    
    if (!challenge) throw new Error('Challenge not found');
    
    // Convert challenge to a plain object so we can modify it
    const challengeObj = challenge.toObject ? challenge.toObject() : { ...challenge };
    
    // Add full image path if image exists
    if (challengeObj.imageUrl) {
      challengeObj.imageUrl = this.getFullImagePath(challengeObj.imageUrl);
    }
    
    const enrollment = await UserChallengeEnrollment.findOne({
      userId,
      challenge: challenge._id
    }).sort({ createdAt: -1 }); // Get the most recent enrollment
    
    if (!enrollment) {
      throw new Error('User not enrolled in this challenge');
    }
    
    // Get progress records for this enrollment
    const progressRecords = await ChallengeProgress.find({
      userId,
      challenge: challenge._id,
      enrollment: enrollment._id
    }).sort({ date: 1 });
    
    // Calculate total progress for the challenge
    let totalUserSteps = 0;
    let totalTargetSteps = 0;
    
    // Format the data for the frontend
    const dailyProgress = progressRecords.map(record => {
      totalUserSteps += record.userSteps;
      totalTargetSteps += record.targetValue;
      
      return {
        date: record.date,
        value: record.userSteps,
        target: record.targetValue,
        isCompleted: record.isCompleted,
        percentage: Math.min(100, Math.round((record.userSteps / record.targetValue) * 100))
      };
    });
    
    // Calculate overall progress percentage for the challenge
    const overallProgressPercentage = totalTargetSteps > 0 
      ? Math.min(100, Math.round((totalUserSteps / totalTargetSteps) * 100))
      : enrollment.completionPercentage;
    
    return {
      challenge: challengeObj,
      enrollment,
      startDate: enrollment.startDate,
      endDate: enrollment.endDate,
      dailyProgress,
      totalUserSteps,
      totalTargetSteps,
      overallProgress: overallProgressPercentage,
      isCompleted: enrollment.status === 'completed'
    };
  }

  // Get user achievements
  async getUserAchievements(userId) {
    const achievements = await ChallengeAchievement.find({
      userId,
      displayOnProfile: true
    }).populate('challenge');
    
    return achievements.map(achievement => {
      // Get badge path
      let badgePath = achievement.achievementBadge;
      if (badgePath) {
        badgePath = this.getFullBadgePath(badgePath);
      }
      
      return {
        id: achievement._id,
        challengeId: achievement.challenge.challengeId,
        name: achievement.challenge.name,
        description: achievement.challenge.description,
        completedOn: achievement.completedOn,
        badge: badgePath,
        reward: achievement.challenge.reward,
        rewardClaimed: achievement.rewardClaimed,
        rewardClaimedOn: achievement.rewardClaimedOn
      };
    });
  }

  // Enroll user in a challenge
  async enrollUserInChallenge(userId, challengeIdOrObjectId) {
    console.log(`Enrolling user ${userId} in challenge ${challengeIdOrObjectId}`);
    
    let challenge;
    
    // Try to find by challengeId string first
    challenge = await Challenge.findOne({ challengeId: challengeIdOrObjectId });
    
    // If not found, try to find by MongoDB _id
    if (!challenge && mongoose.Types.ObjectId.isValid(challengeIdOrObjectId)) {
      challenge = await Challenge.findById(challengeIdOrObjectId);
      console.log(`Looking up by ObjectId: ${challengeIdOrObjectId}, found: ${challenge ? 'Yes' : 'No'}`);
    }
    
    if (!challenge) {
      console.log(`Challenge not found with ID: ${challengeIdOrObjectId}`);
      throw new Error('Challenge not found');
    }
    
    console.log(`Found challenge: ${challenge.name} (${challenge.challengeId})`);

    // Check if user is already enrolled in this challenge with active status
    const existingEnrollment = await UserChallengeEnrollment.findOne({ 
      userId, 
      challenge: challenge._id,
      status: 'active' 
    });

    if (existingEnrollment) {
      throw new Error('Already enrolled in this challenge');
    }

    // Archive any previous enrollments for this challenge
    await UserChallengeEnrollment.updateMany(
      { userId, challenge: challenge._id, status: { $ne: 'active' } },
      { $set: { status: 'archived' } }
    );

    // Calculate start and end date
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (challenge.duration - 1) * 24 * 60 * 60 * 1000);

    // Create enrollment
    const enrollment = await UserChallengeEnrollment.create({
      userId,
      challenge: challenge._id,
      startDate,
      endDate,
      status: 'active',
      totalProgress: 0,
      completionPercentage: 0,
      currentDay: 1,
      enrolledAt: new Date()
    });
    
    // Create daily progress entries in ChallengeProgress collection
    const progressEntries = [];
    for (let i = 0; i < challenge.duration; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      
      progressEntries.push({
        userId,
        challenge: challenge._id,
        enrollment: enrollment._id,
        date,
        userSteps: 0,
        targetValue: challenge.targetValue,
        isCompleted: false
      });
    }
    
    await ChallengeProgress.insertMany(progressEntries);
    
    // Make sure to use the string challengeId for subsequent lookup
    return this.getChallengeDetails(challenge.challengeId, userId);
  }

  // Update challenge progress from workout data
  async updateWorkoutProgress(userId, workoutData) {
    // Check if the user is enrolled in any active challenges
    const activeEnrollments = await UserChallengeEnrollment.find({
      userId,
      status: 'active'
    }).populate('challenge');
    
    if (!activeEnrollments || activeEnrollments.length === 0) {
      // User not enrolled in any challenges, nothing to update
      return null;
    }
    
    // Extract steps from workout data
    const steps = workoutData.steps || 0;
    if (steps <= 0) {
      return null; // No steps recorded, nothing to update
    }
    
    const today = new Date();
    const updatedChallenges = [];
    const completedChallenges = [];
    
    // Process each active enrollment
    for (const enrollment of activeEnrollments) {
      const challenge = enrollment.challenge;
      
      // Only update if today is within the challenge period
      const startDate = moment(enrollment.startDate).startOf('day');
      const endDate = moment(enrollment.endDate).endOf('day');
      const currentDate = moment(today);
      
      if (currentDate.isBefore(startDate) || currentDate.isAfter(endDate)) {
        console.log(`Challenge ${challenge.name} is not active for today (${currentDate.format('YYYY-MM-DD')})`);
        continue; // Skip this challenge as it's not active for today
      }
      
      // Find today's progress record for this specific challenge
      let todayProgress = await ChallengeProgress.findOne({
        userId,
        challenge: challenge._id,
        enrollment: enrollment._id,
        date: {
          $gte: moment(today).startOf('day').toDate(),
          $lte: moment(today).endOf('day').toDate()
        }
      });
      
      if (!todayProgress) {
        console.log(`No progress record found for today, creating a new one`);
        // Create a new progress record for today if not found
        todayProgress = new ChallengeProgress({
          userId,
          challenge: challenge._id,
          enrollment: enrollment._id,
          date: today,
          userSteps: 0,
          targetValue: challenge.targetValue,
          isCompleted: false
        });
      }
      
      // Update steps for today
      const currentSteps = (todayProgress.userSteps || 0) + steps;
      todayProgress.userSteps = currentSteps;
      
      console.log(`Updating challenge ${challenge.challengeId}: ${challenge.name}`);
      console.log(`Current steps: ${currentSteps}, Target: ${challenge.targetValue}`);
      
      // Check if daily target is completed
      if (challenge.type === 'daily_steps') {
        // For daily step challenges: check if today's steps exceed target
        todayProgress.isCompleted = currentSteps >= challenge.targetValue;
        console.log(`Daily steps challenge: ${currentSteps}/${challenge.targetValue} steps, completed: ${todayProgress.isCompleted}`);
      }
      // Save today's progress
      await todayProgress.save();
      
      // Update enrollment progress
      let completionPercentage = 0;
      
      if (challenge.type === 'daily_steps') {
        // Get all progress records for this enrollment
        const allProgress = await ChallengeProgress.find({
          userId,
          challenge: challenge._id,
          enrollment: enrollment._id
        });
        
        // Count completed days
        const completedDays = allProgress.filter(p => p.isCompleted).length;
        
        // Check days elapsed since start
        const daysElapsed = Math.min(
          challenge.duration,
          currentDate.diff(startDate, 'days') + 1
        );
        
        // Calculate percentage based on completed days vs. challenge duration
        completionPercentage = Math.round((completedDays / challenge.duration) * 100);
        
        // Check if challenge is already completed
        const wasAlreadyCompleted = enrollment.status === 'completed';
        
        // Determine if challenge should be completed
        let shouldCompleteChallenge = false;
        
        // CASE 1: User completes challenge on day one by recording enough steps for all days
        if (todayProgress.isCompleted && 
            currentDate.diff(startDate, 'days') === 0 && 
            challenge.targetValue * challenge.duration <= currentSteps) {
          
          console.log(`User completed entire ${challenge.duration}-day challenge on first day!`);
          shouldCompleteChallenge = true;
          
          // Mark all days as completed
          await ChallengeProgress.updateMany(
            { enrollment: enrollment._id },
            { $set: { isCompleted: true, userSteps: challenge.targetValue } }
          );
          
          completionPercentage = 100;
        } 
        // CASE 2: User completes all days required by the challenge, even if before the end date
        else if (completedDays >= challenge.duration) {
          console.log(`User completed all ${challenge.duration} days of challenge!`);
          shouldCompleteChallenge = true;
          completionPercentage = 100;
        }
        // CASE 3: User completes current day's target and has completed ALL previous days
        else if (todayProgress.isCompleted && 
                 completedDays === daysElapsed && 
                 daysElapsed >= challenge.duration) {
          console.log(`User has completed all days up to now, marking challenge as complete`);
          shouldCompleteChallenge = true;
          completionPercentage = 100;
        }
        
        // Complete the challenge if conditions are met
        if (shouldCompleteChallenge && !wasAlreadyCompleted) {
          enrollment.status = 'completed';
          enrollment.completedAt = new Date();
          
          // Create achievement immediately on completion
          await this.createChallengeAchievement(
            userId, 
            challenge._id, 
            enrollment._id, 
            challenge.challengeId, 
            challenge.name, 
            challenge.reward, 
            completedChallenges
          );
        }
      } 
      else if (challenge.type === 'steps') {
        // For total steps challenges: check cumulative steps against target
        const allProgress = await ChallengeProgress.find({ 
          userId,
          challenge: challenge._id,
          enrollment: enrollment._id 
        });
        
        const totalSteps = allProgress.reduce((sum, p) => sum + (p.userSteps || 0), 0);
        completionPercentage = Math.min(100, Math.round((totalSteps / challenge.targetValue) * 100));
        
        // For total steps challenges, mark as completed when total steps reach target
        // regardless of how many days it took
        const wasAlreadyCompleted = enrollment.status === 'completed';
        if (totalSteps >= challenge.targetValue && !wasAlreadyCompleted) {
          console.log(`User reached total step goal of ${challenge.targetValue}! (Current: ${totalSteps})`);
          enrollment.status = 'completed';
          enrollment.completedAt = new Date();
          completionPercentage = 100;
          
          // Create achievement immediately on completion
          await this.createChallengeAchievement(
            userId, 
            challenge._id, 
            enrollment._id, 
            challenge.challengeId, 
            challenge.name, 
            challenge.reward, 
            completedChallenges
          );
          
          // Also mark today's progress as completed since the overall challenge is complete
          todayProgress.isCompleted = true;
          await todayProgress.save();
        }
      }
      
      enrollment.completionPercentage = completionPercentage;
      await enrollment.save();
      
      updatedChallenges.push({
        challengeId: challenge.challengeId,
        name: challenge.name,
        progress: enrollment.completionPercentage,
        isCompleted: enrollment.status === 'completed'
      });
    }
    
    return {
      updatedChallenges,
      completedChallenges
    };
  }
  
  // Helper method to create challenge achievement - immediately on completion
  async createChallengeAchievement(userId, challengeId, enrollmentId, challengeStringId, challengeName, reward, completedChallenges) {
    // Check if achievement already exists
    const existingAchievement = await ChallengeAchievement.findOne({
      userId,
      challenge: challengeId
    });
    
    if (!existingAchievement) {
      console.log(`Creating achievement for challenge ${challengeStringId}`);
      // Create a new achievement record
      const badgeName = `${challengeStringId}_badge.png`;
      const achievement = await ChallengeAchievement.create({
        userId,
        challenge: challengeId,
        enrollment: enrollmentId,
        completedOn: new Date(),
        rewardClaimed: false,
        achievementBadge: badgeName,
        displayOnProfile: true
      });
      
      // Add to completed challenges list for notification
      completedChallenges.push({
        challengeId: challengeStringId,
        name: challengeName,
        reward: reward,
        badgeUrl: this.getFullBadgePath(badgeName)
      });
    }
  }

  // Claim challenge achievement reward
  async claimChallengeReward(userId, achievementId) {
    const achievement = await ChallengeAchievement.findOne({
      _id: achievementId,
      userId
    });
    
    if (!achievement) {
      throw new Error('Achievement not found');
    }
    
    if (achievement.rewardClaimed) {
      throw new Error('Reward already claimed');
    }
    
    // Mark reward as claimed
    achievement.rewardClaimed = true;
    achievement.rewardClaimedOn = new Date();
    await achievement.save();
    
    // Convert to object and add full badge path
    const achievementObj = achievement.toObject ? achievement.toObject() : { ...achievement };
    if (achievementObj.achievementBadge) {
      achievementObj.achievementBadge = this.getFullBadgePath(achievementObj.achievementBadge);
    }
    
    return achievementObj;
  }

  // Get summary of all user's challenges for home page display
  async getHomeChallengesSummary(userId) {
    const activeEnrollments = await UserChallengeEnrollment.find({
      userId,
      status: 'active'
    }).populate('challenge').sort({ createdAt: -1 }).limit(3); // Get most recent active challenges
    
    const result = [];
    
    for (const enrollment of activeEnrollments) {
      // Get total progress for this challenge
      const progressRecords = await ChallengeProgress.find({
        userId,
        enrollment: enrollment._id
      });
      
      let totalUserSteps = 0;
      let totalTargetSteps = 0;
      let completedDays = 0;
      
      progressRecords.forEach(record => {
        totalUserSteps += record.userSteps;
        totalTargetSteps += record.targetValue;
        if (record.isCompleted) completedDays++;
      });
      
      const challenge = enrollment.challenge;
      const daysRemaining = this.calculateDaysRemaining(enrollment);
      
      // Convert challenge to object and add full image path
      const challengeObj = challenge.toObject ? challenge.toObject() : { ...challenge };
      if (challengeObj.imageUrl) {
        challengeObj.imageUrl = this.getFullImagePath(challengeObj.imageUrl);
      }
      
      result.push({
        challengeId: challenge.challengeId,
        name: challenge.name,
        description: challenge.type === 'daily_steps' 
          ? `${completedDays}/${challenge.duration} days` 
          : `${totalUserSteps}/${challenge.targetValue} steps`,
        progress: enrollment.completionPercentage,
        icon: challenge.iconType || 'star',
        color: challenge.backgroundColor || '#4CAF50',
        daysRemaining,
        imageUrl: challengeObj.imageUrl || ''
      });
    }
    
    return result;
  }

  // Get user's progression for all enrolled challenges
  async getUserEnrollmentsProgress(userId) {
    // Get all user's enrollments (both active and completed)
    const allEnrollments = await UserChallengeEnrollment.find({
      userId,
      status: { $in: ['active', 'completed'] }
    }).populate('challenge').sort({ createdAt: -1 });
    
    const enrollmentProgressData = [];
    
    for (const enrollment of allEnrollments) {
      const challenge = enrollment.challenge;
      const daysRemaining = this.calculateDaysRemaining(enrollment);
      
      // Get progress records for this enrollment
      const progressRecords = await ChallengeProgress.find({
        userId,
        enrollment: enrollment._id
      }).sort({ date: 1 });
      
      // Calculate progress statistics
      let totalUserSteps = 0;
      let completedDays = 0;
      
      progressRecords.forEach(record => {
        totalUserSteps += record.userSteps;
        if (record.isCompleted) completedDays++;
      });
      
      // Determine if this is a daily steps challenge or total steps challenge
      const isStepsTypeChallenge = challenge.type === 'steps';
      
      // Calculate completion percentage based on challenge type
      const completionPercentage = isStepsTypeChallenge
        ? Math.min(100, Math.round((totalUserSteps / challenge.targetValue) * 100))
        : Math.min(100, Math.round((completedDays / challenge.duration) * 100));
      
      // Convert challenge to object and add full image path
      const challengeObj = challenge.toObject ? challenge.toObject() : { ...challenge };
      if (challengeObj.imageUrl) {
        challengeObj.imageUrl = this.getFullImagePath(challengeObj.imageUrl);
      }
      
      // Format response with just the essential data
      enrollmentProgressData.push({
        enrollmentId: enrollment._id,
        challengeId: challenge.challengeId,
        challengeName: challenge.name,
        challengeType: challenge.type,
        difficulty: challenge.difficulty,
        status: enrollment.status,
        daysRemaining,
        startDate: enrollment.startDate,
        endDate: enrollment.endDate,
        imageUrl: challengeObj.imageUrl || '',
        
        // Progress metrics
        totalUserSteps,
        targetValue: isStepsTypeChallenge ? challenge.targetValue : challenge.targetValue * challenge.duration,
        completedDays,
        totalDays: challenge.duration,
        completionPercentage: completionPercentage,
        
        // Progress description
        progressDescription: isStepsTypeChallenge
          ? `${totalUserSteps}/${challenge.targetValue} steps recorded`
          : `${completedDays}/${challenge.duration} days completed`
      });
    }
    
    return enrollmentProgressData;
  }

  // Ensure standard challenges exist in the database
  async ensureStandardChallengesExist() {
    const standardChallenges = [
      {
        challengeId: 'easy_start',
        name: 'Easy Start',
        description: 'Begin your journey with challenges and get a unique reward. Elevate your activity level by walking 3,000 steps daily for 3 days.',
        type: 'daily_steps',
        duration: 3,
        durationLabel: '3 day',
        difficulty: 'easy',
        targetValue: 3000,
        targetLabel: '3,000 steps daily',
        reward: 'Starter Badge',
        iconType: 'star',
        backgroundColor: '#FF9800',
        imageUrl: 'Challenge.jpg'
      },
      {
        challengeId: 'outdoor_week',
        name: 'Outdoor Week Challenge',
        description: 'Walk at least 5,000 steps daily for 7 days to earn this badge.',
        type: 'daily_steps',
        duration: 7,
        durationLabel: '7 day',
        difficulty: 'medium',
        targetValue: 5000,
        targetLabel: '5,000 steps daily',
        reward: 'Outdoor Enthusiast',
        iconType: 'star',
        backgroundColor: '#4CAF50',
        imageUrl: 'Challenge.jpg'
      },
      {
        challengeId: 'indoor_week',
        name: 'Indoor Week Challenge',
        description: 'Achieve 6,000 steps daily for 7 days without stepping outside.',
        type: 'daily_steps',
        duration: 7,
        durationLabel: '7 day',
        difficulty: 'medium',
        targetValue: 6000,
        targetLabel: '6,000 steps daily',
        reward: 'Indoor Pro',
        iconType: 'star',
        backgroundColor: '#2196F3',
        imageUrl: 'Challenge.jpg'
      },
      {
        challengeId: 'daily_steps-28',
        name: '28-DAY',
        description: 'Build a long-lasting habit by walking 7,000 steps every day for 28 days.',
        type: 'daily_steps',
        duration: 28,
        durationLabel: '28 day',
        difficulty: 'hard',
        targetValue: 7000,
        targetLabel: '7,000 steps daily',
        reward: 'Gold Medal',
        iconType: 'trophy',
        backgroundColor: '#FFD700',
        imageUrl: 'Challenge.jpg'
      },
      {
        challengeId: 'beginner_walker',
        name: 'Beginner Walker',
        description: 'Walk at least 2,000 steps each day for 3 days to start your walking journey.',
        type: 'daily_steps',
        duration: 3,
        durationLabel: '3 day',
        difficulty: 'easy',
        targetValue: 2000,
        targetLabel: '2,000 steps daily',
        reward: 'Starter Badge',
        iconType: 'badge',
        backgroundColor: '#2196F3',
        imageUrl: 'Challenge.jpg'
      },
      {
        challengeId: 'step_master',
        name: 'Step Master',
        description: 'Achieve a total of 100,000 steps over 14 days to become a true step master.',
        type: 'steps',
        duration: 14,
        durationLabel: '14 day',
        difficulty: 'medium',
        targetValue: 100000,
        targetLabel: '100,000 total steps',
        reward: 'Master Stepper Badge',
        iconType: 'badge',
        backgroundColor: '#9C27B0',
        imageUrl: 'Challenge.jpg'
      }
    ];

    for (const template of standardChallenges) {
      const exists = await Challenge.findOne({ challengeId: template.challengeId });
      if (!exists) {
        await Challenge.create({
          ...template,
          isActive: true
        });
      }
    }
    
    // Update image URLs for existing challenges
    await this.updateExistingChallengeImages();
  }

  // Update image URLs for existing challenges
  async updateExistingChallengeImages() {
    console.log('Updating challenge images...');
    const defaultImageName = 'Challenge.jpg';
    
    // Find all challenges with empty or missing imageUrl
    const challengesWithoutImages = await Challenge.find({ 
      $or: [
        { imageUrl: "" },
        { imageUrl: { $exists: false } }
      ]
    });
    
    console.log(`Found ${challengesWithoutImages.length} challenges that need image updates`);
    
    // Update each challenge to add the default image
    for (const challenge of challengesWithoutImages) {
      challenge.imageUrl = defaultImageName;
      await challenge.save();
      console.log(`Updated image for challenge: ${challenge.name}`);
    }
    
    return { 
      updated: challengesWithoutImages.length,
      message: `Updated ${challengesWithoutImages.length} challenges with default images`
    };
  }

  // Get user's active challenges
  async getUserActiveChallenges(userId) {
    const activeEnrollments = await UserChallengeEnrollment.find({
      userId,
      status: 'active'
    }).populate('challenge');

    return activeEnrollments.map(enrollment => {
      const challenge = enrollment.challenge;
      
      // Convert challenge to object and add full image path
      const challengeObj = challenge.toObject ? challenge.toObject() : { ...challenge };
      if (challengeObj.imageUrl) {
        challengeObj.imageUrl = this.getFullImagePath(challengeObj.imageUrl);
      }
      
      return {
        challengeId: challenge.challengeId,
        name: challenge.name,
        description: challenge.description,
        progress: enrollment.completionPercentage,
        daysRemaining: this.calculateDaysRemaining(enrollment),
        startDate: enrollment.startDate,
        endDate: enrollment.endDate,
        targetValue: challenge.targetValue,
        targetLabel: challenge.targetLabel,
        imageUrl: challengeObj.imageUrl || ''
      };
    });
  }

  // Get user's completed challenges
  async getUserCompletedChallenges(userId) {
    const completedEnrollments = await UserChallengeEnrollment.find({
      userId,
      status: 'completed'
    }).populate('challenge');

    return completedEnrollments.map(enrollment => {
      const challenge = enrollment.challenge;
      
      // Convert challenge to object and add full image path
      const challengeObj = challenge.toObject ? challenge.toObject() : { ...challenge };
      if (challengeObj.imageUrl) {
        challengeObj.imageUrl = this.getFullImagePath(challengeObj.imageUrl);
      }
      
      return {
        challengeId: challenge.challengeId,
        name: challenge.name,
        description: challenge.description,
        completedOn: enrollment.completedAt,
        duration: challenge.duration,
        difficulty: challenge.difficulty,
        imageUrl: challengeObj.imageUrl || ''
      };
    });
  }

  // Update challenge status (archive, etc.)
  async updateChallengeStatus(userId, challengeId, newStatus) {
    const allowedStatuses = ['active', 'archived'];
    
    if (!allowedStatuses.includes(newStatus)) {
      throw new Error('Invalid status. Allowed statuses: ' + allowedStatuses.join(', '));
    }
    
    let challenge;
    
    // Try to find by challengeId string first
    challenge = await Challenge.findOne({ challengeId });
    
    // If not found, try to find by MongoDB _id
    if (!challenge && mongoose.Types.ObjectId.isValid(challengeId)) {
      challenge = await Challenge.findById(challengeId);
    }
    
    if (!challenge) throw new Error('Challenge not found');
    
    const enrollment = await UserChallengeEnrollment.findOne({
      userId,
      challenge: challenge._id
    }).sort({ createdAt: -1 }); // Get the most recent enrollment
    
    if (!enrollment) {
      throw new Error('User not enrolled in this challenge');
    }
    
    // Don't allow changing completed challenges
    if (enrollment.status === 'completed' && newStatus !== 'archived') {
      throw new Error('Cannot change status of completed challenges');
    }
    
    enrollment.status = newStatus;
    await enrollment.save();
    
    return {
      challengeId: challenge.challengeId,
      status: newStatus,
      updated: true
    };
  }
}

module.exports = new ChallengeService();