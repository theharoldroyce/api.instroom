// routes/instagram.js
const express = require('express');
const router = express.Router();
const instagramController = require('../controllers/instagramController');

// Define the route for getting user profile information
// GET /api/instagram/user/:username
router.get('/user/:username', instagramController.fetchUserProfile);

// Define the route for getting user media
// GET /api/instagram/user/:username/media
router.get('/user/:username/media', instagramController.fetchUserMedia);

// Define the route for getting user stats
// GET /api/instagram/user/:username/userstat
router.get('/user/:username/userstat', instagramController.fetchUserStats);

module.exports = router;
