/**
 * Session Cache Service
 * Caches API data in sessionStorage for the current browser session
 * Data persists during navigation but clears when browser is closed
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  expiresAt: number;
};

// Cache duration in milliseconds (30 minutes)
const DEFAULT_CACHE_DURATION = 30 * 60 * 1000;

// Cache keys
const CACHE_KEYS = {
  VIDEOS_LIST: "cache_videos_list",
  VIDEOS_PAGE: "cache_videos_page_",
  VIDEO_DETAIL: "cache_video_",
  COMICS_LIST: "cache_comics_list",
  COMICS_PAGE: "cache_comics_page_",
  COMIC_DETAIL: "cache_comic_",
} as const;

/**
 * Get cached data from sessionStorage
 */
function getFromCache<T>(key: string): T | null {
  try {
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      sessionStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Save data to sessionStorage cache
 */
function saveToCache<T>(
  key: string,
  data: T,
  duration: number = DEFAULT_CACHE_DURATION
): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + duration,
    };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    // sessionStorage might be full, clear old entries
    console.warn("Cache storage full, clearing old entries");
    clearExpiredCache();
  }
}

/**
 * Remove specific item from cache
 */
function removeFromCache(key: string): void {
  sessionStorage.removeItem(key);
}

/**
 * Clear all expired cache entries
 */
function clearExpiredCache(): void {
  const keysToRemove: string[] = [];

  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith("cache_")) {
      try {
        const cached = sessionStorage.getItem(key);
        if (cached) {
          const entry = JSON.parse(cached);
          if (Date.now() > entry.expiresAt) {
            keysToRemove.push(key);
          }
        }
      } catch {
        keysToRemove.push(key!);
      }
    }
  }

  keysToRemove.forEach((key) => sessionStorage.removeItem(key));
}

/**
 * Clear all cache
 */
function clearAllCache(): void {
  const keysToRemove: string[] = [];

  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith("cache_")) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => sessionStorage.removeItem(key));
}

/**
 * Update a specific item in a cached list
 */
function updateItemInCache<T extends { _id: string }>(
  listKey: string,
  itemId: string,
  updates: Partial<T>
): void {
  const cached = getFromCache<T[]>(listKey);
  if (cached) {
    const updatedList = cached.map((item) =>
      item._id === itemId ? { ...item, ...updates } : item
    );
    saveToCache(listKey, updatedList);
  }
}

// ==================== VIDEO CACHE ====================

export const videoCache = {
  /**
   * Get all videos from cache
   */
  getAll: () => getFromCache<any[]>(CACHE_KEYS.VIDEOS_LIST),

  /**
   * Save all videos to cache
   */
  saveAll: (videos: any[]) => saveToCache(CACHE_KEYS.VIDEOS_LIST, videos),

  /**
   * Get videos for a specific page
   */
  getPage: (page: number) =>
    getFromCache<any[]>(`${CACHE_KEYS.VIDEOS_PAGE}${page}`),

  /**
   * Save videos for a specific page
   */
  savePage: (page: number, videos: any[]) =>
    saveToCache(`${CACHE_KEYS.VIDEOS_PAGE}${page}`, videos),

  /**
   * Get single video by ID
   */
  getById: (id: string) => getFromCache<any>(`${CACHE_KEYS.VIDEO_DETAIL}${id}`),

  /**
   * Save single video
   */
  saveById: (id: string, video: any) =>
    saveToCache(`${CACHE_KEYS.VIDEO_DETAIL}${id}`, video),

  /**
   * Update video in all caches (list and detail)
   */
  updateVideo: (id: string, updates: Partial<any>) => {
    // Update in list cache
    updateItemInCache(CACHE_KEYS.VIDEOS_LIST, id, updates);

    // Update detail cache
    const cached = getFromCache<any>(`${CACHE_KEYS.VIDEO_DETAIL}${id}`);
    if (cached) {
      saveToCache(`${CACHE_KEYS.VIDEO_DETAIL}${id}`, { ...cached, ...updates });
    }

    // Update in page caches
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(CACHE_KEYS.VIDEOS_PAGE)) {
        updateItemInCache(key, id, updates);
      }
    }
  },

  /**
   * Invalidate video cache
   */
  invalidate: () => {
    removeFromCache(CACHE_KEYS.VIDEOS_LIST);
    // Remove all page caches
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(CACHE_KEYS.VIDEOS_PAGE)) {
        sessionStorage.removeItem(key);
      }
    }
  },
};

// ==================== COMIC CACHE ====================

export const comicCache = {
  /**
   * Get all comics from cache
   */
  getAll: () => getFromCache<any[]>(CACHE_KEYS.COMICS_LIST),

  /**
   * Save all comics to cache
   */
  saveAll: (comics: any[]) => saveToCache(CACHE_KEYS.COMICS_LIST, comics),

  /**
   * Get comics for a specific page
   */
  getPage: (page: number) =>
    getFromCache<any[]>(`${CACHE_KEYS.COMICS_PAGE}${page}`),

  /**
   * Save comics for a specific page
   */
  savePage: (page: number, comics: any[]) =>
    saveToCache(`${CACHE_KEYS.COMICS_PAGE}${page}`, comics),

  /**
   * Get single comic by ID
   */
  getById: (id: string) => getFromCache<any>(`${CACHE_KEYS.COMIC_DETAIL}${id}`),

  /**
   * Save single comic
   */
  saveById: (id: string, comic: any) =>
    saveToCache(`${CACHE_KEYS.COMIC_DETAIL}${id}`, comic),

  /**
   * Update comic in all caches
   */
  updateComic: (id: string, updates: Partial<any>) => {
    updateItemInCache(CACHE_KEYS.COMICS_LIST, id, updates);

    const cached = getFromCache<any>(`${CACHE_KEYS.COMIC_DETAIL}${id}`);
    if (cached) {
      saveToCache(`${CACHE_KEYS.COMIC_DETAIL}${id}`, { ...cached, ...updates });
    }

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(CACHE_KEYS.COMICS_PAGE)) {
        updateItemInCache(key, id, updates);
      }
    }
  },

  /**
   * Invalidate comic cache
   */
  invalidate: () => {
    removeFromCache(CACHE_KEYS.COMICS_LIST);
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(CACHE_KEYS.COMICS_PAGE)) {
        sessionStorage.removeItem(key);
      }
    }
  },
};

// ==================== UTILITIES ====================

export const cacheUtils = {
  clearAll: clearAllCache,
  clearExpired: clearExpiredCache,

  /**
   * Get cache statistics
   */
  getStats: () => {
    let totalSize = 0;
    let cacheCount = 0;

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith("cache_")) {
        const value = sessionStorage.getItem(key);
        if (value) {
          totalSize += value.length * 2; // UTF-16 encoding
          cacheCount++;
        }
      }
    }

    return {
      count: cacheCount,
      sizeBytes: totalSize,
      sizeKB: (totalSize / 1024).toFixed(2),
    };
  },
};

export default {
  video: videoCache,
  comic: comicCache,
  utils: cacheUtils,
};
