/**
 * In-Memory Analysis Report Cache
 * 30-minute TTL based on SHA-256 image content hashes.
 */
class CacheManager {
  constructor(ttlMs = 30 * 60 * 1000) { // 30 minutes TTL
    this.cache = new Map();
    this.ttlMs = ttlMs;
  }

  get(hash) {
    if (!hash || !this.cache.has(hash)) return null;

    const item = this.cache.get(hash);
    const age = Date.now() - item.timestamp;

    if (age > this.ttlMs) {
      console.log(`[Cache] Evicting expired item for hash ${hash.substring(0, 12)}... (age: ${(age / 60000).toFixed(1)}m)`);
      this.cache.delete(hash);
      return null;
    }

    console.log(`[Cache] HIT for image hash ${hash.substring(0, 12)}... (Cached ${(age / 1000).toFixed(1)}s ago)`);
    return item.data;
  }

  set(hash, data) {
    if (!hash || !data) return;
    this.cache.set(hash, {
      timestamp: Date.now(),
      data
    });
    console.log(`[Cache] Stored analysis report for image hash ${hash.substring(0, 12)}... (TTL: 30m)`);
  }

  clear() {
    this.cache.clear();
  }
}

export default new CacheManager();
