// Centralized, Extensible AI Vision Model Registry for InsightLens
// Distinguishes Gemini and OpenRouter vision-capable models with speed tiers and thinking configuration.

import ModelHealthTracker from './ModelHealthTracker.js';

export const MODEL_REGISTRY = [
  // --- GOOGLE GEMINI MULTIMODAL FLASH MODELS ---
  {
    id: 'gemini-3.5-flash-lite',
    provider: 'gemini',
    displayName: 'Gemini 3.5 Flash Lite',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 4000,
    timeoutMs: 16000,
    speedTier: 'FAST',
    priority: 100,
    enabled: true,
    thinkingConfig: undefined
  },
  {
    id: 'gemini-3.1-flash-lite',
    provider: 'gemini',
    displayName: 'Gemini 3.1 Flash Lite',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 4000,
    timeoutMs: 16000,
    speedTier: 'FAST',
    priority: 98,
    enabled: true,
    thinkingConfig: undefined
  },
  {
    id: 'gemini-3.7-flash',
    provider: 'gemini',
    displayName: 'Gemini 3.7 Flash',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 4000,
    timeoutMs: 16000,
    speedTier: 'FAST',
    priority: 95,
    enabled: true,
    thinkingConfig: { thinking_budget: 0 } // Zero thinking budget for fast response
  },
  {
    id: 'gemini-3.6-flash',
    provider: 'gemini',
    displayName: 'Gemini 3.6 Flash',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 4000,
    timeoutMs: 16000,
    speedTier: 'BALANCED',
    priority: 85,
    enabled: true,
    thinkingConfig: undefined
  },
  {
    id: 'gemini-3.5-flash',
    provider: 'gemini',
    displayName: 'Gemini 3.5 Flash',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 4000,
    timeoutMs: 15000,
    speedTier: 'BALANCED',
    priority: 80,
    enabled: false, // Disabled due to low free-tier quota (20 req/day)
    thinkingConfig: undefined
  },
  {
    id: 'gemini-3.8-flash',
    provider: 'gemini',
    displayName: 'Gemini 3.8 Flash',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 4000,
    timeoutMs: 15000,
    speedTier: 'DEEP',
    priority: 75,
    enabled: true,
    thinkingConfig: undefined
  },

  // --- OPENROUTER VISION MODELS ---
  {
    id: 'google/gemini-3.8-flash',
    provider: 'openrouter',
    displayName: 'OpenRouter: Gemini 3.8 Flash',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 4500,
    timeoutMs: 10000,
    speedTier: 'FAST',
    priority: 90,
    enabled: true
  },
  {
    id: 'google/gemini-3.5-flash-lite',
    provider: 'openrouter',
    displayName: 'OpenRouter: Gemini 3.5 Flash Lite',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 4500,
    timeoutMs: 10000,
    speedTier: 'FAST',
    priority: 88,
    enabled: true
  },
  {
    id: 'qwen/qwen3.8-flash',
    provider: 'openrouter',
    displayName: 'OpenRouter: Qwen 3.8 Flash',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 4500,
    timeoutMs: 12000,
    speedTier: 'BALANCED',
    priority: 70,
    enabled: true
  }
];

class ModelRegistry {
  constructor() {
    this.models = new Map();
    MODEL_REGISTRY.forEach(m => this.models.set(m.id, { ...m }));
  }

  getModel(modelId) {
    return this.models.get(modelId);
  }

  getAllModels() {
    return Array.from(this.models.values());
  }

  registerModel(modelConfig) {
    if (!modelConfig.id || !modelConfig.provider) {
      throw new Error('Model configuration requires id and provider');
    }
    this.models.set(modelConfig.id, {
      vision: true,
      structuredJson: true,
      maxOutputTokens: 4500,
      timeoutMs: 12000,
      speedTier: 'BALANCED',
      priority: 50,
      enabled: true,
      ...modelConfig
    });
  }

  getVisionCandidates({ maxCandidates = 4, hasGeminiKey = true, hasOpenRouterKey = true } = {}) {
    const allVision = Array.from(this.models.values())
      .filter(m => m.enabled && m.vision)
      .filter(m => {
        if (m.provider === 'gemini') return hasGeminiKey;
        if (m.provider === 'openrouter') return hasOpenRouterKey;
        return false;
      });

    // Separate healthy models from models currently in cooldown
    const healthy = allVision.filter(m => ModelHealthTracker.isAvailable(m.id));
    const pool = healthy.length > 0 ? healthy : allVision;

    // Prioritize by registry priority + historical average latency
    pool.sort((a, b) => {
      const statsA = ModelHealthTracker.getStats(a.id);
      const statsB = ModelHealthTracker.getStats(b.id);
      
      // If one model is faster by > 3s on average, prioritize it
      if (statsA?.avgLatencyMs && statsB?.avgLatencyMs) {
        if (statsA.avgLatencyMs + 3000 < statsB.avgLatencyMs) return -1;
        if (statsB.avgLatencyMs + 3000 < statsA.avgLatencyMs) return 1;
      }
      return b.priority - a.priority;
    });

    return pool.slice(0, maxCandidates);
  }

  // Lightweight probe to verify model availability at startup
  async probeGeminiAvailability(apiKey) {
    if (!apiKey) return;
    console.log('[ModelRegistry] Probing Gemini models availability...');
    const geminiModels = Array.from(this.models.values()).filter(m => m.provider === 'gemini');

    for (const m of geminiModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${m.id}:generateContent?key=${apiKey}`;
      const body = {
        contents: [{ parts: [{ text: '{"status":"probe"}' }] }],
        generationConfig: { response_mime_type: "application/json", maxOutputTokens: 20 }
      };

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
          console.log(`[ModelRegistry] Model ${m.id} is HEALTHY`);
          ModelHealthTracker.recordSuccess(m.id, 500);
        } else {
          const status = res.status;
          console.warn(`[ModelRegistry] Model ${m.id} probe returned HTTP ${status}`);
          if (status === 503) ModelHealthTracker.recordFailure(m.id, 'HTTP_503', 4000, '503 High Demand');
          else if (status === 429) ModelHealthTracker.recordFailure(m.id, 'HTTP_429', 1000, '429 Rate Limit');
          else if (status === 404) m.enabled = false;
        }
      } catch (err) {
        console.warn(`[ModelRegistry] Model ${m.id} probe error: ${err.message}`);
      }
    }
  }
}

export default new ModelRegistry();
