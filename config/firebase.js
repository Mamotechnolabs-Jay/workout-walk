const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  // Try to load service account file - first check environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  } else {
    // Fall back to the default path - update this to match your file name
    serviceAccount = require('../workout-effective-15af8-firebase-adminsdk-fbsvc-7c3b15f5e6.json');
  }
} catch (error) {
  console.error('Error loading Firebase service account:', error.message);
  console.error('Please make sure your service account file is properly set up');
  process.exit(1); // Exit with error
}

// Initialize the app
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;