// services/tiktokService.js
const axios = require('axios');

function formatK(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
}

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
        params: { key: apiKey, username },
        timeout: 10000
      }),
      axios.get('https://api.omar-thing.site/', {
        params: { key: apiKey, type: 'domain', username },
        timeout: 10000
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
      followers: stats['followers'] || 'Not Available',
      avg_hearts: stats['hearts'] && stats['videos'] && stats['videos'] > 0
        ? formatK(Math.round(stats['hearts'] / stats['videos']))
        : 'Not Available',
      avg_views: stats['hearts'] && stats['videos'] && stats['videos'] > 0
        ? formatK(Math.round((stats['hearts'] * 10) / stats['videos']))
        : 'Not Available',
      avg_comments: stats['hearts'] && stats['videos'] && stats['videos'] > 0
        ? formatK(Math.round((stats['hearts'] * 0.008) / stats['videos']))
        : 'Not Available',
      engagement_rate: stats['followers'] && stats['followers'] > 0 && stats['hearts'] && stats['videos'] && stats['videos'] > 0
        ? (((stats['hearts'] / stats['videos']) + ((stats['hearts'] * 0.008) / stats['videos'])) / stats['followers'] * 100).toFixed(2) + '%'
        : 'Not Available',
      email: email || 'Not Available'
    };
  } catch (apiError) {
    console.error('Error fetching TikTok data:', apiError.response ? apiError.response.data : apiError.message);
    throw new Error('Failed to fetch data from TikTok API.');
  }
}

module.exports = { getTikTokData };
