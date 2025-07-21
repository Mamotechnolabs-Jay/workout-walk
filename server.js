require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const morgan = require('morgan');
const chalk = require('chalk');
const path = require('path'); // Added for static file paths
const authRoutes = require('./routes/authRoutes');
const userProfileRoutes = require('./routes/userProfileRoutes'); 
const workoutRoutes = require('./routes/workoutRoutes'); // Import workout routes
const challengeRoutes = require('./routes/challengeRoutes'); // Import challenge routes
const freeWalkRoutes = require('./routes/freewalkRoutes'); // Import free walk routes
const activityRoutes = require('./routes/activityRoutes'); // Import activity routes
const activityInsightRoutes = require('./routes/activityInsightRoutes'); // Import activity insight routes
const streakRoutes = require('./routes/streakRoutes'); // Import streak routes
const awardsRoutes = require('./routes/awardsRoutes'); // Import awards routes
const firebaseAuthRoutes = require('./routes/firebaseRoutes'); // Import Firebase auth routes

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files directly from root directory
// This will make the 'images' folder accessible at the root URL path
app.use(express.static(path.join(__dirname)));

// Custom token for colored status code
morgan.token('status-colored', (req, res) => {
  // Color based on status code
  const status = res.statusCode;
  let color;
  
  if (status >= 500) color = chalk.red;         // Server error - red
  else if (status >= 400) color = chalk.yellow; // Client error - yellow
  else if (status >= 300) color = chalk.cyan;   // Redirection - cyan
  else if (status >= 200) color = chalk.green;  // Success - green
  else color = chalk.white;                     // Other - white
  
  return color(status);
});

morgan.token('method-colored', (req) => {
  const method = req.method;
  
  switch (method) {
    case 'GET': return chalk.blue(method);
    case 'POST': return chalk.magenta(method);
    case 'PUT': return chalk.yellow(method);
    case 'DELETE': return chalk.red(method);
    case 'PATCH': return chalk.cyan(method);
    default: return chalk.white(method);
  }
});

// Request logging middleware 
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan(':method-colored :url :status-colored :response-time ms - :res[content-length]'));
} else {
  app.use(morgan('short'));
}

// Routes - first import the routes and then use them
app.use('/api/auth', authRoutes);
app.use('/api/profile', userProfileRoutes); // Use user profile routes
app.use('/api/workouts', workoutRoutes); // Use workout routes
app.use('/api/challenges', challengeRoutes); // Use challenge routes
app.use('/api/freewalk', freeWalkRoutes); // Use free walk routes
app.use('/api/activity', activityRoutes); // Use activity routes
app.use('/api/insights', activityInsightRoutes); // Use activity insight routes
app.use('/api/streaks', streakRoutes); // Use streak routes
app.use('/api/awards', awardsRoutes); // Use awards routes
app.use('/api/firebase', firebaseAuthRoutes); // Use Firebase auth routes

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: err.message || 'Server Error' 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});