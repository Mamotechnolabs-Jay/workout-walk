const express = require('express');
const router = express.Router();
const profileController = require('../controllers/userProfileController');
const { authmiddleware } = require('../middlewares/authMiddleware');

router.post('/create', authmiddleware, profileController.createOrUpdateProfile);


router.get('/get', authmiddleware, profileController.getUserProfile);

router.delete('/delete', authmiddleware, profileController.deleteUserProfile);

module.exports = router;