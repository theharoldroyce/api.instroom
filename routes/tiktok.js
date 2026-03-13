// routes/tiktok.js
const express = require('express');
const router = express.Router();
const tiktokController = require('../controllers/tiktokController');

// GET /:username/tiktok
router.get('/:username/tiktok', tiktokController.fetchTikTokData);

module.exports = router;
