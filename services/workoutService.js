const axios = require('axios');
const Workout = require('../models/WorkoutModel');
const UserProfile = require('../models/UserProfile');
const DailyWorkout = require('../models/DailyWorkoutModel');
const WorkoutSession = require('../models/WorkoutSession');
const WorkoutCategory = require('../models/WorkoutCategory');
const WorkoutProgram = require('../models/WorkoutProgram');
const UserWorkoutProgress = require('../models/UserWorkoutProgress');

class WorkoutService {
  constructor() {
    this.apiKey = process.env.FITNESS_API_KEY;
    this.baseUrl = 'https://api.api-ninjas.com/v1';
    console.log('WorkoutService initialized with API URL:', this.baseUrl);
    console.log('API Key present:', !!this.apiKey);

    // Default category IDs
    this.categoryIds = ['weight_loss', 'progression', 'lunch_walks'];
    
    // Base path for workout images
    this.workoutImageBasePath = 'http://ec2-16-171-15-0.eu-north-1.compute.amazonaws.com:9000/images/workout';
  }

  // Get full image path
  getFullImagePath(imageName) {
    if (!imageName) return '';
    return `${this.workoutImageBasePath}/${imageName}`;
  }

  // Fetch exercises from Ninja API
  async fetchExercisesFromNinjaAPI(params = {}) {
    console.log('Fetching exercises from Ninja API with params:', params);
    try {
      const url = `${this.baseUrl}/exercises`;
      console.log('Making API request to:', url);
      console.log('Request headers:', {
        'X-Api-Key': this.apiKey ? 'Present (hidden)' : 'Missing'
      });
      console.log('Request params:', params);

      const response = await axios.get(url, {
        headers: {
          'X-Api-Key': this.apiKey
        },
        params: {
          type: 'cardio',
          ...params
        }
      });

      console.log('API Response status:', response.status);
      console.log('Number of exercises received:', response.data?.length || 0);

      if (response.data && response.data.length > 0) {
        // Filter for walking exercises with stricter criteria
        const walkingExercises = response.data.filter(exercise => {
          const name = exercise.name.toLowerCase();
          const instructions = exercise.instructions.toLowerCase();

          // Check if it's explicitly a walking exercise
          const isWalking = (
            name.includes('walk') ||
            name.includes('hike') ||
            name.includes('stroll') ||
            (instructions.includes('walk') && !instructions.includes('skate')) ||
            (instructions.includes('hike') && !instructions.includes('bike'))
          );

          // Log the decision for debugging
          console.log(`Exercise "${exercise.name}" is walking:`, isWalking, {
            name: name,
            hasWalkInName: name.includes('walk'),
            hasHikeInName: name.includes('hike'),
            hasStrollInName: name.includes('stroll'),
            hasWalkInInstructions: instructions.includes('walk'),
            hasHikeInInstructions: instructions.includes('hike')
          });

          return isWalking;
        });

        console.log('Number of walking exercises found:', walkingExercises.length);

        // Return walking exercises if available, otherwise return all cardio exercises
        const exercisesToReturn = walkingExercises.length > 0 ? walkingExercises : response.data;
        console.log('Final number of exercises to return:', exercisesToReturn.length);

        return exercisesToReturn;
      }
      console.log('No exercises found in API response');
      return [];
    } catch (error) {
      console.error('Error fetching exercises from Ninja API:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      return [];
    }
  }

  // Create workout from exercise
  async createWorkoutFromExercise(exercise, categoryId, programId = null, programName = null, order = 1) {
    console.log('Creating workout from exercise:', {
      exerciseName: exercise.name,
      categoryId,
      programId,
      order
    });

    const duration = categoryId === 'lunch_walks' ? 15 : categoryId === 'weight_loss' ? 30 : 20;
    const calories = duration * 5;
    const distance = +(duration * 0.08).toFixed(1);

    console.log('Calculated workout parameters:', {
      duration,
      calories,
      distance
    });

    const workout = await Workout.create({
      name: exercise.name.includes('Walk') ? exercise.name : `${exercise.name} Walking Workout`,
      description: exercise.instructions,
      type: 'walk',
      category: categoryId === 'weight_loss' ? 'weight_loss' : 'progression',
      programId,
      programName,
      order,
      duration,
      estimatedCalories: calories,
      targetDistance: distance,
      includesWarmup: true,
      includesCooldown: true
    });

    console.log('Created workout:', {
      id: workout._id,
      name: workout.name,
      duration: workout.duration
    });

    return workout;
  }

  // Fetch workout categories from API
  async fetchWorkoutCategories() {
    try {
      // Check if categories exist in DB first
      const existingCategories = await WorkoutCategory.find();

      if (existingCategories.length > 0) {
        // Modify the image paths before returning
        return existingCategories.map(category => {
          const categoryObj = category.toObject ? category.toObject() : { ...category };
          if (categoryObj.image) {
            categoryObj.image = this.getFullImagePath(categoryObj.image);
          }
          return categoryObj;
        });
      }

      // Create default categories since Ninja API doesn't have categories
      const fallbackCategories = [
        {
          id: 'weight_loss',
          name: 'Walk off Weight',
          description: 'Walking workouts designed for weight loss',
          image: 'weight-loss.jpg'
        },
        {
          id: 'progression',
          name: 'Get Active',
          description: 'Progressive walking workouts to build endurance',
          image: 'progression.jpg'
        },
        {
          id: 'lunch_walks',
          name: 'After Lunch Walking',
          description: 'Short walks to aid digestion and boost afternoon energy',
          image: 'lunch-walks.jpg'
        }
      ];

      const categories = [];
      for (const cat of fallbackCategories) {
        const newCategory = await WorkoutCategory.create({
          id: cat.id,
          name: cat.name,
          description: cat.description,
          image: cat.image
        });
        
        // Update image path for response
        const categoryObj = newCategory.toObject ? newCategory.toObject() : { ...newCategory };
        if (categoryObj.image) {
          categoryObj.image = this.getFullImagePath(categoryObj.image);
        }
        categories.push(categoryObj);
      }

      return categories;
    } catch (error) {
      console.error('Error in fetchWorkoutCategories:', error);
      throw error;
    }
  }

  // Fetch workout programs by category
  async fetchWorkoutProgramsByCategory(categoryId) {
    try {
      // Check if programs exist in DB for this category
      const existingPrograms = await WorkoutProgram.find({ categoryId });

      if (existingPrograms.length > 0) {
        // Update image paths before returning
        return existingPrograms.map(program => {
          const programObj = program.toObject ? program.toObject() : { ...program };
          if (programObj.image) {
            programObj.image = this.getFullImagePath(programObj.image);
          }
          return programObj;
        });
      }

      // Create programs for this category using exercises from Ninja API
      const programs = [];
      let difficultyLevel;
      let exerciseType = 'cardio'; // Default type for walking workouts

      // Determine appropriate difficulty based on category
      if (categoryId === 'weight_loss') {
        difficultyLevel = 'intermediate';
      } else if (categoryId === 'progression') {
        difficultyLevel = 'beginner';
      } else if (categoryId === 'lunch_walks') {
        difficultyLevel = 'beginner';
      }

      try {
        // Fetch exercises from Ninja API
        const response = await axios.get(`${this.baseUrl}/exercises`, {
          headers: {
            'X-Api-Key': this.apiKey
          },
          params: {
            type: exerciseType,
            difficulty: difficultyLevel
          }
        });

        if (response.data && response.data.length > 0) {
          // Filter for walking exercises
          const walkingExercises = response.data.filter(exercise =>
            exercise.name.toLowerCase().includes('walk') ||
            exercise.instructions.toLowerCase().includes('walk')
          );

          // Use walking exercises if available, otherwise use cardio exercises
          const exercisesToUse = walkingExercises.length > 0 ? walkingExercises : response.data;

          // Create a program based on the category
          let programName, programDesc, programImage, programId;

          if (categoryId === 'weight_loss') {
            programName = 'Walk off Weight Program';
            programDesc = 'A progressive walking program designed to help with weight loss';
            programImage = 'weight-loss.jpg';
            programId = 'weight_loss_program';
          } else if (categoryId === 'progression') {
            programName = 'Get Active Program';
            programDesc = 'A beginner-friendly program to build your walking endurance gradually';
            programImage = 'progression.jpg';
            programId = 'get_active_program';
          } else if (categoryId === 'lunch_walks') {
            programName = 'After Lunch Walking Program';
            programDesc = 'Short, energizing walks perfect for after meals';
            programImage = 'lunch-walks.jpg';
            programId = 'lunch_program';
          }

          // Create the program
          const newProgram = await WorkoutProgram.create({
            id: programId,
            name: programName,
            description: programDesc,
            categoryId: categoryId,
            image: programImage,
            difficulty: difficultyLevel,
            duration: 14,  // 2 weeks program
            totalWorkouts: Math.min(exercisesToUse.length, 7) // Up to 7 workouts per program
          });

          // Update the image path before pushing to programs array
          const programObj = newProgram.toObject ? newProgram.toObject() : { ...newProgram };
          if (programObj.image) {
            programObj.image = this.getFullImagePath(programObj.image);
          }
          programs.push(programObj);

          // Create workouts for this program using API exercises
          const maxWorkouts = Math.min(exercisesToUse.length, 7);

          for (let i = 0; i < maxWorkouts; i++) {
            const exercise = exercisesToUse[i];
            const duration = categoryId === 'lunch_walks' ? 15 : categoryId === 'weight_loss' ? 30 : 20;
            const calories = duration * 5;
            const distance = +(duration * 0.08).toFixed(1);

            await Workout.create({
              name: exercise.name.includes('Walk') ? exercise.name : `${exercise.name} Walking Workout`,
              description: exercise.instructions,
              type: 'walk',
              category: categoryId === 'weight_loss' ? 'weight_loss' : 'progression',
              programId: programId,
              programName: programName,
              order: i + 1,
              duration: duration,
              estimatedCalories: calories,
              targetDistance: distance,
              includesWarmup: true,
              includesCooldown: true
            });
          }
        } else {
          // Create fallback programs if no exercises found
          const createdProgram = await this.createFallbackProgram(categoryId);
          
          // Update the image path before pushing to programs array
          const programObj = createdProgram.toObject ? createdProgram.toObject() : { ...createdProgram };
          if (programObj.image) {
            programObj.image = this.getFullImagePath(programObj.image);
          }
          programs.push(programObj);
        }
      } catch (apiError) {
        console.error(`Error fetching exercises from API for category ${categoryId}:`, apiError);
        // Create fallback programs if API fails
        const createdProgram = await this.createFallbackProgram(categoryId);
        
        // Update the image path before pushing to programs array
        const programObj = createdProgram.toObject ? createdProgram.toObject() : { ...createdProgram };
        if (programObj.image) {
          programObj.image = this.getFullImagePath(programObj.image);
        }
        programs.push(programObj);
      }

      return programs;
    } catch (error) {
      console.error('Error in fetchWorkoutProgramsByCategory:', error);
      throw error;
    }
  }

  // Helper method to create fallback programs
  async createFallbackProgram(categoryId) {
    let program = {
      id: '',
      name: '',
      description: '',
      image: '',
      difficulty: 'beginner',
      duration: 7,
      workouts: []
    };

    if (categoryId === 'lunch_walks') {
      program = {
        id: 'lunch_program',
        name: 'After Lunch Walking',
        description: 'Short walks perfect for after meals',
        image: 'lunch-walks.jpg',
        difficulty: 'beginner',
        duration: 7,
        workouts: [
          {
            name: 'Short Walk 1',
            description: 'Easy 10-minute walk to aid digestion',
            duration: 10,
            calories: 30,
            distance: 0.7,
            order: 1
          },
          {
            name: 'Short Walk 2',
            description: 'Easy 10-minute walk with slightly faster pace',
            duration: 10,
            calories: 30,
            distance: 0.7,
            order: 2
          },
          {
            name: 'Short Walk 3',
            description: 'Moderate 15-minute walk',
            duration: 15,
            calories: 45,
            distance: 1,
            order: 3
          }
        ]
      };
    } else if (categoryId === 'weight_loss') {
      program = {
        id: 'weight_loss_program',
        name: 'Walk off Weight',
        description: 'Walking routines designed for weight management',
        image: 'weight-loss.jpg',
        difficulty: 'intermediate',
        duration: 14,
        workouts: [
          {
            name: 'Fat Burn Walk 1',
            description: 'Moderate intensity walk with intervals',
            duration: 20,
            calories: 120,
            distance: 1.5,
            order: 1
          },
          {
            name: 'Fat Burn Walk 2',
            description: 'Higher intensity walk with longer intervals',
            duration: 25,
            calories: 150,
            distance: 2.0,
            order: 2
          }
        ]
      };
    } else if (categoryId === 'progression') {
      program = {
        id: 'get_active_program',
        name: 'Get Active',
        description: 'Beginner friendly walking routines',
        image: 'progression.jpg',
        difficulty: 'beginner',
        duration: 7,
        workouts: [
          {
            name: 'First Steps',
            description: 'Very gentle introduction to walking',
            duration: 15,
            calories: 45,
            distance: 0.8,
            order: 1
          },
          {
            name: 'Step Up',
            description: 'Slightly more challenging walk',
            duration: 20,
            calories: 60,
            distance: 1.2,
            order: 2
          }
        ]
      };
    }

    // Create the program
    const newProgram = await WorkoutProgram.create({
      id: program.id,
      name: program.name,
      description: program.description,
      categoryId: categoryId,
      image: program.image,
      difficulty: program.difficulty,
      duration: program.duration,
      totalWorkouts: program.workouts.length
    });

    // Create workouts for this program
    for (const workout of program.workouts) {
      await Workout.create({
        name: workout.name,
        description: workout.description,
        type: 'walk',
        category: categoryId === 'weight_loss' ? 'weight_loss' : 'progression',
        programId: program.id,
        programName: program.name,
        order: workout.order,
        duration: workout.duration,
        estimatedCalories: workout.calories,
        targetDistance: workout.distance,
        includesWarmup: true,
        includesCooldown: true
      });
    }

    return newProgram;
  }

  // Fetch workouts for a specific program
  async fetchWorkoutsForProgram(programId) {
    try {
      // Check if workouts for this program exist in DB
      const existingWorkouts = await Workout.find({ programId }).sort({ order: 1 });

      if (existingWorkouts.length > 0) {
        return existingWorkouts;
      }

      // Get the program to determine how to fetch workouts
      const program = await WorkoutProgram.findOne({ id: programId });
      if (!program) {
        throw new Error(`Program not found: ${programId}`);
      }

      let difficulty;
      if (program.difficulty === 'beginner') {
        difficulty = 'beginner';
      } else if (program.difficulty === 'intermediate') {
        difficulty = 'intermediate';
      } else {
        difficulty = 'expert';
      }

      // Fetch exercises from Ninja API
      try {
        const response = await axios.get(`${this.baseUrl}/exercises`, {
          headers: {
            'X-Api-Key': this.apiKey
          },
          params: {
            type: 'cardio',
            difficulty: difficulty
          }
        });

        const workouts = [];

        if (response.data && response.data.length > 0) {
          // Filter for walking exercises
          const walkingExercises = response.data.filter(exercise =>
            exercise.name.toLowerCase().includes('walk') ||
            exercise.instructions.toLowerCase().includes('walk')
          );

          // Use walking exercises if available, otherwise use cardio exercises
          const exercisesToUse = walkingExercises.length > 0 ? walkingExercises : response.data;

          // Set base workout parameters based on program
          let baseDuration, baseCalories, baseDistance;
          if (program.categoryId === 'lunch_walks') {
            baseDuration = 15;
          } else if (program.categoryId === 'weight_loss') {
            baseDuration = 30;
          } else {
            baseDuration = 20;
          }

          baseCalories = baseDuration * 5;
          baseDistance = +(baseDuration * 0.08).toFixed(1);

          // Create workouts using API exercises
          const maxWorkouts = Math.min(exercisesToUse.length, 7);

          for (let i = 0; i < maxWorkouts; i++) {
            const exercise = exercisesToUse[i];

            // Progressively increase duration and intensity
            const duration = baseDuration + (i * 2);
            const calories = Math.round(duration * 5);
            const distance = +((duration * 0.08) + (i * 0.05)).toFixed(1);

            const newWorkout = await Workout.create({
              name: exercise.name.includes('Walk') ? exercise.name : `${exercise.name} Walking Workout`,
              description: exercise.instructions,
              type: 'walk',
              category: program.categoryId === 'weight_loss' ? 'weight_loss' : 'progression',
              programId: program.id,
              programName: program.name,
              order: i + 1,
              duration: duration,
              estimatedCalories: calories,
              targetDistance: distance,
              includesWarmup: true,
              includesCooldown: true
            });

            workouts.push(newWorkout);
          }

          // Update program's workout count
          program.totalWorkouts = workouts.length;
          await program.save();

          return workouts;
        } else {
          throw new Error('No exercises returned from API');
        }
      } catch (apiError) {
        console.error(`Error fetching exercises for program ${programId}:`, apiError);

        // Create fallback workouts
        const workouts = [];
        const categoryId = program.categoryId;
        const workoutCount = categoryId === 'lunch_walks' ? 3 : 5;

        for (let i = 0; i < workoutCount; i++) {
          let duration, calories, distance;

          if (categoryId === 'lunch_walks') {
            duration = 10 + (i * 2);
            calories = duration * 3;
            distance = +(duration * 0.07).toFixed(1);
          } else if (categoryId === 'weight_loss') {
            duration = 20 + (i * 5);
            calories = duration * 6;
            distance = +(duration * 0.1).toFixed(1);
          } else {
            duration = 15 + (i * 3);
            calories = duration * 4;
            distance = +(duration * 0.08).toFixed(1);
          }

          const newWorkout = await Workout.create({
            name: `Walking Workout ${i + 1}`,
            description: `A ${duration}-minute walking workout to help you achieve your fitness goals.`,
            type: 'walk',
            category: categoryId === 'weight_loss' ? 'weight_loss' : 'progression',
            programId: program.id,
            programName: program.name,
            order: i + 1,
            duration: duration,
            estimatedCalories: calories,
            targetDistance: distance,
            includesWarmup: true,
            includesCooldown: true
          });

          workouts.push(newWorkout);
        }

        // Update program's workout count
        program.totalWorkouts = workouts.length;
        await program.save();

        return workouts;
      }
    } catch (error) {
      console.error('Error in fetchWorkoutsForProgram:', error);
      throw error;
    }
  }

  // Get today's workout
  async getTodaysWorkout(userId) {
    console.log('Getting today\'s workout for user:', userId);
    try {
      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Try to find a daily workout for today
      let dailyWorkout = await DailyWorkout.findOne({ userId, date: today })
        .populate('workoutId')
        .populate('activeSessionId')
        .populate('completedSessionId');

      console.log('Existing daily workout found:', !!dailyWorkout);

      // If daily workout exists, return it
      if (dailyWorkout && dailyWorkout.workoutId) {
        console.log('Returning existing daily workout');
        return dailyWorkout;
      }

      // Fetch workout from Ninja API
      let selectedWorkout;
      try {
        // Get user profile to determine fitness level for API parameters
        const userProfile = await UserProfile.findOne({ userId });
        console.log('User profile found:', {
          fitnessLevel: userProfile?.fitnessLevel,
          preferredDuration: userProfile?.preferredWorkoutDuration
        });

        let difficulty = 'beginner';
        if (userProfile?.fitnessLevel) {
          if (userProfile.fitnessLevel === 'advanced') {
            difficulty = 'expert';
          } else if (userProfile.fitnessLevel === 'intermediate') {
            difficulty = 'intermediate';
          }
        }
        console.log('Selected difficulty level:', difficulty);

        // Fetch exercises from Ninja API
        const exercises = await this.fetchExercisesFromNinjaAPI({ difficulty });

        if (exercises.length > 0) {
          console.log('Successfully fetched exercises from API');
          // Select a random exercise
          const randomIndex = Math.floor(Math.random() * exercises.length);
          const selectedExercise = exercises[randomIndex];
          console.log('Selected exercise:', {
            name: selectedExercise.name,
            type: selectedExercise.type,
            difficulty: selectedExercise.difficulty
          });

          // Create a workout from the selected exercise
          selectedWorkout = await this.createWorkoutFromExercise(
            selectedExercise,
            'progression',
            null,
            null,
            1
          );
        } else {
          console.log('No exercises returned from API, using fallback');
          throw new Error('No exercises returned from API');
        }
      } catch (apiError) {
        console.error('Error in API workflow:', {
          message: apiError.message,
          stack: apiError.stack
        });

        // Fallback: Create a basic walking workout
        const workouts = await Workout.find({
          type: 'walk',
          name: { $regex: /walk/i }
        });

        console.log('Fallback workouts found:', workouts.length);

        if (!workouts || workouts.length === 0) {
          console.log('Creating default walking workout');
          selectedWorkout = new Workout({
            name: 'Daily Walking Workout',
            description: 'A simple walking workout to get you moving. Begin with a slow 2-minute warm-up. Then walk at a moderate pace that slightly elevates your heart rate but still allows you to talk comfortably. Focus on maintaining good posture with your head up and shoulders relaxed. Finish with a 2-minute cool-down at a slower pace.',
            type: 'walk',
            category: 'progression',
            duration: 20,
            estimatedCalories: 100,
            targetDistance: 1.5,
            includesWarmup: true,
            includesCooldown: true
          });

          await selectedWorkout.save();
        } else {
          // Use a random walking workout from DB
          const randomIndex = Math.floor(Math.random() * workouts.length);
          selectedWorkout = workouts[randomIndex];
          console.log('Selected fallback workout:', {
            id: selectedWorkout._id,
            name: selectedWorkout.name
          });
        }
      }

      // Get user profile to determine step goal
      const userProfile = await UserProfile.findOne({ userId });
      const targetSteps = userProfile?.stepGoal || 5000;
      console.log('User step goal:', targetSteps);

      // Create daily workout
      const newDailyWorkout = new DailyWorkout({
        userId,
        date: today,
        workoutId: selectedWorkout._id,
        targetSteps: targetSteps,
        completed: false,
        updatedAt: new Date()
      });

      console.log('Creating new daily workout:', {
        userId,
        workoutId: selectedWorkout._id,
        targetSteps
      });

      const savedDailyWorkout = await newDailyWorkout.save();

      // Return with populated fields
      const populatedWorkout = await DailyWorkout.findById(savedDailyWorkout._id)
        .populate('workoutId')
        .populate('activeSessionId')
        .populate('completedSessionId');

      console.log('Returning populated daily workout');
      return populatedWorkout;
    } catch (error) {
      console.error('Error in getTodaysWorkout:', {
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async getTodayProgressBarData(userId) {
    try {
      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get user profile for step goal (the only target we get from user profile)
      const userProfile = await UserProfile.findOne({ userId });
      const stepGoal = userProfile?.stepGoal || 0;

      // Try to get today's assigned workout from DailyWorkout
      const dailyWorkout = await DailyWorkout.findOne({
        userId,
        date: today
      }).populate('workoutId');

      // Find active or most recent completed session for today
      const activeSession = await WorkoutSession.findOne({
        userId,
        status: 'in_progress'
      }).populate('workoutId').sort({ startTime: -1 });

      const completedSession = await WorkoutSession.findOne({
        userId,
        status: 'completed',
        startTime: { $gte: today }
      }).populate('workoutId').sort({ endTime: -1 });

      // Use either active or completed session, prioritizing active
      const session = activeSession || completedSession;

      // Get the workout from session or daily workout
      const workout = session?.workoutId || dailyWorkout?.workoutId;

      // Response structure with fully dynamic targets
      const progressData = {
        steps: {
          current: 0,
          target: stepGoal
        },
        calories: {
          current: 0,
          target: workout?.estimatedCalories || 0
        },
        distance: {
          current: 0,
          target: workout?.targetDistance || 0
        },
        exercise: {
          current: 0,
          target: workout?.duration || 0
        }
      };

      // If we have a session, populate the current progress data
      if (session) {
        // Update steps data
        progressData.steps.current = session.totalSteps || 0;

        // Update calories data
        progressData.calories.current = session.caloriesBurned || 0;

        // Update distance data
        progressData.distance.current = session.totalDistance || 0;

        // Update exercise time data
        let exerciseMinutes = 0;
        if (session.status === 'completed' && session.duration) {
          // For completed sessions, use the recorded duration in seconds, convert to minutes
          exerciseMinutes = Math.floor(session.duration / 60);
        } else if (session.status === 'in_progress') {
          // For active sessions, calculate time from start until now
          const elapsedMs = Date.now() - session.startTime;
          exerciseMinutes = Math.floor(elapsedMs / (1000 * 60));
        }
        progressData.exercise.current = exerciseMinutes;
      }

      // Add header summary for compact display
      progressData.headerSummary = `${progressData.steps.current === 0 ? '0k' : (progressData.steps.current / 1000).toFixed(1) + 'k'} / ${(progressData.steps.target / 1000).toFixed(1)}k`;

      return progressData;
    } catch (error) {
      console.error('Error getting today\'s progress bar data:', error);
      throw error;
    }
  }

  // Update workout session status in daily workout
  async updateDailyWorkoutSessionStatus(userId, sessionId, status) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find daily workout for today
      const dailyWorkout = await DailyWorkout.findOne({ userId, date: today });

      if (!dailyWorkout) {
        return null;
      }

      // Update status based on the session status
      if (status === 'in_progress') {
        dailyWorkout.activeSessionId = sessionId;
      } else if (status === 'completed') {
        dailyWorkout.activeSessionId = null;
        dailyWorkout.completedSessionId = sessionId;
        dailyWorkout.completed = true;
      }

      dailyWorkout.updatedAt = new Date();
      return await dailyWorkout.save();
    } catch (error) {
      console.error('Error updating daily workout session status:', error);
      throw error;
    }
  }
  // Add this method to your WorkoutService class
  async markWorkoutComplete(workoutId, userId) {
    try {
      // First check if this workout is already marked complete for this user
      const existingProgress = await UserWorkoutProgress.findOne({
        userId,
        workoutId
      });

      if (existingProgress) {
        // Update existing record if needed
        if (!existingProgress.completed) {
          existingProgress.completed = true;
          existingProgress.completedAt = new Date();
          await existingProgress.save();
        }
        return existingProgress;
      } else {
        // Create new progress record
        const newProgress = new UserWorkoutProgress({
          userId,
          workoutId,
          completed: true,
          completedAt: new Date()
        });

        // If this workout is part of a program, add the program ID
        const workout = await Workout.findById(workoutId);
        if (workout && workout.programId) {
          newProgress.programId = workout.programId;
        }

        await newProgress.save();
        return newProgress;
      }
    } catch (error) {
      console.error('Error marking workout as complete:', error);
      throw error;
    }
  }
  // Get user program progress
  async getUserProgramProgress(userId, programId) {
    try {
      // Get all workouts for this program
      const workouts = await Workout.find({ programId });

      // Get user's completed workouts for this program
      const completedWorkouts = await UserWorkoutProgress.find({
        userId,
        programId,
        completed: true
      });

      return {
        totalWorkouts: workouts.length,
        completedWorkouts: completedWorkouts.length,
        progress: workouts.length > 0 ?
          Math.round((completedWorkouts.length / workouts.length) * 100) : 0
      };
    } catch (error) {
      console.error('Error getting user program progress:', error);
      throw error;
    }
  }

  // Regenerate workout plan after profile update
  async regenerateWorkoutsAfterProfileUpdate(userId) {
    try {
      // Get user profile
      const userProfile = await UserProfile.findOne({ userId });
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Update today's workout if it exists
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyWorkout = await DailyWorkout.findOne({ userId, date: today });
      if (dailyWorkout) {
        try {
          // Get user's fitness level for API parameters
          let difficulty = 'beginner';
          if (userProfile.fitnessLevel === 'advanced') {
            difficulty = 'expert';
          } else if (userProfile.fitnessLevel === 'intermediate') {
            difficulty = 'intermediate';
          }

          // Fetch exercises from Ninja API
          const exercises = await this.fetchExercisesFromNinjaAPI({ difficulty });

          if (exercises.length > 0) {
            // Select a random exercise
            const randomIndex = Math.floor(Math.random() * exercises.length);
            const selectedExercise = exercises[randomIndex];

            // Create a workout from the selected exercise
            const newWorkout = await this.createWorkoutFromExercise(
              selectedExercise,
              'progression',
              null,
              null,
              1
            );

            dailyWorkout.workoutId = newWorkout._id;
          } else {
            // Fallback to a random workout if no exercises found
            const workouts = await this.getAllWorkouts();
            const randomIndex = Math.floor(Math.random() * workouts.length);
            const selectedWorkout = workouts[randomIndex];
            dailyWorkout.workoutId = selectedWorkout._id;
          }
        } catch (apiError) {
          console.error('Error getting personalized workout from API:', apiError);
          // Fallback to a random workout if API fails
          const workouts = await this.getAllWorkouts();
          const randomIndex = Math.floor(Math.random() * workouts.length);
          const selectedWorkout = workouts[randomIndex];
          dailyWorkout.workoutId = selectedWorkout._id;
        }

        dailyWorkout.updatedAt = new Date();
        await dailyWorkout.save();
      }

      return { success: true, message: 'Workout plan regenerated' };
    } catch (error) {
      console.error('Error regenerating workouts after profile update:', error);
      throw error;
    }
  }

  // Fetch single workout program by ID
  async fetchWorkoutProgram(programId) {
    try {
      // First try to find the program in the database
      const program = await WorkoutProgram.findOne({ id: programId });

      if (program) {
        // Update the image path before returning
        const programObj = program.toObject ? program.toObject() : { ...program };
        if (programObj.image) {
          programObj.image = this.getFullImagePath(programObj.image);
        }
        return programObj;
      }

      // If not found in DB, try to create it using Ninja API exercises
      try {
        // Determine difficulty based on program ID
        let difficulty = 'beginner';
        if (programId.includes('weight_loss')) {
          difficulty = 'intermediate';
        }

        // Fetch exercises from Ninja API
        const exercises = await this.fetchExercisesFromNinjaAPI({ difficulty });

        if (exercises.length > 0) {
          // Create program details based on ID
          let programName, programDesc, programImage, categoryId;

          if (programId.includes('weight_loss')) {
            programName = 'Walk off Weight Program';
            programDesc = 'A progressive walking program designed to help with weight loss';
            programImage = 'weight-loss.jpg';
            categoryId = 'weight_loss';
          } else if (programId.includes('lunch')) {
            programName = 'After Lunch Walking Program';
            programDesc = 'Short, energizing walks perfect for after meals';
            programImage = 'lunch-walks.jpg';
            categoryId = 'lunch_walks';
          } else {
            programName = 'Get Active Program';
            programDesc = 'A beginner-friendly program to build your walking endurance gradually';
            programImage = 'progression.jpg';
            categoryId = 'progression';
          }

          // Create the program
          const newProgram = await WorkoutProgram.create({
            id: programId,
            name: programName,
            description: programDesc,
            categoryId: categoryId,
            image: programImage,
            difficulty: difficulty,
            duration: 14,  // 2 weeks program
            totalWorkouts: Math.min(exercises.length, 7) // Up to 7 workouts per program
          });

          // Create workouts for this program
          const maxWorkouts = Math.min(exercises.length, 7);
          for (let i = 0; i < maxWorkouts; i++) {
            await this.createWorkoutFromExercise(
              exercises[i],
              categoryId,
              programId,
              programName,
              i + 1
            );
          }

          // Update image path before returning
          const programObj = newProgram.toObject ? newProgram.toObject() : { ...newProgram };
          if (programObj.image) {
            programObj.image = this.getFullImagePath(programObj.image);
          }
          return programObj;
        } else {
          // If no exercises found, create a fallback program
          const fallbackProgram = await this.createFallbackProgram(programId.split('_')[0]);
          
          // Update image path before returning
          const programObj = fallbackProgram.toObject ? fallbackProgram.toObject() : { ...fallbackProgram };
          if (programObj.image) {
            programObj.image = this.getFullImagePath(programObj.image);
          }
          return programObj;
        }
      } catch (apiError) {
        console.error(`Error creating program ${programId} from API:`, apiError);
        // Create fallback program if API fails
        const fallbackProgram = await this.createFallbackProgram(programId.split('_')[0]);
        
        // Update image path before returning
        const programObj = fallbackProgram.toObject ? fallbackProgram.toObject() : { ...fallbackProgram };
        if (programObj.image) {
          programObj.image = this.getFullImagePath(programObj.image);
        }
        return programObj;
      }
    } catch (error) {
      console.error('Error fetching workout program:', error);
      throw error;
    }
  }

  async getWorkoutDetails(workoutId) {
    try {
      const workout = await Workout.findById(workoutId);
      if (!workout) return null;

      const workoutData = workout.toObject();

      // Create segments structure for both outdoor and treadmill
      const createSegments = (environment) => {
        const segments = [];

        // Fixed warmup - always 5 minutes if enabled
        if (workout.includesWarmup) {
          segments.push({
            name: "WARMUP",
            duration: 5,
            displayTime: "5:00"
          });
        }

        // The workout.duration is the TRAINING duration only
        const trainingDuration = workout.duration;

        // For progression workouts, create alternating segments with proportional distribution
        const exercises = [];
        if (workout.category === 'progression') {
          // Define the pattern based on environment
          const segmentPattern = environment === 'outdoor'
            ? [
              { name: "MODERATE WALKING", ratio: 0.4 },
              { name: "FAST WALKING", ratio: 0.4 },
              { name: "SLOW WALKING", ratio: 0.2 }
            ]
            : [
              // For treadmill, adjust inclines instead of speeds
              { name: "INCLINE 2%", ratio: 0.4 },
              { name: "INCLINE 4%", ratio: 0.4 },
              { name: "INCLINE 1%", ratio: 0.2 }
            ];

          // Calculate how many complete cycles we can fit
          const patternDuration = 10; // 4 + 4 + 2 = 10 minutes per cycle
          const cycles = Math.floor(trainingDuration / patternDuration);
          const remainingTime = trainingDuration % patternDuration;

          // Add complete cycles
          for (let cycle = 0; cycle < cycles; cycle++) {
            segmentPattern.forEach(segment => {
              const duration = Math.round(patternDuration * segment.ratio);
              exercises.push({
                name: segment.name,
                duration: duration,
                displayTime: `${duration}:00`
              });
            });
          }

          // Distribute remaining time proportionally
          if (remainingTime > 0) {
            segmentPattern.forEach(segment => {
              const duration = Math.round(remainingTime * segment.ratio);
              if (duration > 0) {
                exercises.push({
                  name: segment.name,
                  duration: duration,
                  displayTime: `${duration}:00`
                });
              }
            });
          }
        }
        // Handle standard workout types
        else if (workout.intensity === 'moderate') {
          exercises.push({
            name: environment === 'outdoor' ? "MODERATE WALKING" : "INCLINE 2%",
            duration: trainingDuration,
            displayTime: `${trainingDuration}:00`
          });
        } else if (workout.intensity === 'easy') {
          exercises.push({
            name: environment === 'outdoor' ? "SLOW WALKING" : "INCLINE 1%",
            duration: trainingDuration,
            displayTime: `${trainingDuration}:00`
          });
        } else if (workout.intensity === 'vigorous') {
          exercises.push({
            name: environment === 'outdoor' ? "FAST WALKING" : "INCLINE 5%",
            duration: trainingDuration,
            displayTime: `${trainingDuration}:00`
          });
        }

        // Add the TRAINING segment with its exercises
        segments.push({
          name: "TRAINING",
          duration: trainingDuration,
          displayTime: `${trainingDuration}:00`,
          exercises: exercises  // Changed from 'segments' to 'exercises'
        });

        // Fixed cooldown - always 5 minutes if enabled
        if (workout.includesCooldown) {
          segments.push({
            name: "COOLDOWN",
            duration: 5,
            displayTime: "5:00"
          });
        }

        return segments;
      };

      // Create variants for both environments
      const outdoorSegments = createSegments('outdoor');
      const treadmillSegments = createSegments('treadmill');

      // Add the environments to the response
      const response = {
        ...workoutData,
        environments: {
          outdoor: {
            segments: outdoorSegments
          },
          treadmill: {
            segments: treadmillSegments
          }
        },
      };

      return response;
    } catch (error) {
      console.error('Error fetching workout details:', error);
      throw error;
    }
  }

  // Fetch workouts by program with user progress
  async fetchWorkoutsByProgram(programId, userId) {
    try {
      // Get all workouts in this program
      let workouts = await Workout.find({ programId }).sort({ order: 1 });

      // If no workouts found in DB, try to fetch from API
      if (workouts.length === 0) {
        try {
          // Get program details
          const program = await this.fetchWorkoutProgram(programId);
          if (!program) {
            throw new Error(`Program not found: ${programId}`);
          }

          // Fetch exercises from Ninja API
          const exercises = await this.fetchExercisesFromNinjaAPI({
            difficulty: program.difficulty
          });

          if (exercises.length > 0) {
            // Create workouts for this program
            const maxWorkouts = Math.min(exercises.length, 7);
            for (let i = 0; i < maxWorkouts; i++) {
              const workout = await this.createWorkoutFromExercise(
                exercises[i],
                program.categoryId,
                programId,
                program.name,
                i + 1
              );
              workouts.push(workout);
            }

            // Update program's workout count
            program.totalWorkouts = workouts.length;
            await WorkoutProgram.findOneAndUpdate(
              { id: programId },
              { totalWorkouts: workouts.length }
            );
          } else {
            throw new Error('No exercises returned from API');
          }
        } catch (fetchError) {
          console.error(`Failed to fetch workouts for program ${programId}`, fetchError);
          return [];
        }
      }

      // Get user progress data
      const userProgress = await UserWorkoutProgress.find({
        userId,
        workoutId: { $in: workouts.map(w => w._id) }
      });

      // Map workouts with completion status
      const workoutsWithProgress = workouts.map(workout => {
        const progress = userProgress.find(p =>
          p.workoutId.toString() === workout._id.toString()
        );

        return {
          id: workout._id,
          name: workout.name,
          description: workout.description,
          calories: workout.estimatedCalories,
          distance: workout.targetDistance,
          time: workout.duration,
          completed: progress ? progress.completed : false,
          order: workout.order
        };
      });

      return workoutsWithProgress;
    } catch (error) {
      console.error('Error fetching workouts by program:', error);
      throw error;
    }
  }
  
  // This function might be needed for regenerateWorkoutsAfterProfileUpdate
  async getAllWorkouts() {
    return await Workout.find({ type: 'walk' });
  }
}

module.exports = new WorkoutService();