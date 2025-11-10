/**
 * Cache service for storing and retrieving data
 * Uses localStorage for persistence across page refreshes
 */

const CACHE_PREFIX = 'dashboard_cache_'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Get cached data
 */
export const getCachedData = (key) => {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key)
    if (!cached) return null

    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()

    // Check if cache is still valid
    if (now - timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_PREFIX + key)
      return null
    }

    return data
  } catch (error) {
    console.error('Error reading cache:', error)
    return null
  }
}

/**
 * Set cached data
 */
export const setCachedData = (key, data) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheData))
  } catch (error) {
    console.error('Error setting cache:', error)
  }
}

/**
 * Clear all cache
 */
export const clearCache = () => {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}

/**
 * Clear specific cache key
 */
export const clearCachedData = (key) => {
  try {
    localStorage.removeItem(CACHE_PREFIX + key)
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}

/**
 * Generate cache key from filters
 */
export const generateCacheKey = (type, filters) => {
  return `${type}_${JSON.stringify(filters)}`
}

