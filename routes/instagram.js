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

// Define the route for getting user stats from RapidAPI
// GET /:username/userstat_rapid
router.get('/:username/userstat_rapid', instagramController.fetchUserStatsFromRapidAPI);

// Define the route for getting user info from RapidAPI
// GET /:username/info
router.get('/:username/info', instagramController.fetchUserInfo);

// Define the route for getting user posts from RapidAPI
// GET /:username/posts
router.get('/:username/posts', instagramController.fetchUserPosts);

// Define the route for getting a full user overview (profile + stats + contact/location)
// GET /v1/:username/instagram (Meta Graph API + RapidAPI mix)
router.get('/v1/:username/instagram', instagramController.fetchUserOverview);

// Define the route for getting a full user overview using only RapidAPI
// GET /v2/:username/instagram (RapidAPI only)
router.get('/v2/:username/instagram', instagramController.fetchUserOverviewFromRapidAPI);

module.exports = router;
