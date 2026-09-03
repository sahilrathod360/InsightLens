// In-Memory Runtime Model Health Tracker for InsightLens AI Engine
// Tracks real telemetry (latency, success/failure counts, 503/429/402 status, cooldowns)

class ModelHealthTracker {
  constructor() {
    this.stats = new Map();
  }

  _getOrCreate(modelId) {
    if (!this.stats.has(modelId)) {
      this.stats.set(modelId, {
        modelId,
        successCount: 0,
        failureCount: 0,
        consecutiveFailures: 0,
        http402Count: 0,
        http429Count: 0,
        http503Count: 0,
        timeoutCount: 0,
        invalidJsonCount: 0,
        totalLatencyMs: 0,
        avgLatencyMs: 0,
        recentLatencyMs: 0,
        lastSuccessTimestamp: null,
        lastFailureTimestamp: null,
        lastFailureReason: null,
        cooldownUntil: 0
      });
    }
    return this.stats.get(modelId);
  }

  recordSuccess(modelId, latencyMs = 0) {
    const s = this._getOrCreate(modelId);
    s.successCount++;
    s.consecutiveFailures = 0;
    s.recentLatencyMs = latencyMs;
    s.totalLatencyMs += latencyMs;
    s.avgLatencyMs = Math.round(s.totalLatencyMs / s.successCount);
    s.lastSuccessTimestamp = Date.now();
    s.cooldownUntil = 0; // Clear any existing cooldown on success
  }

  recordFailure(modelId, errorType = 'UNKNOWN', latencyMs = 0, reason = '') {
    const s = this._getOrCreate(modelId);
    s.failureCount++;
    s.consecutiveFailures++;
    s.lastFailureTimestamp = Date.now();
    s.lastFailureReason = `${errorType}: ${reason}`;

    const now = Date.now();
    if (errorType === 'HTTP_402' || reason.includes('402') || reason.includes('credits')) {
      s.http402Count++;
      // Cooldown 20 minutes for credit exhaustion
      s.cooldownUntil = now + (20 * 60 * 1000);
      console.warn(`[HealthTracker] Model ${modelId} placed on 20-min cooldown due to credit exhaustion (HTTP 402)`);
    } else if (errorType === 'HTTP_503' || reason.includes('503') || reason.includes('demand')) {
      s.http503Count++;
      // Cooldown 2 minutes for transient high demand spikes
      s.cooldownUntil = now + (2 * 60 * 1000);
      console.warn(`[HealthTracker] Model ${modelId} placed on 2-min cooldown due to high demand (HTTP 503)`);
    } else if (errorType === 'HTTP_429' || reason.includes('429') || reason.includes('quota')) {
      s.http429Count++;
      // Cooldown 2 minutes for rate limit
      s.cooldownUntil = now + (2 * 60 * 1000);
      console.warn(`[HealthTracker] Model ${modelId} placed on 2-min cooldown due to rate limit (HTTP 429)`);
    } else if (errorType === 'TIMEOUT') {
      s.timeoutCount++;
      if (s.consecutiveFailures >= 2) {
        s.cooldownUntil = now + (3 * 60 * 1000);
      }
    } else if (errorType === 'INVALID_JSON') {
      s.invalidJsonCount++;
    }
  }

  isAvailable(modelId) {
    const s = this.stats.get(modelId);
    if (!s) return true;
    if (s.cooldownUntil && Date.now() < s.cooldownUntil) {
      return false; // In cooldown
    }
    return true;
  }

  getStats(modelId) {
    return this.stats.get(modelId) || null;
  }

  getAllStats() {
    return Array.from(this.stats.values());
  }
}

export default new ModelHealthTracker();
