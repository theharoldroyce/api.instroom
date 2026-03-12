// routes/tiktok.js
const express = require('express');
const router = express.Router();
const tiktokController = require('../controllers/tiktokController');

// GET /:username/tiktok
router.get('/:username/tiktok', tiktokController.fetchTikTokUser);

// GET /:username/tiktok-email
router.get('/:username/tiktok-email', tiktokController.fetchTikTokEmail);

module.exports = router;
