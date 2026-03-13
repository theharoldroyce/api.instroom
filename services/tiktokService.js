// services/tiktokService.js
const axios = require('axios');

/**
 * Fetches TikTok user info and email from the external API.
 * @param {string} username The TikTok username to look up.
 * @returns {Promise<object>} Combined user data with email.
 */
async function getTikTokData(username) {
  const apiKey = process.env.TIKTOK_ACCESS_TOKEN;

  if (!apiKey) {
    throw new Error('API configuration is incomplete.');
  }

  try {
    // Fetch profile and email data in parallel
    const [profileResponse, emailResponse] = await Promise.all([
      axios.get('https://api.omar-thing.site/', {
        params: { key: apiKey, username }
      }),
      axios.get('https://api.omar-thing.site/', {
        params: { key: apiKey, type: 'domain', username }
      }).catch(() => null)
    ]);

    const data = profileResponse.data;
    const profile = data.profile || {};
    const stats = data.stats || {};

    // Try to get email from the email API response
    let email = null;
    if (emailResponse && emailResponse.data) {
      const emailData = emailResponse.data;
      if (emailData.email) {
        email = emailData.email;
      } else if (emailData.data && emailData.data.email) {
        email = emailData.data.email;
      } else if (emailData.email_domain) {
        email = emailData.email_domain;
      }
    }

    // If no email from API, try to find one in the bio text
    if (!email && profile['About']) {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const match = profile['About'].match(emailRegex);
      if (match) {
        email = match[0];
      }
    }

    return {
      username: profile['Username'] || 'Not Available',
      avatar: profile['Avatar URL'] || 'Not Available',
      country: profile['Country'] || 'Not Available',
      user_id: profile['User ID'] || 'Not Available',
      followers: stats['Followers'] || 'Not Available',
      hearts: stats['Hearts'] || 'Not Available',
      videos: stats['Videos'] || 'Not Available',
      email: email || 'Not Available'
    };
  } catch (apiError) {
    console.error('Error fetching TikTok data:', apiError.response ? apiError.response.data : apiError.message);
    throw new Error('Failed to fetch data from TikTok API.');
  }
}

module.exports = { getTikTokData };
