const { riotApi } = require('../config/riot-api');

/**
 * Handles API requests with retries and rate limiting
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Axios request options
 * @param {number} retries - Number of retry attempts
 * @return {Promise<Object>} - API response data
 */
async function makeApiRequest(url, options = {}, retries = 3) {
  try {
    const response = await riotApi.get(url, options);
    return response.data;
  } catch (error) {
    // Handle rate limiting
    if (error.response && error.response.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 5;
      console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
      
      // Wait for the retry-after period
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      
      // Try again
      return makeApiRequest(url, options, retries);
    }
    
    // Handle server errors with retries
    if (error.response && (error.response.status >= 500 || error.response.status === 403) && retries > 0) {
      console.log(`API error: ${error.response.status}. Retrying... (${retries} attempts left)`);
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try again with one less retry
      return makeApiRequest(url, options, retries - 1);
    }
    
    // Handle other errors
    console.error('API request failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    
    throw error;
  }
}

/**
 * Creates a cache key from URL and options
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Request options
 * @return {string} - Cache key
 */
function createCacheKey(url, options = {}) {
  return `${url}:${JSON.stringify(options)}`;
}

// Simple in-memory cache
const apiCache = new Map();

/**
 * Makes an API request with caching
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Request options
 * @param {number} cacheTTL - Cache time-to-live in seconds (default 5 minutes)
 * @return {Promise<Object>} - API response data
 */
async function cachedApiRequest(url, options = {}, cacheTTL = 300) {
  const cacheKey = createCacheKey(url, options);
  
  // Check if we have a valid cached response
  const cachedResponse = apiCache.get(cacheKey);
  if (cachedResponse && Date.now() < cachedResponse.expiry) {
    return cachedResponse.data;
  }
  
  // If not cached or expired, make a fresh request
  const data = await makeApiRequest(url, options);
  
  // Cache the response
  apiCache.set(cacheKey, {
    data,
    expiry: Date.now() + (cacheTTL * 1000)
  });
  
  return data;
}

module.exports = {
  makeApiRequest,
  cachedApiRequest
};