// services/tiktokService.js
const axios = require('axios');

/**
 * Fetches TikTok user info from the external API.
 * @param {string} username The TikTok username to look up.
 * @returns {Promise<object>} Filtered user data.
 */
async function getTikTokUser(username) {
  const apiKey = process.env.TIKTOK_ACCESS_TOKEN;

  if (!apiKey) {
    throw new Error('API configuration is incomplete.');
  }

  try {
    const response = await axios.get('https://api.omar-thing.site/', {
      params: { key: apiKey, username }
    });

    const data = response.data;
    const profile = data.profile || {};
    const stats = data.stats || {};

    return {
      username: profile['Username'] || null,
      country: profile['Country'] || null,
      user_id: profile['User ID'] || null,
      followers: stats['followers'] || null,
      hearts: stats['hearts'] || null,
      videos: stats['videos'] || null
    };
  } catch (apiError) {
    console.error('Error fetching TikTok user:', apiError.response ? apiError.response.data : apiError.message);
    throw new Error('Failed to fetch data from TikTok API.');
  }
}

async function getTikTokEmail(username) {
  const apiKey = process.env.TIKTOK_ACCESS_TOKEN;

  if (!apiKey) {
    throw new Error('API configuration is incomplete.');
  }

  try {
    const response = await axios.get('https://api.omar-thing.site/', {
      params: { key: apiKey, type: 'domain', username }
    });

    const data = response.data;
    return { email: data.email_domain || null };
  } catch (apiError) {
    if (apiError.response && apiError.response.status === 404) {
      return { email: null };
    }
    console.error('Error fetching TikTok email:', apiError.response ? apiError.response.data : apiError.message);
    throw new Error('Failed to fetch email from TikTok API.');
  }
}

module.exports = { getTikTokUser, getTikTokEmail };
