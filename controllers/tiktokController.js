// controllers/tiktokController.js
const Joi = require('joi');
const tiktokService = require('../services/tiktokService');

const usernameSchema = Joi.object({
  username: Joi.string().pattern(/^[a-zA-Z0-9._]+$/).min(1).max(30).required()
});

async function fetchTikTokData(req, res) {
  const { username } = req.params;

  const { error } = usernameSchema.validate({ username });
  if (error) {
    return res.status(400).json({ message: 'Invalid username format.', details: error.details });
  }

  try {
    const data = await tiktokService.getTikTokData(username);
    res.status(200).json(data);
  } catch (serviceError) {
    const statusCode = serviceError.message.includes('configuration') ? 500 : 502;
    res.status(statusCode).json({ message: serviceError.message });
  }
}

module.exports = { fetchTikTokData };
