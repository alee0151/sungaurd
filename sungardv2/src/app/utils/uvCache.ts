/**
 * UV Cache Utility
 * Stores UV API responses in localStorage keyed by rounded lat/lng.
 * Cache entries expire after 1 hour to reduce redundant API calls.
 */

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_KEY_PREFIX = 'sunguard_uv_cache_';
const COORD_PRECISION = 2; // round to ~1.1km grid

export interface UVCacheEntry {
  uv: number;
  hourlyForecast: { time: string; uv: number }[];
  locationName: string;
  lat: number;
  lon: number;
  fetchedAt: number; // unix ms timestamp
}

/** Round coordinate to reduce cache key noise */
export function roundCoord(val: number): number {
  return Math.round(val * Math.pow(10, COORD_PRECISION)) / Math.pow(10, COORD_PRECISION);
}

/** Build a cache key from coordinates */
export function buildCacheKey(lat: number, lon: number): string {
  return `${CACHE_KEY_PREFIX}${roundCoord(lat)}_${roundCoord(lon)}`;
}

/** Read a cache entry. Returns null if missing or expired. */
export function readUVCache(lat: number, lon: number): UVCacheEntry | null {
  try {
    const key = buildCacheKey(lat, lon);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: UVCacheEntry = JSON.parse(raw);
    const age = Date.now() - entry.fetchedAt;
    if (age > CACHE_TTL_MS) {
      localStorage.removeItem(key); // evict expired entry
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

/** Write a cache entry to localStorage */
export function writeUVCache(entry: UVCacheEntry): void {
  try {
    const key = buildCacheKey(entry.lat, entry.lon);
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage quota exceeded — silently ignore
  }
}

/** Return how many minutes ago the cache was written (for display) */
export function cacheAgeMinutes(entry: UVCacheEntry): number {
  return Math.floor((Date.now() - entry.fetchedAt) / 60000);
}

/** Purge all expired UV cache entries (housekeeping) */
export function purgeExpiredUVCache(): void {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_KEY_PREFIX));
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const entry: UVCacheEntry = JSON.parse(raw);
      if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}
