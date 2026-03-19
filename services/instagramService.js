// services/instagramService.js
const axios = require('axios');
const cache = require('../utils/cache');
const { checkAndIncrement } = require('../utils/rapidApiLimiter');

/**
 * Formats a number into a compact string representation (e.g., 1000 -> "1k", 1200 -> "1.2k").
 */
function formatK(num) {
  if (num < 1000) return String(Math.round(num));
  const thousands = num / 1000;
  return thousands.toFixed(1).replace(/\.0$/, '') + 'k';
}

/**
 * Fetches user data from the Instagram Graph API using business_discovery.
 */
async function getUserProfile(username) {
  const cacheKey = `profile:${username}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const instagramBusinessId = process.env.INSTAGRAM_BUSINESS_ID;

  if (!accessToken || !instagramBusinessId) {
    throw new Error('API configuration is incomplete.');
  }

  const fields = `business_discovery.username(${username}){id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url}`;
  const url = `https://graph.facebook.com/v25.0/${instagramBusinessId}?fields=${fields}&access_token=${accessToken}`;

  try {
    const response = await axios.get(url, { timeout: 10000 });
    cache.set(cacheKey, response.data);
    return response.data;
  } catch (apiError) {
    console.error('Error fetching user profile from Instagram API:', apiError.response?.data ?? apiError.message);
    throw new Error('Failed to fetch data from Instagram.');
  }
}

/**
 * Fetches recent media for a user from the Instagram Graph API.
 */
async function getUserMedia(username) {
  const cacheKey = `media:${username}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const instagramBusinessId = process.env.INSTAGRAM_BUSINESS_ID;

  if (!accessToken || !instagramBusinessId) {
    throw new Error('API configuration is incomplete.');
  }

  const fields = `business_discovery.username(${username}){media.limit(50){comments_count,like_count,view_count,id,timestamp,media_type}}`;
  const url = `https://graph.facebook.com/v25.0/${instagramBusinessId}?fields=${fields}&access_token=${accessToken}`;

  try {
    const response = await axios.get(url, { timeout: 10000 });
    const data = response.data;

    let summary;
    if (data.business_discovery?.media?.data) {
      const today = new Date().toISOString().split('T')[0];

      const latest15Videos = data.business_discovery.media.data
        .filter(item => item.media_type === 'VIDEO' && item.timestamp.split('T')[0] !== today)
        .slice(0, 15);

      summary = latest15Videos.reduce((totals, video) => {
        totals.total_likes += video.like_count || 0;
        totals.total_comments += video.comments_count || 0;
        totals.total_video_count += video.view_count || 0;
        return totals;
      }, { total_likes: 0, total_comments: 0, total_video_count: 0 });

      summary.video_count = latest15Videos.length;
    } else {
      summary = { total_likes: 0, total_comments: 0, total_video_count: 0, video_count: 0 };
    }

    cache.set(cacheKey, summary);
    return summary;
  } catch (apiError) {
    console.error('Error fetching user media from Instagram API:', apiError.response?.data ?? apiError.message);
    throw new Error('Failed to fetch media from Instagram.');
  }
}

/**
 * Calculates average engagement stats for a user.
 * Accepts pre-fetched data to avoid duplicate API calls when used inside getFullOverview.
 */
async function getUserStats(username, prefetched = null) {
  const [profileData, mediaSummary] = prefetched
    ? [prefetched.profileData, prefetched.mediaSummary]
    : await Promise.all([getUserProfile(username), getUserMedia(username)]);

  const followers = profileData.business_discovery?.followers_count || 0;
  const { total_likes, total_comments, total_video_count, video_count } = mediaSummary;

  const avg_likes = video_count > 0 ? total_likes / video_count : 0;
  const avg_comments = video_count > 0 ? total_comments / video_count : 0;
  const avg_video_views = video_count > 0 ? total_video_count / video_count : 0;
  const total_engagements = avg_likes + avg_comments;
  const engagement_rate = followers > 0 ? (total_engagements / followers) * 100 : 0;

  return {
    avg_likes: formatK(avg_likes),
    avg_comments: formatK(avg_comments),
    avg_video_views: formatK(avg_video_views),
    engagement_rate: engagement_rate.toFixed(2) + '%'
  };
}

/**
 * Fetches user info from the Instagram Social API (RapidAPI).
 */
async function getUserInfoFromRapidAPI(username) {
  const cacheKey = `info:${username}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const rapidApiKey = process.env.RAPIDAPI_KEY;
  const rapidApiHost = process.env.RAPIDAPI_HOST;

  if (!rapidApiKey || !rapidApiHost) {
    throw new Error('API configuration is incomplete.');
  }

  const headers = { 'x-rapidapi-key': rapidApiKey, 'x-rapidapi-host': rapidApiHost };
  const params = { username_or_id_or_url: username };
  const baseURL = `https://${rapidApiHost}`;

  await checkAndIncrement();

  try {
    const infoResponse = await axios.get(`${baseURL}/v1/info`, { headers, params, timeout: 10000 });
    const infoData = infoResponse.data;

    let email = null;
    let country = null;
    let followers = 0;
    let user_id = null;
    let avatar = null;
    let fetchedUsername = null;

    if (infoData?.data) {
      email = infoData.data.public_email || 'Email not available';
      country = infoData.data.about?.country || null;
      followers = infoData.data.follower_count || 0;
      user_id = infoData.data.id || null;
      avatar = infoData.data.profile_pic_url || null;
      fetchedUsername = infoData.data.username || null;
    }

    if (!country) {
      try {
        const aboutResponse = await axios.get(`${baseURL}/v1/info_about`, { headers, params, timeout: 10000 });
        if (aboutResponse.data?.data?.country) {
          country = aboutResponse.data.data.country;
        }
      } catch (aboutError) {
        console.error('Fallback info_about call failed:', aboutError.message);
      }
    }

    const result = { country, email, followers, user_id, avatar, username: fetchedUsername || username };
    cache.set(cacheKey, result);
    return result;
  } catch (apiError) {
    console.error('Error fetching user info from RapidAPI:', apiError.response?.data ?? apiError.message);
    throw new Error('Failed to fetch data from Instagram Social API.');
  }
}

/**
 * Fetches user posts from the Instagram Social API (RapidAPI).
 */
async function getUserPostsFromRapidAPI(username) {
  const cacheKey = `posts:${username}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const rapidApiKey = process.env.RAPIDAPI_KEY;
  const rapidApiHost = process.env.RAPIDAPI_HOST;

  if (!rapidApiKey || !rapidApiHost) {
    throw new Error('API configuration is incomplete.');
  }

  const headers = { 'x-rapidapi-key': rapidApiKey, 'x-rapidapi-host': rapidApiHost };
  const params = { username_or_id_or_url: username };
  const baseURL = `https://${rapidApiHost}`;

  await checkAndIncrement();

  try {
    const response = await axios.get(`${baseURL}/v1/posts`, { headers, params, timeout: 10000 });
    const items = response.data?.data?.items || [];

    const totals = items.reduce((acc, item) => {
      acc.total_comment_count += item.comment_count || 0;
      acc.total_like_count += item.like_count || 0;
      acc.total_play_count += item.play_count || 0;
      return acc;
    }, { total_comment_count: 0, total_like_count: 0, total_play_count: 0 });

    totals.post_count = items.length;

    cache.set(cacheKey, totals);
    return totals;
  } catch (apiError) {
    console.error('Error fetching user posts from RapidAPI:', apiError.response?.data ?? apiError.message);
    throw new Error('Failed to fetch posts from Instagram Social API.');
  }
}

/**
 * Calculates average engagement stats for a user using RapidAPI data sources.
 */
async function getUserStatsFromRapidAPI(username) {
  const [postsData, infoData] = await Promise.all([
    getUserPostsFromRapidAPI(username),
    getUserInfoFromRapidAPI(username)
  ]);

  const { total_like_count, total_comment_count, total_play_count, post_count } = postsData;
  const followers = infoData.followers || 0;

  const avg_likes = post_count > 0 ? total_like_count / post_count : 0;
  const avg_comments = post_count > 0 ? total_comment_count / post_count : 0;
  const avg_video_views = post_count > 0 ? total_play_count / post_count : 0;
  
  const total_engagements = avg_likes + avg_comments;
  const engagement_rate = followers > 0 ? (total_engagements / followers) * 100 : 0;

  return {
    avg_likes: formatK(avg_likes),
    avg_comments: formatK(avg_comments),
    avg_video_views: formatK(avg_video_views),
    engagement_rate: engagement_rate.toFixed(2) + '%'
  };
}

/**
 * Fetches a full overview combining profile, stats, and contact/location info.
 * Fetches profile and media once, reuses data for stats — no duplicate API calls.
 */
async function getFullOverview(username) {
  const [profileData, mediaSummary, infoData] = await Promise.all([
    getUserProfile(username),
    getUserMedia(username),
    getUserInfoFromRapidAPI(username)
  ]);

  const profile = profileData.business_discovery || {};
  const statsData = await getUserStats(username, { profileData, mediaSummary });

  return {
    photo: profile.profile_picture_url || null,
    username: profile.username || username,
    email: infoData.email || null,
    followers: profile.followers_count || 0,
    engagement_rate: statsData.engagement_rate,
    avg_likes: statsData.avg_likes,
    avg_comments: statsData.avg_comments,
    avg_video_views: statsData.avg_video_views,
    location: infoData.country || null
  };
}

/**
 * Fetches a full overview using only RapidAPI data sources (V2).
 * Combines getUserInfoFromRapidAPI and getUserStatsFromRapidAPI.
 */
async function getFullOverviewFromRapidAPI(username) {
  const [infoData, statsData] = await Promise.all([
    getUserInfoFromRapidAPI(username),
    getUserStatsFromRapidAPI(username)
  ]);

  return {
    photo: infoData.avatar || null,
    username: infoData.username || username,
    email: infoData.email || null,
    followers: infoData.followers || 0,
    engagement_rate: statsData.engagement_rate,
    avg_likes: statsData.avg_likes,
    avg_comments: statsData.avg_comments,
    avg_video_views: statsData.avg_video_views,
    location: infoData.country || null
  };
}

module.exports = {
  getUserProfile,
  getUserMedia,
  getUserStats,
  getUserInfoFromRapidAPI,
  getUserPostsFromRapidAPI,
  getUserStatsFromRapidAPI,
  getFullOverview,
  getFullOverviewFromRapidAPI
};
