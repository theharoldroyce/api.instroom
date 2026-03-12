// routes/instagram.js
const express = require('express');
const router = express.Router();
const instagramController = require('../controllers/instagramController');

 // Define the route for getting user profile information
// GET /:username/user
router.get('/:username/user', instagramController.fetchUserProfile);
 
// Define the route for getting user media
// GET /:username/media
router.get('/:username/media', instagramController.fetchUserMedia);
 
// Define the route for getting user stats
// GET /:username/userstat
router.get('/:username/userstat', instagramController.fetchUserStats);

// Define the route for getting user info from RapidAPI
// GET /:username/info
router.get('/:username/info', instagramController.fetchUserInfo);

// Define the route for getting a full user overview (profile + stats + contact/location)
// GET /:username/instagram
router.get('/:username/instagram', instagramController.fetchUserOverview);

module.exports = router;
