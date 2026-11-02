// Canonical Model Registry for InsightLens
// Configures vision models, priority hierarchy, timeouts, output limits, and capabilities.

import ModelHealthTracker from './ModelHealthTracker.js';

export const MODEL_REGISTRY = [
  // --- Google Gemini (Primary Tier — Direct Gemini API) ---
  {
    id: 'gemini-3.5-flash-lite',
    provider: 'gemini',
    displayName: 'Gemini 3.5 Flash Lite',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 5000,
    timeoutMs: 18000,
    speedTier: 'FAST',
    priority: 105,
    enabled: true,
    cooldownUntil: 0
  },
  {
    id: 'gemini-3.1-flash-lite',
    provider: 'gemini',
    displayName: 'Gemini 3.1 Flash Lite',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 5000,
    timeoutMs: 18000,
    speedTier: 'FAST',
    priority: 100,
    enabled: true,
    cooldownUntil: 0
  },
  {
    id: 'gemini-3.7-flash',
    provider: 'gemini',
    displayName: 'Gemini 3.7 Flash',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 5000,
    timeoutMs: 18000,
    speedTier: 'FAST',
    priority: 95,
    enabled: true,
    cooldownUntil: 0
  },
  {
    id: 'gemini-3.6-flash',
    provider: 'gemini',
    displayName: 'Gemini 3.6 Flash',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 5000,
    timeoutMs: 18000,
    speedTier: 'BALANCED',
    priority: 90,
    enabled: true,
    cooldownUntil: 0
  },
  {
    id: 'gemini-3.8-flash',
    provider: 'gemini',
    displayName: 'Gemini 3.8 Flash',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 5000,
    timeoutMs: 18000,
    speedTier: 'DEEP',
    priority: 82,
    enabled: true,
    cooldownUntil: 0
  },

  // --- OpenRouter (Fallback Tier 2 — Attempted ONLY if Gemini & Groq fail) ---
  {
    id: 'google/gemini-2.5-flash-lite',
    provider: 'openrouter',
    displayName: 'OpenRouter: Gemini 2.5 Flash Lite',
    vision: true,
    structuredJson: true,
    maxOutputTokens: 4000,
    timeoutMs: 14000,
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
    maxOutputTokens: 4000,
    timeoutMs: 14000,
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
    maxOutputTokens: 4000,
    timeoutMs: 14000,
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
    maxOutputTokens: 4000,
    timeoutMs: 14000,
    speedTier: 'FAST',
    priority: 80,
    enabled: true
  },

  // --- Groq (Fallback Tier 1 — Official Vision Model) ---
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

export class ModelRegistryManager {
  constructor(registry = MODEL_REGISTRY) {
    this.models = [...registry];
  }

  getGeminiCandidates(options = {}) {
    const { preferredModel } = options;
    const now = Date.now();

    const candidates = this.models
      .filter(m => m.provider === 'gemini' && m.enabled && m.vision && (m.cooldownUntil || 0) < now)
      .sort((a, b) => b.priority - a.priority);

    if (preferredModel && preferredModel !== 'auto') {
      const match = candidates.find(m => m.id === preferredModel);
      if (match) {
        return [match, ...candidates.filter(m => m.id !== preferredModel)];
      }
    }

    return candidates;
  }

  getGroqCandidates(options = {}) {
    const now = Date.now();
    return this.models
      .filter(m => m.provider === 'groq' && m.enabled && m.vision && (m.cooldownUntil || 0) < now)
      .sort((a, b) => b.priority - a.priority);
  }

  getOpenRouterCandidates(options = {}) {
    const { preferredModel } = options;
    const now = Date.now();

    const candidates = this.models
      .filter(m => m.provider === 'openrouter' && m.enabled && m.vision && (m.cooldownUntil || 0) < now)
      .sort((a, b) => b.priority - a.priority);

    if (preferredModel && preferredModel !== 'auto') {
      const match = candidates.find(m => m.id === preferredModel);
      if (match) {
        return [match, ...candidates.filter(m => m.id !== preferredModel)];
      }
    }

    return candidates;
  }

  getVisionCandidates({ maxCandidates = 4, hasGeminiKey = true, hasOpenRouterKey = true, allowedProviders = ['gemini', 'openrouter'] } = {}) {
    return this.models
      .filter(m => m.enabled && m.vision)
      .filter(m => allowedProviders.includes(m.provider))
      .filter(m => {
        if (m.provider === 'gemini') return hasGeminiKey;
        if (m.provider === 'openrouter') return hasOpenRouterKey;
        return true;
      })
      .filter(m => ModelHealthTracker.isAvailable(m.id))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxCandidates);
  }

  getModel(modelId) {
    return this.models.find(m => m.id === modelId) || null;
  }

  getModelConfig(modelId) {
    return this.models.find(m => m.id === modelId) || null;
  }
}

export default new ModelRegistryManager();
