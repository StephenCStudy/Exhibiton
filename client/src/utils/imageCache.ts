// Image caching utility to prevent repeated Mega API calls
// Uses browser's sessionStorage to cache image data URLs (cleared when tab closes)

const CACHE_PREFIX = "img_cache_";
const CACHE_EXPIRY = 1000 * 60 * 60 * 24; // 24 hours
const MAX_CACHE_SIZE = 50; // Maximum number of cached images
const RATE_LIMIT_KEY = "mega_rate_limited";
const FAILED_REQUESTS_KEY = "mega_failed_requests";

interface CacheEntry {
  dataUrl: string;
  timestamp: number;
}

interface RateLimitInfo {
  isLimited: boolean;
  resetTime: number; // Timestamp when rate limit resets
}

// Check if Mega is rate limited
export function isMegaRateLimited(): RateLimitInfo {
  try {
    const cached = sessionStorage.getItem(RATE_LIMIT_KEY);
    if (!cached) return { isLimited: false, resetTime: 0 };

    const { resetTime } = JSON.parse(cached);
    if (Date.now() > resetTime) {
      sessionStorage.removeItem(RATE_LIMIT_KEY);
      return { isLimited: false, resetTime: 0 };
    }

    return { isLimited: true, resetTime };
  } catch {
    return { isLimited: false, resetTime: 0 };
  }
}

// Set rate limit status
export function setMegaRateLimited(secondsUntilReset: number): void {
  try {
    const resetTime = Date.now() + secondsUntilReset * 1000;
    sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ resetTime }));
  } catch {
    // Ignore storage errors
  }
}

// Track failed requests to avoid retrying same URLs
export function isRequestFailed(key: string): boolean {
  try {
    const cached = sessionStorage.getItem(FAILED_REQUESTS_KEY);
    if (!cached) return false;
    const failed: Record<string, number> = JSON.parse(cached);
    // Consider failed if it failed in the last 5 minutes
    return !!(failed[key] && Date.now() - failed[key] < 5 * 60 * 1000);
  } catch {
    return false;
  }
}

export function markRequestFailed(key: string): void {
  try {
    const cached = sessionStorage.getItem(FAILED_REQUESTS_KEY);
    const failed: Record<string, number> = cached ? JSON.parse(cached) : {};
    failed[key] = Date.now();

    // Clean up old entries (older than 10 minutes)
    const cutoff = Date.now() - 10 * 60 * 1000;
    Object.keys(failed).forEach((k) => {
      if (failed[k] < cutoff) delete failed[k];
    });

    sessionStorage.setItem(FAILED_REQUESTS_KEY, JSON.stringify(failed));
  } catch {
    // Ignore storage errors
  }
}

// Get cached image
export function getCachedImage(key: string): string | null {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const cached = sessionStorage.getItem(cacheKey);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_EXPIRY) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }

    return entry.dataUrl;
  } catch {
    return null;
  }
}

// Set cached image
export function setCachedImage(key: string, dataUrl: string): void {
  try {
    // Don't cache if dataUrl is too large (over 500KB)
    if (dataUrl.length > 500000) return;

    const cacheKey = CACHE_PREFIX + key;
    const entry: CacheEntry = {
      dataUrl,
      timestamp: Date.now(),
    };

    // Clean up old entries if needed
    cleanupCache();

    sessionStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (e) {
    // sessionStorage might be full, clear old entries
    console.warn("Cache storage full, cleaning up...");
    clearOldestCacheEntries(10);
  }
}

// Get all cache keys
function getCacheKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      keys.push(key);
    }
  }
  return keys;
}

// Clean up expired entries
function cleanupCache(): void {
  const keys = getCacheKeys();

  if (keys.length < MAX_CACHE_SIZE) return;

  // Sort by timestamp and remove oldest
  const entries: { key: string; timestamp: number }[] = [];

  for (const key of keys) {
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        const entry: CacheEntry = JSON.parse(cached);
        entries.push({ key, timestamp: entry.timestamp });
      }
    } catch {
      sessionStorage.removeItem(key);
    }
  }

  // Sort oldest first
  entries.sort((a, b) => a.timestamp - b.timestamp);

  // Remove oldest 20%
  const toRemove = Math.ceil(entries.length * 0.2);
  for (let i = 0; i < toRemove; i++) {
    sessionStorage.removeItem(entries[i].key);
  }
}

// Clear oldest entries
function clearOldestCacheEntries(count: number): void {
  const entries: { key: string; timestamp: number }[] = [];

  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      try {
        const cached = sessionStorage.getItem(key);
        if (cached) {
          const entry: CacheEntry = JSON.parse(cached);
          entries.push({ key, timestamp: entry.timestamp });
        }
      } catch {
        if (key) sessionStorage.removeItem(key);
      }
    }
  }

  entries.sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < Math.min(count, entries.length); i++) {
    sessionStorage.removeItem(entries[i].key);
  }
}

// Clear all image cache
export function clearImageCache(): void {
  const keys = getCacheKeys();
  for (const key of keys) {
    sessionStorage.removeItem(key);
  }
}

// Request queue for throttling Mega API calls
class RequestQueue {
  private queue: (() => Promise<void>)[] = [];
  private running = 0;
  private maxConcurrent = 2; // Only 2 concurrent requests to Mega
  private paused = false;

  async add<T>(request: () => Promise<T>): Promise<T> {
    // Check if rate limited
    const rateLimit = isMegaRateLimited();
    if (rateLimit.isLimited) {
      const timeLeft = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      throw new Error(`Rate limited. Try again in ${timeLeft} seconds.`);
    }

    return new Promise((resolve, reject) => {
      const wrappedRequest = async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          this.processQueue();
        }
      };

      this.queue.push(wrappedRequest);
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.paused) return;

    // Check rate limit before processing
    if (isMegaRateLimited().isLimited) {
      this.paused = true;
      return;
    }

    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        this.running++;
        request();
      }
    }
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.processQueue();
  }

  clear(): void {
    this.queue = [];
  }
}

export const megaRequestQueue = new RequestQueue();
