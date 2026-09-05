/**
 * In-Memory Analysis Report Cache (Bounded LRU with TTL)
 * Default: 30-minute TTL, maximum 100 entries.
 */
class CacheManager {
  constructor(maxSize = 100, ttlMs = 30 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = parseInt(process.env.CACHE_MAX_SIZE, 10) || maxSize;
    this.ttlMs = parseInt(process.env.CACHE_TTL_MS, 10) || ttlMs;

    // Periodic sweep every 10 minutes to evict stale entries without active gets
    this.sweepInterval = setInterval(() => this.purgeExpired(), 10 * 60 * 1000);
    if (this.sweepInterval.unref) {
      this.sweepInterval.unref(); // Do not block process exit
    }
  }

  get(hash) {
    if (!hash || !this.cache.has(hash)) return null;

    const item = this.cache.get(hash);
    const age = Date.now() - item.timestamp;

    if (age > this.ttlMs) {
      this.cache.delete(hash);
      return null;
    }

    // Refresh LRU order on access
    this.cache.delete(hash);
    this.cache.set(hash, item);

    console.log(`[Cache] HIT for image hash ${hash.substring(0, 12)}... (Cached ${(age / 1000).toFixed(1)}s ago)`);
    return item.data;
  }

  set(hash, data) {
    if (!hash || !data) return;

    // If key already exists, delete it first to place it at the end (most recent)
    if (this.cache.has(hash)) {
      this.cache.delete(hash);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (least recently used) entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        console.log(`[Cache] Evicted LRU entry ${oldestKey.substring(0, 12)}... (Capacity: ${this.maxSize})`);
      }
    }

    this.cache.set(hash, {
      timestamp: Date.now(),
      data
    });
    console.log(`[Cache] Stored report for image hash ${hash.substring(0, 12)}... (Cache size: ${this.cache.size}/${this.maxSize})`);
  }

  purgeExpired() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

export default new CacheManager();
