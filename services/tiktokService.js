// services/tiktokService.js
const axios = require('axios');
const cache = require('../utils/cache');

function formatK(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
}

/**
 * Fetches TikTok user info and email from the external API.
 */
async function getTikTokData(username) {
  const cacheKey = `tiktok:${username}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.TIKTOK_ACCESS_TOKEN;

  if (!apiKey) {
    throw new Error('API configuration is incomplete.');
  }

  try {
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

    let email = null;
    if (emailResponse?.data) {
      const emailData = emailResponse.data;
      email = emailData.email || emailData.data?.email || emailData.email_domain || null;
    }

    if (!email && profile['About']) {
      const match = profile['About'].match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (match) email = match[0];
    }

    const hearts = stats['hearts'];
    const videos = stats['videos'];
    const followers = stats['followers'];
    const hasValidStats = hearts && videos && videos > 0;

    const result = {
      username: profile['Username'] || 'Not Available',
      avatar: profile['Avatar URL'] || 'Not Available',
      country: profile['Country'] || 'Not Available',
      user_id: profile['User ID'] || 'Not Available',
      followers: followers || 'Not Available',
      avg_hearts: hasValidStats ? formatK(Math.round(hearts / videos)) : 'Not Available',
      avg_views: hasValidStats ? formatK(Math.round((hearts * 10) / videos)) : 'Not Available',
      avg_comments: hasValidStats ? formatK(Math.round((hearts * 0.008) / videos)) : 'Not Available',
      engagement_rate: hasValidStats && followers > 0
        ? (((hearts / videos) + ((hearts * 0.008) / videos)) / followers * 100).toFixed(2) + '%'
        : 'Not Available',
      email: email || 'Not Available'
    };

    cache.set(cacheKey, result);
    return result;
  } catch (apiError) {
    console.error('Error fetching TikTok data:', apiError.response?.data ?? apiError.message);
    throw new Error('Failed to fetch data from TikTok API.');
  }
}

module.exports = { getTikTokData };
