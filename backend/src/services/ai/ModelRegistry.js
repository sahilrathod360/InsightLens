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
    maxOutputTokens: 6000,
    timeoutMs: 25000,
    speedTier: 'FAST',
    priority: 105,
    enabled: true,
    thinkingConfig: undefined
  },
  {
    id: 'gemini-3.1-flash-lite',
    provider: 'gemini',
    displayName: 'Gemini 3.1 Flash Lite',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 6000,
    timeoutMs: 25000,
    speedTier: 'FAST',
    priority: 100,
    enabled: true,
    thinkingConfig: undefined
  },
  {
    id: 'gemini-3.7-flash',
    provider: 'gemini',
    displayName: 'Gemini 3.7 Flash',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 6000,
    timeoutMs: 20000,
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
    maxOutputTokens: 6000,
    timeoutMs: 20000,
    speedTier: 'BALANCED',
    priority: 90,
    enabled: true,
    thinkingConfig: undefined
  },
  {
    id: 'gemini-3.8-flash',
    provider: 'gemini',
    displayName: 'Gemini 3.8 Flash',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 6000,
    timeoutMs: 18000,
    speedTier: 'DEEP',
    priority: 82,
    enabled: true,
    thinkingConfig: { thinking_budget: 0 }
  },

  // --- OPENROUTER VISION MODELS ---
  {
    id: 'google/gemini-2.5-flash-lite',
    provider: 'openrouter',
    displayName: 'OpenRouter: Gemini 2.5 Flash Lite',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 6000,
    timeoutMs: 12000,
    speedTier: 'FAST',
    priority: 90,
    enabled: true
  },
  {
    id: 'google/gemini-2.5-flash',
    provider: 'openrouter',
    displayName: 'OpenRouter: Gemini 2.5 Flash',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 6000,
    timeoutMs: 12000,
    speedTier: 'FAST',
    priority: 88,
    enabled: true
  },
  {
    id: 'google/gemini-3.5-flash-lite',
    provider: 'openrouter',
    displayName: 'OpenRouter: Gemini 3.5 Flash Lite',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 6000,
    timeoutMs: 12000,
    speedTier: 'FAST',
    priority: 86,
    enabled: true
  },
  {
    id: 'google/gemini-3.8-flash',
    provider: 'openrouter',
    displayName: 'OpenRouter: Gemini 3.8 Flash',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 6000,
    timeoutMs: 14000,
    speedTier: 'FAST',
    priority: 80,
    enabled: true
  },

  // --- GROQ MULTIMODAL LPU VISION MODELS ---
  {
    id: 'qwen/qwen3.8-27b',
    provider: 'groq',
    displayName: 'Groq: Qwen 2.5 27B Vision',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 950,
    timeoutMs: 15000,
    speedTier: 'FAST',
    priority: 96,
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

  getGeminiCandidates({ preferredModel = null } = {}) {
    const geminiModels = Array.from(this.models.values())
      .filter(m => m.enabled && m.vision && m.provider === 'gemini');
    const healthy = geminiModels.filter(m => ModelHealthTracker.isAvailable(m.id));
    const pool = healthy.length > 0 ? healthy : geminiModels;
    pool.sort((a, b) => b.priority - a.priority);
    if (preferredModel && preferredModel !== 'auto') {
      const match = pool.find(m => m.id === preferredModel);
      if (match) {
        return [match, ...pool.filter(m => m.id !== preferredModel)];
      }
    }
    return pool;
  }

  getGroqCandidates() {
    const groqModels = Array.from(this.models.values())
      .filter(m => m.enabled && m.vision && m.provider === 'groq');
    const healthy = groqModels.filter(m => ModelHealthTracker.isAvailable(m.id));
    return healthy.length > 0 ? healthy : groqModels;
  }

  getOpenRouterCandidates({ preferredModel = null } = {}) {
    const orModels = Array.from(this.models.values())
      .filter(m => m.enabled && m.vision && m.provider === 'openrouter');
    const healthy = orModels.filter(m => ModelHealthTracker.isAvailable(m.id));
    const pool = healthy.length > 0 ? healthy : orModels;
    pool.sort((a, b) => b.priority - a.priority);
    if (preferredModel && preferredModel !== 'auto') {
      const match = pool.find(m => m.id === preferredModel);
      if (match) {
        return [match, ...pool.filter(m => m.id !== preferredModel)];
      }
    }
    return pool;
  }

  getVisionCandidates({ maxCandidates = 6, hasGeminiKey = true, hasOpenRouterKey = true, hasGroqKey = true, allowedProviders = null, preferredProvider = null, preferredModel = null } = {}) {
    const providerSet = Array.isArray(allowedProviders) ? new Set(allowedProviders) : null;

    // MANDATORY PRIORITY CHAIN: Gemini -> Groq -> OpenRouter
    // Gemini is ALWAYS first-choice. Groq is fallback 1. OpenRouter is fallback 2.
    const geminiList = hasGeminiKey && (!providerSet || providerSet.has('gemini'))
      ? this.getGeminiCandidates({ preferredModel })
      : [];

    const groqList = hasGroqKey && (!providerSet || providerSet.has('groq'))
      ? this.getGroqCandidates()
      : [];

    const openRouterList = hasOpenRouterKey && (!providerSet || providerSet.has('openrouter'))
      ? this.getOpenRouterCandidates({ preferredModel })
      : [];

    const ordered = [...geminiList, ...groqList, ...openRouterList];
    return ordered.slice(0, maxCandidates);
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
