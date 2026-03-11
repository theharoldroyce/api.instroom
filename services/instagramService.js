// services/instagramService.js
const axios = require('axios');


/**
 * Fetches user data from the Instagram Graph API using business_discovery.
 * @param {string} username The Instagram username to look up.
 * @returns {Promise<object>} The data returned from the API.
 */
async function getUserProfile(username) {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const instagramBusinessId = process.env.INSTAGRAM_BUSINESS_ID;

  if (!accessToken || !instagramBusinessId) {
    console.error('Instagram Access Token or Business ID is not defined in environment variables.');
    // Throw an error that can be caught by the controller
    throw new Error('API configuration is incomplete.');
  }

  // This syntax aligns with the official Graph API documentation for business_discovery.
  const apiFields = 'id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url';
  const fields = `business_discovery.username(${username}){${apiFields}}`;
  const url = `https://graph.facebook.com/v25.0/${instagramBusinessId}?fields=${fields}&access_token=${accessToken}`;

  try {
    const response = await axios.get(url);
    return response.data;
  } catch (apiError) {
    // Log the detailed error for server-side debugging
    console.error('Error fetching user profile from Instagram API:', apiError.response ? apiError.response.data : apiError.message);
    // Re-throw a more generic error to be handled by the controller
    throw new Error('Failed to fetch data from Instagram.');
  }
}

/**
 * Fetches recent media for a user from the Instagram Graph API.
 * @param {string} username The Instagram username to look up.
 * @returns {Promise<object>} The media data returned from the API.
 */
async function getUserMedia(username) {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const instagramBusinessId = process.env.INSTAGRAM_BUSINESS_ID;

  if (!accessToken || !instagramBusinessId) {
    console.error('Instagram Access Token or Business ID is not defined in environment variables.');
    throw new Error('API configuration is incomplete.');
  }

  // Using template literal for cleaner string construction.
  // Re-adding `view_count` as you've confirmed it works for your use case.
  // This field can sometimes require special permissions.
  const mediaFields = 'media.limit(50){comments_count,like_count,view_count,id,timestamp,media_type}';
  const fields = `business_discovery.username(${username}){${mediaFields}}`;
  const url = `https://graph.facebook.com/v25.0/${instagramBusinessId}?fields=${fields}&access_token=${accessToken}`;

  try {
    const response = await axios.get(url);
    const data = response.data;

    // If media data exists, calculate the summary. Otherwise, return a zeroed summary.
    if (data.business_discovery && data.business_discovery.media && data.business_discovery.media.data) {
      const today = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD (UTC)

      // 1. Filter for videos that were not posted today.
      const filteredVideos = data.business_discovery.media.data.filter(item => {
        const isVideo = item.media_type === 'VIDEO';
        const isNotToday = item.timestamp.split('T')[0] !== today;
        return isVideo && isNotToday;
      });

      // 2. Take the latest 15 from that filtered list.
      const latest15Videos = filteredVideos.slice(0, 15);

      // 3. Calculate the totals.
      // Per your request, `total_video_count` is now the sum of `view_count` for the latest 15 videos.
      const summary = latest15Videos.reduce((totals, video) => {
        totals.total_likes += video.like_count || 0;
        totals.total_comments += video.comments_count || 0;
        totals.total_video_count += video.view_count || 0;
        return totals;
      }, { total_likes: 0, total_comments: 0, total_video_count: 0 });

      // Add the count of videos used for the summary
      summary.video_count = latest15Videos.length;

      return summary;
    }

    // If no media, return a zeroed-out summary
    return {
      total_likes: 0,
      total_comments: 0,
      total_video_count: 0,
      video_count: 0
    };
  } catch (apiError) {
    // Log the detailed error for server-side debugging
    console.error('Error fetching user media from Instagram API:', apiError.response ? apiError.response.data : apiError.message);
    // Re-throw a more generic error to be handled by the controller
    throw new Error('Failed to fetch media from Instagram.');
  }
}

/**
 * Formats a number into a compact string representation (e.g., 1000 -> "1k", 1200 -> "1.2k").
 * @param {number} num The number to format.
 * @returns {string} The formatted string.
 */
function formatK(num) {
  if (num < 1000) {
    return String(Math.round(num));
  }
  const thousands = num / 1000;
  // Use toFixed(1) and remove trailing .0 if it exists
  return thousands.toFixed(1).replace(/\.0$/, '') + 'k';
}

/**
 * Calculates average engagement stats for a user.
 * @param {string} username The Instagram username to look up.
 * @returns {Promise<object>} An object with avg_likes, avg_comments, avg_video_views, and engagement_rate.
 */
async function getUserStats(username) {
  // Fetch profile and media data concurrently for efficiency
  const [profileData, mediaSummary] = await Promise.all([
    getUserProfile(username),
    getUserMedia(username)
  ]);

  const followers = profileData.business_discovery?.followers_count || 0;
  const { total_likes, total_comments, total_video_count, video_count } = mediaSummary;

  // Avoid division by zero if there are no videos
  const avg_likes = video_count > 0 ? total_likes / video_count : 0;
  const avg_comments = video_count > 0 ? total_comments / video_count : 0;
  const avg_video_views = video_count > 0 ? total_video_count / video_count : 0;

  // Calculate Engagement Rate: (Total Engagements / Followers) * 100
  const total_engagements = avg_likes + avg_comments;
  
  // Avoid division by zero if there are no followers
  const engagement_rate = followers > 0 ? (total_engagements / followers) * 100 : 0;

  return {
    avg_likes: formatK(avg_likes),
    avg_comments: formatK(avg_comments),
    avg_video_views: formatK(avg_video_views),
    engagement_rate: Number(engagement_rate.toFixed(2))
  };
}

/**
 * Fetches user info from the Instagram Social API (RapidAPI).
 * @param {string} username The Instagram username to look up.
 * @returns {Promise<object>} The data returned from the API.
 */
async function getUserInfoFromRapidAPI(username) {
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  const rapidApiHost = process.env.RAPIDAPI_HOST;

  if (!rapidApiKey || !rapidApiHost) {
    console.error('RapidAPI Key or Host is not defined in environment variables.');
    throw new Error('API configuration is incomplete.');
  }

  const headers = {
    'x-rapidapi-key': rapidApiKey,
    'x-rapidapi-host': rapidApiHost
  };
  const params = { username_or_id_or_url: username };
  const baseURL = `https://${rapidApiHost}`;

  try {
    // Fetch info and about data concurrently
    const [infoResponse, aboutResponse] = await Promise.all([
      axios.get(`${baseURL}/v1/info`, { headers, params }),
      axios.get(`${baseURL}/v1/info_about`, { headers, params })
    ]);

    const infoData = infoResponse.data;
    const aboutData = aboutResponse.data;

    let email = null;
    let country = null;

    if (infoData && infoData.data) {
      email = infoData.data.public_email || 'Email not available';

      // Prioritize location from 'info_about' endpoint, fallback to 'info' endpoint
      if (aboutData && aboutData.data && aboutData.data.country) {
        country = aboutData.data.country;
      } else if (infoData.data.about && infoData.data.about.country) {
        country = infoData.data.about.country;
      }
    }

    return { country, email };
  } catch (apiError) {
    console.error('Error fetching user info from RapidAPI:', apiError.response ? apiError.response.data : apiError.message);
    throw new Error('Failed to fetch data from Instagram Social API.');
  }
}

module.exports = {
  getUserProfile,
  getUserMedia,
  getUserStats,
  getUserInfoFromRapidAPI
};
